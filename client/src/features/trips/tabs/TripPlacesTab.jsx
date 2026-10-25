import React, { useState, useEffect } from "react";
import Badge from "../../../components/Badge";
import Button from "../../../components/Button";
import EmptyState from "../../../components/EmptyState";
import MapView from "../../planner/MapView";
import {
  Compass,
  ExternalLink,
  Star,
  Sparkles,
  Clock,
} from "lucide-react";

export const TripPlacesTab = ({ trip, onOpenPlanner }) => {
  const [places, setPlaces] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E2E1]">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6C2F00] block mb-1">
            EXPLORATION CATALOGUE
          </span>
          <h3 className="font-serif text-2xl font-bold text-[#1C1B1B]">
            Recommended Sights in {trip.destination}
          </h3>
          <p className="text-xs text-[#54433A] mt-1">
            Curated monuments, viewpoints, and cultural attractions tailored to
            your itinerary.
          </p>
        </div>

        {onOpenPlanner && (
          <Button
            variant="terracotta"
            size="sm"
            onClick={onOpenPlanner}
            className="shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            <span>Generate / Refresh Sights</span>
          </Button>
        )}
      </div>

      {/* Interactive MapView */}
      {trip?.planData?.days && (
        <div className="space-y-2">
          <MapView
            days={trip.planData.days}
            places={trip.planData.places || {}}
            selectedDay={1}
          />
        </div>
      )}

      {/* Category filter pills */}
      {places.length > 0 && (
        <div className="flex items-center space-x-2 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat.id
                  ? "bg-[#6C2F00] text-white shadow-xs"
                  : "bg-white text-[#54433A] border border-[#DAC2B6] hover:border-[#6C2F00]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Places Grid */}
      {places.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlaces.map((place, idx) => {
            const photoUrl =
              place.photos?.[0]?.url ||
              place.photoUrl ||
              "https://images.unsplash.com/photo-1599661046227-4d1c87a5b9e1?auto=format&fit=crop&w=600&q=80";

            return (
              <div
                key={place.id || idx}
                className="bg-white border border-[#E5E2E1] rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group"
              >
                <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                  <img
                    src={photoUrl}
                    alt={place.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                  {place.photos?.[0]?.author && (
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-xs text-[10px] text-white/90 px-2 py-0.5 truncate">
                      Photo: {place.photos[0].author} (
                      {place.photos[0].license || "CC"})
                    </div>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
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

                  <div className="pt-3 border-t border-[#F2EFEF] flex items-center justify-between text-xs text-[#877369]">
                    <div className="flex items-center gap-3">
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

                    {place.sourceUrl && (
                      <a
                        href={place.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#6C2F00] hover:underline font-semibold inline-flex items-center gap-1 text-[11px]"
                      >
                        <span>Learn More</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Compass}
          title="No Sights Recommended Yet"
          description={`Generate an AI recommendation plan to discover top sights, monuments, and an interactive route map for ${trip.destination}.`}
          actionLabel="Generate Recommendation Plan"
          onAction={onOpenPlanner}
        />
      )}
    </div>
  );
};

export default TripPlacesTab;
