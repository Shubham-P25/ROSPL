import React, { useState, useEffect } from "react";
import { emergencyApi } from "../../../services/api/emergencyApi";
import { getErrorMessage } from "../../../services/api/client";
import LoadingState from "../../../components/LoadingState";
import { Phone, ShieldAlert, Flame, HeartPulse, Info } from "lucide-react";

const NUMBER_ROWS = [
  { key: "police", label: "Police", icon: ShieldAlert },
  { key: "ambulance", label: "Ambulance", icon: HeartPulse },
  { key: "fire", label: "Fire", icon: Flame },
  { key: "womenHelpline", label: "Women's Helpline", icon: Phone },
  { key: "touristHelpline", label: "Tourist Helpline", icon: Phone },
  { key: "touristPolice", label: "Tourist Police", icon: ShieldAlert },
  { key: "nonEmergencyPolice", label: "Non-Emergency Police", icon: Phone },
  { key: "euGeneral", label: "EU General Emergency", icon: Phone },
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
      setError(getErrorMessage(err, "Could not load emergency numbers."));
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

  if (error) {
    return (
      <div className="p-6 rounded border border-[#E5E2E1] bg-[#FCF9F8] text-sm text-[#54433A]">
        {error}
      </div>
    );
  }

  const availableRows = NUMBER_ROWS.filter((row) => data?.[row.key]);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="pb-4 border-b border-[#E5E2E1]">
        <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6C2F00] block mb-1">
          Local Emergency Contacts
        </span>
        <h3 className="font-serif text-2xl font-bold text-[#1C1B1B]">
          {data?.country
            ? `Emergency Numbers — ${data.country}`
            : `Emergency Numbers for ${trip.destination}`}
        </h3>
        <p className="text-xs text-[#54433A] mt-1">
          Save these before you travel — reception isn't guaranteed
          everywhere, but a screenshot works offline.
        </p>
      </div>

      {data?.resolvedBy === "keyword-match" && (
        <div className="flex gap-2 items-start p-3 rounded bg-[#FCF3E8] border border-[#EED9BE] text-xs text-[#6C2F00]">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Matched to {data.country} from your destination text. If that's
            wrong, please verify local numbers directly.
          </span>
        </div>
      )}

      {data?.note && (
        <div className="flex gap-2 items-start p-3 rounded bg-[#FCF3E8] border border-[#EED9BE] text-xs text-[#6C2F00]">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{data.note}</span>
        </div>
      )}

      {availableRows.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4">
          {availableRows.map(({ key, label, icon: Icon }) => (
            <a
              key={key}
              href={`tel:${data[key]}`}
              className="flex items-center justify-between p-4 rounded border border-[#E5E2E1] hover:border-[#6C2F00] transition-colors bg-white"
            >
              <span className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-[#6C2F00]" />
                <span className="text-sm font-medium text-[#1C1B1B]">
                  {label}
                </span>
              </span>
              <span className="font-serif text-lg font-bold text-[#6C2F00]">
                {data[key]}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default TripEmergencyTab;
