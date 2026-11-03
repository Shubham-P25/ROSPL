import React from "react";
import Badge from "../../components/Badge";
import { Star, Clock, ExternalLink, Image as ImageIcon, ChevronUp, ChevronDown, Trash2 } from "lucide-react";

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
    rating,
    visitMinutes = 90,
    estCost,
    description,
    photoUrl,
    photoCredit,
    sourceUrl,
  } = place;

  const slotColors = {
    morning: "bg-[#FFF4ED] text-[#6C2F00] border-[#FFD9C2]",
    afternoon: "bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]",
    evening: "bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]",
  };

  return (
    <div className="bg-white border border-[#E5E2E1] rounded-lg shadow-xs hover:shadow-md hover:border-[#DAC2B6] transition-all overflow-hidden flex flex-col md:flex-row">
      {/* Photo Thumbnail */}
      <div className="relative w-full md:w-56 h-48 md:h-auto shrink-0 bg-[#F6F3F2] overflow-hidden group">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[#877369] p-4 text-center">
            <ImageIcon className="w-8 h-8 mb-1 opacity-50" />
            <span className="text-[11px]">Photo unavailable</span>
          </div>
        )}

        {photoCredit && (
          <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-xs text-[10px] text-white/90 px-2 py-0.5 truncate">
            {photoCredit}
          </div>
        )}
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
              {rating !== undefined && (
                <div className="flex items-center space-x-1 text-xs font-semibold text-[#877369]">
                  <Star className="w-3.5 h-3.5 fill-[#F0BD8B] text-[#F0BD8B]" />
                  <span>{rating.toFixed(1)} / 5</span>
                </div>
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
                      title="Remove stop"
                      className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <h4 className="font-serif text-xl font-bold text-[#1C1B1B] leading-snug">
            {name}
          </h4>

          {description && (
            <p className="text-xs text-[#54433A] leading-relaxed line-clamp-2">
              {description}
            </p>
          )}
        </div>

        {/* Footer Meta */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#F2EFEF] text-xs text-[#877369]">
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <Clock className="w-3.5 h-3.5 mr-1 text-[#6C2F00]" />
              {visitMinutes} mins visit
            </span>
            {estCost !== undefined && (
              <span>
                Est. Entry:{" "}
                <strong className="text-[#1C1B1B]">
                  {estCost > 0 ? `₹${estCost}` : "Free"}
                </strong>
              </span>
            )}
            {travelMinutesFromPrev > 0 && (
              <span className="text-[#877369] italic">
                ~{travelMinutesFromPrev}m travel from previous
              </span>
            )}
          </div>

          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-[#6C2F00] hover:underline text-xs font-semibold"
            >
              <span>Learn more</span>
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlaceCard;
