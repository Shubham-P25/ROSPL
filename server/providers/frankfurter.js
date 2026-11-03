/**
 * Official API Docs: https://www.frankfurter.app/docs/
 * Frankfurter Open-Source Currency API (European Central Bank data).
 * Free, open-source, no key required.
 */
const axios = require("axios");
const { cacheGet, cacheSet } = require("../cache/cache");
const logger = require("../lib/logger");
const { recordProviderStatus } = require("../routes/health");

const BASE_URL = "https://api.frankfurter.app/latest";
const TIMEOUT_MS = 4000;
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

// Static offline fallback rates for top currencies
const STATIC_FALLBACK_RATES = {
  USD: {
    INR: 84.5,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 153.2,
    AUD: 1.52,
    CAD: 1.38,
    SGD: 1.32,
    AED: 3.67,
    THB: 34.2,
  },
  INR: {
    USD: 0.0118,
    EUR: 0.0109,
    GBP: 0.0093,
    JPY: 1.81,
    AED: 0.0434,
    THB: 0.405,
    USD_REF: 84.5,
  },
  EUR: { USD: 1.08, INR: 91.5, GBP: 0.86, JPY: 166.0 },
  GBP: { USD: 1.26, EUR: 1.16, INR: 106.8 },
};

function normalizeRate(rawData, targetCurrency) {
  if (!rawData || !rawData.rates || typeof rawData.rates !== "object") {
    return null;
  }
  const targetUpper = targetCurrency.toUpperCase();
  const rate = rawData.rates[targetUpper];
  if (typeof rate === "number" && !isNaN(rate) && rate > 0) {
    return {
      base: rawData.base || "USD",
      target: targetUpper,
      rate,
      date: rawData.date || new Date().toISOString().slice(0, 10),
      source: "frankfurter",
    };
  }
  return null;
}

function getOfflineFallbackRate(fromCurr, toCurr) {
  const from = fromCurr.toUpperCase();
  const to = toCurr.toUpperCase();
  if (from === to) return 1.0;

  if (STATIC_FALLBACK_RATES[from] && STATIC_FALLBACK_RATES[from][to]) {
    return STATIC_FALLBACK_RATES[from][to];
  }
  if (STATIC_FALLBACK_RATES[to] && STATIC_FALLBACK_RATES[to][from]) {
    return 1 / STATIC_FALLBACK_RATES[to][from];
  }
  // Try conversion through USD
  if (STATIC_FALLBACK_RATES.USD[to] && STATIC_FALLBACK_RATES.USD[from]) {
    return STATIC_FALLBACK_RATES.USD[to] / STATIC_FALLBACK_RATES.USD[from];
  }
  return 1.0;
}

async function getExchangeRate(fromCurrency = "USD", toCurrency = "INR") {
  const from = fromCurrency.toUpperCase().trim();
  const to = toCurrency.toUpperCase().trim();

  if (from === to) {
    return { base: from, target: to, rate: 1.0, source: "identity" };
  }

  const cacheKey = `frankfurter:rate:${from}:${to}`;
  const cached = await cacheGet(cacheKey);
  if (cached && cached.value) {
    return cached.value;
  }

  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      const res = await axios.get(BASE_URL, {
        params: {
          from,
          to,
        },
        timeout: TIMEOUT_MS,
      });

      const normalized = normalizeRate(res.data, to);
      if (normalized) {
        await cacheSet(cacheKey, normalized, { freshMs: TWELVE_HOURS_MS });
        recordProviderStatus("frankfurter", true);
        return normalized;
      }
    } catch (err) {
      if (attempt === 1) {
        logger.warn("Frankfurter rate fetch failed, using offline fallback", {
          from,
          to,
          error: err.message,
        });
        recordProviderStatus("frankfurter", false, err.message);
      }
    }
  }

  // Safe offline fallback
  const fallbackRate = getOfflineFallbackRate(from, to);
  return {
    base: from,
    target: to,
    rate: fallbackRate,
    source: "static_offline_fallback",
  };
}

module.exports = {
  getExchangeRate,
  normalizeRate,
  getOfflineFallbackRate,
  STATIC_FALLBACK_RATES,
};
