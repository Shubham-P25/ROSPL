import React, { useState } from "react";
import Button from "../../components/Button";
import FormField from "../../components/FormField";
import { Compass, Calendar, DollarSign, Users, Sparkles, MapPin } from "lucide-react";

const INTEREST_OPTIONS = [
  { id: "culture", label: "Culture & Heritage", icon: "🏛️" },
  { id: "nature", label: "Nature & Views", icon: "🌲" },
  { id: "food", label: "Culinary & Dining", icon: "🍛" },
  { id: "shopping", label: "Bazaars & Crafts", icon: "🛍️" },
  { id: "adventure", label: "Adventure & Trails", icon: "🧗" },
  { id: "religious", label: "Spiritual & Temples", icon: "🪔" },
  { id: "nightlife", label: "Nightlife & Cafes", icon: "🌙" },
];

const POPULAR_DESTINATIONS = ["Jaipur", "Goa", "Varanasi", "Udaipur", "Agra", "Kerala"];

export const PlannerForm = ({ onSubmit, initialValues = {}, loading = false }) => {
  const [destination, setDestination] = useState(initialValues.destination || "Jaipur");
  const [days, setDays] = useState(initialValues.days || 3);
  const [budget, setBudget] = useState(initialValues.budget || 15000);
  const [currency, setCurrency] = useState(initialValues.currency || "INR");
  const [travellers, setTravellers] = useState(initialValues.travellers || 1);
  const [pace, setPace] = useState(initialValues.pace || "normal");
  const [interests, setInterests] = useState(
    initialValues.interests || ["culture", "food"],
  );
  const [startDate, setStartDate] = useState(
    initialValues.startDate || new Date().toISOString().split("T")[0],
  );
  const [error, setError] = useState("");

  const toggleInterest = (id) => {
    if (interests.includes(id)) {
      if (interests.length === 1) {
        setError("Please select at least 1 interest.");
        return;
      }
      setInterests(interests.filter((item) => item !== id));
      setError("");
    } else {
      if (interests.length >= 6) {
        setError("You can choose up to 6 interests.");
        return;
      }
      setInterests([...interests, id]);
      setError("");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!destination.trim()) {
      setError("Please specify a travel destination.");
      return;
    }
    if (days < 1 || days > 14) {
      setError("Trip duration must be between 1 and 14 days.");
      return;
    }
    if (!budget || budget <= 0) {
      setError("Please provide a valid positive budget.");
      return;
    }
    if (interests.length === 0) {
      setError("Please select at least one interest.");
      return;
    }

    onSubmit({
      destination: destination.trim(),
      days: Number(days),
      budget: Number(budget),
      currency,
      travellers: Number(travellers),
      interests,
      pace,
      startDate: startDate || undefined,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-[#DAC2B6] rounded-2xl p-6 sm:p-10 shadow-lg max-w-3xl mx-auto space-y-8"
    >
      <div className="space-y-1">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6C2F00]">
          ZERO-DOLLAR OPEN SOURCE TRIP PLANNER
        </span>
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#1C1B1B]">
          Where would you like to travel?
        </h2>
        <p className="text-xs text-[#54433A]">
          Generate a complete day-by-day itinerary with monuments, weather, packing checklist, and budget split.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-[#FFDAD6]/60 border border-[#BA1A1A]/30 rounded text-xs text-[#BA1A1A]">
          {error}
        </div>
      )}

      {/* Destination Field & Quick Suggestions */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-[#1C1B1B]">
          Destination City
        </label>
        <div className="relative">
          <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-[#877369]" />
          <input
            type="text"
            required
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="e.g. Jaipur, Goa, Varanasi, Udaipur..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#FAF8F7] border border-[#DAC2B6] rounded-md text-sm text-[#1C1B1B] focus:outline-none focus:border-[#6C2F00] focus:ring-1 focus:ring-[#6C2F00]"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-[#877369] text-[11px]">Popular seeds:</span>
          {POPULAR_DESTINATIONS.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => setDestination(city)}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
                destination.toLowerCase() === city.toLowerCase()
                  ? "bg-[#6C2F00] text-white border-[#6C2F00]"
                  : "bg-white text-[#54433A] border-[#DAC2B6] hover:border-[#6C2F00]"
              }`}
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      {/* Days & Travellers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#1C1B1B] mb-1.5">
            Duration (Days)
          </label>
          <div className="relative">
            <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-[#877369]" />
            <input
              type="number"
              min="1"
              max="14"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-[#FAF8F7] border border-[#DAC2B6] rounded-md text-sm text-[#1C1B1B] focus:outline-none focus:border-[#6C2F00]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#1C1B1B] mb-1.5">
            Total Budget
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3.5 top-3 w-4 h-4 text-[#877369]" />
            <input
              type="number"
              min="1000"
              step="500"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-[#FAF8F7] border border-[#DAC2B6] rounded-md text-sm text-[#1C1B1B] focus:outline-none focus:border-[#6C2F00]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#1C1B1B] mb-1.5">
            Currency
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full px-3 py-2 bg-[#FAF8F7] border border-[#DAC2B6] rounded-md text-sm text-[#1C1B1B] focus:outline-none focus:border-[#6C2F00]"
          >
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
          </select>
        </div>
      </div>

      {/* Pace Selector */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-[#1C1B1B]">
          Travel Pace
        </label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: "relaxed", title: "Relaxed", desc: "3 stops/day, leisurely meals" },
            { id: "normal", title: "Standard", desc: "4 stops/day, balanced sight-seeing" },
            { id: "packed", title: "Packed", desc: "5 stops/day, action-oriented" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPace(item.id)}
              className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                pace === item.id
                  ? "bg-[#FFF4ED] border-[#6C2F00] ring-1 ring-[#6C2F00]"
                  : "bg-white border-[#E5E2E1] hover:border-[#DAC2B6]"
              }`}
            >
              <div className="text-xs font-bold text-[#1C1B1B]">{item.title}</div>
              <div className="text-[11px] text-[#877369] mt-0.5">{item.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Interests Selection */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-[#1C1B1B]">
          Interests (select 1 to 6)
        </label>
        <div className="flex flex-wrap gap-2">
          {INTEREST_OPTIONS.map((item) => {
            const isSelected = interests.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleInterest(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#6C2F00] text-white border-[#6C2F00] shadow-xs"
                    : "bg-[#FAF8F7] text-[#54433A] border-[#DAC2B6] hover:border-[#1C1B1B]"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-4 border-t border-[#F2EFEF]">
        <Button
          type="submit"
          variant="terracotta"
          size="lg"
          loading={loading}
          className="w-full text-sm font-semibold tracking-wider uppercase py-3.5"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          <span>Build Expedition Plan</span>
        </Button>
      </div>
    </form>
  );
};

export default PlannerForm;
