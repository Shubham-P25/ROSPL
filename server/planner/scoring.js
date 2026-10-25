/**
 * planner/scoring.js
 * Pure scoring function and deduplication.
 */
const { haversineKm } = require("../lib/haversine");

function normalizeName(name = "") {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function areNamesSimilar(nameA, nameB) {
  const a = normalizeName(nameA);
  const b = normalizeName(nameB);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function deduplicatePlaces(places) {
  const result = [];
  for (const place of places) {
    const isDuplicate = result.some((existing) => {
      // 1. Exact or contained normalized name match
      if (areNamesSimilar(existing.name, place.name)) {
        return true;
      }
      // 2. Physical proximity within 50 meters (0.05 km) with similar name
      const distance = haversineKm(existing, place);
      if (distance < 0.05) {
        return true;
      }
      return false;
    });

    if (!isDuplicate) {
      result.push(place);
    }
  }
  return result;
}

function scorePlaces(places, interests = []) {
  if (!Array.isArray(places) || places.length === 0) {
    return [];
  }
  const want = new Set(interests);

  const scored = places
    .map((p) => {
      const interest = want.has(p.category) ? 1 : 0.35;
      const rating = (p.rating ?? 3.5) / 5;
      const pop = p.popularity ?? 0.3;
      const score = 0.45 * interest + 0.3 * rating + 0.25 * pop;
      return {
        ...p,
        score: Number(score.toFixed(4)),
      };
    })
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)); // deterministic tie-break

  return deduplicatePlaces(scored);
}

module.exports = {
  scorePlaces,
  deduplicatePlaces,
  normalizeName,
};
