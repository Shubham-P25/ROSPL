/**
 * Official API Docs:
 * Wikipedia Geosearch: https://www.mediawiki.org/wiki/Extension:GeoData
 * Wikimedia Commons: https://www.mediawiki.org/wiki/API:Imageinfo
 * Validated, multi-step lookup for verified CC place photos.
 */
const axios = require("axios");
const { cacheGet, cacheSet } = require("../cache/cache");
const { haversineKm } = require("../lib/haversine");
const logger = require("../lib/logger");
const { recordProviderStatus } = require("../routes/health");

const WIKIPEDIA_API_URL = "https://en.wikipedia.org/w/api.php";
const COMMONS_API_URL = "https://commons.wikimedia.org/w/api.php";
const TIMEOUT_MS = 5000;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const USER_AGENT =
  process.env.NOMINATIM_USER_AGENT ||
  "PackGo-TravelPlanner/1.0 (contact: patilshubham7644@gmail.com)";

// Throttle: max 5 requests / sec (200ms spacing)
let lastReqTime = 0;
async function throttle() {
  const now = Date.now();
  const diff = now - lastReqTime;
  if (diff < 200) {
    await new Promise((r) => setTimeout(r, 200 - diff));
  }
  lastReqTime = Date.now();
}

function stripHtml(html) {
  if (!html || typeof html !== "string") return "";
  return html.replace(/<[^>]*>?/gm, "").trim();
}

const FORBIDDEN_IMAGE_PATTERNS = [
  "map",
  "locator",
  "poster",
  "diagram",
  "logo",
  "flag",
  "plan",
  "chart",
];

function isRejectedFileName(fileName = "") {
  if (!fileName || typeof fileName !== "string") return true;
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".svg")) return true;
  return FORBIDDEN_IMAGE_PATTERNS.some((pattern) => lower.includes(pattern));
}

const GENERIC_TOKENS = new Set([
  "mandir",
  "temple",
  "fort",
  "church",
  "masjid",
  "mosque",
  "palace",
  "ghat",
  "park",
  "garden",
  "monument",
  "mahal",
  "shri",
  "lake",
  "beach",
  "road",
  "gate",
]);

function tokenize(text = "") {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function tokenOverlap(title = "", placeName = "") {
  const tTokens = tokenize(title);
  const pTokens = tokenize(placeName);
  if (tTokens.length === 0 || pTokens.length === 0) return 0;

  const filterDistinctive = (tokens) => {
    const distinctive = tokens.filter((t) => !GENERIC_TOKENS.has(t));
    return distinctive.length > 0 ? distinctive : tokens;
  };

  const pDist = filterDistinctive(pTokens);
  const tSet = new Set(tTokens);

  let matches = 0;
  for (const pt of pDist) {
    if (
      tSet.has(pt) ||
      Array.from(tSet).some((t) => t.includes(pt) || pt.includes(t))
    ) {
      matches++;
    }
  }

  return matches / pDist.length;
}

/**
 * Fetch license and author metadata from Wikimedia Commons for a specific image file name.
 */
async function fetchCommonsMetadata(fileName) {
  if (!fileName || isRejectedFileName(fileName)) return null;
  const title = fileName.startsWith("File:") ? fileName : `File:${fileName}`;

  try {
    await throttle();
    const res = await axios.get(COMMONS_API_URL, {
      params: {
        action: "query",
        titles: title,
        prop: "imageinfo",
        iiprop: "url|size|extmetadata",
        iiurlwidth: 800,
        format: "json",
      },
      headers: { "User-Agent": USER_AGENT },
      timeout: TIMEOUT_MS,
    });

    const pages = res.data?.query?.pages || {};
    const page = Object.values(pages)[0];
    if (!page || page.missing !== undefined) return null;

    const info = page.imageinfo?.[0];
    if (!info || (!info.url && !info.thumburl)) return null;

    const meta = info.extmetadata || {};
    const author =
      stripHtml(meta.Artist?.value) || "Wikimedia Commons Contributor";
    const license = meta.LicenseShortName?.value || "CC BY-SA 4.0";
    const licenseUrl =
      meta.LicenseUrl?.value || "https://creativecommons.org/licenses/";
    const caption =
      stripHtml(meta.ObjectName?.value) ||
      stripHtml(page.title).replace(/^File:/, "").replace(/\.[^.]+$/, "");

    return {
      url: info.thumburl || info.url,
      caption: caption || undefined,
      author,
      license,
      licenseUrl,
      sourceUrl:
        info.descriptionurl || info.descriptionshorturl || undefined,
    };
  } catch (_e) {
    return null;
  }
}

/**
 * Validated, multi-step lookup for verified CC place photos.
 * Returns verified photo metadata object or null.
 */
async function fetchPlacePhoto(placeName, destinationName = "", coords = null) {
  if (!placeName || typeof placeName !== "string" || !placeName.trim()) {
    return null;
  }

  const cleanName = placeName.trim();
  const cacheKey = `wikimedia:v2:${cleanName.toLowerCase()}:${(destinationName || "").toLowerCase()}`;

  const cached = await cacheGet(cacheKey);
  if (cached) {
    return cached.value; // May be null (negative cache)
  }

  try {
    let acceptedFileName = null;
    let acceptedThumbnailUrl = null;

    // Step 1: Geosearch (best signal if coordinates available)
    if (
      coords &&
      Number.isFinite(coords.lat) &&
      Number.isFinite(coords.lng)
    ) {
      await throttle();
      const geoRes = await axios.get(WIKIPEDIA_API_URL, {
        params: {
          action: "query",
          generator: "geosearch",
          ggscoord: `${coords.lat}|${coords.lng}`,
          ggsradius: 1000,
          ggslimit: 10,
          prop: "pageimages|coordinates",
          piprop: "thumbnail|name",
          pithumbsize: 800,
          format: "json",
        },
        headers: { "User-Agent": USER_AGENT },
        timeout: TIMEOUT_MS,
      });

      const pages = Object.values(geoRes.data?.query?.pages || {});
      for (const page of pages) {
        if (!page.pageimage || isRejectedFileName(page.pageimage)) continue;
        const overlap = tokenOverlap(page.title, cleanName);
        if (overlap >= 0.6 && page.thumbnail?.source) {
          acceptedFileName = page.pageimage;
          acceptedThumbnailUrl = page.thumbnail.source;
          break;
        }
      }
    }

    // Step 2: Title search fallback
    if (!acceptedFileName) {
      const q = destinationName ? `${cleanName} ${destinationName}` : cleanName;
      await throttle();
      const searchRes = await axios.get(WIKIPEDIA_API_URL, {
        params: {
          action: "query",
          list: "search",
          srsearch: q,
          srlimit: 5,
          format: "json",
        },
        headers: { "User-Agent": USER_AGENT },
        timeout: TIMEOUT_MS,
      });

      const searchHits = searchRes.data?.query?.search || [];
      if (searchHits.length > 0) {
        const pageIds = searchHits.map((h) => h.pageid).join("|");
        await throttle();
        const detailsRes = await axios.get(WIKIPEDIA_API_URL, {
          params: {
            action: "query",
            pageids: pageIds,
            prop: "pageimages|coordinates",
            piprop: "thumbnail|name",
            pithumbsize: 800,
            format: "json",
          },
          headers: { "User-Agent": USER_AGENT },
          timeout: TIMEOUT_MS,
        });

        const detailPages = Object.values(detailsRes.data?.query?.pages || {});
        for (const page of detailPages) {
          if (!page.pageimage || isRejectedFileName(page.pageimage)) continue;
          const overlap = tokenOverlap(page.title, cleanName);
          if (overlap < 0.6) continue;

          // If place coordinates exist, verify page coordinates are within 5 km
          if (
            coords &&
            Number.isFinite(coords.lat) &&
            Number.isFinite(coords.lng) &&
            page.coordinates &&
            page.coordinates[0]
          ) {
            const pageCoord = {
              lat: page.coordinates[0].lat,
              lng: page.coordinates[0].lon,
            };
            const dist = haversineKm(coords, pageCoord);
            if (dist > 5) continue; // Out of range, reject
          }

          if (page.thumbnail?.source) {
            acceptedFileName = page.pageimage;
            acceptedThumbnailUrl = page.thumbnail.source;
            break;
          }
        }
      }
    }

    // Step 3: Fetch Commons metadata if file was accepted
    if (acceptedFileName) {
      const metadata = await fetchCommonsMetadata(acceptedFileName);
      if (metadata) {
        if (!metadata.url && acceptedThumbnailUrl) {
          metadata.url = acceptedThumbnailUrl;
        }
        await cacheSet(cacheKey, metadata, { freshMs: NINETY_DAYS_MS });
        recordProviderStatus("wikimedia", true);
        return metadata;
      }
    }

    // Negative caching: cache null for 7 days
    await cacheSet(cacheKey, null, { freshMs: SEVEN_DAYS_MS });
    return null;
  } catch (err) {
    logger.warn("Wikimedia photo lookup failed", {
      placeName,
      error: err.message,
    });
    recordProviderStatus("wikimedia", false, err.message);
    return null;
  }
}

module.exports = {
  fetchPlacePhoto,
  fetchCommonsMetadata,
  isRejectedFileName,
  tokenOverlap,
  stripHtml,
};
