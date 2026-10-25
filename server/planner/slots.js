/**
 * planner/slots.js
 * Assigns chronological slots (morning, afternoon, evening) based on
 * cumulative visit durations and travel time.
 */
const { haversineKm, travelMinutes } = require("../lib/haversine");

function assignTimeSlots(orderedPlaces) {
  if (!Array.isArray(orderedPlaces) || orderedPlaces.length === 0) {
    return [];
  }

  // Start at 09:00 AM (minutes from midnight: 9 * 60 = 540)
  let currentClockMinutes = 9 * 60;
  const items = [];

  for (let i = 0; i < orderedPlaces.length; i++) {
    const place = orderedPlaces[i];
    let travelFromPrev = 0;

    if (i > 0) {
      const prevPlace = orderedPlaces[i - 1];
      const distKm = haversineKm(prevPlace, place);
      travelFromPrev = travelMinutes(distKm);
      currentClockMinutes += travelFromPrev;
    }

    // Insert 60 min lunch break around 13:00 (780 mins)
    if (currentClockMinutes >= 13 * 60 && currentClockMinutes < 14 * 60) {
      currentClockMinutes += 60;
    }

    const currentHour = currentClockMinutes / 60;
    let slot = "morning";
    if (currentHour >= 17) {
      slot = "evening";
    } else if (currentHour >= 12) {
      slot = "afternoon";
    }

    items.push({
      placeId: place.id,
      slot,
      travelMinutesFromPrev: travelFromPrev,
    });

    // Advance clock by visit duration
    const visitDuration = place.visitMinutes || 90;
    currentClockMinutes += visitDuration;
  }

  return items;
}

module.exports = {
  assignTimeSlots,
};
