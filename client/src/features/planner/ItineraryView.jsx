import React, { useState } from "react";
import PlaceCard from "./PlaceCard";
import Button from "../../components/Button";
import { RefreshCw, AlertTriangle } from "lucide-react";

export const ItineraryView = ({
  plan,
  onRegenerateDay,
  regeneratingDay = false,
  onUpdatePlan,
}) => {
  const [activeDay, setActiveDay] = useState(1);

  if (!plan || !plan.days || plan.days.length === 0) {
    return null;
  }

  const { days, places = {}, degraded = [] } = plan;
  const currentDayData = days.find((d) => d.day === activeDay) || days[0];

  const handleMoveStop = (dayNum, index, direction) => {
    if (!onUpdatePlan) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const updatedDays = days.map((d) => {
      if (d.day !== dayNum) return d;
      const items = [...d.items];
      if (targetIndex < 0 || targetIndex >= items.length) return d;
      const temp = items[index];
      items[index] = items[targetIndex];
      items[targetIndex] = temp;
      return { ...d, items };
    });
    onUpdatePlan({ days: updatedDays });
  };

  const handleRemoveStop = (dayNum, index) => {
    if (!onUpdatePlan) return;
    const updatedDays = days.map((d) => {
      if (d.day !== dayNum) return d;
      const items = d.items.filter((_, idx) => idx !== index);
      const estCost = items.reduce((s, it) => s + (places[it.placeId]?.estCost || 0), 0);
      return { ...d, items, estCost };
    });
    onUpdatePlan({ days: updatedDays });
  };

  return (
    <div className="space-y-8">
      {/* Degraded notification banners */}
      {degraded.length > 0 && (
        <div className="p-4 bg-[#FFF4ED] border border-[#FFD9C2] rounded-lg text-xs text-[#6C2F00] flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-[#6C2F00]" />
          <span>
            Notice: Some optional details ({degraded.join(", ")}) are operating in offline fallback mode. Your complete day-by-day plan remains fully intact.
          </span>
        </div>
      )}

      {/* Day Selector Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E2E1]">
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 sm:pb-0">
          {days.map((d) => (
            <button
              key={d.day}
              type="button"
              onClick={() => setActiveDay(d.day)}
              className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                activeDay === d.day
                  ? "bg-[#6C2F00] text-white shadow-xs"
                  : "bg-white text-[#54433A] border border-[#DAC2B6] hover:border-[#6C2F00]"
              }`}
            >
              Day {d.day} ({d.items?.length || 0} stops)
            </button>
          ))}
        </div>

        {/* Regenerate Action */}
        <Button
          variant="outline"
          size="sm"
          loading={regeneratingDay}
          onClick={() => onRegenerateDay && onRegenerateDay(activeDay)}
          className="shrink-0 text-xs font-semibold"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Regenerate Day {activeDay}
        </Button>
      </div>

      {/* Day Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-2xl font-bold text-[#1C1B1B]">
            Day {currentDayData.day} Exploration
          </h3>
          <p className="text-xs text-[#877369] mt-0.5">
            Optimized route with calculated travel times and lunch breaks.
          </p>
        </div>
        {currentDayData.estCost > 0 && (
          <div className="text-right">
            <span className="text-[11px] text-[#877369] block">Est. Day Admissions</span>
            <span className="text-sm font-bold text-[#1C1B1B]">
              ₹{currentDayData.estCost.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Day Stops Timeline */}
      <div className="space-y-4">
        {currentDayData.items && currentDayData.items.length > 0 ? (
          currentDayData.items.map((item, index) => {
            const place = places[item.placeId];
            return (
              <PlaceCard
                key={item.placeId || index}
                place={place}
                slot={item.slot}
                travelMinutesFromPrev={item.travelMinutesFromPrev}
                isFirst={index === 0}
                isLast={index === currentDayData.items.length - 1}
                onMoveUp={() => handleMoveStop(currentDayData.day, index, "up")}
                onMoveDown={() => handleMoveStop(currentDayData.day, index, "down")}
                onRemove={() => handleRemoveStop(currentDayData.day, index)}
              />
            );
          })
        ) : (
          <div className="p-8 text-center text-xs text-[#877369] bg-white border border-[#E5E2E1] rounded-lg">
            No stops planned for Day {activeDay}. Enjoy leisure or local relaxation!
          </div>
        )}
      </div>
    </div>
  );
};

export default ItineraryView;
