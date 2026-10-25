/**
 * Official API Docs: https://open-meteo.com/en/docs
 * Open-Meteo weather forecast and climate adapter.
 * Free for non-commercial open-source use, no API key required.
 */
const axios = require("axios");
const { cacheGet, cacheSet } = require("../cache/cache");
const logger = require("../lib/logger");
const { recordProviderStatus } = require("../routes/health");

const BASE_URL = "https://api.open-meteo.com/v1/forecast";
const TIMEOUT_MS = 4000;
const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

function normalizeWeather(rawData, locationName = "Destination") {
  if (!rawData || !rawData.daily || !Array.isArray(rawData.daily.time)) {
    return null;
  }

  const { time, temperature_2m_max, temperature_2m_min, precipitation_probability_max } =
    rawData.daily;

  const daily = time.map((date, idx) => ({
    date,
    tempMax: temperature_2m_max ? temperature_2m_max[idx] : null,
    tempMin: temperature_2m_min ? temperature_2m_min[idx] : null,
    rainProb: precipitation_probability_max ? precipitation_probability_max[idx] : 0,
  }));

  const maxTempAll = temperature_2m_max?.length ? Math.max(...temperature_2m_max) : 28;
  const minTempAll = temperature_2m_min?.length ? Math.min(...temperature_2m_min) : 18;
  const maxRainProb = precipitation_probability_max?.length
    ? Math.max(...precipitation_probability_max)
    : 10;

  return {
    location: locationName,
    temperatureMax: Math.round(maxTempAll),
    temperatureMin: Math.round(minTempAll),
    rainProbability: maxRainProb,
    precipitationProbabilityMax: maxRainProb,
    daily,
    source: "open-meteo",
  };
}

async function fetchWeatherForecast({ lat, lng, locationName = "Destination" }) {
  if (lat === undefined || lng === undefined) return null;

  const cacheKey = `openmeteo:forecast:${lat.toFixed(2)}:${lng.toFixed(2)}`;
  const cached = await cacheGet(cacheKey);
  if (cached && cached.value) {
    return cached.value;
  }

  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      const res = await axios.get(BASE_URL, {
        params: {
          latitude: lat,
          longitude: lng,
          daily: [
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_probability_max",
          ].join(","),
          timezone: "auto",
        },
        timeout: TIMEOUT_MS,
      });

      const normalized = normalizeWeather(res.data, locationName);
      if (normalized) {
        await cacheSet(cacheKey, normalized, { freshMs: THREE_HOURS_MS });
        recordProviderStatus("openmeteo", true);
        return normalized;
      }
      return null;
    } catch (err) {
      if (attempt === 1) {
        logger.warn("Open-Meteo forecast failed after retry", {
          provider: "openmeteo",
          error: err.message,
        });
        recordProviderStatus("openmeteo", false, err.message);
        return null;
      }
    }
  }
  return null;
}

module.exports = {
  fetchWeatherForecast,
  normalizeWeather,
};
