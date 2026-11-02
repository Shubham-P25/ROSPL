import React from "react";
import Badge from "../../components/Badge";
import PlacePhoto from "../../components/PlacePhoto";
import {
  Sparkles,
  Clock,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Trash2,
} from "lucide-react";

export const PlaceCard = ({
  place,
  slot,
  travelMinutesFromPrev,
  onMoveUp,
  onMoveDown,
  onRemove,
  isFirst = false,
  isLast = false,
}) => {
  if (!place) return null;

  const {
    name,
    category,
    visitMinutes = 90,
    estCost,
    description,
    photoUrl,
    photos,
    photoCredit,
    sourceUrl,
    rate,
    popularity,
  } = place;

  const displayPhoto = photos?.[0]?.url || photoUrl || null;
  const displayCredit = photos?.[0]?.author || photoCredit;

  const slotColors = {
    morning: "bg-[#FFF4ED] text-[#6C2F00] border-[#FFD9C2]",
    afternoon: "bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]",
    evening: "bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]",
  };

  const isPopular = (rate && rate >= 3) || (popularity && popularity >= 0.8);

  return (
    <div className="bg-white border border-[#E5E2E1] rounded-lg shadow-xs hover:shadow-md hover:border-[#DAC2B6] transition-all overflow-hidden flex flex-col md:flex-row">
      {/* Photo Thumbnail */}
      <div className="relative w-full md:w-56 h-48 md:h-auto shrink-0 bg-[#F6F3F2] overflow-hidden group">
        <PlacePhoto
          src={displayPhoto}
          alt={name}
          category={category}
          credit={displayCredit}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      {/* Place Details */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Badge variant="terracotta" size="xs">
                {category}
              </Badge>
              {slot && (
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border capitalize ${
                    slotColors[slot] || "bg-gray-100 text-gray-700"
                  }`}
                >
                  {slot}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {isPopular && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  Popular
                </span>
              )}

              {/* Interactive reorder / remove controls */}
              {(onMoveUp || onMoveDown || onRemove) && (
                <div className="flex items-center space-x-1 bg-slate-100 rounded-lg p-0.5 ml-2">
                  {onMoveUp && !isFirst && (
                    <button
                      type="button"
                      onClick={onMoveUp}
                      title="Move stop earlier"
                      className="p-1 hover:bg-white rounded text-slate-500 hover:text-indigo-600 transition-colors"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onMoveDown && !isLast && (
                    <button
                      type="button"
                      onClick={onMoveDown}
                      title="Move stop later"
                      className="p-1 hover:bg-white rounded text-slate-500 hover:text-indigo-600 transition-colors"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {onRemove && (
                    <button
                      type="button"
                      onClick={onRemove}
                      title="Remove place from day"
                      className="p-1 hover:bg-white rounded text-slate-500 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <h4 className="font-serif text-lg font-bold text-[#1C1B1B]">{name}</h4>

          {description && (
            <p className="text-xs text-[#54433A] leading-relaxed line-clamp-2">
              {description}
            </p>
          )}
        </div>

        <div className="pt-2 border-t border-[#F0ECE9] flex flex-wrap items-center justify-between gap-3 text-xs text-[#877369]">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-[#6C2F00]" />
              <span>{visitMinutes} mins</span>
            </span>
            {estCost !== undefined && (
              <span className="font-medium text-[#1C1B1B]">
                {estCost > 0 ? `₹${estCost.toLocaleString("en-IN")}` : "Free"}
              </span>
            )}
            {travelMinutesFromPrev > 0 && (
              <span className="text-[#877369] italic">
                ~{travelMinutesFromPrev}m transit
              </span>
            )}
          </div>

          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 text-[#6C2F00] hover:text-[#3B1900] font-semibold text-[11px]"
            >
              <span>Info</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlaceCard;
