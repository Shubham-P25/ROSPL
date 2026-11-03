import React, { useState, useEffect } from "react";
import Badge from "../../../components/Badge";
import EmptyState from "../../../components/EmptyState";
import MapView from "../../planner/MapView";
import {
  Compass,
  ExternalLink,
  Star,
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

  // Current day itinerary stops
  const currentDayData = planDays.find((d) => d.day === selectedDay) || planDays[0];
  const currentDayStops = (currentDayData?.items || []).map((item, idx) => {
    const place = planPlaces[item.placeId] || {};
    return {
      ...place,
      slot: item.slot,
      order: idx + 1,
      travelTime: item.travelMinutesFromPrev,
    };
  });

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E2E1]">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6C2F00] block mb-1">
            ROUTE MAP &amp; EXPLORATION CATALOGUE
          </span>
          <h3 className="font-serif text-2xl font-bold text-[#1C1B1B]">
            Exploration Map &amp; Sights in {trip.destination}
          </h3>
          <p className="text-xs text-[#54433A] mt-1">
            Toggle through each day of your expedition to view geographic stops,
            timed itineraries, and recommended gear.
          </p>
        </div>
      </div>

      {/* ── DAY SELECTOR TOGGLE BAR ── */}
      {planDays.length > 0 && (
        <div className="bg-white p-4 rounded-xl border border-[#DAC2B6]/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#6C2F00]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#1C1B1B]">
              Select Itinerary Day:
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
            {planDays.map((d) => (
              <button
                key={d.day}
                type="button"
                onClick={() => setSelectedDay(d.day)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                  selectedDay === d.day
                    ? "bg-[#6C2F00] text-white shadow-sm ring-2 ring-[#6C2F00]/20"
                    : "bg-[#F6F3F2] text-[#54433A] hover:bg-[#DAC2B6]/40"
                }`}
              >
                Day {d.day} ({d.items?.length || 0} stops)
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── INTERACTIVE LEAFLET MAP VIEW ── */}
      {planDays.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-[#877369]">
            <span className="flex items-center gap-1 font-semibold text-[#6C2F00]">
              <Navigation className="w-3.5 h-3.5" />
              Showing Route &amp; Highlights for Day {selectedDay}
            </span>
            <span>Zoom &amp; drag map to view coordinates</span>
          </div>

          <MapView
            days={planDays}
            places={planPlaces}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
          />
        </div>
      )}

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
                stop.photos?.[0]?.url ||
                stop.photoUrl ||
                "https://images.unsplash.com/photo-1599661046227-4d1c87a5b9e1?auto=format&fit=crop&w=600&q=80";

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
                    {/* Photo with Stop Badge */}
                    <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                      <img
                        src={photoUrl}
                        alt={stop.name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src =
                            "https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=600&q=80";
                        }}
                      />
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <span className="bg-[#6C2F00] text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                          Stop #{stop.order}
                        </span>
                        <span className="bg-black/60 backdrop-blur-xs text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-md">
                          {stop.slot}
                        </span>
                      </div>
                      {stop.rating && (
                        <div className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-xs text-white text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{stop.rating.toFixed(1)}</span>
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

                      {/* Info & Budget Metrics */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#F6F3F2] p-2.5 rounded-lg border border-[#DAC2B6]/40">
                        <div>
                          <span className="text-[#877369] block">Admission / Est:</span>
                          <span className="font-bold text-[#1C1B1B]">
                            {stop.estCost > 0 ? `₹${stop.estCost}` : "Free Entry"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#877369] block">Visit Duration:</span>
                          <span className="font-bold text-[#1C1B1B]">
                            {stop.visitMinutes || 90} mins
                          </span>
                        </div>
                      </div>

                      {/* Recommended Items */}
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#6C2F00] flex items-center gap-1">
                          <Backpack className="w-3 h-3" />
                          What to Bring / Tips:
                        </span>
                        <p className="text-[11px] text-[#54433A] leading-relaxed">
                          {getRecommendedItems(stop.category)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Links Footer: Google Maps & YouTube Vlog */}
                  <div className="p-3 bg-[#FAF8F7] border-t border-[#F0EDED] flex items-center justify-between gap-2">
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6C2F00] hover:underline"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Google Maps ↗</span>
                    </a>

                    <a
                      href={vlogUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 hover:underline"
                    >
                      <Video className="w-3.5 h-3.5 text-red-600 fill-red-600" />
                      <span>Vlog Video ↗</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── ALL SIGHTS CATALOGUE ── */}
      <section className="space-y-6 pt-6 border-t border-[#E5E2E1]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h4 className="font-serif text-xl font-bold text-[#1C1B1B]">
            All Exploration Sights ({filteredPlaces.length})
          </h4>

          {/* Category filter pills */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 hide-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat.id
                    ? "bg-[#6C2F00] text-white shadow-xs"
                    : "bg-white text-[#54433A] border border-[#DAC2B6] hover:border-[#6C2F00]"
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
                place.photos?.[0]?.url ||
                place.photoUrl ||
                "https://images.unsplash.com/photo-1599661046227-4d1c87a5b9e1?auto=format&fit=crop&w=600&q=80";

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
                      <img
                        src={photoUrl}
                        alt={place.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.src =
                            "https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=600&q=80";
                        }}
                      />
                      <div className="absolute top-3 left-3">
                        <Badge variant="terracotta" size="xs">
                          {place.category || "Sight"}
                        </Badge>
                      </div>
                      {place.rating && (
                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-xs text-white text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{place.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>

                    <div className="p-5 space-y-3">
                      <div className="space-y-1">
                        <h4 className="font-serif text-lg font-bold text-[#1C1B1B] leading-snug">
                          {place.name}
                        </h4>
                        {place.description && (
                          <p className="text-xs text-[#54433A] line-clamp-2 leading-relaxed">
                            {place.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 flex items-center justify-between text-xs text-[#877369] border-t border-[#F2EFEF]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#6C2F00]" />
                          {place.visitMinutes || 90}m
                        </span>
                        <span>
                          Est:{" "}
                          <strong className="text-slate-900">
                            {place.estCost > 0 ? `₹${place.estCost}` : "Free"}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-[#FAF8F7] border-t border-[#F0EDED] flex items-center justify-between text-xs">
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#6C2F00] hover:underline font-semibold inline-flex items-center gap-1 text-[11px]"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Maps</span>
                    </a>

                    <a
                      href={vlogUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-700 hover:underline font-semibold inline-flex items-center gap-1 text-[11px]"
                    >
                      <Video className="w-3.5 h-3.5 text-red-600 fill-red-600" />
                      <span>Travel Vlog</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Compass}
            title="No Sights Found"
            description={`Explore destinations and landmarks in ${trip.destination}.`}
          />
        )}
      </section>
    </div>
  );
};

export default TripPlacesTab;
