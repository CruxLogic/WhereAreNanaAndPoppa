import { useEffect, useMemo, useState } from "react";
import type { Destination, Trip } from "./types";
import destinationsData from "./data/destinations.json";
import tripData from "./data/trip.json";
import { Globe } from "./components/Globe";
import { Header } from "./components/Header";
import { TodayCard } from "./components/TodayCard";
import { VoyageRail } from "./components/VoyageRail";
import { DestinationPanel } from "./components/DestinationPanel";
import { ShipPanel } from "./components/ShipPanel";
import { Timeline } from "./components/Timeline";
import { buildSortedTrip, getTripStatus } from "./utils/tripStatus";
import { mergeExtracts } from "./utils/mergeExtracts";

const destinations = mergeExtracts(destinationsData as Destination[]);
const trip = tripData as Trip;

export interface ShipPosition {
  lat: number;
  lon: number;
  speedKn: number | null;
  courseDeg: number | null;
  headingDeg: number | null;
  timestamp: string;
  name: string;
  mmsi: number;
  trackUrl?: string;
}

function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shipOpen, setShipOpen] = useState(false);
  const [shipPos, setShipPos] = useState<ShipPosition | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}ship-position.json`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ShipPosition | null) => {
        if (cancelled || !data || typeof data.lat !== "number") return;
        setShipPos(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const selectPort = (id: string | null) => {
    setSelectedId(id);
    setShipOpen(false);
  };

  const selectShip = () => {
    setShipOpen(true);
    setSelectedId(null);
  };

  const sortedTrip = useMemo(() => buildSortedTrip(destinations), []);
  const status = useMemo(() => getTripStatus(sortedTrip, new Date()), [sortedTrip]);

  const selectedEntry = selectedId ? sortedTrip.byId.get(selectedId) ?? null : null;
  const selected = selectedEntry?.dest ?? null;
  const selectedDay = selectedEntry?.dayOfTrip ?? null;
  const selectedIndex = selectedEntry?.index ?? null;
  const prevId =
    selectedIndex != null && selectedIndex > 0
      ? sortedTrip.ports[selectedIndex - 1].id
      : null;
  const nextId =
    selectedIndex != null && selectedIndex < sortedTrip.ports.length - 1
      ? sortedTrip.ports[selectedIndex + 1].id
      : null;

  return (
    <div className="dawn-sky relative h-full w-full overflow-hidden">
      <Globe
        trip={sortedTrip}
        status={status}
        selectedId={selectedId}
        onSelect={selectPort}
        shipPos={shipPos}
        onShipSelect={selectShip}
      />
      <Header trip={trip} status={status} totalDays={sortedTrip.totalDays} />
      <TodayCard status={status} onSelect={selectPort} />
      <VoyageRail
        trip={sortedTrip}
        status={status}
        totalDays={sortedTrip.totalDays}
        onSelect={selectPort}
      />
      <Timeline
        trip={sortedTrip}
        status={status}
        selectedId={selectedId}
        onSelect={selectPort}
      />
      <DestinationPanel
        destination={selected}
        dayOfTrip={selectedDay}
        prevId={prevId}
        nextId={nextId}
        onSelect={selectPort}
        onClose={() => setSelectedId(null)}
      />
      <ShipPanel
        open={shipOpen}
        onClose={() => setShipOpen(false)}
        livePosition={shipPos}
      />
    </div>
  );
}

export default App;
