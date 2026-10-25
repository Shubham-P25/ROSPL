/**
 * Official API Docs: https://www.mediawiki.org/wiki/API:Imageinfo
 * Wikimedia Commons adapter for CC-licensed place imagery.
 * Zero-cost, CC BY-SA compliant with author and license attribution.
 */
const axios = require("axios");
const { cacheGet, cacheSet } = require("../cache/cache");
const logger = require("../lib/logger");
const { recordProviderStatus } = require("../routes/health");

const COMMONS_API_URL = "https://commons.wikimedia.org/w/api.php";
const TIMEOUT_MS = 5000;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const USER_AGENT = "PackGo-TravelPlanner/1.0 (https://github.com/Shubham-P25/ROSPL)";

function stripHtml(html) {
  if (!html || typeof html !== "string") return "";
  return html.replace(/<[^>]*>?/gm, "").trim();
}

function normalizeWikimediaPhoto(rawData) {
  if (!rawData || !rawData.query || !rawData.query.pages) {
    return null;
  }

  const pages = rawData.query.pages;
  const pageKey = Object.keys(pages)[0];
  if (!pageKey || pageKey === "-1") return null;

  const page = pages[pageKey];
  const imageinfo = page.imageinfo && page.imageinfo[0];
  if (!imageinfo || (!imageinfo.url && !imageinfo.thumburl)) {
    return null;
  }

  const extmetadata = imageinfo.extmetadata || {};
  const rawArtist = extmetadata.Artist ? extmetadata.Artist.value : "";
  const author = stripHtml(rawArtist) || "Wikimedia Commons Contributor";
  const license = extmetadata.LicenseShortName ? extmetadata.LicenseShortName.value : "CC BY-SA 4.0";
  const licenseUrl = extmetadata.LicenseUrl
    ? extmetadata.LicenseUrl.value
    : "https://creativecommons.org/licenses/";
  const caption = extmetadata.ObjectName
    ? stripHtml(extmetadata.ObjectName.value)
    : stripHtml(page.title).replace(/^File:/, "").replace(/\.[^.]+$/, "");

  return {
    url: imageinfo.thumburl || imageinfo.url,
    caption: caption || undefined,
    author,
    license,
    licenseUrl,
    sourceUrl: imageinfo.descriptionurl || imageinfo.descriptionshorturl || undefined,
  };
}

async function fetchPlacePhoto(placeName, destinationName = "") {
  if (!placeName || typeof placeName !== "string") return null;

  const searchQuery = destinationName
    ? `${placeName.trim()} ${destinationName.trim()}`
    : placeName.trim();
  const cacheKey = `wikimedia:photo:${searchQuery.toLowerCase()}`;

  const cached = await cacheGet(cacheKey);
  if (cached && cached.value) {
    return cached.value;
  }

  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      const res = await axios.get(COMMONS_API_URL, {
        params: {
          action: "query",
          generator: "search",
          gsrsearch: searchQuery,
          gsrnamespace: 6, // File: namespace
          gsrlimit: 1,
          prop: "imageinfo",
          iiprop: "url|size|extmetadata",
          iiurlwidth: 800,
          format: "json",
        },
        headers: { "User-Agent": USER_AGENT },
        timeout: TIMEOUT_MS,
      });

      const photo = normalizeWikimediaPhoto(res.data);
      if (photo) {
        await cacheSet(cacheKey, photo, { freshMs: NINETY_DAYS_MS });
        recordProviderStatus("wikimedia", true);
        return photo;
      }
      return null;
    } catch (err) {
      if (attempt === 1) {
        logger.warn("Wikimedia Commons photo search failed after retry", {
          searchQuery,
          error: err.message,
        });
        recordProviderStatus("wikimedia", false, err.message);
        return null;
      }
    }
  }
  return null;
}

module.exports = {
  fetchPlacePhoto,
  normalizeWikimediaPhoto,
  stripHtml,
};
