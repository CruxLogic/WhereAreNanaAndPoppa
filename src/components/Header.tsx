import type { Trip } from "../types";
import type { TripStatus } from "../utils/tripStatus";

interface HeaderProps {
  trip: Trip;
  status: TripStatus;
  totalDays: number;
}

function dayLabel(status: TripStatus, totalDays: number): string {
  if (status.phase === "before") return `Setting sail in ${status.daysUntil} days`;
  if (status.phase === "done") return `Voyage complete · ${totalDays} days at sea`;
  const day = status.phase === "in-port" ? status.dayOfTrip : status.dayOfTrip;
  return `Day ${day} of ${totalDays}`;
}

export function Header({ trip, status, totalDays }: HeaderProps) {
  return (
    <header className="absolute top-0 left-0 right-0 z-20 px-6 md:px-10 pt-5 pb-3 pointer-events-none">
      <div className="max-w-[1600px] mx-auto flex items-start justify-between gap-6">
        <div className="rise" style={{ animationDelay: "120ms" }}>
          <h1 className="display text-sky-cream leading-[0.95] tracking-tight"
              style={{ fontSize: "clamp(1.8rem, 3.4vw, 2.6rem)", fontWeight: 500 }}>
            Where are{" "}
            <span className="italic" style={{ fontWeight: 400, color: "#FFD9B5" }}>
              {trip.travellers[0]}
            </span>
            {" & "}
            <span className="italic" style={{ fontWeight: 400, color: "#FFD9B5" }}>
              {trip.travellers[1] ?? ""}
            </span>
            ?
          </h1>
        </div>
        <div
          className="text-right rise sm:hidden"
          style={{ animationDelay: "260ms" }}
        >
          <p className="tracker text-sky-cream/85" style={{ fontSize: "0.85rem" }}>
            {dayLabel(status, totalDays)}
          </p>
        </div>
      </div>
    </header>
  );
}
