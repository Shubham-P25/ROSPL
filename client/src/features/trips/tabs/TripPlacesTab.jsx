import React, { useState, useEffect } from "react";
import Badge from "../../../components/Badge";
import EmptyState from "../../../components/EmptyState";
import MapView from "../../planner/MapView";
import PlacePhoto from "../../../components/PlacePhoto";
import {
  Compass,
  ExternalLink,
  Sparkles,
  Clock,
  MapPin,
  Navigation,
  Video,
  Backpack,
  Layers,
  Banknote,
} from "lucide-react";

const getRecommendedItems = (category = "") => {
  const cat = category.toLowerCase();
  if (cat.includes("beach") || cat.includes("coast")) {
    return "Sunglasses, Sunscreen SPF50, Flip-flops, Cotton Towel";
  }
  if (cat.includes("nature") || cat.includes("wildlife") || cat.includes("trek")) {
    return "Comfortable Walking Shoes, Insect Repellent, Camera, Water Bottle";
  }
  if (cat.includes("culture") || cat.includes("temple") || cat.includes("spiritual") || cat.includes("heritage")) {
    return "Modest Covered Attire, Slip-on Shoes, Scarf, Photography Permit";
  }
  if (cat.includes("food") || cat.includes("culinary") || cat.includes("shopping") || cat.includes("bazaar")) {
    return "Hand Sanitizer, UPI / Cash for Local Stalls, Reusable Shopping Tote";
  }
  return "Camera / Smartphone, Walking Shoes, Water Bottle";
};

export const TripPlacesTab = ({ trip }) => {
  const [places, setPlaces] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDay, setSelectedDay] = useState(1);

  const planDays = trip?.planData?.days || [];
  const planPlaces = trip?.planData?.places || {};

  useEffect(() => {
    if (trip?.planData?.places) {
      setPlaces(Object.values(trip.planData.places));
    }
  }, [trip]);

  const categories = [
    { id: "all", label: "All Sights" },
    { id: "culture", label: "Historic & Heritage" },
    { id: "nature", label: "Nature & Views" },
    { id: "food", label: "Culinary" },
    { id: "shopping", label: "Bazaars" },
    { id: "relaxation", label: "Leisure" },
  ];

  const filteredPlaces = places.filter((p) => {
    if (selectedCategory === "all") return true;
    const cat = (p.category || "").toLowerCase();
    return cat.includes(selectedCategory);
  });

  const currentDayPlan = planDays.find((d) => d.day === selectedDay) || planDays[0];

  const currentDayStops = (currentDayPlan?.items || []).map((item, idx) => {
    const pl = planPlaces[item.placeId] || {};
    return {
      ...pl,
      slot: item.slot,
      order: idx + 1,
      travelMinutes: item.travelMinutesFromPrev || 15,
    };
  });

  return (
    <div className="space-y-10">
      {/* ── HEADER ── */}
      <div className="pb-4 border-b border-[#E5E2E1] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6C2F00] block mb-1">
            EXPLORATION &amp; SIGHTSEEING
          </span>
          <h3 className="font-serif text-2xl font-bold text-[#1C1B1B]">
            Destinations &amp; Curated Sights in {trip.destination}
          </h3>
          <p className="text-xs text-[#54433A] mt-1">
            Verified landmarks, scenic viewpoints, and heritage points selected for your journey.
          </p>
        </div>

        {planDays.length > 0 && (
          <div className="flex items-center space-x-1.5 bg-[#F6F3F2] p-1 rounded-full border border-[#DAC2B6]/40 shrink-0">
            {planDays.map((d) => (
              <button
                key={d.day}
                type="button"
                onClick={() => setSelectedDay(d.day)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  selectedDay === d.day
                    ? "bg-[#6C2F00] text-white shadow-xs"
                    : "text-[#54433A] hover:text-[#1C1B1B]"
                }`}
              >
                Day {d.day}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── INTERACTIVE ROUTE MAP VIEW ── */}
      <section className="bg-white border border-[#E5E2E1] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Compass className="w-5 h-5 text-[#6C2F00]" />
            <h4 className="font-serif text-lg font-bold text-[#1C1B1B]">
              Day {selectedDay} Geographic Transit &amp; Waypoint Map
            </h4>
          </div>
          <span className="text-xs text-[#877369]">
            {currentDayStops.length} Waypoints mapped for this day
          </span>
        </div>

        <div className="rounded-xl overflow-hidden border border-[#E5E2E1] min-h-[380px]">
          <MapView
            days={planDays}
            places={planPlaces}
            selectedDay={selectedDay}
          />
        </div>
      </section>

      {/* ── DAY ITINERARY HIGHLIGHT CARDS ── */}
      {currentDayStops.length > 0 && (
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="font-serif text-xl font-bold text-[#1C1B1B] flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#6C2F00] text-white text-xs font-bold">
                {selectedDay}
              </span>
              <span>Day {selectedDay} Visiting Itinerary &amp; Highlight Stops</span>
            </h4>
            <span className="text-xs text-[#877369]">
              {currentDayStops.length} stops planned
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {currentDayStops.map((stop, idx) => {
              const photoUrl =
                stop.photos?.[0]?.url || stop.photoUrl || null;

              const mapUrl =
                stop.mapUrl ||
                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  (stop.name || "") + " " + trip.destination,
                )}`;

              const vlogUrl =
                stop.vlogUrl ||
                `https://www.youtube.com/results?search_query=${encodeURIComponent(
                  (stop.name || "") + " " + trip.destination + " travel vlog",
                )}`;

              return (
                <div
                  key={stop.id || idx}
                  className="bg-white border border-[#E5E2E1] rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Verified Photo with Category Placeholder Fallback */}
                    <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                      <PlacePhoto
                        src={photoUrl}
                        alt={stop.name}
                        category={stop.category}
                        credit={stop.photos?.[0]?.author || stop.photoCredit}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
                        <span className="bg-[#6C2F00] text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                          Stop #{stop.order}
                        </span>
                        <span className="bg-black/60 backdrop-blur-xs text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-md">
                          {stop.slot}
                        </span>
                      </div>
                      {(stop.rate >= 3 || stop.popularity >= 0.8) && (
                        <div className="absolute top-2.5 right-2.5 bg-amber-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs z-10">
                          <Sparkles className="w-3 h-3" />
                          <span>Popular</span>
                        </div>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="p-4 space-y-3">
                      <div>
                        <h5 className="font-serif text-base font-bold text-[#1C1B1B] leading-snug">
                          {stop.name}
                        </h5>
                        <p className="text-xs text-[#54433A] line-clamp-2 mt-1 leading-relaxed">
                          {stop.description || `Scenic and cultural highlight in ${trip.destination}.`}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-[#54433A] pt-2 border-t border-[#F0ECE9]">
                        <div className="flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#6C2F00] shrink-0" />
                          <span>{stop.visitMinutes || 90} mins visit</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <Banknote className="w-3.5 h-3.5 text-[#6C2F00] shrink-0" />
                          <span>
                            {stop.estCost && stop.estCost > 0
                              ? `₹${stop.estCost.toLocaleString("en-IN")}`
                              : "Free entry"}
                          </span>
                        </div>
                      </div>

                      <div className="bg-[#FCF9F8] p-2.5 rounded-lg border border-[#DAC2B6]/40 text-xs">
                        <div className="flex items-center space-x-1.5 text-[#6C2F00] font-semibold mb-1">
                          <Backpack className="w-3.5 h-3.5" />
                          <span className="text-[11px] uppercase tracking-wider">
                            What to bring
                          </span>
                        </div>
                        <p className="text-[11px] text-[#54433A] leading-tight">
                          {getRecommendedItems(stop.category)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="px-4 py-3 bg-[#FBF9F8] border-t border-[#E5E2E1] flex items-center justify-between text-xs">
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-[#6C2F00] hover:text-[#3B1900] font-semibold"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Directions</span>
                    </a>

                    <a
                      href={vlogUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-[#C04000] hover:text-[#902800] font-semibold"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Watch Vlog</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── ALL SIGHTS DIRECTORY ── */}
      <section className="space-y-6 pt-4 border-t border-[#E5E2E1]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-serif text-xl font-bold text-[#1C1B1B]">
              Complete Destination Directory
            </h4>
            <p className="text-xs text-[#54433A] mt-1">
              Filter curated sights by theme or interest.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? "bg-[#6C2F00] text-white shadow-xs"
                    : "bg-[#F6F3F2] text-[#54433A] hover:bg-[#EAE5E2]"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {places.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlaces.map((place, idx) => {
              const photoUrl =
                place.photos?.[0]?.url || place.photoUrl || null;

              const mapUrl =
                place.mapUrl ||
                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  (place.name || "") + " " + trip.destination,
                )}`;

              const vlogUrl =
                place.vlogUrl ||
                `https://www.youtube.com/results?search_query=${encodeURIComponent(
                  (place.name || "") + " " + trip.destination + " travel vlog",
                )}`;

              return (
                <div
                  key={place.id || idx}
                  className="bg-white border border-[#E5E2E1] rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group justify-between"
                >
                  <div>
                    <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                      <PlacePhoto
                        src={photoUrl}
                        alt={place.name}
                        category={place.category}
                        credit={place.photos?.[0]?.author || place.photoCredit}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-3 left-3 z-10">
                        <Badge variant="terracotta" size="xs">
                          {place.category || "Sight"}
                        </Badge>
                      </div>
                      {(place.rate >= 3 || place.popularity >= 0.8) && (
                        <div className="absolute top-3 right-3 bg-amber-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs z-10">
                          <Sparkles className="w-3 h-3" />
                          <span>Popular</span>
                        </div>
                      )}
                    </div>

                    <div className="p-5 space-y-3">
                      <div className="space-y-1">
                        <h4 className="font-serif text-lg font-bold text-[#1C1B1B] leading-snug">
                          {place.name}
                        </h4>
                        <p className="text-xs text-[#54433A] line-clamp-3 leading-relaxed">
                          {place.description ||
                            `Scenic, historical, and cultural interest point in ${trip.destination}.`}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-[#54433A] pt-2 border-t border-[#F0ECE9]">
                        <div className="flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#6C2F00] shrink-0" />
                          <span>{place.visitMinutes || 90} mins</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <Banknote className="w-3.5 h-3.5 text-[#6C2F00] shrink-0" />
                          <span>
                            {place.estCost && place.estCost > 0
                              ? `₹${place.estCost.toLocaleString("en-IN")}`
                              : "Free entry"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 py-3 bg-[#FBF9F8] border-t border-[#E5E2E1] flex items-center justify-between text-xs">
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-[#6C2F00] hover:text-[#3B1900] font-semibold"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Directions</span>
                    </a>

                    <a
                      href={vlogUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-[#C04000] hover:text-[#902800] font-semibold"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Watch Vlog</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No Sights Found"
            message={`No attractions match the selected filter for ${trip.destination}.`}
          />
        )}
      </section>
    </div>
  );
};

export default TripPlacesTab;
