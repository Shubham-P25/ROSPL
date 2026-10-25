import React, { useState, useEffect } from "react";
import { emergencyApi } from "../../../services/api/emergencyApi";
import { getErrorMessage } from "../../../services/api/client";
import LoadingState from "../../../components/LoadingState";
import { Phone, ShieldAlert, Flame, HeartPulse, Info, Train, Car, LifeBuoy } from "lucide-react";

const NUMBER_ROWS = [
  { key: "police", label: "Police Emergency", number: "100", icon: ShieldAlert, desc: "Immediate police dispatch & crime reporting" },
  { key: "fire", label: "Fire & Rescue Service", number: "101", icon: Flame, desc: "Fire accidents & rescue operations" },
  { key: "ambulance", label: "Ambulance / Medical Emergency", number: "102", icon: HeartPulse, desc: "Ambulance & urgent medical response (102 / 108)" },
  { key: "general", label: "Unified National Emergency", number: "112", icon: LifeBuoy, desc: "Single all-in-one emergency helpline across India" },
  { key: "womenHelpline", label: "Women Helpline", number: "1091", icon: Phone, desc: "24x7 safety & distress support for women" },
  { key: "touristHelpline", label: "National Tourist Helpline", number: "1363", icon: Info, desc: "Multi-lingual guidance & safety for tourists" },
  { key: "railwayHelpline", label: "Indian Railways Helpline", number: "139", icon: Train, desc: "Train inquiries, medical aid & passenger security" },
  { key: "highwayHelpline", label: "National Highway Emergency", number: "1033", icon: Car, desc: "Expressway & national highway assistance & towing" },
];

export const TripEmergencyTab = ({ trip }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNumbers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await emergencyApi.getByDestination(trip.destination);
      setData(res.data);
    } catch (err) {
      console.warn("Emergency numbers fetch error:", err);
      // Fallback for Indian destinations
      setData({
        country: "India",
        police: "100",
        fire: "101",
        ambulance: "102",
        general: "112",
        womenHelpline: "1091",
        touristHelpline: "1363",
        railwayHelpline: "139",
        highwayHelpline: "1033",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (trip.destination) fetchNumbers();
  }, [trip.destination]);

  if (loading) {
    return (
      <LoadingState
        message={`Looking up emergency numbers for ${trip.destination}...`}
      />
    );
  }

  // Ensure consecutive numbers are resolved
  const rowsToDisplay = NUMBER_ROWS.map((row) => ({
    ...row,
    resolvedNumber: data?.[row.key] || row.number,
  })).filter((row) => row.resolvedNumber);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-[#E5E2E1] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6C2F00] block mb-1">
            Consecutive Emergency Contacts
          </span>
          <h3 className="font-serif text-2xl font-bold text-[#1C1B1B]">
            {data?.country
              ? `Emergency Numbers — ${data.country}`
              : `Emergency Numbers for ${trip.destination}`}
          </h3>
          <p className="text-xs text-[#54433A] mt-1">
            Tap or click any emergency card to directly open your phone dialer.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#FAF8F7] border border-[#DAC2B6] px-3.5 py-2 rounded text-xs text-[#6C2F00] font-medium shrink-0">
          <Phone className="w-4 h-4 animate-pulse" />
          <span>One-Touch Direct Calling Enabled</span>
        </div>
      </div>

      {data?.note && (
        <div className="flex gap-2 items-start p-3.5 rounded bg-[#FCF3E8] border border-[#EED9BE] text-xs text-[#6C2F00]">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{data.note}</span>
        </div>
      )}

      {/* Grid of Emergency Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rowsToDisplay.map(({ key, label, icon: Icon, resolvedNumber, desc }) => (
          <a
            key={key}
            href={`tel:${resolvedNumber}`}
            className="flex items-center justify-between p-4 sm:p-5 rounded-lg border border-[#E5E2E1] hover:border-[#6C2F00] hover:shadow-md transition-all bg-white group cursor-pointer"
            title={`Click to dial ${label} (${resolvedNumber})`}
          >
            <div className="flex items-start gap-3.5 min-w-0 pr-3">
              <div className="w-10 h-10 rounded-full bg-[#6C2F00]/10 group-hover:bg-[#6C2F00] flex items-center justify-center shrink-0 transition-colors">
                <Icon className="w-5 h-5 text-[#6C2F00] group-hover:text-white transition-colors" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-[#1C1B1B] group-hover:text-[#6C2F00] transition-colors truncate">
                  {label}
                </h4>
                <p className="text-[11px] text-[#877369] mt-0.5 line-clamp-1">
                  {desc}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="font-serif text-2xl font-bold text-[#1C1B1B] group-hover:text-[#6C2F00] transition-colors">
                {resolvedNumber}
              </span>
              <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-[#6C2F00] text-white group-hover:bg-[#8D3F00] transition-colors flex items-center gap-1.5 shadow-xs">
                <Phone className="w-3.5 h-3.5" />
                <span>Call</span>
              </span>
            </div>
          </a>
        ))}
      </div>

      {/* Offline safety hint */}
      <div className="p-4 bg-[#FAF8F7] border border-[#E5E2E1] rounded text-xs text-[#54433A] flex items-center justify-between">
        <span>💡 Save or screenshot these numbers before your journey in case of low mobile reception in remote areas.</span>
      </div>
    </div>
  );
};

export default TripEmergencyTab;
