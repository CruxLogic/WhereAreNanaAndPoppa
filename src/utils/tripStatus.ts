import type { Destination } from "../types";

export interface SortedTrip {
  ports: Destination[];
  byId: Map<string, { dest: Destination; index: number; dayOfTrip: number }>;
  totalDays: number;
}

export type TripStatus =
  | { phase: "before"; daysUntil: number; firstPort: Destination }
  | { phase: "in-port"; port: Destination; dayOfTrip: number }
  | {
      phase: "at-sea";
      previous: Destination;
      next: Destination;
      daysSincePrevious: number;
      daysUntilNext: number;
      progress: number;
      currentCoord: [number, number];
      dayOfTrip: number;
    }
  | { phase: "done"; lastPort: Destination };

export function buildSortedTrip(destinations: Destination[]): SortedTrip {
  const ports = [...destinations].sort((a, b) =>
    a.arrivalDate.localeCompare(b.arrivalDate),
  );
  const start = ports[0]?.arrivalDate;
  const byId = new Map<string, { dest: Destination; index: number; dayOfTrip: number }>();
  ports.forEach((dest, index) => {
    const dayOfTrip = start ? dayDiff(dest.arrivalDate, start) + 1 : index + 1;
    byId.set(dest.id, { dest, index, dayOfTrip });
  });
  const totalDays = start
    ? dayDiff(ports[ports.length - 1].departureDate, start) + 1
    : 0;
  return { ports, byId, totalDays };
}

export function getTripStatus(trip: SortedTrip, today: Date): TripStatus {
  const { ports } = trip;
  if (ports.length === 0) {
    throw new Error("No destinations.");
  }
  const todayIso = isoDate(today);
  const first = ports[0];
  const last = ports[ports.length - 1];

  if (todayIso < first.arrivalDate) {
    return {
      phase: "before",
      daysUntil: dayDiff(first.arrivalDate, todayIso),
      firstPort: first,
    };
  }
  if (todayIso > last.departureDate) {
    return { phase: "done", lastPort: last };
  }

  for (const p of ports) {
    if (todayIso >= p.arrivalDate && todayIso <= p.departureDate) {
      return {
        phase: "in-port",
        port: p,
        dayOfTrip: dayDiff(todayIso, first.arrivalDate) + 1,
      };
    }
  }

  for (let i = 0; i < ports.length - 1; i++) {
    const prev = ports[i];
    const next = ports[i + 1];
    if (prev.departureDate < todayIso && next.arrivalDate > todayIso) {
      const total = dayDiff(next.arrivalDate, prev.departureDate);
      const elapsed = dayDiff(todayIso, prev.departureDate);
      const progress = total > 0 ? elapsed / total : 0;
      const currentCoord: [number, number] = [
        prev.coords[0] + (next.coords[0] - prev.coords[0]) * progress,
        interpLng(prev.coords[1], next.coords[1], progress),
      ];
      return {
        phase: "at-sea",
        previous: prev,
        next,
        daysSincePrevious: elapsed,
        daysUntilNext: total - elapsed,
        progress,
        currentCoord,
        dayOfTrip: dayDiff(todayIso, first.arrivalDate) + 1,
      };
    }
  }
  return { phase: "done", lastPort: last };
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayDiff(a: string, b: string): number {
  return Math.round(
    (new Date(a + "T00:00:00Z").getTime() -
      new Date(b + "T00:00:00Z").getTime()) /
      86400000,
  );
}

function interpLng(a: number, b: number, t: number): number {
  let delta = b - a;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  let result = a + delta * t;
  if (result > 180) result -= 360;
  if (result < -180) result += 360;
  return result;
}

export function formatLongDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-NZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
