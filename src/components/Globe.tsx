import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { geoInterpolate } from "d3-geo";
import type { SortedTrip, TripStatus } from "../utils/tripStatus";
import type { Destination } from "../types";

interface GlobeProps {
  trip: SortedTrip;
  status: TripStatus;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onShipSelect: () => void;
}

const STYLES = {
  liberty: { label: "Liberty", url: "https://tiles.openfreemap.org/styles/liberty" },
  bright: { label: "Bright", url: "https://tiles.openfreemap.org/styles/bright" },
  positron: { label: "Light", url: "https://tiles.openfreemap.org/styles/positron" },
} as const;
type StyleKey = keyof typeof STYLES;
const STYLE_STORAGE_KEY = "globe.basemap";
const DEFAULT_STYLE: StyleKey = "liberty";

const ARC_SAMPLES = 64;
const ROUTE_SOURCE = "trip-route-full";
const PAST_SOURCE = "trip-route-past";

export function Globe({
  trip,
  status,
  selectedId,
  onSelect,
  onShipSelect,
}: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const portMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const shipMarkerRef = useRef<maplibregl.Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  const onShipSelectRef = useRef(onShipSelect);
  onSelectRef.current = onSelect;
  onShipSelectRef.current = onShipSelect;

  const [styleKey, setStyleKey] = useState<StyleKey>(() => {
    if (typeof window === "undefined") return DEFAULT_STYLE;
    const saved = window.localStorage.getItem(STYLE_STORAGE_KEY);
    return saved && saved in STYLES ? (saved as StyleKey) : DEFAULT_STYLE;
  });

  // Initialise map once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const initialFocus = focusCoord(status);
    const map = new maplibregl.Map({
      container,
      style: STYLES[styleKey].url,
      center: [initialFocus[1], initialFocus[0]],
      zoom: 2.8,
      minZoom: 0.4,
      maxZoom: 8,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    map.touchZoomRotate.disableRotation();

    map.on("style.load", () => {
      map.setProjection({ type: "globe" });
      forceLatinLabels(map);
      map.setSky({
        "sky-color": "#0e1a35",
        "horizon-color": "#5a4a78",
        "fog-color": "#f2d2ae",
        "fog-ground-blend": 0.4,
        "horizon-fog-blend": 0.5,
        "sky-horizon-blend": 0.7,
        "atmosphere-blend": 0.8,
      });
      addOrUpdateRouteLayers(map, trip, status);
      attachPortMarkers(map, trip, portMarkersRef, selectedIdRef.current, onSelectRef);
      attachShipMarker(
        map,
        shipMarkerRef,
        currentShipLngLat(status),
        status.phase === "in-port",
        onShipSelectRef,
      );
      applyPanelPadding(map);
    });

    const resize = () => {
      map.resize();
      applyPanelPadding(map);
    };
    window.addEventListener("resize", resize);

    const clickAway = () => onSelectRef.current(null);
    map.on("click", clickAway);

    return () => {
      window.removeEventListener("resize", resize);
      portMarkersRef.current.forEach((m) => m.remove());
      portMarkersRef.current.clear();
      shipMarkerRef.current?.remove();
      shipMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refs we need inside the map handlers without re-binding the map
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const statusRef = useRef(status);
  statusRef.current = status;

  // Style switching — re-add custom layers and markers afterwards
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    window.localStorage.setItem(STYLE_STORAGE_KEY, styleKey);
    const desired = STYLES[styleKey].url;
    map.setStyle(desired, { diff: false });
    // style.load will re-run and our handler re-adds the route layers + sky
  }, [styleKey]);

  // Re-add route data + ship marker when trip / status change.
  // Port markers are created on style.load and only have their selection
  // styling updated on selectedId change — recreating them replays the
  // marker-pop animation and causes a visible flash on every selection.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    addOrUpdateRouteLayers(map, trip, status);
    attachShipMarker(
      map,
      shipMarkerRef,
      currentShipLngLat(status),
      status.phase === "in-port",
      onShipSelectRef,
    );
  }, [trip, status]);

  // Update only the selection styling of the affected port markers in place
  useEffect(() => {
    portMarkersRef.current.forEach((marker, id) => {
      updatePortMarkerSelection(
        marker.getElement() as HTMLDivElement,
        trip.byId.get(id)?.dest,
        id === selectedId,
      );
    });
  }, [selectedId, trip]);

  // Fly to selected destination
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const entry = trip.byId.get(selectedId);
    if (!entry) return;
    const [lat, lng] = entry.dest.coords;
    map.flyTo({
      center: [lng, lat],
      zoom: Math.max(map.getZoom(), 2.4),
      duration: 1200,
      essential: true,
    });
  }, [selectedId, trip]);

  return (
    <div className="absolute inset-0">
      <div
        ref={containerRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
      <StyleSwitcher value={styleKey} onChange={setStyleKey} />
    </div>
  );
}

function StyleSwitcher({
  value,
  onChange,
}: {
  value: StyleKey;
  onChange: (k: StyleKey) => void;
}) {
  return (
    <div className="absolute bottom-28 left-4 z-20 pointer-events-auto">
      <div className="bg-parchment/95 backdrop-blur-[2px] rounded-[3px] shadow-card border border-ink/10 p-1 flex gap-0.5">
        {(Object.keys(STYLES) as StyleKey[]).map((k) => {
          const active = k === value;
          return (
            <button
              key={k}
              type="button"
              onClick={() => onChange(k)}
              className={`tracker text-[10px] px-2.5 py-1.5 rounded-[2px] transition-colors ${
                active
                  ? "bg-ink text-parchment"
                  : "text-ink/70 hover:text-ink hover:bg-ink/5"
              }`}
              aria-pressed={active}
            >
              {STYLES[k].label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function forceLatinLabels(map: maplibregl.Map) {
  const layers = map.getStyle().layers ?? [];
  for (const layer of layers) {
    if (layer.type !== "symbol") continue;
    map.setLayoutProperty(layer.id, "text-field", [
      "coalesce",
      ["get", "name:en"],
      ["get", "name:latin"],
      ["get", "name"],
    ]);
  }
}

function applyPanelPadding(map: maplibregl.Map) {
  const w = map.getContainer().clientWidth;
  const right = w >= 1024 ? 640 : w >= 768 ? 608 : w >= 640 ? 544 : 0;
  map.setPadding({ top: 96, bottom: 104, right, left: 0 });
}

function focusCoord(status: TripStatus): [number, number] {
  switch (status.phase) {
    case "before":
      return status.firstPort.coords;
    case "in-port":
      return status.port.coords;
    case "at-sea":
      return status.currentCoord;
    case "done":
      return status.lastPort.coords;
  }
}

function isoFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayBetween(a: string, b: string): number {
  return Math.round(
    (new Date(a + "T00:00:00Z").getTime() - new Date(b + "T00:00:00Z").getTime()) /
      86400000,
  );
}

function buildRouteCoords(trip: SortedTrip): [number, number][] {
  const coords: [number, number][] = [];
  for (let i = 0; i < trip.ports.length - 1; i++) {
    const a: [number, number] = [trip.ports[i].coords[1], trip.ports[i].coords[0]];
    const b: [number, number] = [
      trip.ports[i + 1].coords[1],
      trip.ports[i + 1].coords[0],
    ];
    const interp = geoInterpolate(a, b);
    const start = i === 0 ? 0 : 1;
    for (let s = start; s <= ARC_SAMPLES; s++) {
      coords.push(interp(s / ARC_SAMPLES) as [number, number]);
    }
  }
  return makeContinuous(coords);
}

// Normalize consecutive longitudes so they differ by no more than 180,
// allowing values outside [-180, 180]. Prevents lines from drawing the
// long way around when the route crosses the antimeridian.
function makeContinuous(coords: [number, number][]): [number, number][] {
  if (coords.length === 0) return coords;
  const out: [number, number][] = [coords[0]];
  for (let i = 1; i < coords.length; i++) {
    let lng = coords[i][0];
    const prevLng = out[i - 1][0];
    while (lng - prevLng > 180) lng -= 360;
    while (lng - prevLng < -180) lng += 360;
    out.push([lng, coords[i][1]]);
  }
  return out;
}

function buildPastRouteCoords(
  trip: SortedTrip,
  status: TripStatus,
): [number, number][] | null {
  if (status.phase === "before") return null;
  const todayIso = isoFromDate(new Date());
  const coords: [number, number][] = [];
  for (let i = 0; i < trip.ports.length - 1; i++) {
    const a = trip.ports[i];
    const b = trip.ports[i + 1];
    const aLngLat: [number, number] = [a.coords[1], a.coords[0]];
    const bLngLat: [number, number] = [b.coords[1], b.coords[0]];
    const interp = geoInterpolate(aLngLat, bLngLat);
    let endT = 0;
    if (b.arrivalDate <= todayIso) endT = 1;
    else if (a.departureDate <= todayIso && b.arrivalDate > todayIso) {
      const total = dayBetween(b.arrivalDate, a.departureDate);
      const elapsed = dayBetween(todayIso, a.departureDate);
      endT = total > 0 ? Math.max(0, Math.min(1, elapsed / total)) : 0;
    } else {
      break;
    }
    const start = i === 0 ? 0 : 1;
    const samples = Math.max(2, Math.round(ARC_SAMPLES * endT));
    for (let s = start; s <= samples; s++) {
      coords.push(interp((s / samples) * endT) as [number, number]);
    }
    if (endT < 1) break;
  }
  return coords.length >= 2 ? makeContinuous(coords) : null;
}

function addOrUpdateRouteLayers(
  map: maplibregl.Map,
  trip: SortedTrip,
  status: TripStatus,
) {
  const fullCoords = buildRouteCoords(trip);
  const fullData: GeoJSON.Feature<GeoJSON.LineString> = {
    type: "Feature",
    geometry: { type: "LineString", coordinates: fullCoords },
    properties: {},
  };
  const fullSource = map.getSource(ROUTE_SOURCE) as maplibregl.GeoJSONSource | undefined;
  if (fullSource) {
    fullSource.setData(fullData);
  } else {
    map.addSource(ROUTE_SOURCE, { type: "geojson", data: fullData });
  }
  if (!map.getLayer("route-full-halo")) {
    map.addLayer({
      id: "route-full-halo",
      type: "line",
      source: ROUTE_SOURCE,
      paint: {
        "line-color": "#F5EBD8",
        "line-opacity": 0.85,
        "line-width": 4,
        "line-blur": 1.5,
      },
      layout: { "line-cap": "round" },
    });
  }
  if (!map.getLayer("route-full-line")) {
    map.addLayer({
      id: "route-full-line",
      type: "line",
      source: ROUTE_SOURCE,
      paint: {
        "line-color": "#1B2A4E",
        "line-opacity": 0.85,
        "line-width": 1.8,
        "line-dasharray": [2, 3],
      },
      layout: { "line-cap": "round" },
    });
  }

  const pastCoords = buildPastRouteCoords(trip, status);
  const pastData: GeoJSON.Feature<GeoJSON.LineString> | null = pastCoords
    ? {
        type: "Feature",
        geometry: { type: "LineString", coordinates: pastCoords },
        properties: {},
      }
    : null;
  const pastSource = map.getSource(PAST_SOURCE) as maplibregl.GeoJSONSource | undefined;
  if (pastSource) {
    pastSource.setData(
      pastData ?? {
        type: "Feature",
        geometry: { type: "LineString", coordinates: [] },
        properties: {},
      },
    );
  } else {
    map.addSource(PAST_SOURCE, {
      type: "geojson",
      data: pastData ?? {
        type: "Feature",
        geometry: { type: "LineString", coordinates: [] },
        properties: {},
      },
    });
  }
  if (!map.getLayer("route-past-glow")) {
    map.addLayer({
      id: "route-past-glow",
      type: "line",
      source: PAST_SOURCE,
      paint: {
        "line-color": "#C4452F",
        "line-width": 6,
        "line-opacity": 0.55,
        "line-blur": 4,
      },
      layout: { "line-cap": "round" },
    });
  }
  if (!map.getLayer("route-past-line")) {
    map.addLayer({
      id: "route-past-line",
      type: "line",
      source: PAST_SOURCE,
      paint: {
        "line-color": "#C4452F",
        "line-width": 2.4,
        "line-opacity": 0.95,
      },
      layout: { "line-cap": "round" },
    });
  }
}

function makePortMarkerEl(
  dest: Destination,
  dayOfTrip: number,
  selected: boolean,
  index: number,
): HTMLDivElement {
  const isHome = dest.stopType === "homePort";
  const isScenic = dest.stopType === "scenic";
  const isDateline = dest.stopType === "dateline";

  // MapLibre applies the positioning transform inline on the outer element it
  // owns. The pop animation lives on an inner child so its `transform: scale()`
  // keyframes don't clobber that positioning.
  const el = document.createElement("div");
  el.className = "port-marker";
  el.style.cursor = "pointer";

  const inner = document.createElement("div");
  inner.className = "port-marker-inner marker-pop";
  inner.style.animationDelay = `${320 + index * 18}ms`;

  const fill = isDateline
    ? "#3D4A6B"
    : isScenic
      ? "#C9924B"
      : isHome
        ? "#C4452F"
        : "#F5EBD8";
  const stroke = isDateline ? "#F5EBD8" : "#1B2A4E";
  const labelColor = isDateline || isScenic || isHome ? "#F5EBD8" : "#1B2A4E";

  Object.assign(inner.style, {
    borderRadius: "50%",
    background: fill,
    border: `1.4px solid ${stroke}`,
    color: labelColor,
    font: `600 ${isHome ? 11 : 10}px "JetBrains Mono", monospace`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
  });
  if (!isDateline) inner.textContent = String(dayOfTrip);
  el.appendChild(inner);
  updatePortMarkerSelection(el, dest, selected);
  return el;
}

function updatePortMarkerSelection(
  el: HTMLDivElement,
  dest: Destination | undefined,
  selected: boolean,
) {
  const inner = el.firstElementChild as HTMLDivElement | null;
  if (!inner) return;
  const isHome = dest?.stopType === "homePort";
  const size = isHome || selected ? 22 : 18;
  inner.style.width = `${size}px`;
  inner.style.height = `${size}px`;
  inner.style.boxShadow = selected
    ? "0 0 0 3px rgba(245,235,216,0.85), 0 0 0 4.5px #C4452F, 0 1px 3px rgba(15,22,42,0.5)"
    : "0 1px 3px rgba(15,22,42,0.5)";
}

function attachPortMarkers(
  map: maplibregl.Map,
  trip: SortedTrip,
  ref: React.MutableRefObject<Map<string, maplibregl.Marker>>,
  selectedId: string | null,
  onSelectRef: React.MutableRefObject<(id: string | null) => void>,
) {
  ref.current.forEach((m) => m.remove());
  ref.current.clear();
  trip.ports.forEach((dest, i) => {
    const dayOfTrip = trip.byId.get(dest.id)?.dayOfTrip ?? 0;
    const el = makePortMarkerEl(dest, dayOfTrip, dest.id === selectedId, i);
    el.addEventListener("click", (ev) => {
      ev.stopPropagation();
      onSelectRef.current(dest.id);
    });
    const marker = new maplibregl.Marker({
      element: el,
      opacity: "1",
      opacityWhenCovered: "0",
    })
      .setLngLat([dest.coords[1], dest.coords[0]])
      .addTo(map);
    ref.current.set(dest.id, marker);
  });
}

function makeShipMarkerEl(): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "ship-marker";
  Object.assign(el.style, {
    position: "relative",
    width: "16px",
    height: "16px",
    cursor: "pointer",
  });

  const dot = document.createElement("div");
  Object.assign(dot.style, {
    position: "absolute",
    inset: "2px",
    borderRadius: "50%",
    background: "#C4452F",
    border: "1.5px solid #F5EBD8",
    boxShadow: "0 1px 3px rgba(15,22,42,0.5)",
  });
  el.appendChild(dot);

  const pulse = document.createElement("div");
  pulse.className = "today-pulse-dom";
  Object.assign(pulse.style, {
    position: "absolute",
    inset: "2px",
    borderRadius: "50%",
    border: "1.5px solid #C4452F",
    pointerEvents: "none",
  });
  el.appendChild(pulse);

  return el;
}

function attachShipMarker(
  map: maplibregl.Map,
  ref: React.MutableRefObject<maplibregl.Marker | null>,
  lngLat: [number, number] | null,
  inPort: boolean,
  onShipSelectRef: React.MutableRefObject<() => void>,
) {
  if (!lngLat) {
    ref.current?.remove();
    ref.current = null;
    return;
  }
  if (!ref.current) {
    const el = makeShipMarkerEl();
    el.addEventListener("click", (ev) => {
      ev.stopPropagation();
      onShipSelectRef.current();
    });
    ref.current = new maplibregl.Marker({
      element: el,
      offset: inPort ? [16, -16] : [0, 0],
      opacity: "1",
      opacityWhenCovered: "0",
    })
      .setLngLat(lngLat)
      .addTo(map);
  } else {
    ref.current.setLngLat(lngLat);
    ref.current.setOffset(inPort ? [16, -16] : [0, 0]);
  }
}

function currentShipLngLat(status: TripStatus): [number, number] | null {
  if (status.phase === "at-sea") {
    const [lat, lng] = status.currentCoord;
    return [lng, lat];
  }
  if (status.phase === "in-port") {
    const [lat, lng] = status.port.coords;
    return [lng, lat];
  }
  return null;
}
