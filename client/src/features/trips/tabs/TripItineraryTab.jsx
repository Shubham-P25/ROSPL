import React, { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { tripsApi } from "../../../services/api/tripsApi";
import { getErrorMessage } from "../../../services/api/client";
import Button from "../../../components/Button";
import FormField from "../../../components/FormField";
import Modal from "../../../components/Modal";
import Badge from "../../../components/Badge";
import EmptyState from "../../../components/EmptyState";
import PlacePhoto from "../../../components/PlacePhoto";
import { haversineKm, travelMinutes } from "../../../lib/haversine";
import { playPop, playTick } from "../../../lib/sound";
import {
  Calendar,
  MapPin,
  Plus,
  Trash2,
  Clock,
  Video,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Map,
  Sparkles,
  MoveUp,
  MoveDown,
  Sunrise,
  Sun,
  Sunset,
  Navigation,
  Compass,
} from "lucide-react";

const SLOT_META = {
  morning: {
    label: "Morning",
    timeRange: "09:00 - 12:30",
    icon: Sunrise,
    badgeBg: "bg-amber-100 text-amber-900 border-amber-200",
  },
  afternoon: {
    label: "Afternoon",
    timeRange: "13:30 - 17:00",
    icon: Sun,
    badgeBg: "bg-orange-100 text-orange-900 border-orange-200",
  },
  evening: {
    label: "Evening",
    timeRange: "17:30 - 20:30",
    icon: Sunset,
    badgeBg: "bg-indigo-100 text-indigo-900 border-indigo-200",
  },
};

export const TripItineraryTab = ({ trip, onTripUpdated }) => {
  const [, setSearchParams] = useSearchParams();
  const [collapsedDays, setCollapsedDays] = useState({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addDayTarget, setAddDayTarget] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);

  const [activityForm, setActivityForm] = useState({
    name: "",
    slot: "morning",
    location: "",
    estCost: "",
    category: "culture",
    notes: "",
  });

  // Normalize PlanData / Activities into Day Sections
  const normalizedDays = useMemo(() => {
    const startDate = trip.startDate ? new Date(trip.startDate) : new Date();

    // Strategy A: use trip.planData.days and trip.planData.places if present
    if (trip.planData?.days && Array.isArray(trip.planData.days) && trip.planData.days.length > 0) {
      const placesMap = trip.planData.places || {};

      return trip.planData.days.map((d) => {
        const dayNumber = d.day || 1;
        const dayDate = new Date(startDate.getTime() + (dayNumber - 1) * 86400000);
        const dateStr = dayDate.toLocaleDateString("en-IN", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });

        const stops = (d.items || []).map((item, idx) => {
          const place = placesMap[item.placeId] || {
            name: item.name || `Stop ${idx + 1}`,
            category: "culture",
            estCost: 0,
          };

          const slotKey = (item.slot || (idx === 0 ? "morning" : idx === 1 ? "afternoon" : "evening")).toLowerCase();
          const vlogUrl =
            place.vlogUrl ||
            `https://www.youtube.com/results?search_query=${encodeURIComponent(
              `${place.name} ${trip.destination} travel vlog`,
            )}`;
          const mapUrl =
            place.mapUrl ||
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${place.name} ${trip.destination}`,
            )}`;

          return {
            id: item.placeId || `stop-${dayNumber}-${idx}`,
            name: place.name,
            slot: slotKey,
            category: place.category || "culture",
            estCost: Number(place.estCost) || 0,
            address: place.address || place.name,
            lat: place.lat,
            lng: place.lng,
            vlogUrl,
            mapUrl,
            notes: place.description || item.notes || "",
            placeObj: place,
            day: dayNumber,
          };
        });

        const totalEstCost = stops.reduce((sum, s) => sum + (s.estCost || 0), 0);

        return {
          day: dayNumber,
          dateStr,
          stops,
          totalEstCost,
        };
      });
    }

    // Strategy B: group trip.activities by date/day
    const activities = trip.activities || [];
    if (activities.length === 0) return [];

    const grouped = {};
    activities.forEach((act, idx) => {
      let dayNum = act.day || 1;
      if (!act.day && act.date) {
        const actDate = new Date(act.date);
        const diffMs = actDate.getTime() - startDate.getTime();
        dayNum = Math.max(1, Math.floor(diffMs / 86400000) + 1);
      }

      if (!grouped[dayNum]) grouped[dayNum] = [];

      const slotGuess = idx % 3 === 0 ? "morning" : idx % 3 === 1 ? "afternoon" : "evening";
      const vlogUrl =
        act.vlogUrl ||
        `https://www.youtube.com/results?search_query=${encodeURIComponent(
          `${act.name} ${act.location || trip.destination} travel vlog`,
        )}`;
      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${act.name} ${act.location || trip.destination}`,
      )}`;

      grouped[dayNum].push({
        id: act._id || `act-${idx}`,
        name: act.name,
        slot: slotGuess,
        category: "culture",
        estCost: Number(act.estCost) || 0,
        address: act.location || act.name,
        vlogUrl,
        mapUrl,
        notes: act.notes || "",
        day: dayNum,
        originalActivityIdx: idx,
      });
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([dayNumStr, stops]) => {
        const dayNumber = Number(dayNumStr);
        const dayDate = new Date(startDate.getTime() + (dayNumber - 1) * 86400000);
        const dateStr = dayDate.toLocaleDateString("en-IN", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
        const totalEstCost = stops.reduce((sum, s) => sum + (s.estCost || 0), 0);

        return {
          day: dayNumber,
          dateStr,
          stops,
          totalEstCost,
        };
      });
  }, [trip.planData, trip.activities, trip.startDate, trip.destination]);

  const toggleDayCollapse = (day) => {
    setCollapsedDays((prev) => ({
      ...prev,
      [day]: !prev[day],
    }));
  };

  const handleOpenDayOnMap = (day) => {
    setSearchParams({ tab: "places", day: String(day) });
  };

  const handleGenerateRecommendations = async () => {
    setGenerating(true);
    try {
      const res = await tripsApi.generateRecommendations(trip._id);
      if (res.data?.trip && onTripUpdated) {
        onTripUpdated(res.data.trip);
      }
    } catch (err) {
      console.error("Failed to generate plan:", err);
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteStop = async (dayNumber, stopIndex) => {
    playTick();

    // If using planData
    if (trip.planData?.days) {
      const updatedPlan = JSON.parse(JSON.stringify(trip.planData));
      const targetDay = updatedPlan.days.find((d) => d.day === dayNumber);
      if (targetDay && targetDay.items) {
        targetDay.items.splice(stopIndex, 1);
      }
      try {
        const res = await tripsApi.update(trip._id, { planData: updatedPlan });
        if (onTripUpdated) onTripUpdated(res.data);
      } catch (err) {
        console.error("Failed to delete stop:", err);
      }
      return;
    }

    // Fallback: delete from trip.activities
    const dayData = normalizedDays.find((d) => d.day === dayNumber);
    const stop = dayData?.stops[stopIndex];
    if (stop && stop.originalActivityIdx !== undefined) {
      const updatedActivities = (trip.activities || []).filter(
        (_, idx) => idx !== stop.originalActivityIdx,
      );
      try {
        const res = await tripsApi.update(trip._id, { activities: updatedActivities });
        if (onTripUpdated) onTripUpdated(res.data);
      } catch (err) {
        console.error("Failed to delete activity:", err);
      }
    }
  };

  const handleMoveStop = async (dayNumber, fromIdx, toIdx) => {
    if (toIdx < 0) return;

    if (trip.planData?.days) {
      const updatedPlan = JSON.parse(JSON.stringify(trip.planData));
      const targetDay = updatedPlan.days.find((d) => d.day === dayNumber);
      if (targetDay && targetDay.items && toIdx < targetDay.items.length) {
        const [moved] = targetDay.items.splice(fromIdx, 1);
        targetDay.items.splice(toIdx, 0, moved);

        // Reassign slots smoothly
        targetDay.items.forEach((item, idx) => {
          item.slot = idx === 0 ? "morning" : idx === 1 ? "afternoon" : "evening";
        });

        playPop();
        try {
          const res = await tripsApi.update(trip._id, { planData: updatedPlan });
          if (onTripUpdated) onTripUpdated(res.data);
        } catch (err) {
          console.error("Failed to reorder stop:", err);
        }
      }
    }
  };

  const handleAddStopSubmit = async (e) => {
    e.preventDefault();
    if (!activityForm.name.trim()) return;

    setLoading(true);
    playPop();

    const newPlaceId = `custom_${Date.now()}`;
    const newPlace = {
      id: newPlaceId,
      name: activityForm.name.trim(),
      category: activityForm.category || "culture",
      estCost: Number(activityForm.estCost) || 0,
      address: activityForm.location.trim() || activityForm.name.trim(),
      description: activityForm.notes.trim(),
    };

    if (trip.planData?.days) {
      const updatedPlan = JSON.parse(JSON.stringify(trip.planData));
      if (!updatedPlan.places) updatedPlan.places = {};
      updatedPlan.places[newPlaceId] = newPlace;

      let targetDay = updatedPlan.days.find((d) => d.day === addDayTarget);
      if (!targetDay) {
        targetDay = { day: addDayTarget, items: [] };
        updatedPlan.days.push(targetDay);
      }

      targetDay.items.push({
        placeId: newPlaceId,
        slot: activityForm.slot || "afternoon",
      });

      try {
        const res = await tripsApi.update(trip._id, { planData: updatedPlan });
        if (onTripUpdated) onTripUpdated(res.data);
        setIsAddModalOpen(false);
        setActivityForm({
          name: "",
          slot: "morning",
          location: "",
          estCost: "",
          category: "culture",
          notes: "",
        });
      } catch (err) {
        setError(getErrorMessage(err, "Failed to add activity."));
      } finally {
        setLoading(false);
      }
      return;
    }

    // Fallback: push to activities
    const startDate = trip.startDate ? new Date(trip.startDate) : new Date();
    const actDate = new Date(startDate.getTime() + (addDayTarget - 1) * 86400000);

    const updatedActivities = [
      ...(trip.activities || []),
      {
        name: activityForm.name.trim(),
        date: actDate,
        location: activityForm.location.trim(),
        notes: activityForm.notes.trim(),
        estCost: Number(activityForm.estCost) || 0,
        day: addDayTarget,
      },
    ];

    try {
      const res = await tripsApi.update(trip._id, { activities: updatedActivities });
      if (onTripUpdated) onTripUpdated(res.data);
      setIsAddModalOpen(false);
      setActivityForm({
        name: "",
        slot: "morning",
        location: "",
        estCost: "",
        category: "culture",
        notes: "",
      });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to add activity."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E5E2E1]">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6C2F00] block mb-1">
            Chronological Journey
          </span>
          <h3 className="font-serif text-2xl font-bold text-[#1C1B1B]">
            Day-by-Day Expedition Itinerary
          </h3>
          <p className="text-xs text-[#54433A] mt-0.5">
            Optimized route slots, transit times, and curated sightseeing milestones for {trip.destination}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setAddDayTarget(1);
              setIsAddModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Activity
          </Button>
        </div>
      </div>

      {/* Day Sections */}
      {normalizedDays.length > 0 ? (
        <div className="space-y-8">
          {normalizedDays.map((dayObj) => {
            const isCollapsed = collapsedDays[dayObj.day];

            return (
              <div
                key={dayObj.day}
                className="bg-[#FFFFFF] border border-[#E5E2E1] rounded-lg overflow-hidden shadow-xs"
              >
                {/* Sticky Day Section Header */}
                <div className="sticky top-0 z-10 bg-[#FAF8F7]/95 backdrop-blur-md px-5 py-4 border-b border-[#E5E2E1] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleDayCollapse(dayObj.day)}
                      className="p-1 hover:bg-[#E5E2E1] rounded text-[#6C2F00] transition-colors"
                      title={isCollapsed ? "Expand day" : "Collapse day"}
                    >
                      {isCollapsed ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronUp className="w-5 h-5" />
                      )}
                    </button>
                    <div>
                      <h4 className="font-serif text-lg font-bold text-[#1C1B1B] flex items-center gap-2">
                        <span>Day {dayObj.day}</span>
                        <span className="text-xs font-sans font-normal text-[#877369]">
                          • {dayObj.dateStr}
                        </span>
                      </h4>
                      <p className="text-[11px] text-[#54433A]">
                        {dayObj.stops.length} {dayObj.stops.length === 1 ? "stop" : "stops"} • Est. ₹{dayObj.totalEstCost.toLocaleString("en-IN")} total
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleOpenDayOnMap(dayObj.day)}
                      className="px-2.5 py-1 text-xs font-semibold rounded bg-[#6C2F00]/10 hover:bg-[#6C2F00]/20 text-[#6C2F00] flex items-center gap-1.5 transition-colors"
                    >
                      <Map className="w-3.5 h-3.5" />
                      Open Day on Map
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddDayTarget(dayObj.day);
                        setIsAddModalOpen(true);
                      }}
                      className="p-1 text-[#877369] hover:text-[#6C2F00] transition-colors rounded hover:bg-[#E5E2E1]"
                      title="Add stop to this day"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Day Stops Timeline */}
                {!isCollapsed && (
                  <div className="p-5 sm:p-6 space-y-4">
                    {dayObj.stops.length > 0 ? (
                      dayObj.stops.map((stop, sIdx) => {
                        const slotInfo = SLOT_META[stop.slot] || SLOT_META.morning;
                        const SlotIcon = slotInfo.icon;

                        // Travel connector between previous stop and this stop
                        let connectorText = null;
                        if (sIdx > 0) {
                          const prevStop = dayObj.stops[sIdx - 1];
                          if (
                            prevStop.lat &&
                            prevStop.lng &&
                            stop.lat &&
                            stop.lng
                          ) {
                            const km = Math.round(haversineKm(prevStop, stop) * 10) / 10;
                            const mins = travelMinutes(km);
                            connectorText = `🚶 ${mins} min transit · ${km} km`;
                          } else {
                            connectorText = `🚶 ~15 min transit between stops`;
                          }
                        }

                        return (
                          <React.Fragment key={stop.id || sIdx}>
                            {/* Travel Connector between cards */}
                            {connectorText && (
                              <div className="flex items-center justify-center my-2">
                                <div className="h-px bg-[#E5E2E1] flex-1 max-w-[60px]" />
                                <span className="px-3 py-1 bg-[#FAF8F7] text-[10px] font-medium text-[#877369] rounded-full border border-[#E5E2E1] flex items-center gap-1">
                                  <Navigation className="w-3 h-3 text-[#6C2F00]" />
                                  {connectorText}
                                </span>
                                <div className="h-px bg-[#E5E2E1] flex-1 max-w-[60px]" />
                              </div>
                            )}

                            {/* Timeline Stop Card */}
                            <div className="bg-[#FFFFFF] border border-[#E5E2E1] hover:border-[#DAC2B6] rounded-md p-4 transition-all flex flex-col sm:flex-row items-start justify-between gap-4 shadow-xs">
                              <div className="flex items-start gap-4 flex-1 min-w-0">
                                {/* Place Photo Thumbnail */}
                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded overflow-hidden shrink-0">
                                  <PlacePhoto
                                    place={stop.placeObj || stop}
                                    alt={stop.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>

                                <div className="space-y-1.5 flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    {/* Slot Chip */}
                                    <span
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${slotInfo.badgeBg}`}
                                    >
                                      <SlotIcon className="w-3 h-3" />
                                      {slotInfo.label} ({slotInfo.timeRange})
                                    </span>

                                    {/* Category Chip */}
                                    <Badge variant="neutral" size="xs">
                                      {stop.category}
                                    </Badge>

                                    {/* Est Cost Chip */}
                                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-[#FAF8F7] text-[#54433A] rounded border border-[#E5E2E1]">
                                      {stop.estCost > 0
                                        ? `₹${stop.estCost.toLocaleString("en-IN")}`
                                        : "Free Entry"}
                                    </span>
                                  </div>

                                  <h5 className="font-serif text-base font-bold text-[#1C1B1B] truncate">
                                    {stop.name}
                                  </h5>

                                  {stop.address && (
                                    <p className="text-[11px] text-[#877369] flex items-center gap-1 truncate">
                                      <MapPin className="w-3 h-3 shrink-0" />
                                      {stop.address}
                                    </p>
                                  )}

                                  {stop.notes && (
                                    <p className="text-[11px] text-[#54433A] line-clamp-2 pt-0.5">
                                      {stop.notes}
                                    </p>
                                  )}

                                  {/* Action Links */}
                                  <div className="flex items-center gap-2 pt-2">
                                    <a
                                      href={stop.mapUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#6C2F00] hover:underline"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      View on Maps
                                    </a>
                                    <span className="text-[#DAC2B6]">•</span>
                                    <a
                                      href={stop.vlogUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 hover:underline"
                                    >
                                      <Video className="w-3 h-3" />
                                      Watch Vlog
                                    </a>
                                  </div>
                                </div>
                              </div>

                              {/* Card Actions (Reorder & Delete) */}
                              <div className="flex items-center sm:flex-col gap-1 self-end sm:self-auto shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleMoveStop(dayObj.day, sIdx, sIdx - 1)}
                                  disabled={sIdx === 0}
                                  className="p-1 text-[#877369] hover:text-[#6C2F00] disabled:opacity-30 disabled:hover:text-[#877369]"
                                  title="Move earlier"
                                >
                                  <MoveUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveStop(dayObj.day, sIdx, sIdx + 1)}
                                  disabled={sIdx === dayObj.stops.length - 1}
                                  className="p-1 text-[#877369] hover:text-[#6C2F00] disabled:opacity-30 disabled:hover:text-[#877369]"
                                  title="Move later"
                                >
                                  <MoveDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteStop(dayObj.day, sIdx)}
                                  className="p-1 text-[#877369] hover:text-[#BA1A1A] transition-colors"
                                  title="Remove stop"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      })
                    ) : (
                      <div className="text-center py-6 text-xs text-[#877369] italic">
                        No activities scheduled for Day {dayObj.day}. Click "+" to add one.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Calendar}
          title="No Itinerary Plan Available"
          description="Let PackGo generate an optimized day-by-day itinerary with routes, stops, and schedules."
          actionLabel={generating ? "Generating Plan..." : "Generate with PackGo"}
          onAction={handleGenerateRecommendations}
        />
      )}

      {/* Add Stop Modal */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title={`Add Stop to Day ${addDayTarget}`}
          subtitle={`Schedule an excursion in ${trip.destination}`}
        >
          {error && (
            <div className="mb-4 p-3 bg-[#FFDAD6]/50 text-xs text-[#BA1A1A] rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleAddStopSubmit} className="space-y-4">
            <FormField label="Activity / Place Name" required>
              <input
                type="text"
                placeholder="e.g. Amber Palace & Fort"
                value={activityForm.name}
                onChange={(e) =>
                  setActivityForm({ ...activityForm, name: e.target.value })
                }
                className="w-full px-3 py-2 bg-[#F6F3F2] border border-[#E5E2E1] rounded text-xs focus:outline-none focus:border-[#6C2F00]"
                required
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Time Slot" required>
                <select
                  value={activityForm.slot}
                  onChange={(e) =>
                    setActivityForm({ ...activityForm, slot: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#F6F3F2] border border-[#E5E2E1] rounded text-xs focus:outline-none focus:border-[#6C2F00]"
                >
                  <option value="morning">Morning (09:00 - 12:30)</option>
                  <option value="afternoon">Afternoon (13:30 - 17:00)</option>
                  <option value="evening">Evening (17:30 - 20:30)</option>
                </select>
              </FormField>

              <FormField label="Est. Cost (INR)">
                <input
                  type="number"
                  min="0"
                  step="50"
                  placeholder="e.g. 500"
                  value={activityForm.estCost}
                  onChange={(e) =>
                    setActivityForm({ ...activityForm, estCost: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#F6F3F2] border border-[#E5E2E1] rounded text-xs focus:outline-none focus:border-[#6C2F00]"
                />
              </FormField>
            </div>

            <FormField label="Location / Landmark">
              <input
                type="text"
                placeholder="e.g. Devisinghpura, Amer, Jaipur"
                value={activityForm.location}
                onChange={(e) =>
                  setActivityForm({ ...activityForm, location: e.target.value })
                }
                className="w-full px-3 py-2 bg-[#F6F3F2] border border-[#E5E2E1] rounded text-xs focus:outline-none focus:border-[#6C2F00]"
              />
            </FormField>

            <FormField label="Notes & Tips">
              <textarea
                rows={2}
                placeholder="e.g. Arrive early to beat crowd; hire official guide."
                value={activityForm.notes}
                onChange={(e) =>
                  setActivityForm({ ...activityForm, notes: e.target.value })
                }
                className="w-full px-3 py-2 bg-[#F6F3F2] border border-[#E5E2E1] rounded text-xs focus:outline-none focus:border-[#6C2F00]"
              />
            </FormField>

            <div className="flex justify-end space-x-3 pt-4 border-t border-[#E5E2E1]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddModalOpen(false)}
                type="button"
              >
                Cancel
              </Button>
              <Button
                variant="terracotta"
                size="sm"
                type="submit"
                disabled={loading}
              >
                {loading ? "Adding..." : "Add to Itinerary"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default TripItineraryTab;
