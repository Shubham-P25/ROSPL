/**
 * planner/cluster.js
 * Deterministic k-means clustering with day-capacity balancing.
 */
const { haversineKm } = require("../lib/haversine");

function clusterIntoDays(places, k, maxPerDay = 5) {
  if (!places || places.length === 0) return [];
  if (k <= 1 || places.length <= 1) return [places];

  // If there are fewer places than days k, cap k to places.length
  const actualK = Math.min(k, places.length);

  // 1. Farthest-first initialization starting from top-scored place (deterministic)
  const centers = [places[0]];
  while (centers.length < actualK) {
    let best = null;
    let bestD = -1;
    for (const p of places) {
      const d = Math.min(...centers.map((c) => haversineKm(p, c)));
      if (d > bestD) {
        bestD = d;
        best = p;
      }
    }
    centers.push(best || places[centers.length]);
  }

  let cur = centers.map((c) => ({ lat: c.lat, lng: c.lng }));
  let groups = [];

  // 2. 10 iterations of k-means
  for (let iter = 0; iter < 10; iter++) {
    groups = Array.from({ length: actualK }, () => []);
    for (const p of places) {
      let bi = 0;
      let bd = Infinity;
      cur.forEach((c, i) => {
        const d = haversineKm(p, c);
        if (d < bd) {
          bd = d;
          bi = i;
        }
      });
      groups[bi].push(p);
    }
    cur = groups.map((g, i) =>
      g.length
        ? {
            lat: g.reduce((s, p) => s + p.lat, 0) / g.length,
            lng: g.reduce((s, p) => s + p.lng, 0) / g.length,
          }
        : cur[i],
    );
  }

  // 3. Balance: move the farthest members of oversized groups to the nearest group with room
  for (const g of groups) {
    while (g.length > maxPerDay) {
      const ci = groups.indexOf(g);
      g.sort((a, b) => haversineKm(b, cur[ci]) - haversineKm(a, cur[ci]));
      const moved = g.shift();
      const target = groups
        .map((gg, i) => ({ gg, i }))
        .filter(({ gg }) => gg !== g && gg.length < maxPerDay)
        .sort(
          (a, b) => haversineKm(moved, cur[a.i]) - haversineKm(moved, cur[b.i]),
        )[0];

      if (!target) {
        g.push(moved);
        break;
      }
      target.gg.push(moved);
    }
  }

  // Ensure groups are distributed into exactly k buckets if requested
  const nonZeroGroups = groups.filter((g) => g.length > 0);
  return nonZeroGroups;
}

module.exports = {
  clusterIntoDays,
};
