/**
 * planner/order.js
 * Nearest-neighbour route ordering followed by 2-opt TSP optimization.
 */
const { haversineKm } = require("../lib/haversine");

const pathKm = (r) =>
  r.slice(1).reduce((s, p, i) => s + haversineKm(r[i], p), 0);

function orderDay(places) {
  if (!Array.isArray(places) || places.length <= 2) {
    return places || [];
  }

  const left = [...places];
  const route = [left.shift()]; // start from the highest-scored place

  while (left.length > 0) {
    const last = route[route.length - 1];
    left.sort((a, b) => haversineKm(last, a) - haversineKm(last, b));
    route.push(left.shift());
  }

  let improved = true;
  let iterations = 0;
  const MAX_ITERATIONS = 50;

  while (improved && iterations < MAX_ITERATIONS) {
    improved = false;
    iterations++;
    for (let i = 1; i < route.length - 1; i++) {
      for (let j = i + 1; j < route.length; j++) {
        const cand = [
          ...route.slice(0, i),
          ...route.slice(i, j + 1).reverse(),
          ...route.slice(j + 1),
        ];
        if (pathKm(cand) + 1e-9 < pathKm(route)) {
          route.splice(0, route.length, ...cand);
          improved = true;
        }
      }
    }
  }

  return route;
}

module.exports = {
  orderDay,
  pathKm,
};
