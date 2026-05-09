import { useEffect, useMemo, useRef, useState } from "react";
import shipData from "../data/ship.json";
import { Lightbox, type LightboxImage } from "./Lightbox";
import { formatLongDate } from "../utils/tripStatus";

interface ShipPanelProps {
  open: boolean;
  onClose: () => void;
  livePosition?: {
    lat: number;
    lon: number;
    speedKn: number | null;
    timestamp: string;
  } | null;
}

const baseUrl = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

export function ShipPanel({ open, onClose, livePosition }: ShipPanelProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const asideRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (open) {
      setLightboxIndex(null);
      asideRef.current?.scrollTo({ top: 0 });
    }
  }, [open]);

  const images: LightboxImage[] = useMemo(
    () =>
      shipData.images.map((img) => ({
        src: `${baseUrl}${img.src}`,
        alt: img.alt,
        credit: img.credit,
        sourceUrl: img.sourceUrl,
      })),
    [],
  );

  if (!open) return null;

  const openTracker = () => {
    window.open(shipData.trackUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <aside
      ref={asideRef}
      className="panel-in parchment-scroll absolute top-0 right-0 z-30 w-full sm:w-[34rem] md:w-[38rem] lg:w-[40rem] bg-parchment shadow-panel overflow-y-auto sm:bottom-[104px] bottom-0"
    >
      <div className="relative px-7 pt-7 pb-10">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-parchment-deep/60 hover:bg-parchment-deep text-ink/70 hover:text-ink flex items-center justify-center transition-colors z-10"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <div className="flex items-center gap-3 mb-1 pr-12">
          <span className="tracker text-[10px] text-vermillion">The Ship</span>
          <span className="h-px flex-1 bg-ink/15" />
        </div>

        <h2
          className="display text-ink leading-[1.02] mt-2 pr-12"
          style={{ fontSize: "clamp(2rem, 4vw, 2.7rem)", fontWeight: 500 }}
        >
          {shipData.name}
        </h2>
        <p className="display italic text-ink/65 mt-1" style={{ fontSize: "1.6rem", fontWeight: 400 }}>
          {shipData.tagline}
        </p>

        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            onClick={openTracker}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-[3px] border border-ink/20 bg-parchment-deep/40 hover:bg-parchment-deep text-ink/80 hover:text-ink tracker text-[10px] transition-colors"
          >
            View Exact Location <span aria-hidden>&rarr;</span>
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3 border-y border-ink/10 py-4">
          <div>
            <p className="tracker text-[9px] text-ink/50">Embark</p>
            <p className="display text-ink mt-0.5" style={{ fontSize: "0.95rem" }}>
              {formatDayMonthYear(shipData.voyage.embarkDate)}
            </p>
          </div>
          <div>
            <p className="tracker text-[9px] text-ink/50">Return</p>
            <p className="display text-ink mt-0.5" style={{ fontSize: "0.95rem" }}>
              {formatDayMonthYear(shipData.voyage.returnDate)}
            </p>
          </div>
          <div>
            <p className="tracker text-[9px] text-ink/50">Voyage</p>
            <p className="display text-ink mt-0.5" style={{ fontSize: "0.95rem" }}>
              {shipData.voyage.totalDays} days
            </p>
          </div>
          <div>
            <p className="tracker text-[9px] text-ink/50">Last AIS fix</p>
            <p className="font-mono text-[12px] text-ink mt-0.5">
              {livePosition
                ? `${livePosition.lat.toFixed(2)}, ${livePosition.lon.toFixed(2)}`
                : "—"}
            </p>
            {livePosition && (
              <p className="tracker text-[9px] text-ink/55 mt-0.5">
                {formatRelative(livePosition.timestamp)}
                {livePosition.speedKn != null ? ` · ${livePosition.speedKn.toFixed(1)} kn` : ""}
              </p>
            )}
          </div>
        </div>

        {images.length > 0 && (
          <div className="mt-5 -mx-7 px-7 overflow-x-auto snap-x snap-mandatory parchment-scroll">
            <div className="flex gap-3 pb-1">
              {images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setLightboxIndex(i)}
                  aria-label={`Open image: ${img.alt}`}
                  className="snap-start shrink-0 basis-[40%] bg-white p-2 shadow-card text-left cursor-zoom-in transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-vermillion/60"
                >
                  <img src={img.src} alt={img.alt} className="w-full aspect-[4/3] object-cover" />
                  <p className="tracker text-[8px] text-ink/55 mt-1.5 truncate">{img.credit}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-ink/85 leading-relaxed mt-5" style={{ fontSize: "1.02rem" }}>
          {shipData.summary}
        </p>

        {shipData.specs.length > 0 && (
          <section className="mt-6">
            <p className="tracker text-[10px] text-vermillion mb-3">By the numbers</p>
            <dl className="grid grid-cols-2 gap-x-5 gap-y-2">
              {shipData.specs.map((s) => (
                <div key={s.label} className="flex items-baseline gap-2">
                  <dt className="tracker text-[9px] text-ink/50 shrink-0 min-w-[5.5rem]">
                    {s.label}
                  </dt>
                  <dd className="display text-ink" style={{ fontSize: "0.95rem" }}>
                    {s.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {shipData.highlights.length > 0 && (
          <section className="mt-6">
            <p className="tracker text-[10px] text-vermillion mb-3">Onboard highlights</p>
            <ol className="space-y-3">
              {shipData.highlights.map((h, i) => (
                <li key={i} className="flex gap-3">
                  <span className="font-mono text-[11px] text-vermillion mt-1 shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-ink/85 leading-relaxed">
                    <span className="display text-ink" style={{ fontWeight: 500 }}>
                      {h.title}.
                    </span>{" "}
                    {h.body}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {shipData.dining.length > 0 && (
          <section className="mt-6">
            <p className="tracker text-[10px] text-vermillion mb-3">Dining</p>
            <ul className="space-y-3">
              {shipData.dining.map((d, i) => (
                <li key={i} className="flex gap-3">
                  <span className="font-mono text-[11px] text-vermillion mt-1 shrink-0">&rarr;</span>
                  <span className="text-ink/85 leading-relaxed">
                    <span className="display text-ink" style={{ fontWeight: 500 }}>
                      {d.name}.
                    </span>{" "}
                    {d.note}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {shipData.activities.length > 0 && (
          <section className="mt-6">
            <p className="tracker text-[10px] text-vermillion mb-3">Things to do on board</p>
            <ul className="space-y-3">
              {shipData.activities.map((a, i) => (
                <li key={i} className="flex gap-3">
                  <span className="font-mono text-[11px] text-vermillion mt-1 shrink-0">&rarr;</span>
                  <span className="text-ink/85 leading-relaxed">{a}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {shipData.bars.length > 0 && (
          <section className="mt-6">
            <p className="tracker text-[10px] text-vermillion mb-3">Bars worth a stop</p>
            <ul className="space-y-3">
              {shipData.bars.map((b, i) => (
                <li key={i} className="flex gap-3">
                  <span className="font-mono text-[11px] text-vermillion mt-1 shrink-0">&middot;</span>
                  <span className="text-ink/85 leading-relaxed">
                    <span className="display text-ink" style={{ fontWeight: 500 }}>
                      {b.name}.
                    </span>{" "}
                    {b.note}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {shipData.links.length > 0 && (
          <section className="mt-6">
            <p className="tracker text-[10px] text-ink/55 mb-2">Read more</p>
            <ul className="space-y-2">
              {shipData.links.map((l, i) => (
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
          {formatLongDate(shipData.voyage.embarkDate)} &mdash;{" "}
          {formatLongDate(shipData.voyage.returnDate)}
        </p>
      </div>

      {lightboxIndex !== null && images.length > 0 && (
        <Lightbox
          images={images}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      )}
    </aside>
  );
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatDayMonthYear(iso: string): string {
  const [y, m, day] = iso.split("-").map(Number);
  return `${String(day).padStart(2, "0")} ${MONTHS[m - 1]} ${String(y).slice(-2)}`;
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return iso;
  const diffMs = Date.now() - t;
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} d ago`;
}
