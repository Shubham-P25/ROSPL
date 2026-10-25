/**
 * planner/budget.js
 * Rule-based budget split and cost verification.
 */
const SPLIT = {
  stay: 0.4,
  food: 0.25,
  transport: 0.15,
  activities: 0.15,
  buffer: 0.05,
};

const CATEGORY_DEFAULT_EST_COST = {
  culture: 250,
  nature: 100,
  food: 400,
  shopping: 300,
  adventure: 600,
  nightlife: 800,
  religious: 50,
  other: 150,
};

function splitBudget(total) {
  const out = {};
  const validTotal = Math.max(0, Number(total) || 0);
  for (const [k, v] of Object.entries(SPLIT)) {
    out[k] = Math.round(validTotal * v);
  }
  return out;
}

function verifyBudget(selectedPlaces = [], budgetActivities = 0) {
  const warnings = [];
  let totalEstCost = 0;
  let hasApproximateEstimates = false;

  for (const place of selectedPlaces) {
    if (place.estCost !== undefined && place.estCost !== null) {
      totalEstCost += place.estCost;
    } else {
      const defaultCost = CATEGORY_DEFAULT_EST_COST[place.category] || 150;
      totalEstCost += defaultCost;
      hasApproximateEstimates = true;
    }
  }

  if (hasApproximateEstimates) {
    warnings.push(
      "Some activity admission fees are estimated based on regional category averages.",
    );
  }

  if (totalEstCost > budgetActivities) {
    warnings.push(
      `Estimated activity costs (₹${totalEstCost}) exceed your allocated activities budget (₹${budgetActivities}). Consider prioritizing free or lower-cost sights.`,
    );
  }

  return {
    totalEstCost,
    warnings,
  };
}

module.exports = {
  SPLIT,
  CATEGORY_DEFAULT_EST_COST,
  splitBudget,
  verifyBudget,
};
