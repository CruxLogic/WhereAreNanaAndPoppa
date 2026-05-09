import { useEffect, useState } from "react";
import type { Destination } from "../types";
import { formatLongDate, formatShortDate } from "../utils/tripStatus";
import { Lightbox } from "./Lightbox";

interface PanelProps {
  destination: Destination | null;
  dayOfTrip: number | null;
  onClose: () => void;
}

export function DestinationPanel({ destination, dayOfTrip, onClose }: PanelProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    setLightboxIndex(null);
  }, [destination?.id]);

  if (!destination) return null;
  const d = destination;
  const sameDay = d.arrivalDate === d.departureDate;

  return (
    <aside
      key={d.id}
      className="panel-in absolute top-0 right-0 bottom-0 z-30 w-full sm:w-[26rem] md:w-[28rem] bg-parchment shadow-panel overflow-y-auto"
    >
      <div className="relative px-7 pt-7 pb-10">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-parchment-deep/60 hover:bg-parchment-deep text-ink/70 hover:text-ink flex items-center justify-center transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <div className="flex items-center gap-3 mb-1">
          <span className="tracker text-[10px] text-vermillion">
            {dayOfTrip != null ? `Day ${dayOfTrip}` : "Stop"}
          </span>
          <span className="h-px flex-1 bg-ink/15" />
          <span className="tracker text-[10px] text-ink/55">
            {stopTypeLabel(d.stopType)}
          </span>
        </div>

        <h2
          className="display text-ink leading-[1.02] mt-2"
          style={{ fontSize: "clamp(2rem, 4vw, 2.7rem)", fontWeight: 500 }}
        >
          {d.name}
        </h2>
        <p className="display italic text-ink/65 mt-1" style={{ fontSize: "1.1rem", fontWeight: 400 }}>
          {d.country}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3 border-y border-ink/10 py-4">
          <div>
            <p className="tracker text-[9px] text-ink/50">
              {sameDay ? "Visit" : "Arrive"}
            </p>
            <p className="display text-ink mt-0.5" style={{ fontSize: "0.95rem" }}>
              {formatShortDate(d.arrivalDate)}
            </p>
            {d.arrivalTime && (
              <p className="tracker text-[10px] text-ink/55 mt-0.5">{d.arrivalTime}</p>
            )}
          </div>
          {!sameDay && (
            <div>
              <p className="tracker text-[9px] text-ink/50">Depart</p>
              <p className="display text-ink mt-0.5" style={{ fontSize: "0.95rem" }}>
                {formatShortDate(d.departureDate)}
              </p>
              {d.departureTime && (
                <p className="tracker text-[10px] text-ink/55 mt-0.5">{d.departureTime}</p>
              )}
            </div>
          )}
          <div className={sameDay ? "" : "col-span-2"}>
            <p className="tracker text-[9px] text-ink/50">Latitude</p>
            <p className="font-mono text-[12px] text-ink mt-0.5">
              {formatCoord(d.coords[0], "lat")}
            </p>
          </div>
          <div className={sameDay ? "col-span-2" : "col-span-2"}>
            <p className="tracker text-[9px] text-ink/50">Longitude</p>
            <p className="font-mono text-[12px] text-ink mt-0.5">
              {formatCoord(d.coords[1], "lng")}
            </p>
          </div>
        </div>

        {d.notes && (
          <p className="display italic text-ink/75 mt-5" style={{ fontSize: "0.95rem" }}>
            &ldquo;{d.notes}&rdquo;
          </p>
        )}

        {d.summary && (
          <p className="text-ink/85 leading-relaxed mt-5" style={{ fontSize: "1.02rem" }}>
            {d.summary}
          </p>
        )}

        {d.funFacts && d.funFacts.length > 0 && (
          <section className="mt-6">
            <p className="tracker text-[10px] text-vermillion mb-3">Did you know</p>
            <ol className="space-y-3">
              {d.funFacts.map((f, i) => (
                <li key={i} className="flex gap-3">
                  <span className="font-mono text-[11px] text-vermillion mt-1 shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-ink/85 leading-relaxed">{f}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {d.thingsToDo && d.thingsToDo.length > 0 && (
          <section className="mt-6">
            <p className="tracker text-[10px] text-vermillion mb-3">Things to do</p>
            <ul className="space-y-3">
              {d.thingsToDo.map((t, i) => (
                <li key={i} className="flex gap-3">
                  <span className="font-mono text-[11px] text-vermillion mt-1 shrink-0">
                    &rarr;
                  </span>
                  <span className="text-ink/85 leading-relaxed">{t}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {d.localWord && (
          <section className="mt-6">
            <div className="bg-parchment-warm border border-brass/35 rounded-[3px] p-4 relative">
              <p className="tracker text-[9px] text-brass-deep mb-1">A word from here</p>
              <p
                className="display text-ink leading-tight"
                style={{ fontSize: "1.6rem", fontWeight: 500 }}
              >
                {d.localWord.word}
              </p>
              {d.localWord.pronunciation && (
                <p className="font-mono text-[11px] text-ink/60 mt-1">
                  {d.localWord.pronunciation}
                </p>
              )}
              <p className="text-ink/80 italic mt-2">
                {d.localWord.meaning}
              </p>
            </div>
          </section>
        )}

        {d.images && d.images.length > 0 && (
          <section className="mt-6 grid grid-cols-2 gap-3">
            {d.images.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setLightboxIndex(i)}
                aria-label={`Open image: ${img.alt}`}
                className="bg-white p-2 shadow-card text-left cursor-zoom-in transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-vermillion/60"
                style={{ transform: `rotate(${(i % 2 === 0 ? -1 : 1) * 0.6}deg)` }}
              >
                <img src={img.src} alt={img.alt} className="w-full aspect-[4/3] object-cover" />
                <p className="tracker text-[8px] text-ink/55 mt-1.5">
                  {img.credit}
                </p>
              </button>
            ))}
          </section>
        )}

        {d.links && d.links.length > 0 && (
          <section className="mt-6">
            <p className="tracker text-[10px] text-ink/55 mb-2">Read more</p>
            <ul className="space-y-2">
              {d.links.map((l, i) => (
                <li key={i}>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="display text-ink hover:text-vermillion underline decoration-ink/30 underline-offset-4 decoration-1 hover:decoration-vermillion transition-colors"
                  >
                    {l.label}
                  </a>
                  {l.description && (
                    <span className="text-ink/60 text-sm"> &middot; {l.description}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="tracker text-[9px] text-ink/40 mt-10">
          {formatLongDate(d.arrivalDate)}
        </p>
      </div>

      {lightboxIndex !== null && d.images && d.images.length > 0 && (
        <Lightbox
          images={d.images}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      )}
    </aside>
  );
}

function stopTypeLabel(t: Destination["stopType"]): string {
  switch (t) {
    case "homePort":
      return "Home port";
    case "scenic":
      return "Scenic stop";
    case "dateline":
      return "Crossing";
    default:
      return "Port of call";
  }
}

function formatCoord(value: number, axis: "lat" | "lng"): string {
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const min = Math.floor((abs - deg) * 60);
  const sec = Math.round(((abs - deg) * 60 - min) * 60);
  const dir = axis === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  return `${deg}° ${String(min).padStart(2, "0")}′ ${String(sec).padStart(2, "0")}″ ${dir}`;
}
