import type { TripStatus } from "../utils/tripStatus";
import { formatLongDate } from "../utils/tripStatus";

interface TodayCardProps {
  status: TripStatus;
  onSelect: (id: string) => void;
}

export function TodayCard({ status, onSelect }: TodayCardProps) {
  return (
    <div
      className="absolute top-24 md:top-28 left-6 md:left-10 z-20 max-w-[18rem] rise"
      style={{ animationDelay: "420ms" }}
    >
      <div className="bg-parchment/95 backdrop-blur-[2px] rounded-[3px] shadow-card border border-ink/10 px-5 py-4 relative overflow-hidden">
        <div className="absolute -top-2 -right-2 w-12 h-12 rounded-full bg-vermillion/10 blur-xl" />
        <p className="tracker text-[9px] text-vermillion mb-1.5">Right now</p>
        {renderBody(status, onSelect)}
      </div>
    </div>
  );
}

function renderBody(status: TripStatus, onSelect: (id: string) => void) {
  if (status.phase === "before") {
    return (
      <>
        <p className="display text-ink leading-tight" style={{ fontSize: "1.35rem", fontWeight: 500 }}>
          The voyage begins in <span className="italic">{status.daysUntil}</span> days.
        </p>
        <p className="text-ink/70 text-sm mt-2">
          Setting sail from {status.firstPort.name} on {formatLongDate(status.firstPort.arrivalDate)}.
        </p>
      </>
    );
  }
  if (status.phase === "in-port") {
    return (
      <>
        <p className="display text-ink leading-tight" style={{ fontSize: "1.35rem", fontWeight: 500 }}>
          Today they're in{" "}
          <button
            onClick={() => onSelect(status.port.id)}
            className="italic underline decoration-vermillion/60 underline-offset-4 decoration-2 hover:text-vermillion transition-colors"
          >
            {status.port.name}
          </button>
          .
        </p>
        <p className="text-ink/70 text-sm mt-2">{status.port.country}</p>
        <p className="tracker text-[9px] text-ink/50 mt-2">
          Day {status.dayOfTrip}
        </p>
      </>
    );
  }
  if (status.phase === "at-sea") {
    return (
      <>
        <p className="display text-ink leading-tight" style={{ fontSize: "1.3rem", fontWeight: 500 }}>
          Sailing on toward{" "}
          <button
            onClick={() => onSelect(status.next.id)}
            className="italic underline decoration-vermillion/60 underline-offset-4 decoration-2 hover:text-vermillion transition-colors"
          >
            {status.next.name}
          </button>
          .
        </p>
        <div className="mt-3">
          <div className="h-[3px] bg-ink/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-vermillion"
              style={{ width: `${Math.round(status.progress * 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 tracker text-[9px] text-ink/55">
            <span>{status.previous.name}</span>
            <span>{status.next.name}</span>
          </div>
        </div>
        <p className="text-ink/70 text-sm mt-3">
          {status.daysUntilNext === 0
            ? "Arriving tomorrow."
            : `${status.daysUntilNext} day${status.daysUntilNext === 1 ? "" : "s"} until they arrive.`}
        </p>
      </>
    );
  }
  return (
    <>
      <p className="display text-ink leading-tight" style={{ fontSize: "1.35rem", fontWeight: 500 }}>
        Home in <span className="italic">{status.lastPort.name}</span>.
      </p>
      <p className="text-ink/70 text-sm mt-2">The voyage is complete.</p>
    </>
  );
}
