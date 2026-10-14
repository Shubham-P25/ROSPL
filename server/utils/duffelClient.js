const axios = require("axios");

// Duffel Flight API client (flight search).
// Uses Duffel API v2 (https://duffel.com/docs/api) with FLIGHT_API_KEY
const BASE_URL = process.env.DUFFEL_BASE_URL || "https://api.duffel.com";
const REQUEST_TIMEOUT_MS = 15000;

class DuffelError extends Error {
  constructor(message, { code, status, cause } = {}) {
    super(message);
    this.name = "DuffelError";
    this.code = code; // "CONFIG" | "UPSTREAM" | "NETWORK"
    this.status = status;
    this.cause = cause;
  }
}

function isConfigured() {
  return Boolean(process.env.FLIGHT_API_KEY);
}

function getHeaders() {
  if (!isConfigured()) {
    throw new DuffelError(
      "Duffel credentials are not configured (set FLIGHT_API_KEY in server/.env)",
      { code: "CONFIG" },
    );
  }

  return {
    Authorization: `Bearer ${process.env.FLIGHT_API_KEY}`,
    "Duffel-Version": "v2",
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

/**
 * Resolve free text (e.g. "Paris", "Goa", "Mumbai") or 3-letter IATA code to an IATA code.
 * Duffel flight offer search requires valid IATA airport/city codes.
 */
async function resolveLocationCode(keyword) {
  if (!keyword || !keyword.trim()) return null;
  const cleanKeyword = keyword.trim();

  // If already a 3-letter IATA code, return it directly
  if (/^[A-Za-z]{3}$/.test(cleanKeyword)) {
    return {
      iataCode: cleanKeyword.toUpperCase(),
      name: cleanKeyword.toUpperCase(),
    };
  }

  const headers = getHeaders();
  try {
    const { data } = await axios.get(`${BASE_URL}/places/suggestions`, {
      params: { query: cleanKeyword },
      headers,
      timeout: REQUEST_TIMEOUT_MS,
    });

    const suggestions = data?.data || [];
    if (!suggestions.length) return null;

    // Prefer city-level match first, then airport match
    const cityMatch = suggestions.find(
      (p) => p.type === "city" && (p.iata_code || p.iata_city_code),
    );
    const airportMatch = suggestions.find(
      (p) => p.iata_city_code || p.iata_code,
    );
    const selected = cityMatch || airportMatch || suggestions[0];

    const iataCode = selected.iata_city_code || selected.iata_code;
    if (!iataCode) return null;

    return {
      iataCode: iataCode.toUpperCase(),
      name: selected.name || selected.city_name || cleanKeyword,
      cityName: selected.city_name,
      countryCode: selected.iata_country_code,
      type: selected.type,
      id: selected.id,
    };
  } catch (err) {
    if (err.response) {
      const upstreamMsg =
        err.response.data?.errors?.[0]?.message ||
        err.response.data?.errors?.[0]?.detail ||
        `Duffel places search failed with status ${err.response.status}`;
      throw new DuffelError(upstreamMsg, {
        code: "UPSTREAM",
        status: err.response.status,
        cause: err,
      });
    }
    if (err instanceof DuffelError) throw err;
    throw new DuffelError(err.message || "Could not reach Duffel API", {
      code: "NETWORK",
      cause: err,
    });
  }
}

/**
 * Search for flight offers on Duffel
 */
async function searchFlightOffers({
  originCode,
  destinationCode,
  departureDate,
  adults = 1,
  cabinClass = "economy",
  maxResults = 20,
}) {
  const headers = getHeaders();
  try {
    const { data } = await axios.post(
      `${BASE_URL}/air/offer_requests?return_offers=true`,
      {
        data: {
          slices: [
            {
              origin: originCode,
              destination: destinationCode,
              departure_date: departureDate,
            },
          ],
          passengers: Array.from({ length: adults }, () => ({ type: "adult" })),
          cabin_class: cabinClass,
        },
      },
      {
        headers,
        timeout: REQUEST_TIMEOUT_MS,
      },
    );

    const offers = data?.data?.offers || [];
    return Array.isArray(offers) ? offers.slice(0, maxResults) : [];
  } catch (err) {
    if (err.response) {
      const upstreamMsg =
        err.response.data?.errors?.[0]?.message ||
        err.response.data?.errors?.[0]?.detail ||
        `Duffel flight search failed with status ${err.response.status}`;
      throw new DuffelError(upstreamMsg, {
        code: "UPSTREAM",
        status: err.response.status,
        cause: err,
      });
    }
    if (err instanceof DuffelError) throw err;
    throw new DuffelError(
      err.message || "Could not reach Duffel flight service",
      {
        code: "NETWORK",
        cause: err,
      },
    );
  }
}

module.exports = {
  isConfigured,
  resolveLocationCode,
  searchFlightOffers,
  DuffelError,
};
