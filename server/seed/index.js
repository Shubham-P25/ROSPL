/**
 * seed/index.js
 * Loads curated seed places for popular destinations.
 */
const fs = require("fs");
const path = require("path");

const SEED_MAP = {
  jaipur: path.join(__dirname, "destinations", "jaipur.json"),
  goa: path.join(__dirname, "destinations", "goa.json"),
  varanasi: path.join(__dirname, "destinations", "varanasi.json"),
};

function normalizeCityName(cityName = "") {
  return cityName.trim().toLowerCase().split(",")[0].trim();
}

function getSeedPlaces(cityName) {
  const norm = normalizeCityName(cityName);
  const filePath = SEED_MAP[norm];
  if (!filePath || !fs.existsSync(filePath)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`Failed to read seed file for ${cityName}:`, err.message);
    return [];
  }
}

function hasSeedData(cityName) {
  const norm = normalizeCityName(cityName);
  return Boolean(SEED_MAP[norm] && fs.existsSync(SEED_MAP[norm]));
}

module.exports = {
  getSeedPlaces,
  hasSeedData,
  normalizeCityName,
};
