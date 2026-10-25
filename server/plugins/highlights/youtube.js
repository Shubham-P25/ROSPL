/**
 * plugins/highlights/youtube.js
 * Featured destination travel video & guide highlights adapter.
 * Uses YouTube Data API v3 if key is present; gracefully and silently
 * falls back to curated maintainer travel guides with zero required keys.
 */
const axios = require("axios");
const { cacheGet, cacheSet } = require("../../cache/cache");
const { normalizeCityName } = require("../../seed/index");
const logger = require("../../lib/logger");

const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 4000;

// Curated maintainer fallback guides for destinations
const CURATED_GUIDES = {
  jaipur: [
    {
      title: "Jaipur - The Pink City Complete Travel Guide",
      channelTitle: "Wikivoyage Heritage Guide",
      url: "https://en.wikivoyage.org/wiki/Jaipur",
      thumbnail:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/East_facade_Hawa_Mahal_Jaipur_2016-01-24.jpg/320px-East_facade_Hawa_Mahal_Jaipur_2016-01-24.jpg",
      source: "curated",
    },
    {
      title: "Amber Palace and Historic Fortresses of Rajasthan",
      channelTitle: "Heritage Explorers",
      url: "https://en.wikivoyage.org/wiki/Amer",
      thumbnail:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Amber_Fort_Jaipur.jpg/800px-Amber_Fort_Jaipur.jpg",
      source: "curated",
    },
  ],
  goa: [
    {
      title: "Goa Complete Travel Itinerary & Beaches",
      channelTitle: "Coastal Expeditions",
      url: "https://en.wikivoyage.org/wiki/Goa",
      thumbnail:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Goa_Sunset.jpg/320px-Goa_Sunset.jpg",
      source: "curated",
    },
  ],
  varanasi: [
    {
      title: "Varanasi - The Spiritual Heart & Sacred Ghats",
      channelTitle: "Cultural Journeys",
      url: "https://en.wikivoyage.org/wiki/Varanasi",
      thumbnail:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Varanasi_Ghats.jpg/320px-Varanasi_Ghats.jpg",
      source: "curated",
    },
  ],
};

function normalizeYouTubeItem(item) {
  if (!item || !item.id || !item.snippet) return null;
  const videoId = typeof item.id === "string" ? item.id : item.id.videoId;
  if (!videoId) return null;

  return {
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnail:
      item.snippet.thumbnails?.medium?.url ||
      item.snippet.thumbnails?.default?.url ||
      null,
    source: "youtube",
  };
}

async function fetchDestinationHighlights(destination) {
  if (!destination || typeof destination !== "string") return [];

  const norm = normalizeCityName(destination);
  const cacheKey = `highlights:${norm}`;
  const cached = await cacheGet(cacheKey);
  if (cached && Array.isArray(cached.value)) {
    return cached.value;
  }

  const apiKey = process.env.YOUTUBE_API_KEY;

  if (apiKey) {
    try {
      const res = await axios.get(YOUTUBE_SEARCH_URL, {
        params: {
          part: "snippet",
          q: `${destination} travel guide`,
          type: "video",
          maxResults: 3,
          key: apiKey,
        },
        timeout: TIMEOUT_MS,
      });

      if (res.data?.items && Array.isArray(res.data.items)) {
        const videos = res.data.items
          .map(normalizeYouTubeItem)
          .filter(Boolean);

        if (videos.length > 0) {
          await cacheSet(cacheKey, videos, { freshMs: THREE_DAYS_MS });
          return videos;
        }
      }
    } catch (err) {
      logger.debug("YouTube API highlights search failed, using curated fallback", {
        destination,
        error: err.message,
      });
    }
  }

  // Silent fallback to curated maintainer links
  const curated = CURATED_GUIDES[norm] || [
    {
      title: `${destination} Essential Travel Guide`,
      channelTitle: "Wikivoyage Open Explorer",
      url: `https://en.wikivoyage.org/wiki/${encodeURIComponent(destination)}`,
      thumbnail:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Wikivoyage-Logo-v3-icon.svg/240px-Wikivoyage-Logo-v3-icon.svg.png",
      source: "curated",
    },
  ];

  await cacheSet(cacheKey, curated, { freshMs: THREE_DAYS_MS });
  return curated;
}

module.exports = {
  fetchDestinationHighlights,
  normalizeYouTubeItem,
  CURATED_GUIDES,
};
