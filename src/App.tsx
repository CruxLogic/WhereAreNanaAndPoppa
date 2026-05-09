import { useMemo, useState } from "react";
import type { Destination, Trip } from "./types";
import destinationsData from "./data/destinations.json";
import tripData from "./data/trip.json";
import { Globe } from "./components/Globe";
import { Header } from "./components/Header";
import { TodayCard } from "./components/TodayCard";
import { DestinationPanel } from "./components/DestinationPanel";
import { Timeline } from "./components/Timeline";
import { buildSortedTrip, getTripStatus } from "./utils/tripStatus";
import { mergeExtracts } from "./utils/mergeExtracts";

const destinations = mergeExtracts(destinationsData as Destination[]);
const trip = tripData as Trip;

function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
        onSelect={setSelectedId}
      />
      <Header trip={trip} status={status} totalDays={sortedTrip.totalDays} />
      <TodayCard status={status} onSelect={setSelectedId} />
      <Timeline
        trip={sortedTrip}
        status={status}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
      <DestinationPanel
        destination={selected}
        dayOfTrip={selectedDay}
        prevId={prevId}
        nextId={nextId}
        onSelect={setSelectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}

export default App;
