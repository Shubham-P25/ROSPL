import React, { useState, useEffect } from "react";
import { weatherApi } from "../../../services/api/weatherApi";
import Button from "../../../components/Button";
import {
  CloudSun,
  Sun,
  CloudRain,
  Cloud,
  Wind,
  Thermometer,
  Umbrella,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

const fmt = (n) => (Number.isFinite(n) ? `${Math.round(n)}°` : "—");
const fmtFull = (n) => (Number.isFinite(n) ? `${Math.round(n)}°C` : "—");

function WeatherIcon({ condition = "", className = "w-6 h-6" }) {
  const c = (condition || "").toLowerCase();
  if (c.includes("rain") || c.includes("drizzle") || c.includes("shower")) {
    return <CloudRain className={`${className} text-sky-500`} />;
  }
  if (c.includes("clear") || c.includes("sun")) {
    return <Sun className={`${className} text-amber-500`} />;
  }
  if (c.includes("cloud") || c.includes("overcast")) {
    return <CloudSun className={`${className} text-amber-600`} />;
  }
  return <Cloud className={`${className} text-slate-400`} />;
}

export const TripWeatherTab = ({ trip }) => {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWeather = async () => {
    if (!trip?._id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await weatherApi.getTripWeather(trip._id);
      if (res.data) {
        setWeatherData(res.data);
      } else {
        setError("Weather data temporarily unavailable.");
      }
    } catch (_err) {
      setError("Unable to retrieve weather forecast right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, [trip?._id]);

  const current = weatherData?.current;
  const daily = weatherData?.daily || [];
  // Today's rain probability from the first daily record or current
  const todayRainProb = daily[0]?.rainProb ?? 0;

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="pb-4 border-b border-[#E5E2E1] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6C2F00] block mb-1">
            Atmospheric Conditions
          </span>
          <h3 className="font-serif text-2xl font-bold text-[#1C1B1B]">
            Weather Forecast for {trip?.destination}
          </h3>
          <p className="text-xs text-[#54433A] mt-1">
            Live Open-Meteo forecast tailored to your expedition dates.
          </p>
        </div>

        {weatherData?.source && (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
            via {weatherData.source}
          </span>
        )}
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-6 animate-pulse">
          <div className="h-44 bg-[#EBE7E5] rounded-2xl w-full" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {[...Array(Math.min(7, Math.max(3, daily.length || 4)))].map((_, i) => (
              <div key={i} className="h-36 bg-[#EBE7E5] rounded-xl" />
            ))}
          </div>
        </div>
      ) : error && !weatherData ? (
        <div className="p-8 bg-white border border-[#E5E2E1] rounded-2xl text-center space-y-4 max-w-lg mx-auto shadow-xs">
          <AlertCircle className="w-10 h-10 text-amber-700 mx-auto" />
          <div>
            <h4 className="font-serif text-lg font-bold text-[#1C1B1B]">
              Weather Report Unavailable
            </h4>
            <p className="text-xs text-[#54433A] mt-1">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchWeather}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Retry Weather Sync
          </Button>
        </div>
      ) : weatherData ? (
        <div className="space-y-8">
          {/* Current Weather Banner */}
          <div className="bg-gradient-to-br from-[#6C2F00] to-[#8C3F00] text-white rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="text-xs uppercase tracking-widest text-amber-200 font-bold">
                  Atmospheric Snapshot · {weatherData.location || trip?.destination}
                </span>
                <div className="flex items-baseline space-x-3">
                  <span className="font-serif text-5xl sm:text-6xl font-bold">
                    {fmtFull(current?.temp)}
                  </span>
                  <span className="text-lg font-medium text-amber-100">
                    {current?.condition || "Partly Cloudy"}
                  </span>
                </div>
                {daily[0] && (
                  <p className="text-xs text-amber-200/90 pt-1">
                    Expected High: {fmtFull(daily[0].tempMax)} · Low: {fmtFull(daily[0].tempMin)}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 sm:gap-6 bg-black/20 backdrop-blur-xs p-4 rounded-xl text-center text-xs">
                <div>
                  <Thermometer className="w-4 h-4 mx-auto mb-1 text-amber-200" />
                  <span className="text-amber-200/80 block text-[11px]">Feels Like</span>
                  <span className="font-bold">{fmtFull(current?.feelsLike ?? current?.temp)}</span>
                </div>
                <div>
                  <Umbrella className="w-4 h-4 mx-auto mb-1 text-amber-200" />
                  <span className="text-amber-200/80 block text-[11px]">Rain Chance</span>
                  <span className="font-bold">{Number.isFinite(todayRainProb) ? `${todayRainProb}%` : "—"}</span>
                </div>
                <div>
                  <Wind className="w-4 h-4 mx-auto mb-1 text-amber-200" />
                  <span className="text-amber-200/80 block text-[11px]">Wind Speed</span>
                  <span className="font-bold">{Number.isFinite(current?.windSpeed) ? `${current.windSpeed} km/h` : "—"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Outlook — exactly one card per daily entry */}
          {daily.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-serif text-xl font-bold text-[#1C1B1B]">
                  Daily Atmospheric Outlook ({daily.length} Days)
                </h4>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {daily.map((item, idx) => (
                  <div
                    key={item.date || idx}
                    className="bg-white border border-[#E5E2E1] p-4 rounded-xl text-center space-y-2 shadow-xs hover:border-[#6C2F00]/30 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-[#6C2F00] uppercase block">
                        {item.day || `Day ${idx + 1}`}
                      </span>
                      <span className="text-[10px] text-[#7A6B63] block">
                        {item.date ? new Date(item.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : ""}
                      </span>
                    </div>

                    <div className="py-1">
                      <WeatherIcon condition={item.condition} className="w-7 h-7 mx-auto" />
                      <span className="text-[11px] text-[#54433A] font-medium block mt-1 truncate">
                        {item.condition || "Pleasant"}
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-[#1C1B1B]">
                        {fmt(item.tempMax)}{" "}
                        <span className="text-[#8B7366] font-normal">
                          / {fmt(item.tempMin)}
                        </span>
                      </div>

                      {Number.isFinite(item.rainProb) && (
                        <span className="text-[10px] text-sky-700 font-medium block mt-0.5">
                          🌧️ {item.rainProb}% rain
                        </span>
                      )}

                      {item.source === "climatology" && (
                        <span className="inline-block mt-2 px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                          Typical for this time
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default TripWeatherTab;
