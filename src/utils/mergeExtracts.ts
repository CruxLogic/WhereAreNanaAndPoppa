import type { Destination } from "../types";

interface ExtractImage {
  filename: string;
  alt: string;
  credit: string;
  license?: string;
  sourceUrl?: string;
  downloadUrl?: string;
}

interface Extract {
  researchId: string;
  summary?: string;
  funFacts?: string[];
  thingsToDo?: string[];
  wildlife?: Destination["wildlife"];
  localWord?: Destination["localWord"];
  images?: ExtractImage[];
  links?: Destination["links"];
}

const extractModules = import.meta.glob<Extract>(
  "../data/extracts/*.json",
  { eager: true, import: "default" },
);

const sharedAliases: Record<string, string> = {
  "auckland-start": "auckland",
  "auckland-finish": "auckland",
};

const extractsById: Record<string, Extract> = {};
for (const [path, mod] of Object.entries(extractModules)) {
  if (path.includes("_progress") || path.includes("_schema")) continue;
  const e = mod as Extract;
  if (e?.researchId) extractsById[e.researchId] = e;
}

const baseUrl = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

function imageSrc(researchId: string, filename: string): string {
  return `${baseUrl}/images/${researchId}/${filename}`;
}

export function mergeExtracts(destinations: Destination[]): Destination[] {
  return destinations.map((dest) => {
    const researchId = sharedAliases[dest.id] ?? dest.id;
    const extract = extractsById[researchId];
    if (!extract) return dest;

    return {
      ...dest,
      summary: extract.summary ?? dest.summary,
      funFacts: extract.funFacts ?? dest.funFacts,
      thingsToDo: extract.thingsToDo ?? dest.thingsToDo,
      wildlife: extract.wildlife ?? dest.wildlife,
      localWord: extract.localWord ?? dest.localWord,
      images: extract.images
        ? extract.images.map((img) => ({
            src: imageSrc(researchId, img.filename),
            alt: img.alt,
            credit: img.credit,
            sourceUrl: img.sourceUrl,
          }))
        : dest.images,
      links: extract.links ?? dest.links,
    };
  });
}
