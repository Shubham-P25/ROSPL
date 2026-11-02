import React, { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Compass, Navigation, MapPin, Layers, LocateFixed } from "lucide-react";

// Fix default leaflet icon paths if standard markers are ever used
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function escapeHtml(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const DAY_COLORS = [
  "#6C2F00", // Terracotta
  "#0369A1", // Sky Blue
  "#15803D", // Forest Green
  "#7E22CE", // Purple
  "#C2410C", // Rust Orange
  "#B91C1C", // Crimson
  "#0F766E", // Deep Teal
];

const osrmRouteCache = new Map();

async function fetchOsrmRoute(latLngs) {
  if (!latLngs || latLngs.length < 2) return null;
  const key = latLngs
    .map(([lat, lng]) => `${lat.toFixed(4)},${lng.toFixed(4)}`)
    .join(";");
  if (osrmRouteCache.has(key)) return osrmRouteCache.get(key);

  const coordsStr = latLngs.map(([lat, lng]) => `${lng},${lat}`).join(";");
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`,
      { signal: AbortSignal.timeout(3500) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code === "Ok" && data.routes?.[0]?.geometry?.coordinates) {
      const line = data.routes[0].geometry.coordinates.map(([lng, lat]) => [
        lat,
        lng,
      ]);
      osrmRouteCache.set(key, line);
      return line;
    }
    return null;
  } catch (_e) {
    return null;
  }
}

export default function MapView({
  days = [],
  places = {},
  selectedDay = 1,
  onSelectDay,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);
  const markerMapRef = useRef(new Map());

  const [viewMode, setViewMode] = useState(
    selectedDay === "all" ? "all" : "day",
  ); // 'day' | 'all'
  const activeDayNumber = typeof selectedDay === "number" ? selectedDay : 1;

  // Compute stops data with useMemo
  const stops = useMemo(() => {
    if (viewMode === "all") {
      const allStops = [];
      days.forEach((d) => {
        const color = DAY_COLORS[(d.day - 1) % DAY_COLORS.length];
        (d.items || []).forEach((item, idx) => {
          const place = places[item.placeId];
          if (
            place &&
            typeof place.lat === "number" &&
            typeof place.lng === "number"
          ) {
            allStops.push({
              ...place,
              dayNumber: d.day,
              order: idx + 1,
              slot: item.slot,
              travelTime: item.travelMinutesFromPrev,
              color,
              globalId: `${d.day}-${place.id || idx}`,
            });
          }
        });
      });
      return allStops;
    }

    const activeDayData = days.find((d) => d.day === activeDayNumber) || days[0];
    const dayItems = activeDayData ? activeDayData.items || [] : [];
    const color = DAY_COLORS[(activeDayNumber - 1) % DAY_COLORS.length];

    return dayItems
      .map((item, idx) => {
        const place = places[item.placeId];
        if (
          !place ||
          typeof place.lat !== "number" ||
          typeof place.lng !== "number"
        ) {
          return null;
        }
        return {
          ...place,
          dayNumber: activeDayNumber,
          order: idx + 1,
          slot: item.slot,
          travelTime: item.travelMinutesFromPrev,
          color,
          globalId: `${activeDayNumber}-${place.id || idx}`,
        };
      })
      .filter(Boolean);
  }, [days, places, activeDayNumber, viewMode]);

  // Stable key for redraw dependency
  const stopsStableKey = useMemo(() => {
    return stops.map((s) => `${s.globalId}:${s.lat.toFixed(4)},${s.lng.toFixed(4)}`).join("|");
  }, [stops]);

  // ── EFFECT 1: Map Initialization (runs once) ──
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // CARTO Voyager Tile Layer (clean, free, no hospital icons, OSM attribution)
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      },
    ).addTo(map);

    layerGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    // ResizeObserver to handle tab changes & container sizing automatically
    const ro = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    ro.observe(mapContainerRef.current);

    // Initial size invalidation
    requestAnimationFrame(() => {
      map.invalidateSize();
    });

    return () => {
      ro.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // ── EFFECT 2: Redraw Markers & Polyline when stops change ──
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();
    markerMapRef.current.clear();

    if (stops.length === 0) {
      map.setView([19.076, 72.8777], 11);
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
        if (roadPoints && roadPoints.length > 0 && mapInstanceRef.current) {
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

    // Fit map bounds cleanly
    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      requestAnimationFrame(() => {
        map.invalidateSize();
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      });
    }
  }, [stopsStableKey, viewMode]);

  const handleLocateStop = (stop) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo([stop.lat, stop.lng], 15, { duration: 0.8 });
    const marker = markerMapRef.current.get(stop.globalId);
    if (marker) {
      setTimeout(() => {
        marker.openPopup();
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
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "all"
                ? "bg-[#1C1B1B] text-white shadow-xs"
                : "bg-white text-[#54433A] hover:bg-[#F6F3F2] border border-[#DAC2B6]/40"
            }`}
          >
            All Days
          </button>

          {days.map((d) => (
            <button
              key={d.day}
              type="button"
              onClick={() => {
                setViewMode("day");
                if (onSelectDay) onSelectDay(d.day);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "day" && activeDayNumber === d.day
                  ? "bg-[#6C2F00] text-white shadow-xs"
                  : "bg-white text-[#54433A] hover:bg-[#F6F3F2] border border-[#DAC2B6]/40"
              }`}
            >
              Day {d.day}
            </button>
          ))}
        </div>
      </div>

      {/* ── Map Canvas ── */}
      <div className="relative w-full h-[400px] sm:h-[450px] bg-[#F6F3F2]">
        <div ref={mapContainerRef} className="w-full h-full z-0" />
      </div>

      {/* ── Stops Directory List (Visible at all zoom levels) ── */}
      {stops.length > 0 && (
        <div className="p-4 bg-white border-t border-[#E5E2E1] max-h-56 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6C2F00]">
              Numbered Route Sequence
            </span>
            <span className="text-[11px] text-[#7A6B63]">
              Click Locate to zoom to any stop
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {stops.map((stop) => (
              <div
                key={stop.globalId}
                className="p-2.5 rounded-lg border border-[#E5E2E1] hover:border-[#6C2F00]/40 bg-[#FCF9F8] flex items-center justify-between text-xs transition-colors"
              >
                <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                  <span
                    style={{ backgroundColor: stop.color }}
                    className="w-5 h-5 rounded-full text-white font-bold flex items-center justify-center text-[10px] shrink-0"
                  >
                    {stop.order}
                  </span>
                  <div className="truncate">
                    <span className="font-semibold text-[#1C1B1B] block truncate">
                      {stop.name}
                    </span>
                    <span className="text-[10px] text-[#7A6B63] capitalize block">
                      {viewMode === "all" ? `Day ${stop.dayNumber} · ` : ""}
                      {stop.slot} • {stop.category || "Sight"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleLocateStop(stop)}
                  title="Locate stop on map"
                  className="px-2 py-1 rounded bg-white hover:bg-[#6C2F00] hover:text-white border border-[#DAC2B6]/40 text-[#6C2F00] font-semibold text-[10px] flex items-center space-x-1 shrink-0 transition-colors cursor-pointer"
                >
                  <LocateFixed className="w-3 h-3" />
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
