import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation, Compass, Clock, Tag } from "lucide-react";

// Fix default leaflet icon paths if standard markers are ever used
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function MapView({ days = [], places = {}, selectedDay = 1, onSelectDay }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);
  const [activePlace, setActivePlace] = useState(null);

  const activeDayData = days.find((d) => d.day === selectedDay) || days[0];
  const dayItems = activeDayData ? activeDayData.items : [];

  // Extract valid ordered stops with coordinates
  const stops = dayItems
    .map((item, idx) => {
      const place = places[item.placeId];
      if (!place || typeof place.lat !== "number" || typeof place.lng !== "number") {
        return null;
      }
      return {
        ...place,
        order: idx + 1,
        slot: item.slot,
        travelTime: item.travelMinutesFromPrev,
      };
    })
    .filter(Boolean);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map once
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      layerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    layerGroup.clearLayers();

    if (stops.length === 0) {
      // Default view
      map.setView([26.9124, 75.7872], 12);
      return;
    }

    const latLngs = [];

    stops.forEach((stop) => {
      const latLng = [stop.lat, stop.lng];
      latLngs.push(latLng);

      // Create rich custom numbered pin
      const iconHtml = `
        <div style="
          width: 34px;
          height: 34px;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          cursor: pointer;
        ">
          <span style="
            transform: rotate(45deg);
            font-weight: 700;
            font-size: 13px;
            font-family: inherit;
          ">${stop.order}</span>
        </div>
      `;

      const customIcon = L.divIcon({
        className: "custom-leaflet-marker",
        html: iconHtml,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
        popupAnchor: [0, -32],
      });

      const photoUrl =
        (stop.photos && stop.photos[0]?.url) ||
        stop.photoUrl ||
        "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=400&q=80";

      const popupContent = `
        <div style="min-width: 200px; max-width: 260px; font-family: system-ui, sans-serif;">
          <img src="${photoUrl}" alt="${stop.name}" style="width: 100%; height: 110px; object-fit: cover; border-radius: 6px; margin-bottom: 8px;" />
          <div style="font-weight: 700; font-size: 14px; color: #0f172a; margin-bottom: 4px;">#${stop.order} ${stop.name}</div>
          <div style="font-size: 12px; color: #64748b; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
            <span style="display: inline-block; padding: 2px 6px; background: #e0e7ff; color: #4338ca; border-radius: 4px; font-weight: 600; text-transform: capitalize;">${stop.category || "Place"}</span>
            <span>•</span>
            <span>${stop.visitMinutes || 90} mins</span>
          </div>
          ${stop.description ? `<p style="font-size: 12px; color: #334155; margin: 0; line-height: 1.4;">${stop.description.slice(0, 100)}...</p>` : ""}
        </div>
      `;

      const marker = L.marker(latLng, { icon: customIcon });
      marker.bindPopup(popupContent);
      marker.on("click", () => setActivePlace(stop));
      marker.addTo(layerGroup);
    });

    // Draw route polyline between consecutive stops
    if (latLngs.length > 1) {
      L.polyline(latLngs, {
        color: "#6366f1",
        weight: 3.5,
        opacity: 0.85,
        dashArray: "6, 8",
        lineCap: "round",
        lineJoin: "round",
      }).addTo(layerGroup);
    }

    // Fit map bounds to show all markers
    const bounds = L.latLngBounds(latLngs);
    map.fitBounds(bounds, { padding: [45, 45], maxZoom: 15 });
  }, [stops, selectedDay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      {/* Map Header with Day selector & stats */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-slate-800 text-sm">Interactive Route Map</h3>
          <span className="text-xs text-slate-500 font-medium ml-1">
            ({stops.length} mapped {stops.length === 1 ? "stop" : "stops"})
          </span>
        </div>

        {/* Day selection tabs */}
        <div className="flex items-center gap-1 overflow-x-auto py-1">
          {days.map((d) => (
            <button
              key={d.day}
              type="button"
              onClick={() => onSelectDay && onSelectDay(d.day)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedDay === d.day
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              Day {d.day}
            </button>
          ))}
        </div>
      </div>

      {/* Map container */}
      <div className="relative w-full h-[420px] bg-slate-100">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Floating Quick Legend */}
        <div className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur-sm border border-slate-200/80 rounded-xl px-3 py-2 text-xs shadow-md">
          <div className="font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
            <Navigation className="w-3.5 h-3.5 text-indigo-600" />
            Route Sequence
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block"></span>
            Numbered pins indicate optimal daily visiting order
          </div>
        </div>

        {/* Selected Place Overlay Card */}
        {activePlace && (
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-xs z-10 bg-white rounded-xl shadow-lg border border-slate-200 p-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="font-bold text-sm text-slate-900 truncate">
                #{activePlace.order} {activePlace.name}
              </div>
              <button
                type="button"
                onClick={() => setActivePlace(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold px-1"
              >
                ✕
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium capitalize">
                {activePlace.category}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {activePlace.visitMinutes || 90}m
              </span>
              <span>₹{activePlace.estCost || 0}</span>
            </div>
            {activePlace.description && (
              <p className="text-xs text-slate-600 line-clamp-2">
                {activePlace.description}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Attribution footer */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>© OpenStreetMap contributors • Open-source geographic routing</span>
        <span>Leaflet Engine</span>
      </div>
    </div>
  );
}
