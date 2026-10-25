import React, { useState } from "react";
import Modal from "../../components/Modal";
import Button from "../../components/Button";
import {
  Sparkles,
  DollarSign,
  Compass,
  Heart,
  Users,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { tripsApi } from "../../services/api/tripsApi";
import { getErrorMessage } from "../../services/api/client";

const INTEREST_OPTIONS = [
  { id: "culture", label: "Culture & Heritage", icon: "🏛️" },
  { id: "food", label: "Culinary & Street Food", icon: "🍛" },
  { id: "nature", label: "Nature & Views", icon: "🌿" },
  { id: "adventure", label: "Adventure", icon: "🧗" },
  { id: "shopping", label: "Bazaars & Crafts", icon: "🛍️" },
  { id: "relaxation", label: "Relaxation", icon: "☕" },
];

const PACE_OPTIONS = [
  { id: "relaxed", label: "Relaxed", desc: "2-3 stops/day" },
  { id: "normal", label: "Balanced", desc: "3-4 stops/day" },
  { id: "packed", label: "Packed", desc: "4-5 stops/day" },
];

export default function GenerateRecommendationModal({
  isOpen,
  onClose,
  trip,
  onSuccess,
}) {
  const [budget, setBudget] = useState(trip?.budget > 0 ? trip.budget : 15000);
  const [pace, setPace] = useState("normal");
  const [interests, setInterests] = useState(["culture", "food"]);
  const [travellers, setTravellers] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!trip) return null;

  const toggleInterest = (id) => {
    if (interests.includes(id)) {
      if (interests.length > 1) {
        setInterests(interests.filter((i) => i !== id));
      }
    } else {
      setInterests([...interests, id]);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await tripsApi.generateRecommendations(trip._id, {
        budget: Number(budget) || 15000,
        pace,
        interests,
        travellers: Number(travellers) || 1,
      });

      if (res.data?.trip) {
        if (onSuccess) onSuccess(res.data.trip, res.data.plan);
        onClose();
      }
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Failed to generate recommendations. Please try again.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? () => {} : onClose}
      title="Generate AI Trip Recommendation Plan"
      subtitle={`Instant tailored blueprint for your trip to ${trip.destination}`}
    >
      <form onSubmit={handleGenerate} className="space-y-6 pt-2">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Highlight notification */}
        <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-xs text-amber-900 leading-relaxed">
          <p className="font-semibold text-amber-950 flex items-center gap-1.5 mb-1">
            <Sparkles className="w-4 h-4 text-amber-700" />
            Populates all trip sections automatically:
          </p>
          <p className="text-[11px] text-amber-800/90">
            Daily Itinerary · Sights with Leaflet Route Map · Budget breakdown &
            Expenses · Weather-tailored Packing list · Local Notes & Sights.
          </p>
        </div>

        {/* 1. Crucial Input: Budget */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
            <span>Total Trip Budget (₹ INR)</span>
            <span className="text-[11px] text-slate-400 font-normal">
              For entire stay
            </span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">
              ₹
            </span>
            <input
              type="number"
              min="1000"
              max="10000000"
              step="500"
              required
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:border-amber-700 focus:bg-white transition-all"
              placeholder="15000"
            />
          </div>
        </div>

        {/* 2. Crucial Input: Pace */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
            Travel Pace
          </label>
          <div className="grid grid-cols-3 gap-2">
            {PACE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPace(opt.id)}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  pace === opt.id
                    ? "bg-amber-900/10 border-amber-800 text-amber-950 font-bold shadow-xs"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <div className="text-xs font-bold capitalize">{opt.label}</div>
                <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                  {opt.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Crucial Input: Interests */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
            Interests & Highlights
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {INTEREST_OPTIONS.map((item) => {
              const isSelected = interests.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleInterest(item.id)}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? "bg-amber-900 text-white border-amber-900 shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <span>{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Crucial Input: Travellers */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
            Travellers
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 6].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setTravellers(num)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  travellers === num
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {num} {num === 1 ? "Solo" : num === 2 ? "Couple" : "People"}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            size="md"
            disabled={loading}
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={loading}
            className="bg-[#6C2F00] hover:bg-[#522300] text-white"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {loading ? "Generating Plan..." : "Generate Recommendation Plan"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
