/**
 * Budget Recommendation Engine for PackGo
 * Pure deterministic rule-based allocation with ₹50 rounding and zero-remainder buffer guarantee.
 */

const DEFAULT_SHARES = {
  stay: 0.30,
  transport: 0.25,
  food: 0.20,
  activities: 0.10,
  shopping: 0.05,
  buffer: 0.10,
};

const MIN_SHARE = 0.03;
const MAX_SHARE = 0.45;

/**
 * Recommends budget allocation across 6 standard categories
 * @param {Object} params
 * @param {number} params.total - Total trip budget in INR
 * @param {number} [params.days=3] - Duration of trip in days
 * @param {number} [params.people=1] - Number of travelers
 * @param {string} [params.transportType] - vehicle, train, flight, bus, etc.
 * @param {string} [params.startingLocation] - Starting city/location
 * @param {string} [params.destination] - Destination city
 * @param {Array} [params.places=[]] - Planned places/activities
 * @param {Array} [params.tags=[]] - User interests or destination tags
 * @returns {Object} { categories, perPerson, shares, total, notes }
 */
function recommendBudget({
  total = 10000,
  days = 3,
  people = 1,
  transportType = "vehicle",
  startingLocation = "",
  destination = "",
  places = [],
  tags = [],
} = {}) {
  const safeTotal = Math.max(0, Math.round(Number(total) || 0));
  const safeDays = Math.max(1, Number(days) || 1);
  const safePeople = Math.max(1, Number(people) || 1);

  if (safeTotal === 0) {
    return {
      categories: { stay: 0, transport: 0, food: 0, activities: 0, shopping: 0, buffer: 0 },
      perPerson: { stay: 0, transport: 0, food: 0, activities: 0, shopping: 0, buffer: 0, total: 0 },
      shares: { ...DEFAULT_SHARES },
      total: 0,
      notes: ["Budget is zero."],
    };
  }

  const shares = { ...DEFAULT_SHARES };
  const notes = [];

  // Rule 1: Short trips (1-2 days) lower stay share
  if (safeDays <= 2) {
    shares.stay = Math.max(MIN_SHARE, shares.stay - 0.10);
    shares.activities += 0.05;
    shares.buffer += 0.05;
    notes.push("Adjusted for short duration (reduced accommodation share, boosted activities and buffer).");
  } else if (safeDays >= 7) {
    // Longer trips need slightly more stay comfort & laundry/supplies
    shares.stay = Math.min(MAX_SHARE, shares.stay + 0.04);
    shares.shopping = Math.max(MIN_SHARE, shares.shopping - 0.02);
    shares.buffer = Math.max(MIN_SHARE, shares.buffer - 0.02);
    notes.push("Extended duration: balanced accommodation and buffer for longer travel.");
  }

  // Rule 2: Transport mode / distance
  const mode = String(transportType || "").toLowerCase();
  const hasDistinctStart = Boolean(
    startingLocation &&
    destination &&
    startingLocation.trim().toLowerCase() !== destination.trim().toLowerCase()
  );

  if (mode === "flight" || mode === "air") {
    shares.transport = Math.min(MAX_SHARE, shares.transport + 0.10);
    shares.stay = Math.max(MIN_SHARE, shares.stay - 0.05);
    shares.shopping = Math.max(MIN_SHARE, shares.shopping - 0.05);
    notes.push("Flight travel detected: increased transportation allocation.");
  } else if (mode === "train" || hasDistinctStart) {
    shares.transport = Math.min(MAX_SHARE, shares.transport + 0.05);
    shares.shopping = Math.max(MIN_SHARE, shares.shopping - 0.05);
    notes.push("Inter-city transit allocated from starting location.");
  }

  // Rule 3: Trek / Adventure / Outdoor
  const tagList = [
    ...(Array.isArray(tags) ? tags : []),
    ...(Array.isArray(places) ? places.map((p) => p.category || p.name || "") : []),
  ].map((t) => String(t).toLowerCase());

  const isAdventure = tagList.some((t) =>
    ["adventure", "trek", "trekking", "hiking", "rafting", "safari", "scuba"].some((kw) => t.includes(kw))
  );

  if (isAdventure) {
    shares.activities = Math.min(MAX_SHARE, shares.activities + 0.08);
    shares.stay = Math.max(MIN_SHARE, shares.stay - 0.04);
    shares.buffer = Math.max(MIN_SHARE, shares.buffer - 0.04);
    notes.push("Adventure & outdoor activities prioritized with higher activity budget.");
  }

  // Rule 4: Group size
  if (safePeople >= 4) {
    shares.food = Math.min(MAX_SHARE, shares.food + 0.05);
    shares.stay = Math.max(MIN_SHARE, shares.stay - 0.03);
    shares.buffer = Math.max(MIN_SHARE, shares.buffer - 0.02);
    notes.push(`Group of ${safePeople}: food and group dining proportion increased.`);
  }

  // Clamp all shares strictly to [MIN_SHARE, MAX_SHARE]
  for (const cat of Object.keys(shares)) {
    shares[cat] = Math.max(MIN_SHARE, Math.min(MAX_SHARE, shares[cat]));
  }

  // Normalize shares so sum === 1.0
  const shareSum = Object.values(shares).reduce((a, b) => a + b, 0);
  for (const cat of Object.keys(shares)) {
    shares[cat] = shares[cat] / shareSum;
  }

  // Rounding to nearest ₹50 for the 5 non-buffer categories
  const categories = {
    stay: Math.round((shares.stay * safeTotal) / 50) * 50,
    transport: Math.round((shares.transport * safeTotal) / 50) * 50,
    food: Math.round((shares.food * safeTotal) / 50) * 50,
    activities: Math.round((shares.activities * safeTotal) / 50) * 50,
    shopping: Math.round((shares.shopping * safeTotal) / 50) * 50,
    buffer: 0,
  };

  // Buffer absorbs the remainder so sum(categories) === total ALWAYS
  let allocated = categories.stay + categories.transport + categories.food + categories.activities + categories.shopping;
  let remainder = safeTotal - allocated;

  // If remainder is negative (e.g. very small total where rounding exceeded total),
  // deduct in multiples of 50 from the largest category
  while (remainder < 0) {
    const highestNonBuffer = ["stay", "transport", "food", "activities", "shopping"].reduce((maxCat, cat) =>
      categories[cat] > categories[maxCat] ? cat : maxCat
    , "stay");

    if (categories[highestNonBuffer] >= 50) {
      categories[highestNonBuffer] -= 50;
      remainder += 50;
    } else {
      break;
    }
  }

  // Buffer gets the exact remainder
  categories.buffer = Math.max(0, remainder);

  // Guarantee exact sum constraint
  const currentSum = categories.stay + categories.transport + categories.food + categories.activities + categories.shopping + categories.buffer;
  if (currentSum !== safeTotal) {
    categories.buffer += (safeTotal - currentSum);
  }

  // Calculate perPerson amounts
  const perPerson = {
    stay: Math.round(categories.stay / safePeople),
    transport: Math.round(categories.transport / safePeople),
    food: Math.round(categories.food / safePeople),
    activities: Math.round(categories.activities / safePeople),
    shopping: Math.round(categories.shopping / safePeople),
    buffer: Math.round(categories.buffer / safePeople),
    total: Math.round(safeTotal / safePeople),
  };

  return {
    categories,
    perPerson,
    shares: Object.fromEntries(
      Object.entries(categories).map(([k, v]) => [k, safeTotal > 0 ? Number((v / safeTotal).toFixed(3)) : 0])
    ),
    total: safeTotal,
    people: safePeople,
    days: safeDays,
    notes,
  };
}

module.exports = {
  recommendBudget,
  DEFAULT_SHARES,
};
