const axios = require("axios");

// Amadeus Self-Service API client (flight/hotel search).
//
// HONEST STATUS — read before assuming this "works":
//   1. Written from Amadeus's published API reference (OAuth2
//      client_credentials flow, Flight Offers Search v2, Locations v1,
//      Hotel Search v1/v3) — the shapes match the docs as of this writing.
//   2. It has NOT been exercised against Amadeus's live or test servers.
//      No AMADEUS_CLIENT_ID/SECRET were available to test with, AND the
//      sandbox this was built in has network egress restricted to a fixed
//      allowlist that does not include api.amadeus.com or
//      test.api.amadeus.com — so a live call could not be made even with
//      credentials.
//   3. "Matches the published API docs" and "confirmed working against the
//      live API" are different claims. Treat this as a solid first draft to
//      validate against a real Amadeus sandbox account, not as verified.

const BASE_URL = process.env.AMADEUS_BASE_URL || "https://test.api.amadeus.com";
const REQUEST_TIMEOUT_MS = 10000;

class AmadeusError extends Error {
  constructor(message, { code, status, cause } = {}) {
    super(message);
    this.name = "AmadeusError";
    this.code = code; // "CONFIG" | "UPSTREAM" | "NETWORK"
    this.status = status;
    this.cause = cause;
  }
}

function isConfigured() {
  return Boolean(
    process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET,
  );
}

// In-process token cache. Amadeus access tokens are short-lived (~30 min);
// this avoids a fresh OAuth round trip on every request. Per-process only —
// each server instance would fetch its own token, and it won't survive a
// restart. Fine for a single instance; revisit before scaling horizontally.
let cachedToken = null;
let cachedTokenExpiresAt = 0;

async function getAccessToken() {
  if (!isConfigured()) {
    throw new AmadeusError(
      "Amadeus credentials are not configured (set AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET)",
      { code: "CONFIG" },
    );
  }

  const now = Date.now();
  if (cachedToken && now < cachedTokenExpiresAt) {
    return cachedToken;
  }

  try {
    const { data } = await axios.post(
      `${BASE_URL}/v1/security/oauth2/token`,
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.AMADEUS_CLIENT_ID,
        client_secret: process.env.AMADEUS_CLIENT_SECRET,
      }).toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: REQUEST_TIMEOUT_MS,
      },
    );
    cachedToken = data.access_token;
    cachedTokenExpiresAt = now + (data.expires_in - 60) * 1000;
    return cachedToken;
  } catch (err) {
    cachedToken = null;
    cachedTokenExpiresAt = 0;
    throw new AmadeusError("Failed to authenticate with Amadeus", {
      code: err.response ? "UPSTREAM" : "NETWORK",
      status: err.response?.status,
      cause: err,
    });
  }
}

async function amadeusGet(path, params = {}) {
  const token = await getAccessToken();
  try {
    const { data } = await axios.get(`${BASE_URL}${path}`, {
      params,
      headers: { Authorization: `Bearer ${token}` },
      timeout: REQUEST_TIMEOUT_MS,
    });
    return data;
  } catch (err) {
    if (err.response) {
      const upstreamMsg =
        err.response.data?.errors?.[0]?.detail ||
        err.response.data?.error_description ||
        `Amadeus request failed with status ${err.response.status}`;
      throw new AmadeusError(upstreamMsg, {
        code: "UPSTREAM",
        status: err.response.status,
        cause: err,
      });
    }
    if (err instanceof AmadeusError) throw err;
    throw new AmadeusError(err.message || "Could not reach Amadeus", {
      code: "NETWORK",
      cause: err,
    });
  }
}

/**
 * Resolve free text (e.g. "Paris", "Goa") to an IATA code. Amadeus's search
 * endpoints need airport/city codes, not free text. Returns null on no
 * match rather than throwing — "no match" is expected, not an error.
 */
async function resolveLocationCode(keyword, { subType = "AIRPORT,CITY" } = {}) {
  const data = await amadeusGet("/v1/reference-data/locations", {
    keyword: (keyword || "").trim(),
    subType,
    "page[limit]": 1,
  });
  const first = data?.data?.[0];
  if (!first) return null;
  return {
    iataCode: first.iataCode,
    name: first.name,
    cityCode: first.address?.cityCode || first.iataCode,
    countryCode: first.address?.countryCode,
  };
}

async function searchFlightOffers({
  originCode,
  destinationCode,
  departureDate,
  adults = 1,
  maxResults = 10,
}) {
  const data = await amadeusGet("/v2/shopping/flight-offers", {
    originLocationCode: originCode,
    destinationLocationCode: destinationCode,
    departureDate,
    adults,
    max: maxResults,
    currencyCode: "USD",
  });
  return Array.isArray(data?.data) ? data.data : [];
}

module.exports = {
  isConfigured,
  resolveLocationCode,
  searchFlightOffers,
  AmadeusError,
};
