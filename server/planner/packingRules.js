/**
 * Smart Packing Recommendation Engine for PackGo
 * Generates tailored packing checklists based on weather, destination climate, trip length, group size, and activities.
 */

const BEACH_DESTINATIONS = [
  "goa", "gokarna", "andaman", "pondicherry", "kovalam", "varkala", "alibaug",
  "diu", "digha", "puri", "havelock", "neil island", "tarkarli", "kashid",
  "daman", "udupi", "mangalore", "kannur", "lakshadweep"
];

const COLD_DESTINATIONS = [
  "manali", "shimla", "kashmir", "gulmarg", "leh", "ladakh", "spiti", "auli",
  "sikkim", "gangtok", "darjeeling", "mussoorie", "nainital", "dharamshala",
  "dalhousie", "kullu", "kasol", "pahalgam", "sonamarg", "munsiari", "tawang"
];

const DESERT_DESTINATIONS = [
  "jaisalmer", "bikaner", "jodhpur", "pushkar", "kutch", "rann of kutch", "barmer"
];

const RELIGIOUS_DESTINATIONS = [
  "varanasi", "tirupati", "amritsar", "haridwar", "rishikesh", "puri", "madurai",
  "shirdi", "kedarnath", "badrinath", "dwarka", "somnath", "vaishno devi",
  "ayodhya", "mathura", "vrindavan", "bodh gaya", "rameshwaram", "ujjain"
];

/**
 * Recommends packing items with categories and clear justifications
 * @param {Object} params
 * @param {string} params.destination
 * @param {Object} [params.weather]
 * @param {number} [params.days=3]
 * @param {number} [params.people=1]
 * @param {Array} [params.interests=[]]
 * @param {Array} [params.places=[]]
 * @returns {Array<{name: string, category: string, reason: string, source: string}>}
 */
function recommendPacking({
  destination = "",
  weather = null,
  days = 3,
  people = 1,
  interests = [],
  places = [],
} = {}) {
  const destLower = String(destination || "").toLowerCase();
  const safeDays = Math.max(1, Number(days) || 1);
  const safePeople = Math.max(1, Number(people) || 1);

  const tags = new Set();
  const placeNames = places.map((p) => String(p.name || "").toLowerCase());
  const placeCategories = places.map((p) => String(p.category || "").toLowerCase());
  const interestList = (Array.isArray(interests) ? interests : []).map((i) => String(i).toLowerCase());

  // 1. Weather extraction
  const minTemp = Number(weather?.temperatureMin ?? weather?.minTemp ?? 20);
  const maxTemp = Number(weather?.temperatureMax ?? weather?.maxTemp ?? 28);
  const rainProb = Number(weather?.precipitationProbabilityMax ?? weather?.rainProbability ?? 10);

  // Scenario 1: Beach
  if (
    BEACH_DESTINATIONS.some((d) => destLower.includes(d)) ||
    interestList.some((i) => i.includes("beach") || i.includes("coastal")) ||
    placeNames.some((n) => n.includes("beach") || n.includes("coast")) ||
    placeCategories.some((c) => c.includes("beach"))
  ) {
    tags.add("beach");
  }

  // Scenario 2: Snow / Cold
  if (
    COLD_DESTINATIONS.some((d) => destLower.includes(d)) ||
    minTemp <= 10 ||
    interestList.some((i) => i.includes("snow") || i.includes("ski"))
  ) {
    tags.add("cold");
    if (minTemp <= 4 || destLower.includes("gulmarg") || destLower.includes("leh") || destLower.includes("spiti") || destLower.includes("auli")) {
      tags.add("extreme_cold");
    }
  }

  // Scenario 3: Hot / Tropical
  if (maxTemp >= 33 || (!tags.has("cold") && maxTemp >= 30)) {
    tags.add("hot");
  }

  // Scenario 4: Rain
  if (rainProb > 35 || interestList.some((i) => i.includes("monsoon"))) {
    tags.add("rain");
  }

  // Scenario 5: Desert
  if (DESERT_DESTINATIONS.some((d) => destLower.includes(d))) {
    tags.add("desert");
  }

  // Scenario 6: Mountain / Trekking
  if (
    interestList.some((i) => ["adventure", "trek", "trekking", "hiking"].some((kw) => i.includes(kw))) ||
    placeCategories.some((c) => c.includes("adventure") || c.includes("trail")) ||
    placeNames.some((n) => ["peak", "trail", "pass", "trek", "cliff"].some((kw) => n.includes(kw)))
  ) {
    tags.add("trek");
  }

  // Scenario 7: Religious / Spiritual
  if (
    RELIGIOUS_DESTINATIONS.some((d) => destLower.includes(d)) ||
    interestList.some((i) => ["religious", "spiritual", "temple"].some((kw) => i.includes(kw))) ||
    placeCategories.some((c) => c.includes("religious")) ||
    placeNames.some((n) => ["temple", "mandir", "ghat", "mosque", "church", "ashram"].some((kw) => n.includes(kw)))
  ) {
    tags.add("religious");
  }

  const items = [];
  const seen = new Set();

  function addItem(name, category, reason) {
    const key = name.trim().toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      items.push({
        name: name.trim(),
        category,
        reason,
        source: "recommended",
      });
    }
  }

  // Universal Essentials (scaled for trip length)
  addItem(
    "Government ID & Travel Tickets",
    "Documents",
    "Mandatory for boarding, check-ins, and security checkpoints"
  );
  addItem(
    "Phone Charger & High-Capacity Power Bank",
    "Electronics",
    "Keeps navigation and photography devices operational throughout day trips"
  );
  addItem(
    "Personal Toiletries Kit",
    "Toiletries",
    "Toothbrush, toothpaste, shampoo, and personal hygiene essentials"
  );
  addItem(
    "Basic Travel First-Aid & Pain Relief",
    "Medicine",
    "Essential medication for headaches, antacids, band-aids, and motion comfort"
  );

  // Clothing scaling by duration
  const tshirtCount = Math.min(safeDays, 7) + 1;
  addItem(
    `T-Shirts / Tops (×${tshirtCount})`,
    "Clothing",
    `Recommended supply for ${safeDays} days of comfortable daytime exploration`
  );
  const bottomCount = Math.max(2, Math.min(Math.ceil(safeDays / 2), 4));
  addItem(
    `Comfortable Pants / Bottoms (×${bottomCount})`,
    "Clothing",
    `Versatile bottoms for ${safeDays} days of travel and sightseeing`
  );

  if (safeDays > 5) {
    addItem(
      "Travel Laundry Detergent & Dirty Clothes Bag",
      "Other",
      `Keeps luggage organized and enables mid-trip washing for trips of ${safeDays} days`
    );
  }

  // Scenario: Beach
  if (tags.has("beach")) {
    addItem("Swimwear / Boardshorts", "Clothing", "Ideal for ocean swimming and beach recreation");
    addItem("Fast-Drying Microfiber Beach Towel", "Other", "Lightweight, compact towel for beach days");
    addItem("Waterproof Sandals / Flip-Flops", "Clothing", "Convenient footwear for sandy shores and waterfront walks");
    addItem("Broad Spectrum Sunscreen SPF 50+", "Toiletries", "UV sun protection against harsh coastal glare");
    addItem("Polarized UV Sunglasses", "Other", "Protects eyes from strong reflective marine sunlight");
    addItem("Wide-Brim Sun Hat / Cap", "Clothing", "Shields face and neck from midday sun exposure");
    addItem("Waterproof Dry Bag / Phone Pouch", "Electronics", "Keeps mobile phone and valuables dry during coastal activities");
    addItem("Soothing Aloe Vera / After-Sun Gel", "Toiletries", "Hydrates and cools sun-exposed coastal skin");
  }

  // Scenario: Cold
  if (tags.has("cold")) {
    addItem("Thermal Innerwear (Top & Bottom Set)", "Clothing", `Thermal base layer for chilly conditions (low of ~${Math.round(minTemp)}°C)`);
    addItem("Warm Fleece Jacket / Windcheater", "Clothing", "Insulating mid-layer for mountain breezes");
    addItem("Insulated Warm Beanie & Scarf", "Clothing", "Keeps head and ears protected from cold wind");
    addItem("Warm Woolen Socks (2-3 pairs)", "Clothing", "Maintains foot warmth during evening temperatures");
    addItem("Rich Cold Cream & Lip Balm with SPF", "Toiletries", "Prevents skin cracking and dry lips in crisp mountain air");
    addItem("Touchscreen-Friendly Warm Gloves", "Clothing", "Enables smartphone photography while keeping fingers warm");
  }

  // Scenario: Extreme Cold
  if (tags.has("extreme_cold")) {
    addItem("Heavy Down Feather Parka / Snow Jacket", "Clothing", "Sub-zero and high-altitude thermal insulation");
    addItem("Waterproof Snow Boots with Traction", "Clothing", "Prevents slipping on snow, frost, and icy mountain terrain");
  }

  // Scenario: Hot
  if (tags.has("hot")) {
    addItem("Lightweight Breathable Cotton Clothes", "Clothing", `Keeps cool during peak daytime heat (~${Math.round(maxTemp)}°C)`);
    addItem("Oral Rehydration Salts (ORS) & Electrolytes", "Medicine", "Vital for preventing dehydration and heat exhaustion");
    addItem("Insulated Stainless Steel Water Bottle", "Other", "Maintains chilled drinking water throughout the day");
    addItem("Sun Protection Visor / Cotton Cap", "Clothing", "Protects head from direct overhead solar heating");
  }

  // Scenario: Rain
  if (tags.has("rain")) {
    addItem("Compact Windproof Umbrella", "Other", `High chance of precipitation forecast (${rainProb}%)`);
    addItem("Lightweight Raincoat / Poncho", "Clothing", "Hands-free waterproof protection for walking tours");
    addItem("Waterproof Backpack Cover", "Other", "Protects electronics and luggage contents during downpours");
    addItem("Spare Footwear / Quick-Dry Shoes", "Clothing", "Ensures dry footwear if soaked by unexpected rain");
  }

  // Scenario: Desert
  if (tags.has("desert")) {
    addItem("Cotton Scarf / Shemagh Wrap", "Clothing", "Shields mouth and neck from desert winds and blowing sand");
    addItem("Lubricating Eye Drops", "Medicine", "Relieves dry eyes caused by arid desert air and dust");
    addItem("Deep Moisturizing Lotion", "Toiletries", "Counters rapid skin drying in low-humidity desert climate");
  }

  // Scenario: Trek / Adventure
  if (tags.has("trek")) {
    addItem("Sturdy Trekking Shoes with Ankle Grip", "Clothing", "Provides traction on rocky trails and unpaved terrain");
    addItem("Lightweight 15-20L Sightseeing Daypack", "Other", "Carries water, snacks, and extra layers hands-free");
    addItem("Energy Bars / Trail Nut Mix", "Other", "Quick calories and sustained stamina during long outdoor walks");
    addItem("Compact Emergency Flashlight / Headlamp", "Electronics", "Essential backup illumination for evening trails");
  }

  // Scenario: Religious
  if (tags.has("religious")) {
    addItem("Modest Traditional Attire (Temple Scarf/Dupatta)", "Clothing", "Respects cultural dress expectations at shrines and holy sites");
    addItem("Slip-On Socks for Hot Temple Marble", "Clothing", "Protects bare feet when walking on sun-baked temple courtyard stone");
    addItem("Slip-On Shoes / Easy Footwear", "Clothing", "Quickly removable at temple shoe deposit stands");
  }

  // Scenario: Group Travel
  if (safePeople > 1) {
    addItem(
      "Multi-Port Power Strip / Extension Board",
      "Electronics",
      `Convenient charging for ${safePeople} travelers with limited hotel wall sockets`
    );
    addItem(
      "Shared Group First-Aid Essentials",
      "Medicine",
      `Collective wellness supply for group of ${safePeople}`
    );
  }

  return items;
}

module.exports = {
  recommendPacking,
  BEACH_DESTINATIONS,
  COLD_DESTINATIONS,
  DESERT_DESTINATIONS,
  RELIGIOUS_DESTINATIONS,
};
