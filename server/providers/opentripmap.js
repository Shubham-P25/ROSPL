/**
 * Official API Docs: https://opentripmap.io/docs
 * OpenTripMap places provider adapter.
 */
const axios = require("axios");
const { PlaceSchema } = require("../schemas/place");
const logger = require("../lib/logger");
const { recordProviderStatus } = require("../routes/health");

const BASE_URL =
  process.env.OPENTRIPMAP_BASE_URL || "https://api.opentripmap.com/0.1";
const LANG = process.env.OPENTRIPMAP_LANG || "en";
const TIMEOUT_MS = 4000;

function mapKindsToCategory(kindsString = "") {
  const kinds = kindsString.toLowerCase().split(",");
  if (
    kinds.some(
      (k) =>
        k.includes("religion") ||
        k.includes("temple") ||
        k.includes("church") ||
        k.includes("mosque"),
    )
  ) {
    return "religious";
  }
  if (
    kinds.some(
      (k) =>
        k.includes("historic") ||
        k.includes("monument") ||
        k.includes("cultural") ||
        k.includes("museum"),
    )
  ) {
    return "culture";
  }
  if (
    kinds.some(
      (k) =>
        k.includes("natural") ||
        k.includes("beach") ||
        k.includes("park") ||
        k.includes("lake"),
    )
  ) {
    return "nature";
  }
  if (
    kinds.some(
      (k) =>
        k.includes("food") ||
        k.includes("restaurant") ||
        k.includes("cafe") ||
        k.includes("culinary"),
    )
  ) {
    return "food";
  }
  if (
    kinds.some(
      (k) => k.includes("shop") || k.includes("bazaar") || k.includes("market"),
    )
  ) {
    return "shopping";
  }
  if (
    kinds.some(
      (k) =>
        k.includes("amusement") ||
        k.includes("climb") ||
        k.includes("sport") ||
        k.includes("trail"),
    )
  ) {
    return "adventure";
  }
  if (
    kinds.some(
      (k) => k.includes("night") || k.includes("bar") || k.includes("club"),
    )
  ) {
    return "nightlife";
  }
  return "other";
}

function normalizePlaces(rawPois = []) {
  const normalized = [];
  for (const poi of rawPois) {
    if (!poi.name || !poi.name.trim() || !poi.point) {
      continue;
    }

    const rateNum = Number(poi.rate) || 0;
    const normalizedRating = Math.min(5, Math.max(0, rateNum * (5 / 3)));
    const normalizedPop = Math.min(1, Math.max(0, rateNum / 3));

    const candidate = {
      id: `opentripmap:${poi.xid || poi.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      name: poi.name.trim().slice(0, 200),
      category: mapKindsToCategory(poi.kinds),
      lat: Number(poi.point.lat),
      lng: Number(poi.point.lon),
      rate: rateNum,
      wikidata: poi.wikidata || undefined,
      rating: Number(normalizedRating.toFixed(1)),
      popularity: Number(normalizedPop.toFixed(2)),
      visitMinutes: 90,
      source: "opentripmap",
      sourceUrl: poi.xid
        ? `https://opentripmap.com/en/card/${poi.xid}`
        : undefined,
    };

    const parseResult = PlaceSchema.safeParse(candidate);
    if (parseResult.success) {
      normalized.push(parseResult.data);
    }
  }
  return normalized;
}

async function searchPlacesByRadius({ lat, lng, radiusKm = 20 }) {
  const apiKey = process.env.OPENTRIPMAP_API_KEY;
  if (!apiKey || apiKey === "enter_your_api_key") {
    logger.warn(
      "OpenTripMap API key missing or unconfigured, skipping live call",
      {
        provider: "opentripmap",
      },
    );
    recordProviderStatus("opentripmap", false, "API key not configured");
    return [];
  }

  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      const url = `${BASE_URL}/${LANG}/places/radius`;
      const res = await axios.get(url, {
        params: {
          lat,
          lon: lng,
          radius: radiusKm * 1000,
          rate: 2,
          limit: 50,
          format: "json",
          apikey: apiKey,
        },
        timeout: TIMEOUT_MS,
      });

      if (Array.isArray(res.data)) {
        recordProviderStatus("opentripmap", true);
        return normalizePlaces(res.data);
      }
      return [];
    } catch (err) {
      if (attempt === 1) {
        logger.warn("OpenTripMap fetch failed after retry", {
          provider: "opentripmap",
          error: err.message,
        });
        recordProviderStatus("opentripmap", false, err.message);
        return [];
      }
    }
  }
  return [];
}

module.exports = {
  searchPlacesByRadius,
  normalizePlaces,
  mapKindsToCategory,
};
