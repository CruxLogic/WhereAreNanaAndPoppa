import { useEffect, useState, type FormEvent, type ReactNode } from "react";

const STORAGE_KEY = "wnp.unlocked";
const EXPECTED_HASH = (import.meta.env.VITE_SITE_PASSWORD_HASH ?? "").toLowerCase();

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface PasswordGateProps {
  children: ReactNode;
}

export function PasswordGate({ children }: PasswordGateProps) {
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === EXPECTED_HASH && EXPECTED_HASH !== "";
    } catch {
      return false;
    }
  });
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!EXPECTED_HASH) {
      console.warn(
        "[PasswordGate] VITE_SITE_PASSWORD_HASH is not set. The site is locked. Run `npm run hash-password` and add the result to .env, then rebuild.",
      );
    }
  }, []);

  if (unlocked) return <>{children}</>;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!EXPECTED_HASH) {
      setError("Site not configured.");
      return;
    }
    setPending(true);
    try {
      const hash = await sha256Hex(value.trim());
      if (hash === EXPECTED_HASH) {
        try {
          localStorage.setItem(STORAGE_KEY, EXPECTED_HASH);
        } catch {
          /* ignore storage failures (private mode, etc.) */
        }
        setUnlocked(true);
      } else {
        setError("Incorrect password.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="dawn-sky relative h-full w-full overflow-hidden flex items-center justify-center px-6">
      <div
        className="relative z-10 max-w-md w-full text-center rise"
        style={{ animationDelay: "120ms" }}
      >
        <h1
          className="display text-sky-cream leading-[0.95] tracking-tight"
          style={{ fontSize: "clamp(2rem, 4.6vw, 3.2rem)", fontWeight: 500 }}
        >
          Where are{" "}
          <span className="italic" style={{ fontWeight: 400, color: "#FFD9B5" }}>
            Nana
          </span>
          {" & "}
          <span className="italic" style={{ fontWeight: 400, color: "#FFD9B5" }}>
            Poppa
          </span>
          ?
        </h1>
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col items-stretch gap-3">
          <input
            type="password"
            autoFocus
            autoComplete="current-password"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Password"
            className="w-full rounded-md border border-sky-cream/30 bg-sky-cream/10 px-4 py-3 text-sky-cream placeholder:text-sky-cream/50 outline-none focus:border-sky-cream/70 focus:bg-sky-cream/15 transition"
            style={{ fontSize: "1rem" }}
          />
          <button
            type="submit"
            disabled={pending || value.length === 0}
            className="rounded-md bg-sky-cream/90 text-[color:var(--ink)] px-4 py-3 font-medium tracking-wide hover:bg-sky-cream transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontSize: "0.95rem" }}
          >
            {pending ? "Checking..." : "Enter"}
          </button>
          <div
            className="min-h-[1.25rem] text-sm"
            style={{ color: "var(--vermillion-glow)" }}
            aria-live="polite"
          >
            {error}
          </div>
        </form>
      </div>
    </div>
  );
}
