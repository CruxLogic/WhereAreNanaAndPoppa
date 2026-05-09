export interface Trip {
  name: string;
  travellers: string[];
  startDate: string;
  endDate: string;
  vesselName?: string;
}

export interface Destination {
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
  thingsToDo?: string[];
  localWord?: { word: string; meaning: string; pronunciation?: string };
  images?: Array<{
    src: string;
    alt: string;
    credit: string;
    sourceUrl?: string;
  }>;
  links?: Array<{
    url: string;
    label: string;
    description?: string;
  }>;
}
