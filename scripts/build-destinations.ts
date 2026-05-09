import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Papa from "papaparse";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const csvPath = resolve(repoRoot, "TripItinary.csv");
const dataDir = resolve(repoRoot, "src/data");

interface CsvRow {
  Date: string;
  Day: string;
  Destination: string;
  Notes: string;
  Arrival: string;
  Departure: string;
}

interface Destination {
  id: string;
  name: string;
  country: string;
  coords: [number, number];
  arrivalDate: string;
  departureDate: string;
  arrivalTime?: string;
  departureTime?: string;
  stopType: "port" | "scenic" | "dateline" | "homePort";
  notes?: string;
  summary?: string;
  funFacts?: string[];
  localWord?: { word: string; meaning: string; pronunciation?: string };
  images?: Array<{ src: string; alt: string; credit: string; sourceUrl?: string }>;
  links?: Array<{ url: string; label: string; description?: string }>;
}

interface Trip {
  name: string;
  travellers: string[];
  startDate: string;
  endDate: string;
  vesselName?: string;
}

// Hardcoded port info: name in CSV → { country, coords: [lat, lng] }
// Coordinates use the actual cruise terminal location where it differs
// noticeably from the city centre (e.g. Fremantle for Perth, IJmuiden
// for Amsterdam, Callao for Lima).
const PORTS: Record<string, { country: string; coords: [number, number] }> = {
  Auckland: { country: "New Zealand", coords: [-36.8485, 174.7633] },
  Sydney: { country: "Australia", coords: [-33.8688, 151.2093] },
  Melbourne: { country: "Australia", coords: [-37.8136, 144.9631] },
  Adelaide: { country: "Australia", coords: [-34.9285, 138.6007] },
  "Perth (Fremantle)": { country: "Australia", coords: [-32.0569, 115.7474] },
  "Port Louis": { country: "Mauritius", coords: [-20.1619, 57.4989] },
  "Cape Town": { country: "South Africa", coords: [-33.9249, 18.4241] },
  "Walvis Bay": { country: "Namibia", coords: [-22.9576, 14.5053] },
  Mindelo: { country: "Cape Verde", coords: [16.8901, -24.9819] },
  "Gran Canaria (Las Palmas)": { country: "Spain", coords: [28.1235, -15.4363] },
  Casablanca: { country: "Morocco", coords: [33.5731, -7.5898] },
  "La Coruna": { country: "Spain", coords: [43.3623, -8.4115] },
  "Le Havre": { country: "France", coords: [49.4938, 0.1077] },
  Zeebrugge: { country: "Belgium", coords: [51.3299, 3.2089] },
  Gdansk: { country: "Poland", coords: [54.5189, 18.5305] },
  Visby: { country: "Sweden", coords: [57.6348, 18.2948] },
  Helsinki: { country: "Finland", coords: [60.1699, 24.9384] },
  Tallinn: { country: "Estonia", coords: [59.437, 24.7536] },
  Stockholm: { country: "Sweden", coords: [59.3293, 18.0686] },
  Copenhagen: { country: "Denmark", coords: [55.6761, 12.5683] },
  Amsterdam: { country: "Netherlands", coords: [52.4607, 4.5683] },
  Dover: { country: "United Kingdom", coords: [51.1279, 1.3134] },
  "Shetland Islands": { country: "United Kingdom", coords: [60.1546, -1.1494] },
  Reykjavik: { country: "Iceland", coords: [64.1466, -21.9426] },
  Grundarfjordur: { country: "Iceland", coords: [64.9226, -23.2531] },
  Isafjordur: { country: "Iceland", coords: [66.075, -23.1233] },
  "St. John's": { country: "Canada", coords: [47.5615, -52.7126] },
  "Corner Brook": { country: "Canada", coords: [48.9492, -57.9525] },
  "Quebec City": { country: "Canada", coords: [46.8139, -71.208] },
  Saguenay: { country: "Canada", coords: [48.428, -71.0683] },
  Charlottetown: { country: "Canada", coords: [46.2382, -63.1311] },
  // Sydney appears twice in the itinerary (Australia + Nova Scotia). The
  // CSV lists them under the same name; we disambiguate by date below.
  Halifax: { country: "Canada", coords: [44.6488, -63.5752] },
  "New York City": { country: "United States", coords: [40.7128, -74.006] },
  Miami: { country: "United States", coords: [25.7617, -80.1918] },
  Cartagena: { country: "Colombia", coords: [10.391, -75.4794] },
  "Panama Canal": { country: "Panama", coords: [9.082, -79.771] },
  Manta: { country: "Ecuador", coords: [-0.9677, -80.7089] },
  Lima: { country: "Peru", coords: [-12.0464, -77.1428] },
  Pisco: { country: "Peru", coords: [-13.715, -76.2178] },
  "Easter Island": { country: "Chile", coords: [-27.1127, -109.3497] },
  "Pitcairn Island": { country: "United Kingdom", coords: [-25.0664, -130.1015] },
  Papeete: { country: "French Polynesia", coords: [-17.5516, -149.5585] },
  Moorea: { country: "French Polynesia", coords: [-17.5388, -149.8295] },
  "Cross International Date Line": {
    country: "International Date Line",
    coords: [-26, 180],
  },
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[()'.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseDate(dmY: string): string {
  const [d, m, y] = dmY.split("/");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function parseTime(t: string): string | undefined {
  if (!t || t === "—") return undefined;
  // "10:00pm" -> "22:00"; "8:00am" -> "08:00"
  const match = t.match(/(\d{1,2}):(\d{2})(am|pm)/i);
  if (!match) return undefined;
  let h = parseInt(match[1], 10);
  const m = match[2];
  const period = match[3].toLowerCase();
  if (period === "pm" && h !== 12) h += 12;
  if (period === "am" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${m}`;
}

function classifyStopType(
  name: string,
  notes: string | undefined,
  isFirstOrLastAuckland: boolean,
): Destination["stopType"] {
  if (isFirstOrLastAuckland) return "homePort";
  if (name === "Cross International Date Line") return "dateline";
  if (notes && /scenic/i.test(notes)) return "scenic";
  return "port";
}

function normalizeName(s: string): string {
  return s.replace(/[‘’]/g, "'").trim();
}

function resolvePort(rawName: string, arrivalDate: string) {
  const name = normalizeName(rawName);
  // Sydney disambiguation: first Sydney = Australia (May), second = Nova Scotia (July)
  if (name === "Sydney") {
    if (arrivalDate < "2026-07-01") {
      return { country: "Australia", coords: [-33.8688, 151.2093] as [number, number] };
    }
    return { country: "Canada", coords: [46.1351, -60.1831] as [number, number] };
  }
  const port = PORTS[name];
  if (!port) {
    throw new Error(`Unknown port "${name}" — add it to PORTS lookup`);
  }
  return port;
}

const csv = readFileSync(csvPath, "utf-8");
const parsed = Papa.parse<CsvRow>(csv, { header: true, skipEmptyLines: true });
if (parsed.errors.length > 0) {
  console.error("CSV parse errors:", parsed.errors);
  process.exit(1);
}

const rows = parsed.data.filter((r) => r.Destination && r.Destination !== "At Sea");

// Group consecutive same-destination rows.
// We treat "consecutive same name" as one logical stop only when the
// rows are date-adjacent — Auckland appears first and last but those
// are separated by months of itinerary, so they remain two stops.
const grouped: Array<{ rows: CsvRow[]; name: string }> = [];
for (const row of rows) {
  const last = grouped[grouped.length - 1];
  if (last && last.name === row.Destination) {
    const prevDate = parseDate(last.rows[last.rows.length - 1].Date);
    const thisDate = parseDate(row.Date);
    const diffDays =
      (Date.parse(thisDate) - Date.parse(prevDate)) / (1000 * 60 * 60 * 24);
    if (diffDays <= 1) {
      last.rows.push(row);
      continue;
    }
  }
  grouped.push({ rows: [row], name: row.Destination });
}

const aucklandIndices = grouped
  .map((g, i) => (g.name === "Auckland" ? i : -1))
  .filter((i) => i !== -1);
const firstAucklandIdx = aucklandIndices[0];
const lastAucklandIdx = aucklandIndices[aucklandIndices.length - 1];

const destinations: Destination[] = grouped.map((group, idx) => {
  const first = group.rows[0];
  const last = group.rows[group.rows.length - 1];
  const arrivalDate = parseDate(first.Date);
  const departureDate = parseDate(last.Date);
  const port = resolvePort(group.name, arrivalDate);
  const name = normalizeName(group.name);
  const isFirstOrLastAuckland =
    name === "Auckland" && (idx === firstAucklandIdx || idx === lastAucklandIdx);
  // Disambiguate the two Sydneys in the slug to keep ids unique.
  let id = slugify(name);
  if (name === "Sydney") {
    id = arrivalDate < "2026-07-01" ? "sydney-australia" : "sydney-nova-scotia";
  }
  if (name === "Auckland") {
    id = idx === firstAucklandIdx ? "auckland-start" : "auckland-finish";
  }
  return {
    id,
    name,
    country: port.country,
    coords: port.coords,
    arrivalDate,
    departureDate,
    arrivalTime: parseTime(first.Arrival),
    departureTime: parseTime(last.Departure),
    stopType: classifyStopType(name, first.Notes, isFirstOrLastAuckland),
    notes: first.Notes && first.Notes !== "—" ? first.Notes : undefined,
  };
});

const trip: Trip = {
  name: "Where Is Nana And Pop",
  travellers: ["Nana", "Pop"],
  startDate: destinations[0].arrivalDate,
  endDate: destinations[destinations.length - 1].departureDate,
};

mkdirSync(dataDir, { recursive: true });
writeFileSync(
  resolve(dataDir, "destinations.json"),
  JSON.stringify(destinations, null, 2) + "\n",
);
writeFileSync(resolve(dataDir, "trip.json"), JSON.stringify(trip, null, 2) + "\n");

console.log(`Wrote ${destinations.length} destinations to src/data/destinations.json`);
console.log(`Trip: ${trip.startDate} → ${trip.endDate}`);
