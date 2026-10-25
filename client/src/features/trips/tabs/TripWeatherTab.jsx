import React, { useState, useEffect } from "react";
import { weatherApi } from "../../../services/api/weatherApi";
import LoadingState from "../../../components/LoadingState";
import Button from "../../../components/Button";
import {
  CloudSun,
  Wind,
  Droplets,
  Thermometer,
  Calendar,
  Umbrella,
  Sparkles,
} from "lucide-react";

export const TripWeatherTab = ({ trip }) => {
  const [current, setCurrent] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const planWeather = trip?.planData?.weather;

  const fetchWeather = async () => {
    setLoading(true);
    setError(null);
    try {
      const [curRes, foreRes] = await Promise.all([
        weatherApi.getCurrent(trip.destination),
        weatherApi.getForecast(trip.destination),
      ]);
      setCurrent(curRes.data);
      setForecast(foreRes.data?.forecast || []);
    } catch (_err) {
      // Fallback to planWeather if available
      if (planWeather) {
        setCurrent({
          temp: planWeather.temperatureMax || 28,
          condition:
            (planWeather.rainProbability || 0) > 40
              ? "Possible Showers"
              : "Clear & Pleasant",
          feelsLike: planWeather.temperatureMax || 28,
          humidity: planWeather.rainProbability ? 65 : 45,
          windSpeed: 12,
        });
        setForecast(
          (planWeather.daily || []).map((d) => ({
            date: d.date,
            day: new Date(d.date).toLocaleDateString("en-IN", {
              weekday: "short",
            }),
            tempMax: d.tempMax,
            tempMin: d.tempMin,
            condition: d.rainProb > 40 ? "Rain" : "Sunny",
            rainProb: d.rainProb,
          })),
        );
      } else {
        setError(
          `Could not connect to external weather service. Weather forecast is available when generating a recommendation plan.`,
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (trip.destination) fetchWeather();
  }, [trip.destination, trip.planData]);

  const weatherData = current || (planWeather ? {
    temp: planWeather.temperatureMax || 28,
    condition: (planWeather.rainProbability || 0) > 40 ? "Possible Showers" : "Clear & Pleasant",
    feelsLike: planWeather.temperatureMax || 28,
    humidity: 50,
    windSpeed: 10,
  } : null);

  const forecastData = forecast.length > 0 ? forecast : (planWeather?.daily || []).map((d) => ({
    date: d.date,
    day: new Date(d.date).toLocaleDateString("en-IN", { weekday: "short" }),
    tempMax: d.tempMax,
    tempMin: d.tempMin,
    condition: d.rainProb > 40 ? "Rain" : "Sunny",
    rainProb: d.rainProb,
  }));

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="pb-4 border-b border-[#E5E2E1] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6C2F00] block mb-1">
            ATMOSPHERIC CONDITIONS
          </span>
          <h3 className="font-serif text-2xl font-bold text-[#1C1B1B]">
            Weather Forecast for {trip.destination}
          </h3>
          <p className="text-xs text-[#54433A] mt-1">
            Forecast reports and climate predictions to help you plan and pack
            accurately.
          </p>
        </div>

        {planWeather?.source && (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
            via {planWeather.source}
          </span>
        )}
      </div>

      {loading && !weatherData ? (
        <LoadingState
          message={`Observing atmospheric conditions in ${trip.destination}...`}
        />
      ) : weatherData ? (
        <div className="space-y-8">
          {/* Current Weather Card */}
          <div className="bg-gradient-to-br from-[#6C2F00] to-[#8C3F00] text-white rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="text-xs uppercase tracking-widest text-amber-200 font-bold">
                  Current Forecast · {trip.destination}
                </span>
                <div className="flex items-baseline space-x-3">
                  <span className="font-serif text-5xl sm:text-6xl font-bold">
                    {Math.round(weatherData.temp)}°C
                  </span>
                  <span className="text-lg font-medium text-amber-100">
                    {weatherData.condition}
                  </span>
                </div>
                {planWeather && (
                  <p className="text-xs text-amber-200/90 pt-1">
                    Expected High: {planWeather.temperatureMax}°C · Low: {planWeather.temperatureMin}°C
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 sm:gap-6 bg-black/20 backdrop-blur-xs p-4 rounded-xl text-center text-xs">
                <div>
                  <Thermometer className="w-4 h-4 mx-auto mb-1 text-amber-200" />
                  <span className="text-amber-200/80 block text-[11px]">Feels Like</span>
                  <span className="font-bold">{Math.round(weatherData.feelsLike || weatherData.temp)}°C</span>
                </div>
                <div>
                  <Umbrella className="w-4 h-4 mx-auto mb-1 text-amber-200" />
                  <span className="text-amber-200/80 block text-[11px]">Rain Chance</span>
                  <span className="font-bold">{planWeather?.rainProbability || 10}%</span>
                </div>
                <div>
                  <Wind className="w-4 h-4 mx-auto mb-1 text-amber-200" />
                  <span className="text-amber-200/80 block text-[11px]">Wind Speed</span>
                  <span className="font-bold">{weatherData.windSpeed || 12} km/h</span>
                </div>
              </div>
            </div>
          </div>

          {/* Forecast Days */}
          {forecastData.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-serif text-xl font-bold text-[#1C1B1B]">
                Daily Atmospheric Outlook
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {forecastData.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-[#E5E2E1] p-4 rounded-xl text-center space-y-2 shadow-xs"
                  >
                    <span className="text-xs font-bold text-[#6C2F00] uppercase block">
                      {item.day || `Day ${idx + 1}`}
                    </span>
                    <CloudSun className="w-6 h-6 mx-auto text-amber-600" />
                    <div className="text-xs font-semibold text-slate-800">
                      {item.tempMax ? `${Math.round(item.tempMax)}°` : `${Math.round(weatherData.temp)}°`} /{" "}
                      <span className="text-slate-400">
                        {item.tempMin ? `${Math.round(item.tempMin)}°` : `${Math.round(weatherData.temp - 10)}°`}
                      </span>
                    </div>
                    {item.rainProb !== undefined && (
                      <span className="text-[10px] text-sky-700 font-medium block">
                        🌧️ {item.rainProb}% rain
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 bg-white border border-[#E5E2E1] rounded-xl text-center space-y-4">
          <CloudSun className="w-10 h-10 text-amber-700 mx-auto opacity-75" />
          <div>
            <h4 className="font-serif text-lg font-bold text-slate-900">
              Weather Data for {trip.destination}
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Click below to sync live forecast data or generate a recommendation plan.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchWeather}>
            Fetch Weather
          </Button>
        </div>
      )}
    </div>
  );
};

export default TripWeatherTab;
