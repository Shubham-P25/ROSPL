/**
 * planner/index.js
 * Pure Planner Core: orchestrates scoring, clustering, route ordering,
 * slot assignment, budget splitting, and packing recommendation.
 * Does ZERO I/O, HTTP, or database access.
 */
const { scorePlaces } = require("./scoring");
const { clusterIntoDays } = require("./cluster");
const { orderDay } = require("./order");
const { assignTimeSlots } = require("./slots");
const { splitBudget, verifyBudget } = require("./budget");
const { generatePackingList } = require("./packing");
const { PlanSchema } = require("../schemas/plan");
const { PlanRequestSchema } = require("../schemas/request");

const STOPS_PER_DAY = {
  relaxed: 3,
  normal: 4,
  packed: 5,
};

function generatePlan(
  rawRequest,
  rawPlaces = [],
  weather = null,
  options = {},
) {
  // 1. Validate request input
  const request = PlanRequestSchema.parse(rawRequest);
  const warnings = [];
  const degraded = Array.isArray(options.degraded) ? [...options.degraded] : [];

  // 2. Score and deduplicate places
  const scored = scorePlaces(rawPlaces, request.interests);

  // 3. Determine capacity
  const maxStopsPerDay = STOPS_PER_DAY[request.pace] || 4;
  const capacity = request.days * maxStopsPerDay;

  let selected = scored.slice(0, capacity);

  if (selected.length === 0) {
    warnings.push(
      `No specific places found for "${request.destination}". Try selecting additional interests or a nearby hub city.`,
    );
  } else if (selected.length < request.days) {
    warnings.push(
      `Fewer attractions available (${selected.length}) than travel days (${request.days}). Some days will feature more leisure time.`,
    );
  }

  // 4. Cluster into days
  const dayGroups = clusterIntoDays(selected, request.days, maxStopsPerDay);

  // 5. Order days, assign time slots, calculate day costs
  const days = [];
  const placesSnapshot = {};

  // Store all selected places in snapshot map
  for (const place of selected) {
    placesSnapshot[place.id] = place;
  }

  for (let dayIdx = 0; dayIdx < request.days; dayIdx++) {
    const dayPlaces = dayGroups[dayIdx] || [];
    const orderedPlaces = orderDay(dayPlaces);
    const dayItems = assignTimeSlots(orderedPlaces);

    const dayCost = orderedPlaces.reduce((sum, p) => sum + (p.estCost || 0), 0);

    days.push({
      day: dayIdx + 1,
      items: dayItems,
      estCost: dayCost,
    });
  }

  // 6. Budget
  const budget = splitBudget(request.budget);
  const budgetVerification = verifyBudget(selected, budget.activities);
  warnings.push(...budgetVerification.warnings);

  // 7. Packing
  const packing = generatePackingList(weather, request, selected);

  // 8. Assemble plan snapshot
  const planData = {
    request,
    days,
    places: placesSnapshot,
    budget,
    weather: weather || undefined,
    packing,
    warnings,
    degraded,
    generatedAt: new Date().toISOString(),
    schemaVersion: 1,
  };

  // 9. Contract validation
  return PlanSchema.parse(planData);
}

module.exports = {
  generatePlan,
  STOPS_PER_DAY,
};
