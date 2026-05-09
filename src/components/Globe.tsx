import { useEffect, useMemo, useRef, useState } from "react";
import { geoOrthographic, geoPath, geoInterpolate } from "d3-geo";
import { feature } from "topojson-client";
import worldData from "world-atlas/countries-110m.json";
import type { SortedTrip, TripStatus } from "../utils/tripStatus";

interface GlobeProps {
  trip: SortedTrip;
  status: TripStatus;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

interface ShipPosition {
  lat: number;
  lon: number;
  speedKn: number | null;
  courseDeg: number | null;
  headingDeg: number | null;
  timestamp: string;
  name: string;
  mmsi: number;
  trackUrl: string;
}

const ARC_SAMPLES = 56;

const DEG = Math.PI / 180;

function shortDelta(from: number, to: number): number {
  let d = to - from;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

function visibilityCosine(
  lng: number,
  lat: number,
  rotation: [number, number, number],
): number {
  const lc = -rotation[0] * DEG;
  const fc = -rotation[1] * DEG;
  const l = lng * DEG;
  const f = lat * DEG;
  return Math.sin(fc) * Math.sin(f) + Math.cos(fc) * Math.cos(f) * Math.cos(l - lc);
}

export function Globe({ trip, status, selectedId, onSelect }: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 1024, h: 768 });
  const [rotation, setRotation] = useState<[number, number, number]>(() => {
    const c = focusCoord(status);
    return [-c[1], -c[0], 0];
  });
  const targetRotationRef = useRef<[number, number, number] | null>(null);
  const [zoom, setZoom] = useState(1);
  const dragRef = useRef<{
    sx: number;
    sy: number;
    rot: [number, number, number];
  } | null>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartRef = useRef<{ distance: number; zoom: number } | null>(null);
  const rafScheduled = useRef(false);
  const [shipPos, setShipPos] = useState<ShipPosition | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}ship-position.json`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ShipPosition | null) => {
        if (cancelled || !data || typeof data.lat !== "number") return;
        setShipPos(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        // Trackpad pinch (Mac sends ctrlKey + wheel) — always intercept,
        // anywhere on the page, so the browser doesn't zoom the viewport.
        e.preventDefault();
        setZoom((z) =>
          Math.max(0.6, Math.min(3.5, z * Math.exp(-e.deltaY * 0.012))),
        );
        return;
      }
      const target = e.target as Element | null;
      if (target && svgRef.current && svgRef.current.contains(target)) {
        e.preventDefault();
        setZoom((z) =>
          Math.max(0.6, Math.min(3.5, z * Math.exp(-e.deltaY * 0.0014))),
        );
      }
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const target = targetRotationRef.current;
      if (target) {
        setRotation((curr) => {
          const dλ = shortDelta(curr[0], target[0]);
          const dφ = target[1] - curr[1];
          const ease = Math.min(1, dt / 260);
          if (Math.abs(dλ) < 0.35 && Math.abs(dφ) < 0.35) {
            targetRotationRef.current = null;
            return [target[0], target[1], 0];
          }
          return [curr[0] + dλ * ease, curr[1] + dφ * ease, 0];
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const entry = trip.byId.get(selectedId);
    if (!entry) return;
    const [lat, lng] = entry.dest.coords;
    targetRotationRef.current = [-lng, -lat, 0];
  }, [selectedId, trip]);

  const HEADER_RESERVE = 96;
  const TIMELINE_RESERVE = 104;
  const verticalSpace = Math.max(220, size.h - HEADER_RESERVE - TIMELINE_RESERVE);
  const baseRadius = Math.max(
    200,
    Math.min(verticalSpace / 2 - 8, size.w * 0.46),
  );
  const radius = baseRadius * zoom;
  const cx = size.w / 2;
  const cy = HEADER_RESERVE + verticalSpace / 2;

  const projection = useMemo(
    () =>
      geoOrthographic()
        .scale(radius)
        .translate([cx, cy])
        .rotate(rotation)
        .clipAngle(90)
        .precision(0.4),
    [radius, cx, cy, rotation],
  );

  const pathGenerator = useMemo(() => geoPath(projection), [projection]);

  const countries = useMemo(() => {
    const fc = feature(worldData as any, (worldData as any).objects.countries);
    return (fc as any).features as Array<{ id?: string; type: string; geometry: any }>;
  }, []);

  // Pre-compute earth-tone tint per country deterministically (stable bins)
  const countryTints = useMemo(() => {
    const palette = ["#B88A5E", "#A6926A", "#9A9A6E", "#C0986A", "#B07C50", "#A89378"];
    return countries.map((c, i) => palette[(parseInt(String(c.id ?? i), 10) + i) % palette.length]);
  }, [countries]);

  const routeFeature = useMemo(() => {
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
    return {
      type: "Feature" as const,
      geometry: { type: "LineString" as const, coordinates: coords },
      properties: {},
    };
  }, [trip]);

  const routePath = pathGenerator(routeFeature as any) ?? "";

  // Past portion of route (already sailed)
  const pastRouteFeature = useMemo(() => {
    if (status.phase === "before") return null;
    const today = new Date();
    const todayIso = isoFromDate(today);
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
    if (coords.length < 2) return null;
    return {
      type: "Feature" as const,
      geometry: { type: "LineString" as const, coordinates: coords },
      properties: {},
    };
  }, [trip, status]);

  const pastRoutePath = pastRouteFeature ? pathGenerator(pastRouteFeature as any) ?? "" : "";

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    targetRotationRef.current = null;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchStartRef.current = { distance: dist, zoom };
      dragRef.current = null;
    } else if (pointersRef.current.size === 1) {
      dragRef.current = { sx: e.clientX, sy: e.clientY, rot: rotation };
    }
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2 && pinchStartRef.current) {
      if (rafScheduled.current) return;
      rafScheduled.current = true;
      requestAnimationFrame(() => {
        rafScheduled.current = false;
        const pts = Array.from(pointersRef.current.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const start = pinchStartRef.current;
        if (!start) return;
        const ratio = dist / Math.max(1, start.distance);
        setZoom(Math.max(0.6, Math.min(3.5, start.zoom * ratio)));
      });
      return;
    }

    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.sx;
    const dy = e.clientY - drag.sy;
    if (rafScheduled.current) return;
    rafScheduled.current = true;
    requestAnimationFrame(() => {
      rafScheduled.current = false;
      const k = 180 / radius;
      setRotation([
        drag.rot[0] + dx * k,
        Math.max(-82, Math.min(82, drag.rot[1] - dy * k)),
        0,
      ]);
    });
  };
  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchStartRef.current = null;
    if (pointersRef.current.size === 0) {
      dragRef.current = null;
    } else if (pointersRef.current.size === 1) {
      const remaining = Array.from(pointersRef.current.values())[0];
      dragRef.current = { sx: remaining.x, sy: remaining.y, rot: rotation };
    }
  };

  // Project markers and compute visibility
  const markers = trip.ports.map((d) => {
    const lng = d.coords[1];
    const lat = d.coords[0];
    const cosc = visibilityCosine(lng, lat, rotation);
    const proj = projection([lng, lat]);
    if (!proj) return null;
    const visible = cosc > -0.04;
    const rim = Math.min(1, Math.max(0, (cosc + 0.04) / 0.18));
    return {
      dest: d,
      x: proj[0],
      y: proj[1],
      visible,
      opacity: visible ? rim : 0,
      cosc,
    };
  });

  // Today position — prefer real AIS data, fall back to scheduled interpolation
  const todayProj = (() => {
    if (shipPos) {
      const cosc = visibilityCosine(shipPos.lon, shipPos.lat, rotation);
      const p = projection([shipPos.lon, shipPos.lat]);
      if (!p || cosc < -0.04) return null;
      return {
        x: p[0],
        y: p[1],
        opacity: Math.min(1, Math.max(0, (cosc + 0.04) / 0.18)),
        live: true,
      };
    }
    if (status.phase === "at-sea") {
      const [lat, lng] = status.currentCoord;
      const cosc = visibilityCosine(lng, lat, rotation);
      const p = projection([lng, lat]);
      if (!p || cosc < -0.04) return null;
      return {
        x: p[0],
        y: p[1],
        opacity: Math.min(1, Math.max(0, (cosc + 0.04) / 0.18)),
        live: false,
      };
    }
    return null;
  })();

  return (
    <div ref={containerRef} className="absolute inset-0">
      <svg
        width={size.w}
        height={size.h}
        viewBox={`0 0 ${size.w} ${size.h}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ touchAction: "none", display: "block" }}
        onClick={() => onSelect(null)}
      >
        <defs>
          <radialGradient
            id="ocean-sphere"
            cx={cx + radius * 0.34}
            cy={cy - radius * 0.38}
            r={radius * 1.05}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#7895AC" />
            <stop offset="55%" stopColor="#3E5A6E" />
            <stop offset="100%" stopColor="#1F3142" />
          </radialGradient>
          <radialGradient
            id="atmosphere"
            cx={cx}
            cy={cy}
            r={radius * 1.14}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0.83" stopColor="rgba(245,213,176,0)" />
            <stop offset="0.92" stopColor="rgba(245,213,176,0.6)" />
            <stop offset="1" stopColor="rgba(245,213,176,0)" />
          </radialGradient>
          <radialGradient
            id="terminator"
            cx={cx + radius * 0.42}
            cy={cy - radius * 0.46}
            r={radius * 1.05}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="rgba(255,235,200,0.34)" />
            <stop offset="40%" stopColor="rgba(255,235,200,0)" />
            <stop offset="100%" stopColor="rgba(15,22,42,0.55)" />
          </radialGradient>
          <filter id="route-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="seal-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#1B2A4E" floodOpacity="0.35" />
          </filter>
          <clipPath id="globe-clip">
            <circle cx={cx} cy={cy} r={radius} />
          </clipPath>
        </defs>

        {/* Atmosphere halo */}
        <circle cx={cx} cy={cy} r={radius * 1.12} fill="url(#atmosphere)" pointerEvents="none" />

        {/* Ocean sphere */}
        <circle cx={cx} cy={cy} r={radius} fill="url(#ocean-sphere)" />

        {/* Faint graticule for star-chart feel */}
        <g clipPath="url(#globe-clip)" opacity="0.18" pointerEvents="none">
          {graticulePaths(pathGenerator)}
        </g>

        {/* Continents */}
        <g clipPath="url(#globe-clip)">
          {countries.map((c, i) => {
            const d = pathGenerator(c as any);
            if (!d) return null;
            return (
              <path
                key={(c.id as string | undefined) ?? i}
                d={d}
                fill={countryTints[i]}
                stroke="#7A5B3A"
                strokeWidth={0.35}
                strokeOpacity={0.55}
              />
            );
          })}
        </g>

        {/* Day-side light overlay */}
        <circle cx={cx} cy={cy} r={radius} fill="url(#terminator)" pointerEvents="none" />

        {/* Route — full path (faint) */}
        {routePath && (
          <path
            d={routePath}
            fill="none"
            stroke="#F5EBD8"
            strokeOpacity={0.55}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeDasharray="2 5"
            pointerEvents="none"
          />
        )}

        {/* Route — past portion (vermillion glow) */}
        {pastRoutePath && (
          <g pointerEvents="none">
            <path
              d={pastRoutePath}
              fill="none"
              stroke="#C4452F"
              strokeOpacity={0.85}
              strokeWidth={2.4}
              strokeLinecap="round"
              filter="url(#route-glow)"
              className="route-draw"
              style={{ ["--len" as any]: 6000 }}
            />
            <path
              d={pastRoutePath}
              fill="none"
              stroke="#FFD9B5"
              strokeOpacity={0.7}
              strokeWidth={0.8}
              strokeLinecap="round"
            />
          </g>
        )}

        {/* Markers */}
        <g>
          {markers.map((m, i) => {
            if (!m || !m.visible) return null;
            const isHome = m.dest.stopType === "homePort";
            const isScenic = m.dest.stopType === "scenic";
            const isDateline = m.dest.stopType === "dateline";
            const isSelected = m.dest.id === selectedId;
            const r = isHome ? 11 : isSelected ? 11 : 8;
            const fill = isDateline
              ? "#3D4A6B"
              : isScenic
                ? "#C9924B"
                : isHome
                  ? "#C4452F"
                  : "#F5EBD8";
            const stroke = isDateline ? "#F5EBD8" : "#1B2A4E";
            const labelColor =
              isDateline || isScenic || isHome ? "#F5EBD8" : "#1B2A4E";
            const day = trip.byId.get(m.dest.id)?.dayOfTrip ?? 0;
            return (
              <g
                key={m.dest.id}
                transform={`translate(${m.x} ${m.y})`}
                opacity={m.opacity}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(m.dest.id);
                }}
                className="marker-pop"
                style={{
                  animationDelay: `${320 + i * 18}ms`,
                  cursor: "pointer",
                  transformOrigin: "center",
                }}
              >
                {isSelected && (
                  <circle
                    r={r + 5}
                    fill="none"
                    stroke="#C4452F"
                    strokeWidth={1.5}
                    strokeOpacity={0.7}
                  />
                )}
                <circle
                  r={r}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={1.2}
                  filter="url(#seal-shadow)"
                />
                {!isDateline && (
                  <text
                    y={3.2}
                    textAnchor="middle"
                    fontSize={isHome ? 11 : 9.5}
                    fontFamily="JetBrains Mono"
                    fontWeight={600}
                    fill={labelColor}
                    pointerEvents="none"
                  >
                    {day}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* Selected marker labels — painted last so they sit above all other pins */}
        {(() => {
          const sel = markers.find((m) => m && m.visible && m.dest.id === selectedId);
          if (!sel) return null;
          const r = sel.dest.stopType === "homePort" ? 11 : 11;
          return (
            <g transform={`translate(${sel.x} ${sel.y})`} opacity={sel.opacity} pointerEvents="none">
              <text
                y={-r - 22}
                textAnchor="middle"
                fontSize={13}
                fontFamily="Newsreader"
                fontWeight={600}
                fill="#1B2A4E"
              >
                <tspan
                  style={{
                    paintOrder: "stroke",
                    stroke: "rgba(245,235,216,0.85)",
                    strokeWidth: 4,
                  }}
                >
                  {sel.dest.name}
                </tspan>
              </text>
              <text
                y={-r - 8}
                textAnchor="middle"
                fontSize={11}
                fontFamily="Newsreader"
                fontStyle="italic"
                fill="#1B2A4E"
              >
                <tspan
                  style={{
                    paintOrder: "stroke",
                    stroke: "rgba(245,235,216,0.85)",
                    strokeWidth: 4,
                  }}
                >
                  ({sel.dest.country})
                </tspan>
              </text>
            </g>
          );
        })()}

        {/* Today position pulse — clickable when we have live AIS data */}
        {todayProj && (
          <g
            transform={`translate(${todayProj.x} ${todayProj.y})`}
            opacity={todayProj.opacity}
            style={{ cursor: todayProj.live && shipPos ? "pointer" : "default" }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              if (!todayProj.live || !shipPos) return;
              e.stopPropagation();
              window.open(shipPos.trackUrl, "_blank", "noopener,noreferrer");
            }}
          >
            <circle r={6} fill="#C4452F" stroke="#F5EBD8" strokeWidth={1.4} filter="url(#seal-shadow)" />
            <circle r={6} fill="none" stroke="#C4452F" className="today-pulse" pointerEvents="none" />
            {todayProj.live && shipPos && (
              <title>
                {shipPos.name} — {shipPos.lat.toFixed(3)}, {shipPos.lon.toFixed(3)}
                {shipPos.speedKn != null ? ` — ${shipPos.speedKn.toFixed(1)} kn` : ""}
                {"\n"}Click to open live track
              </title>
            )}
          </g>
        )}
      </svg>
    </div>
  );
}

function graticulePaths(_pathGen: ReturnType<typeof geoPath>) {
  // Cheap graticule: lat lines every 30, lng lines every 30
  const lines: JSX.Element[] = [];
  for (let lat = -60; lat <= 60; lat += 30) {
    const coords: [number, number][] = [];
    for (let lng = -180; lng <= 180; lng += 4) coords.push([lng, lat]);
    const d = _pathGen({
      type: "Feature",
      geometry: { type: "LineString", coordinates: coords },
      properties: {},
    } as any);
    if (d) lines.push(<path key={`lat-${lat}`} d={d} fill="none" stroke="#FFE6C2" strokeWidth={0.5} />);
  }
  for (let lng = -180; lng < 180; lng += 30) {
    const coords: [number, number][] = [];
    for (let lat = -85; lat <= 85; lat += 4) coords.push([lng, lat]);
    const d = _pathGen({
      type: "Feature",
      geometry: { type: "LineString", coordinates: coords },
      properties: {},
    } as any);
    if (d) lines.push(<path key={`lng-${lng}`} d={d} fill="none" stroke="#FFE6C2" strokeWidth={0.5} />);
  }
  return lines;
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
