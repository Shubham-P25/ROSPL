/**
 * planner/packing.js
 * Rule-based packing list generator based on destination, weather, and activities.
 */
function generatePackingList(weather, tripRequest = {}, places = []) {
  const items = [];
  const added = new Set();

  function addItem(item, reason) {
    if (!added.has(item.toLowerCase())) {
      items.push({ item, reason });
      added.add(item.toLowerCase());
    }
  }

  // 1. Universal travel essentials
  addItem(
    "Passport / Government ID & travel documents",
    "Essential for travel verification and hotel check-in",
  );
  addItem(
    "Phone charger and portable power bank",
    "Keeping devices charged during long day tours",
  );
  addItem(
    "Basic medicine kit (painkillers, antacids, bandages)",
    "Health precautions and travel wellness",
  );

  // 2. Trip duration rules
  const days = tripRequest.days || 1;
  if (days > 5) {
    addItem(
      "Laundry bag & extra travel detergent",
      "Convenient clothing management for trips over 5 days",
    );
  }

  // 3. Category-based rules from selected places
  const hasReligious = places.some((p) => p.category === "religious");
  if (hasReligious) {
    addItem(
      "Modest clothing (scarf / temple-appropriate attire)",
      "Respectful dress code for visits to holy places and temples",
    );
  }

  const hasNatureOrAdventure = places.some(
    (p) => p.category === "nature" || p.category === "adventure",
  );
  if (hasNatureOrAdventure) {
    addItem(
      "Comfortable walking shoes or hiking sneakers",
      "Support for walking, nature trails, and fortress stairs",
    );
  }

  const hasBeach = places.some(
    (p) =>
      p.category === "nature" &&
      (p.name.toLowerCase().includes("beach") ||
        (p.description && p.description.toLowerCase().includes("beach"))),
  );
  if (hasBeach) {
    addItem(
      "Quick-dry towel and swimwear",
      "Coastal beach activities and relaxation",
    );
  }

  // 4. Weather-based rules
  if (weather) {
    const rainProb =
      weather.precipitationProbabilityMax ?? (weather.rainProbability || 0);
    const maxTemp = weather.temperatureMax ?? (weather.maxTemp || 25);
    const minTemp = weather.temperatureMin ?? (weather.minTemp || 20);

    if (rainProb > 40) {
      addItem(
        "Compact umbrella or light raincoat",
        `High chance of rainfall (${rainProb}%) forecast for your destination`,
      );
    }

    if (maxTemp > 32) {
      addItem(
        "Broad-spectrum sunscreen, UV sunglasses & sun hat",
        `High daytime temperatures expected (up to ${Math.round(maxTemp)}°C)`,
      );
      addItem(
        "Reusable insulated water bottle",
        "Staying hydrated in hot weather",
      );
    }

    if (minTemp < 12) {
      addItem(
        "Warm jacket or fleece sweater",
        `Chilly evening temperatures forecast (low of ${Math.round(minTemp)}°C)`,
      );
    }
  } else {
    // Default sun protection for warm regions
    addItem(
      "Sunscreen & sunglasses",
      "Daytime sun protection during sightseeing",
    );
    addItem("Reusable water bottle", "General hydration while travelling");
  }

  return items;
}

module.exports = {
  generatePackingList,
};
