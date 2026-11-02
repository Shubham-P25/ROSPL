const axios = require("axios");
const Trip = require("../models/Trip");
const nominatim = require("../providers/nominatim");
const { cacheGet, cacheSet } = require("../cache/cache");
const { getWeatherCondition } = require("../lib/weatherCodes");
const logger = require("../lib/logger");

const FORECAST_API = "https://api.open-meteo.com/v1/forecast";
const ARCHIVE_API = "https://archive-api.open-meteo.com/v1/archive";
const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours

/**
 * Pure normalizer for Open-Meteo data.
 * Guarantees all numbers are finite or null. Never returns NaN.
 */
function normalizeWeatherData({
  location = "Destination",
  currentRaw = null,
  dailyRaw = null,
  source = "open-meteo",
  degraded = false,
  isArchive = false,
}) {
  let current = null;
  if (currentRaw) {
    const temp = Number.isFinite(currentRaw.temperature_2m)
      ? Math.round(currentRaw.temperature_2m)
      : null;
    const feelsLike = Number.isFinite(currentRaw.apparent_temperature)
      ? Math.round(currentRaw.apparent_temperature)
      : temp;
    const humidity = Number.isFinite(currentRaw.relative_humidity_2m)
      ? Math.round(currentRaw.relative_humidity_2m)
      : null;
    const windSpeed = Number.isFinite(currentRaw.wind_speed_10m)
      ? Math.round(currentRaw.wind_speed_10m)
      : null;
    const code = Number.isFinite(currentRaw.weather_code)
      ? currentRaw.weather_code
      : 2;
    const cond = getWeatherCondition(code);

    current = {
      temp,
      feelsLike,
      humidity,
      windSpeed,
      condition: cond.label,
      code,
    };
  }

  const daily = [];
  if (dailyRaw && Array.isArray(dailyRaw.time)) {
    for (let i = 0; i < dailyRaw.time.length; i++) {
      const dateStr = dailyRaw.time[i];
      const maxRaw = dailyRaw.temperature_2m_max?.[i];
      const minRaw = dailyRaw.temperature_2m_min?.[i];
      const rainRaw = dailyRaw.precipitation_probability_max?.[i];
      const codeRaw = dailyRaw.weather_code?.[i];

      const tempMax = Number.isFinite(maxRaw) ? Math.round(maxRaw) : null;
      const tempMin = Number.isFinite(minRaw) ? Math.round(minRaw) : null;
      const rainProb = Number.isFinite(rainRaw) ? Math.round(rainRaw) : 0;
      const code = Number.isFinite(codeRaw) ? codeRaw : 1;
      const cond = getWeatherCondition(code);

      // Derive short day label (e.g. "Thu")
      let dayName = "";
      try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          dayName = d.toLocaleDateString("en-US", { weekday: "short" });
        }
      } catch (_e) {
        dayName = "";
      }

      daily.push({
        date: dateStr,
        day: dayName,
        tempMax,
        tempMin,
        rainProb,
        condition: cond.label,
        code,
        source: isArchive ? "climatology" : "forecast",
      });
    }
  }

  // If current was missing but daily exists, derive current from first day
  if (!current && daily.length > 0 && daily[0].tempMax !== null) {
    const first = daily[0];
    current = {
      temp: first.tempMax,
      feelsLike: first.tempMax,
      humidity: 50,
      windSpeed: 10,
      condition: first.condition,
      code: first.code,
    };
  }

  return {
    location,
    current: current || {
      temp: 28,
      feelsLike: 28,
      humidity: 50,
      windSpeed: 10,
      condition: "Partly Cloudy",
      code: 2,
    },
    daily,
    source,
    degraded,
  };
}

/**
 * Fetch Open-Meteo weather for coordinates and optional date bounds.
 */
async function fetchOpenMeteo({ lat, lng, startDate, endDate, locationName }) {
  const now = new Date();
  const maxForecastDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

  let start = startDate ? new Date(startDate) : now;
  let end = endDate ? new Date(endDate) : new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
  if (isNaN(start.getTime())) start = now;
  if (isNaN(end.getTime()) || end < start) end = new Date(start.getTime() + 4 * 24 * 60 * 60 * 1000);

  // If trip is in the far future (>15 days out), use archive climatology from 1 year ago
  const isFarFuture = start > maxForecastDate;
  if (isFarFuture) {
    const yearAgoStart = new Date(start);
    yearAgoStart.setFullYear(yearAgoStart.getFullYear() - 1);
    const yearAgoEnd = new Date(end);
    yearAgoEnd.setFullYear(yearAgoEnd.getFullYear() - 1);

    const sStr = yearAgoStart.toISOString().split("T")[0];
    const eStr = yearAgoEnd.toISOString().split("T")[0];

    const res = await axios.get(ARCHIVE_API, {
      params: {
        latitude: lat,
        longitude: lng,
        start_date: sStr,
        end_date: eStr,
        daily: [
          "temperature_2m_max",
          "temperature_2m_min",
          "precipitation_sum",
          "weather_code",
        ].join(","),
        timezone: "auto",
      },
      timeout: 5000,
    });

    // Map archive dates back to trip year
    const archiveDaily = res.data?.daily || {};
    if (Array.isArray(archiveDaily.time)) {
      const targetTime = [];
      let cur = new Date(start);
      while (cur <= end) {
        targetTime.push(cur.toISOString().split("T")[0]);
        cur = new Date(cur.getTime() + 24 * 60 * 60 * 1000);
      }
      archiveDaily.time = targetTime.slice(0, archiveDaily.temperature_2m_max?.length || targetTime.length);
    }

    return normalizeWeatherData({
      location: locationName,
      currentRaw: null,
      dailyRaw: archiveDaily,
      source: "open-meteo-climatology",
      isArchive: true,
    });
  }

  // Active / near forecast call
  const sStr = start.toISOString().split("T")[0];
  const eStr = end.toISOString().split("T")[0];

  const res = await axios.get(FORECAST_API, {
    params: {
      latitude: lat,
      longitude: lng,
      start_date: sStr,
      end_date: eStr,
      daily: [
        "weather_code",
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_probability_max",
        "wind_speed_10m_max",
      ].join(","),
      current: [
        "temperature_2m",
        "apparent_temperature",
        "relative_humidity_2m",
        "wind_speed_10m",
        "weather_code",
      ].join(","),
      timezone: "auto",
    },
    timeout: 5000,
  });

  return normalizeWeatherData({
    location: locationName,
    currentRaw: res.data?.current || null,
    dailyRaw: res.data?.daily || null,
    source: "open-meteo",
    isArchive: false,
  });
}

/**
 * GET /api/weather/trip/:tripId
 * Primary trip-scoped weather endpoint
 */
exports.getTripWeather = async (req, res) => {
  try {
    const { tripId } = req.params;
    const trip = await Trip.findOne({ _id: tripId, user: req.user.id });
    if (!trip) {
      return res.status(404).json({ msg: "Trip not found or access denied" });
    }

    const destination = trip.destination || "Destination";
    const cacheKey = `weather:trip:${tripId}:${trip.startDate || ""}:${trip.endDate || ""}`;
    const cached = await cacheGet(cacheKey);
    if (cached && cached.value) {
      return res.json(cached.value);
    }

    // Resolve coordinates: trip.planData -> nominatim
    let coords = null;
    if (trip.planData?.weather?.latitude && trip.planData?.weather?.longitude) {
      coords = {
        lat: trip.planData.weather.latitude,
        lng: trip.planData.weather.longitude,
      };
    } else {
      try {
        coords = await nominatim.geocodeDestination(destination);
      } catch (_e) {
        coords = null;
      }
    }

    if (!coords || typeof coords.lat !== "number" || typeof coords.lng !== "number") {
      coords = { lat: 19.076, lng: 72.8777 }; // Safe Indian default (Mumbai)
    }

    try {
      const weatherData = await fetchOpenMeteo({
        lat: coords.lat,
        lng: coords.lng,
        startDate: trip.startDate,
        endDate: trip.endDate,
        locationName: destination,
      });

      await cacheSet(cacheKey, weatherData, { freshMs: CACHE_TTL_MS });
      return res.json(weatherData);
    } catch (apiErr) {
      logger.warn("Open-Meteo live call failed, returning graceful degraded payload", {
        error: apiErr.message,
        destination,
      });
      // Never 500 on weather failure, return 200 with degraded: true
      return res.json({
        location: destination,
        current: {
          temp: 28,
          feelsLike: 28,
          humidity: 50,
          windSpeed: 10,
          condition: "Partly Cloudy",
          code: 2,
        },
        daily: [],
        source: "offline-fallback",
        degraded: true,
      });
    }
  } catch (err) {
    logger.error("getTripWeather server error:", { message: err.message });
    return res.json({
      location: "Destination",
      current: null,
      daily: [],
      source: "offline-fallback",
      degraded: true,
    });
  }
};

/**
 * GET /api/weather/current/:location (legacy compatibility)
 */
exports.getCurrentWeather = async (req, res) => {
  try {
    const { location } = req.params;
    let coords = await nominatim.geocodeDestination(location);
    if (!coords) coords = { lat: 26.9124, lng: 75.7872 }; // Jaipur fallback

    const data = await fetchOpenMeteo({
      lat: coords.lat,
      lng: coords.lng,
      locationName: location,
    });

    res.json({
      location: data.location,
      country: "IN",
      temperature: data.current.temp,
      description: data.current.condition,
      humidity: data.current.humidity,
      windSpeed: data.current.windSpeed,
      condition: data.current.condition,
      feelsLike: data.current.feelsLike,
      source: data.source,
      provider: "Open-Meteo",
    });
  } catch (err) {
    res.json({
      location: req.params.location,
      temperature: 28,
      feelsLike: 28,
      description: "Partly Cloudy",
      humidity: 50,
      windSpeed: 10,
      provider: "Fallback",
    });
  }
};

/**
 * GET /api/weather/forecast/:location (legacy compatibility)
 */
exports.getForecast = async (req, res) => {
  try {
    const { location } = req.params;
    let coords = await nominatim.geocodeDestination(location);
    if (!coords) coords = { lat: 26.9124, lng: 75.7872 };

    const data = await fetchOpenMeteo({
      lat: coords.lat,
      lng: coords.lng,
      locationName: location,
    });

    res.json({
      location: data.location,
      country: "IN",
      daily: data.daily,
      forecast: data.daily.map((d) => ({
        date: d.date,
        day: d.day,
        temperature: d.tempMax,
        tempMax: d.tempMax,
        tempMin: d.tempMin,
        description: d.condition,
        rainProb: d.rainProb,
        source: d.source,
      })),
      source: data.source,
    });
  } catch (err) {
    res.json({
      location: req.params.location,
      country: "IN",
      daily: [],
      forecast: [],
      degraded: true,
    });
  }
};

module.exports.normalizeWeatherData = normalizeWeatherData;
