import { useEffect, useRef } from "react";
import type { SortedTrip, TripStatus } from "../utils/tripStatus";
import { formatShortDate } from "../utils/tripStatus";

interface TimelineProps {
  trip: SortedTrip;
  status: TripStatus;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function Timeline({ trip, status, selectedId, onSelect }: TimelineProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Determine current focus port for auto-scroll
  const focusId = (() => {
    if (selectedId) return selectedId;
    if (status.phase === "in-port") return status.port.id;
    if (status.phase === "at-sea") return status.next.id;
    if (status.phase === "before") return status.firstPort.id;
    if (status.phase === "done") return status.lastPort.id;
    return null;
  })();

  useEffect(() => {
    if (!focusId || !scrollerRef.current) return;
    const el = scrollerRef.current.querySelector<HTMLElement>(
      `[data-port="${focusId}"]`,
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [focusId]);

  return (
    <div className="absolute left-0 right-0 bottom-0 z-20 px-3 md:px-6 pb-10 pointer-events-none">
      <div className="max-w-[1600px] mx-auto pointer-events-auto">
        <div className="relative bg-parchment/85 backdrop-blur-[2px] rounded-[3px] border border-ink/10 shadow-card overflow-hidden">
          <div
            className="absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none"
            style={{ background: "linear-gradient(to right, rgba(245,235,216,0.95), transparent)" }}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none"
            style={{ background: "linear-gradient(to left, rgba(245,235,216,0.95), transparent)" }}
          />
          <div
            ref={scrollerRef}
            className="timeline-scroll flex gap-2 overflow-x-auto px-4 py-3 snap-x snap-mandatory"
          >
            {trip.ports.map((d) => {
              const isFocus = focusId === d.id;
              const isSelected = selectedId === d.id;
              const dayOfTrip = trip.byId.get(d.id)?.dayOfTrip ?? 0;
              return (
                <button
                  key={d.id}
                  data-port={d.id}
                  onClick={() => onSelect(d.id)}
                  className={[
                    "snap-center shrink-0 px-3 py-2 rounded-[2px] text-left transition-all border",
                    isSelected
                      ? "bg-ink text-parchment border-ink"
                      : isFocus
                        ? "bg-vermillion/10 border-vermillion/40 text-ink"
                        : "bg-transparent border-transparent hover:bg-ink/5 text-ink",
                  ].join(" ")}
                  style={{ minWidth: "8rem" }}
                >
                  <div className="flex items-baseline gap-2">
                    <span
                      className={[
                        "font-mono text-[10px]",
                        isSelected ? "text-parchment-deep" : "text-vermillion",
                      ].join(" ")}
                    >
                      Day {dayOfTrip}
                    </span>
                    <span
                      className={[
                        "tracker text-[8px]",
                        isSelected ? "text-parchment-deep/80" : "text-ink/50",
                      ].join(" ")}
                    >
                      {formatShortDate(d.arrivalDate)}
                    </span>
                  </div>
                  <p
                    className="display leading-tight mt-0.5 truncate"
                    style={{ fontSize: "0.95rem", fontWeight: 500 }}
                  >
                    {d.name}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
