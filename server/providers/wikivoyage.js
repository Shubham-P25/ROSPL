/**
 * Official API Docs: https://www.mediawiki.org/wiki/API:REST_API
 * Wikivoyage MediaWiki REST / Action API adapter for destination summaries.
 * Free, open content under CC BY-SA 4.0.
 */
const axios = require("axios");
const { cacheGet, cacheSet } = require("../cache/cache");
const logger = require("../lib/logger");
const { recordProviderStatus } = require("../routes/health");

const REST_SUMMARY_URL = "https://en.wikivoyage.org/api/rest_v1/page/summary";
const OPENSEARCH_URL = "https://en.wikivoyage.org/w/api.php";
const TIMEOUT_MS = 5000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const USER_AGENT = "PackGo-TravelPlanner/1.0 (https://github.com/Shubham-P25/ROSPL)";

function normalizeWikivoyageSummary(rawData) {
  if (!rawData || (!rawData.title && !rawData.extract)) {
    return null;
  }

  const contentUrl =
    rawData.content_urls?.desktop?.page ||
    (rawData.title ? `https://en.wikivoyage.org/wiki/${encodeURIComponent(rawData.title)}` : null);

  return {
    title: rawData.title || "",
    extract: rawData.extract || rawData.description || "",
    thumbnail: rawData.thumbnail?.source || rawData.originalimage?.source || null,
    contentUrl,
    source: "wikivoyage",
    attribution: "CC BY-SA 4.0 (Wikivoyage contributors)",
  };
}

async function searchArticleTitle(query) {
  try {
    const res = await axios.get(OPENSEARCH_URL, {
      params: {
        action: "opensearch",
        search: query,
        limit: 1,
        namespace: 0,
        format: "json",
      },
      headers: { "User-Agent": USER_AGENT },
      timeout: TIMEOUT_MS,
    });

    if (Array.isArray(res.data) && Array.isArray(res.data[1]) && res.data[1].length > 0) {
      return res.data[1][0];
    }
  } catch (err) {
    logger.debug("Wikivoyage opensearch failed", { query, error: err.message });
  }
  return null;
}

async function fetchDestinationSummary(destination) {
  if (!destination || typeof destination !== "string") return null;

  const trimmed = destination.trim();
  const cacheKey = `wikivoyage:summary:${trimmed.toLowerCase()}`;
  const cached = await cacheGet(cacheKey);
  if (cached && cached.value) {
    return cached.value;
  }

  let titleToFetch = trimmed;

  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      let res;
      try {
        res = await axios.get(`${REST_SUMMARY_URL}/${encodeURIComponent(titleToFetch)}`, {
          headers: { "User-Agent": USER_AGENT },
          timeout: TIMEOUT_MS,
        });
      } catch (err) {
        if (err.response?.status === 404 && attempt === 0) {
          const alternate = await searchArticleTitle(titleToFetch);
          if (alternate && alternate !== titleToFetch) {
            titleToFetch = alternate;
            continue;
          }
        }
        throw err;
      }

      const normalized = normalizeWikivoyageSummary(res.data);
      if (normalized) {
        await cacheSet(cacheKey, normalized, { freshMs: THIRTY_DAYS_MS });
        recordProviderStatus("wikivoyage", true);
        return normalized;
      }
      return null;
    } catch (err) {
      if (attempt === 1) {
        logger.warn("Wikivoyage summary fetch failed after retry", {
          destination,
          error: err.message,
        });
        recordProviderStatus("wikivoyage", false, err.message);
        return null;
      }
    }
  }
  return null;
}

module.exports = {
  fetchDestinationSummary,
  normalizeWikivoyageSummary,
  searchArticleTitle,
};
