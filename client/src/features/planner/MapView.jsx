import React, { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Compass,
  MapPin,
  Calendar,
  Layers,
  Eye,
  Navigation,
} from "lucide-react";

// Distinct accessible colors for each day in "All Days" mode
const DAY_COLORS = [
  "#6C2F00", // Terracotta Brown (Day 1)
  "#1D4ED8", // Cobalt Blue (Day 2)
  "#047857", // Forest Emerald (Day 3)
  "#B45309", // Warm Amber (Day 4)
  "#7C3AED", // Royal Violet (Day 5)
  "#BE185D", // Berry Crimson (Day 6)
  "#0F766E", // Deep Teal (Day 7)
];

// OSRM in-memory geometry cache to avoid repetitive queries to the public server
const osrmCache = new Map();

/**
 * Fetch real driving road geometry from OSRM public demo server with in-memory caching
 */
async function fetchOsrmRoute(latLngs) {
  if (!latLngs || latLngs.length < 2) return null;
  const cacheKey = latLngs.map(([lat, lng]) => `${lat.toFixed(4)},${lng.toFixed(4)}`).join(";");
  if (osrmCache.has(cacheKey)) {
    return osrmCache.get(cacheKey);
  }

  try {
    const coordsStr = latLngs.map(([lat, lng]) => `${lng},${lat}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    if (data.code === "Ok" && data.routes?.[0]?.geometry?.coordinates) {
      // GeoJSON is [lng, lat], Leaflet polyline requires [lat, lng]
      const roadPoints = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      osrmCache.set(cacheKey, roadPoints);
      return roadPoints;
    }
  } catch (_e) {
    // Fall back to straight dashed line
  }
  return null;
}

/**
 * Escapes HTML characters safely to prevent injection into popups
 */
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function MapView({
  days = [],
  places = {},
  selectedDay = null,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);
  const markerMapRef = useRef(new Map());

  // View mode: specific day (number) or "all"
  const [viewMode, setViewMode] = useState("all");

  // Determine active day filter
  const activeDayNumber = useMemo(() => {
    if (viewMode === "all") return "all";
    if (selectedDay) return Number(selectedDay);
    return 1;
  }, [viewMode, selectedDay]);

  // Sync external selectedDay change
  useEffect(() => {
    if (selectedDay && selectedDay !== "all") {
      setViewMode(Number(selectedDay));
    }
  }, [selectedDay]);

  // Compute stops depending on days, places, and activeDayNumber
  const stops = useMemo(() => {
    if (!days || days.length === 0) return [];

    let targetDays = [];
    if (activeDayNumber === "all") {
      targetDays = days;
    } else {
      const d = days.find((item) => item.day === Number(activeDayNumber));
      targetDays = d ? [d] : [];
    }

    let globalOrder = 1;
    const result = [];

    targetDays.forEach((d) => {
      const dayColor = DAY_COLORS[(d.day - 1) % DAY_COLORS.length];
      (d.items || []).forEach((item, idx) => {
        const place = places[item.placeId];
        if (place && typeof place.lat === "number" && typeof place.lng === "number") {
          result.push({
            ...place,
            dayNumber: d.day,
            dayIndex: idx + 1,
            order: activeDayNumber === "all" ? globalOrder++ : idx + 1,
            slot: item.slot || "morning",
            color: dayColor,
            globalId: `${d.day}-${place.id || idx}`,
          });
        }
      });
    });

    return result;
  }, [days, places, activeDayNumber]);

  // Stable key for redraw dependency
  const stopsStableKey = useMemo(() => {
    return stops.map((s) => `${s.globalId}:${s.lat.toFixed(4)},${s.lng.toFixed(4)}`).join("|");
  }, [stops]);

  // ── EFFECT 1: Map Initialization (runs once on mount) ──
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Initialize Leaflet map with explicit initial center and zoom
    // (guarantees map._loaded = true and map._mapPane is defined immediately)
    const map = L.map(mapContainerRef.current, {
      center: [20.5937, 78.9629], // India center baseline
      zoom: 5,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    // Check optional CARTO key in client environment
    const cartoKey = import.meta.env.VITE_CARTO_API_KEY;
    const tileUrl = cartoKey
      ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${cartoKey}`
      : "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

    const attribution = cartoKey
      ? '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>'
      : '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

    L.tileLayer(tileUrl, {
      attribution,
      maxZoom: 19,
      subdomains: cartoKey ? "abcd" : "abc",
    }).addTo(map);

    layerGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    // ResizeObserver to handle tab changes & container sizing automatically
    const ro = new ResizeObserver(() => {
      if (mapInstanceRef.current && mapInstanceRef.current._mapPane) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    ro.observe(mapContainerRef.current);

    const rafId = requestAnimationFrame(() => {
      if (mapInstanceRef.current && mapInstanceRef.current._mapPane) {
        mapInstanceRef.current.invalidateSize();
      }
    });

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (_e) {}
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // ── EFFECT 2: Redraw Markers & Polyline when stops change ──
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup || !map._mapPane) return;

    layerGroup.clearLayers();
    markerMapRef.current.clear();

    if (stops.length === 0) {
      if (map._mapPane) {
        map.setView([19.076, 72.8777], 11);
      }
      return;
    }

    const latLngs = [];

    // Group stops by day to draw routes per day
    const dayGroups = new Map();

    stops.forEach((stop) => {
      const latLng = [stop.lat, stop.lng];
      latLngs.push(latLng);

      if (!dayGroups.has(stop.dayNumber)) {
        dayGroups.set(stop.dayNumber, []);
      }
      dayGroups.get(stop.dayNumber).push(latLng);

      const color = stop.color || "#6C2F00";

      // Numbered pin with clean SVG / CSS styling
      const iconHtml = `
        <div style="
          width: 32px;
          height: 32px;
          background: ${color};
          color: white;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          cursor: pointer;
        ">
          <span style="
            transform: rotate(45deg);
            font-weight: 700;
            font-size: 12px;
            font-family: inherit;
          ">${stop.order}</span>
        </div>
      `;

      const customIcon = L.divIcon({
        className: "packgo-map-marker",
        html: iconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -30],
      });

      // Escape all HTML content to guarantee security
      const safeName = escapeHtml(stop.name);
      const safeCategory = escapeHtml(stop.category || "Sight");
      const safeDesc = escapeHtml(
        stop.description ? `${stop.description.slice(0, 120)}...` : "",
      );
      const verifiedPhoto =
        stop.photos?.[0]?.url || stop.photoUrl || null;

      let photoHtml = "";
      if (verifiedPhoto) {
        photoHtml = `<img src="${escapeHtml(verifiedPhoto)}" alt="${safeName}" style="width: 100%; height: 110px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />`;
      } else {
        photoHtml = `
          <div style="width: 100%; height: 80px; background: linear-gradient(135deg, ${color} 0%, #1c1b1b 100%); border-radius: 8px; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; color: #ffecd6; font-size: 11px; font-weight: 600; text-transform: uppercase;">
            ${safeCategory}
          </div>
        `;
      }

      const popupContent = `
        <div style="min-width: 210px; max-width: 260px; font-family: system-ui, sans-serif;">
          ${photoHtml}
          <div style="font-weight: 700; font-size: 14px; color: #1c1b1b; margin-bottom: 4px;">
            ${viewMode === "all" ? `D${stop.dayNumber} · ` : ""}#${stop.order} ${safeName}
          </div>
          <div style="font-size: 11px; color: #54433a; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
            <span style="padding: 2px 6px; background: #f6f3f2; color: #6c2f00; border-radius: 4px; font-weight: 600; text-transform: capitalize;">${safeCategory}</span>
            <span>•</span>
            <span>${stop.visitMinutes || 90} mins</span>
          </div>
          ${safeDesc ? `<p style="font-size: 11px; color: #54433a; margin: 0; line-height: 1.4;">${safeDesc}</p>` : ""}
        </div>
      `;

      const marker = L.marker(latLng, { icon: customIcon });
      marker.bindPopup(popupContent);
      marker.addTo(layerGroup);
      markerMapRef.current.set(stop.globalId, marker);
    });

    // Draw route lines for each day group
    dayGroups.forEach((dayLatLngs, dayNum) => {
      if (dayLatLngs.length < 2) return;
      const dayColor = DAY_COLORS[(dayNum - 1) % DAY_COLORS.length];

      // Draw dashed straight-line fallback immediately
      const polyline = L.polyline(dayLatLngs, {
        color: dayColor,
        weight: 3.5,
        opacity: 0.85,
        dashArray: "6, 8",
        lineCap: "round",
        lineJoin: "round",
      }).addTo(layerGroup);

      // Attempt OSRM real road route async and replace on success
      fetchOsrmRoute(dayLatLngs).then((roadPoints) => {
        if (
          roadPoints &&
          roadPoints.length > 0 &&
          mapInstanceRef.current === map &&
          map._mapPane
        ) {
          layerGroup.removeLayer(polyline);
          L.polyline(roadPoints, {
            color: dayColor,
            weight: 4,
            opacity: 0.9,
            lineCap: "round",
            lineJoin: "round",
          }).addTo(layerGroup);
        }
      });
    });

    // Fit map bounds cleanly with defensive checks against rapid tab unmount
    let rafId = null;
    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      rafId = requestAnimationFrame(() => {
        if (
          !mapContainerRef.current ||
          mapInstanceRef.current !== map ||
          !map._mapPane
        ) {
          return;
        }
        try {
          map.invalidateSize();
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
          }
        } catch (_err) {
          // Safeguard against asynchronous unmount race conditions
        }
      });
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [stopsStableKey, viewMode]);

  const handleLocateStop = (stop) => {
    const map = mapInstanceRef.current;
    if (!map || !map._mapPane) return;
    map.flyTo([stop.lat, stop.lng], 15, { duration: 0.8 });
    const marker = markerMapRef.current.get(stop.globalId);
    if (marker) {
      setTimeout(() => {
        if (mapInstanceRef.current === map && map._mapPane) {
          marker.openPopup();
        }
      }, 850);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-[#E5E2E1] overflow-hidden flex flex-col">
      {/* ── Subheader with Day & All-Days Toggles ── */}
      <div className="p-3.5 sm:p-4 border-b border-[#E5E2E1] bg-[#FCF9F8] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-[#6C2F00]" />
          <h4 className="font-serif font-bold text-[#1C1B1B] text-sm">
            Interactive Waypoint &amp; Transit Map
          </h4>
          <span className="text-[11px] text-[#7A6B63] font-medium ml-1">
            ({stops.length} {stops.length === 1 ? "stop" : "stops"})
          </span>
        </div>

        {/* Day selection tabs + All Days toggle */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          <button
            type="button"
            onClick={() => setViewMode("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
              viewMode === "all"
                ? "bg-[#6C2F00] text-white shadow-xs"
                : "bg-white text-[#54433A] border border-[#E5E2E1] hover:bg-[#F6F3F2]"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Days</span>
          </button>

          {(days || []).map((d) => {
            const isSelected = viewMode === d.day;
            const dayColor = DAY_COLORS[(d.day - 1) % DAY_COLORS.length];
            return (
              <button
                key={d.day}
                type="button"
                onClick={() => setViewMode(d.day)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-[#6C2F00] text-white shadow-xs"
                    : "bg-white text-[#54433A] border border-[#E5E2E1] hover:bg-[#F6F3F2]"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: dayColor }}
                />
                <span>Day {d.day}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Map Container ── */}
      <div className="relative w-full h-[450px] sm:h-[520px] bg-[#F6F3F2]">
        <div ref={mapContainerRef} className="w-full h-full z-0" />
      </div>

      {/* ── Numbered Stops List Directory Below Map ── */}
      {stops.length > 0 && (
        <div className="p-4 sm:p-5 border-t border-[#E5E2E1] bg-[#FCF9F8]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6C2F00]">
              Route Waypoint Sequence ({stops.length})
            </span>
            <span className="text-[11px] text-[#877369]">
              Click &quot;Locate&quot; to pan directly to any waypoint
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {stops.map((stop) => (
              <div
                key={stop.globalId}
                className="bg-white border border-[#E5E2E1] hover:border-[#DAC2B6] rounded-lg p-2.5 flex items-center justify-between gap-3 shadow-2xs transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                    style={{ backgroundColor: stop.color }}
                  >
                    {stop.order}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-xs text-[#1C1B1B] truncate">
                      {stop.name}
                    </p>
                    <p className="text-[10px] text-[#877369] truncate">
                      {viewMode === "all" ? `Day ${stop.dayNumber} • ` : ""}
                      {stop.category || "Sight"} • ~{stop.visitMinutes || 90}m
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleLocateStop(stop)}
                  className="px-2 py-1 text-[11px] font-semibold text-[#6C2F00] hover:bg-[#6C2F00]/10 rounded flex items-center gap-1 shrink-0 transition-colors"
                >
                  <Eye className="w-3 h-3" />
                  <span>Locate</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
