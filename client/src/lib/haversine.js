/**
 * Great-circle distance between two geographic coordinates in kilometers.
 */
export function haversineKm(a, b) {
  if (
    !a ||
    !b ||
    a.lat === undefined ||
    a.lng === undefined ||
    b.lat === undefined ||
    b.lng === undefined
  ) {
    return 0;
  }
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Estimated travel time in minutes based on distance.
 * Assumes urban transit speed of ~25 km/h + 5 min buffer.
 */
export function travelMinutes(km) {
  if (!km || km <= 0) return 0;
  return Math.round((km / 25) * 60) + 5;
}

