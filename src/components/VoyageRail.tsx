import type { SortedTrip, TripStatus } from "../utils/tripStatus";
import { formatShortDate } from "../utils/tripStatus";
import { RightNowBody } from "./TodayCard";

interface VoyageRailProps {
  trip: SortedTrip;
  status: TripStatus;
  totalDays: number;
  onSelect: (id: string) => void;
}

function dayOfTrip(status: TripStatus, totalDays: number): number {
  if (status.phase === "before") return 0;
  if (status.phase === "in-port" || status.phase === "at-sea") return status.dayOfTrip;
  return totalDays;
}

export function VoyageRail({ trip, status, totalDays, onSelect }: VoyageRailProps) {
  const todayIso = isoDate(new Date());
  let portsVisited = 0;
  for (const p of trip.ports) {
    if (p.departureDate < todayIso) portsVisited++;
  }
  const portsRemaining = Math.max(0, trip.ports.length - portsVisited);
  const day = dayOfTrip(status, totalDays);
  const daysRemaining = Math.max(0, totalDays - day);
  const progressPct = totalDays > 0 ? Math.min(100, Math.max(0, (day / totalDays) * 100)) : 0;

  let daysAtSea = 0;
  for (let i = 0; i < trip.ports.length - 1; i++) {
    const a = trip.ports[i];
    const b = trip.ports[i + 1];
    if (b.arrivalDate <= todayIso) {
      daysAtSea += dayDiff(b.arrivalDate, a.departureDate);
    } else if (a.departureDate < todayIso) {
      daysAtSea += dayDiff(todayIso, a.departureDate);
      break;
    } else {
      break;
    }
  }

  const upcoming = trip.ports
    .filter((p) => p.arrivalDate > todayIso && p.stopType !== "dateline")
    .slice(0, 4);

  const startIso = trip.ports[0]?.arrivalDate;
  const endIso = trip.ports[trip.ports.length - 1]?.departureDate;

  return (
    <aside className="hidden sm:block parchment-scroll absolute top-0 right-0 z-10 w-[22rem] md:w-[24rem] lg:w-[26rem] xl:w-[34rem] 2xl:w-[40rem] bg-parchment shadow-panel overflow-y-auto rise"
      style={{ animationDelay: "320ms", bottom: "104px" }}
    >
      <div className="relative px-7 pt-7 pb-10">
        <div className="flex items-center gap-3 mb-1">
          <span className="tracker text-[10px] text-vermillion">Voyage</span>
          <span className="h-px flex-1 bg-ink/15" />
        </div>

        <div className="flex items-baseline gap-3 mt-2">
          <span
            className="display text-ink"
            style={{
              fontSize: "clamp(2.4rem, 4vw, 3.2rem)",
              fontWeight: 500,
              lineHeight: "1",
              letterSpacing: "-0.01em",
            }}
          >
            {status.phase === "before" ? `T-${status.daysUntil}` : `Day ${day}`}
          </span>
          <span
            className="display italic text-ink/60"
            style={{ fontSize: "1.4rem", fontWeight: 400 }}
          >
            {status.phase === "before"
              ? status.daysUntil === 1
                ? "day to go"
                : "days to go"
              : `of ${totalDays}`}
          </span>
        </div>

        {startIso && endIso && (
          <p className="tracker text-[10px] text-ink/55 mt-2">
            {formatShortDate(startIso)} &mdash; {formatShortDate(endIso)}
          </p>
        )}

        <div className="mt-5">
          <div className="h-[4px] bg-ink/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-vermillion transition-[width] duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 tracker text-[9px] text-ink/55">
            <span>Auckland</span>
            <span>Home</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-ink/10 py-4">
          <Stat label="Ports visited" value={portsVisited} />
          <Stat label="Still to come" value={portsRemaining} />
          <Stat label="Days at sea" value={daysAtSea} />
          <Stat label="Days to home" value={daysRemaining} />
        </div>

        <section className="mt-6">
          <p className="tracker text-[10px] text-vermillion mb-3">Right now</p>
          <RightNowBody status={status} onSelect={onSelect} />
        </section>

        {upcoming.length > 0 && (
          <section className="mt-7">
            <p className="tracker text-[10px] text-vermillion mb-3">Up next</p>
            <ul className="space-y-2">
              {upcoming.map((p) => {
                const entry = trip.byId.get(p.id);
                const dayOf = entry?.dayOfTrip ?? 0;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(p.id)}
                      className="w-full flex items-baseline justify-between gap-3 py-2 px-3 -mx-3 rounded-[3px] hover:bg-parchment-deep/50 transition-colors text-left group"
                    >
                      <span className="flex items-baseline gap-3 min-w-0">
                        <span className="font-mono text-[10px] text-vermillion shrink-0 w-10">
                          Day {dayOf}
                        </span>
                        <span className="display text-ink truncate group-hover:text-vermillion transition-colors" style={{ fontSize: "1rem", fontWeight: 500 }}>
                          {p.name}
                        </span>
                      </span>
                      <span className="tracker text-[9px] text-ink/55 shrink-0">
                        {formatShortDate(p.arrivalDate)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="tracker text-ink/55 text-[9px]">{label}</p>
      <p
        className="display text-ink mt-1"
        style={{ fontSize: "1.5rem", fontWeight: 500, lineHeight: "1" }}
      >
        {value}
      </p>
    </div>
  );
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayDiff(a: string, b: string): number {
  return Math.round(
    (new Date(a + "T00:00:00Z").getTime() - new Date(b + "T00:00:00Z").getTime()) /
      86400000,
  );
}
