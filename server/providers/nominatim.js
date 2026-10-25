/**
 * Official API Docs: https://nominatim.org/release-docs/develop/api/Search/
 * OpenStreetMap Nominatim Geocoding Adapter.
 * Respects Nominatim usage policy: <= 1 req/sec, descriptive User-Agent, no autocomplete, 90-day caching.
 */
const axios = require("axios");
const { cacheGet, cacheSet } = require("../cache/cache");
const logger = require("../lib/logger");
const { recordProviderStatus } = require("../routes/health");

const BASE_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT =
  process.env.NOMINATIM_USER_AGENT || "ROSPL/1.0 (contact: packgo@example.com)";
const TIMEOUT_MS = 4000;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

let lastRequestTimestamp = 0;

async function throttleOnePerSec() {
  const now = Date.now();
  const elapsed = now - lastRequestTimestamp;
  if (elapsed < 1000) {
    await new Promise((resolve) => setTimeout(resolve, 1000 - elapsed));
  }
  lastRequestTimestamp = Date.now();
}

function normalizeGeocode(rawList = []) {
  if (!Array.isArray(rawList) || rawList.length === 0) {
    return null;
  }
  const item = rawList[0];
  const lat = parseFloat(item.lat);
  const lng = parseFloat(item.lon);
  if (isNaN(lat) || isNaN(lng)) return null;

  return {
    name: item.name || (item.display_name ? item.display_name.split(",")[0] : "Unknown"),
    lat,
    lng,
    displayName: item.display_name || item.name || "",
  };
}

async function geocodeDestination(cityName) {
  if (!cityName || !cityName.trim()) return null;
  const query = cityName.trim().toLowerCase();
  const cacheKey = `nominatim:geocode:${query}`;

  // 1. Check cache first (90-day validity)
  const cached = await cacheGet(cacheKey);
  if (cached && cached.value) {
    return cached.value;
  }

  // 2. Throttled HTTP request
  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      await throttleOnePerSec();

      const res = await axios.get(BASE_URL, {
        params: {
          q: query,
          format: "json",
          limit: 1,
          addressdetails: 1,
        },
        headers: {
          "User-Agent": USER_AGENT,
        },
        timeout: TIMEOUT_MS,
      });

      const normalized = normalizeGeocode(res.data);
      if (normalized) {
        await cacheSet(cacheKey, normalized, {
          freshMs: NINETY_DAYS_MS,
          hardMs: NINETY_DAYS_MS * 2,
        });
        recordProviderStatus("nominatim", true);
        return normalized;
      }
      return null;
    } catch (err) {
      if (attempt === 1) {
        logger.warn("Nominatim geocoding failed after retry", {
          provider: "nominatim",
          query,
          error: err.message,
        });
        recordProviderStatus("nominatim", false, err.message);
        return null;
      }
    }
  }
  return null;
}

module.exports = {
  geocodeDestination,
  normalizeGeocode,
};
