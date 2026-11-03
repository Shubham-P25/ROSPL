import React from "react";
import Button from "../../components/Button";
import { Compass, Sparkles, MapPin, CloudSun, Calendar, ShieldAlert } from "lucide-react";

export const PlanProgress = ({ stage, progress = 0, error, onRetry, onCancel }) => {
  const STAGE_LABELS = {
    geocode: "Pinpointing destination coordinates...",
    places: "Discovering curated sights and attractions...",
    weather: "Observing atmospheric forecast and climate...",
    planning: "Optimizing day-by-day travel routes and slots...",
    photos: "Enriching high-resolution imagery and credits...",
    saving: "Finalizing your expedition itinerary snapshot...",
  };

  const currentLabel = STAGE_LABELS[stage] || "Crafting your expedition itinerary...";

  return (
    <div className="bg-white border border-[#DAC2B6] rounded-xl p-8 max-w-2xl mx-auto shadow-md space-y-6 text-center">
      <div className="w-16 h-16 rounded-full bg-[#FFF4ED] text-[#6C2F00] flex items-center justify-center mx-auto shadow-inner animate-pulse">
        {stage === "weather" ? (
          <CloudSun className="w-8 h-8" />
        ) : stage === "places" ? (
          <MapPin className="w-8 h-8" />
        ) : stage === "planning" ? (
          <Calendar className="w-8 h-8" />
        ) : (
          <Compass className="w-8 h-8 animate-spin" />
        )}
      </div>

      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6C2F00]">
          INTELLIGENT TRIP BUILDER
        </span>
        <h3 className="font-serif text-2xl font-bold text-[#1C1B1B]">
          Generating Your Custom Itinerary
        </h3>
        <p className="text-xs text-[#54433A] max-w-md mx-auto">{currentLabel}</p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="w-full bg-[#F2EFEF] rounded-full h-2.5 overflow-hidden border border-[#E5E2E1]">
          <div
            className="bg-[#6C2F00] h-2.5 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.max(5, progress)}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] font-semibold text-[#877369]">
          <span>{stage ? stage.toUpperCase() : "PROCESSING"}</span>
          <span>{progress}%</span>
        </div>
      </div>

      {error ? (
        <div className="p-4 bg-[#FFDAD6]/40 border border-[#BA1A1A]/30 rounded-lg text-left text-xs text-[#BA1A1A] space-y-3">
          <div className="flex items-center space-x-2 font-bold">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Generation Interrupted</span>
          </div>
          <p>{error}</p>
          <div className="flex space-x-3 pt-2">
            <Button variant="danger" size="sm" onClick={onRetry}>
              Retry Plan
            </Button>
            <Button variant="outline" size="sm" onClick={onCancel}>
              Change Preferences
            </Button>
          </div>
        </div>
      ) : (
        <div className="pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-[#877369] hover:text-[#1C1B1B] underline cursor-pointer"
          >
            Cancel and edit request
          </button>
        </div>
      )}
    </div>
  );
};

export default PlanProgress;
