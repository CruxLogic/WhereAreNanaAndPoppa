import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import WebSocket from "ws";

const MMSI = "310500000";
const SHIP_NAME = "Crown Princess";
const TRACK_URL = "https://www.cruisemapper.com/ships/Crown-Princess-708";
const OUTPUT_PATH = resolve("public/ship-position.json");
const TIMEOUT_MS = 240_000;

const apiKey = process.env.AISSTREAM_API_KEY;
if (!apiKey) {
  console.error("AISSTREAM_API_KEY is not set");
  process.exit(1);
}

interface PositionPayload {
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

const ws = new WebSocket("wss://stream.aisstream.io/v0/stream");

const timeout = setTimeout(() => {
  console.warn(
    `No AIS broadcast received for MMSI ${MMSI} within ${TIMEOUT_MS}ms — ship is likely outside terrestrial AIS coverage. Existing position file (if any) is left unchanged.`,
  );
  ws.close();
  process.exit(0);
}, TIMEOUT_MS);

ws.on("open", () => {
  ws.send(
    JSON.stringify({
      APIKey: apiKey,
      BoundingBoxes: [[[-90, -180], [90, 180]]],
      FiltersShipMMSI: [MMSI],
      FilterMessageTypes: ["PositionReport"],
    }),
  );
});

ws.on("message", async (raw) => {
  try {
    const msg = JSON.parse(raw.toString());
    if (msg.MessageType !== "PositionReport") return;
    const report = msg.Message?.PositionReport;
    const meta = msg.MetaData ?? {};
    if (!report || typeof report.Latitude !== "number" || typeof report.Longitude !== "number") {
      return;
    }
    const payload: PositionPayload = {
      lat: report.Latitude,
      lon: report.Longitude,
      speedKn: typeof report.Sog === "number" ? report.Sog : null,
      courseDeg: typeof report.Cog === "number" ? report.Cog : null,
      headingDeg: typeof report.TrueHeading === "number" && report.TrueHeading !== 511
        ? report.TrueHeading
        : null,
      timestamp: meta.time_utc ?? new Date().toISOString(),
      name: typeof meta.ShipName === "string" ? meta.ShipName.trim() : SHIP_NAME,
      mmsi: Number(MMSI),
      trackUrl: TRACK_URL,
    };
    await writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2) + "\n", "utf8");
    console.log(`Wrote ${OUTPUT_PATH}: ${payload.lat.toFixed(4)}, ${payload.lon.toFixed(4)} @ ${payload.timestamp}`);
    clearTimeout(timeout);
    ws.close();
    process.exit(0);
  } catch (err) {
    console.error("Failed to parse message:", err);
  }
});

ws.on("error", (err) => {
  console.error("WebSocket error:", err);
  clearTimeout(timeout);
  process.exit(3);
});
