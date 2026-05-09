# Where Are Nana And Poppa

A small static React site for the grandchildren to follow Nana and Poppa's
2026 world cruise (Auckland → around the world → Auckland, May–August
2026). Each destination shows where it is on a world map, a
kid-friendly summary, photos, and a few weblinks for further reading.

The site is intentionally simple: no backend, no API keys at runtime, no
upload UI. All content (itinerary, summaries, photos, links) is committed
to the repository, and the site deploys as static files to GitHub Pages.

## Status

This is the **scaffold** — project structure, data conversion, and a
placeholder page that lists every port. The map, route line, side panel,
and AI-generated destination content are added in follow-up work.

## Running locally

```sh
npm install
npm run dev
```

Open http://localhost:5173 — you should see the trip header and a list of
all destinations with their dates.

## How the data works

```
src/data/*.json  ──>  React app  ──>  static dist/
```

Trip content lives in:

- `src/data/destinations.json` — array of `Destination` objects
- `src/data/trip.json` — trip-level metadata
- `src/data/extracts/<id>.json` — per-destination summaries, fun facts,
  images, and links, merged in at build time

To add content for a destination, edit the matching extract file and
drop image files into `public/images/<id>/`.

## Destination schema

```ts
interface Destination {
  id: string;                 // slug, e.g. "cape-town"
  name: string;
  country: string;
  coords: [number, number];   // [lat, lng]
  arrivalDate: string;        // ISO YYYY-MM-DD
  departureDate: string;
  arrivalTime?: string;       // "07:00"
  departureTime?: string;
  stopType: "port" | "scenic" | "dateline" | "homePort";
  notes?: string;             // free-form note for the stop
  summary?: string;           // kid-friendly description (added later)
  funFacts?: string[];        // 3-5 bullets (added later)
  localWord?: { word: string; meaning: string; pronunciation?: string };
  images?: Array<{
    src: string;              // "/images/cape-town/hero.jpg"
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
```

To add content for a destination, edit the entry in
`src/data/destinations.json` directly and drop image files into
`public/images/<id>/`. No code changes needed.

## Folder layout

```
WhereAreNanaAndPoppa/
├── src/
│   ├── App.tsx                   placeholder layout
│   ├── main.tsx                  React entry
│   ├── types.ts                  Destination / Trip interfaces
│   ├── data/                     generated JSON, edited going forward
│   ├── components/               (empty — to be filled)
│   ├── hooks/                    (empty — to be filled)
│   └── utils/                    (empty — to be filled)
├── public/images/<id>/           per-destination image folders
└── .github/workflows/deploy.yml  GitHub Pages deploy
```

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds
the site and publishes `dist/` to GitHub Pages. The site URL is
`https://<your-gh-user>.github.io/WhereAreNanaAndPoppa/`.

Before the first deploy: in the GitHub repo, go to Settings → Pages and
set "Source" to "GitHub Actions".

If the repository is renamed, update the `base` path in
`vite.config.ts`.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server (Vite) |
| `npm run build` | Type-check and produce a production build in `dist/` |
| `npm run preview` | Serve the built site locally to verify the GH Pages base path |
| `npm run typecheck` | TypeScript check without emitting |

## What's not yet built

- Map and route line (react-leaflet is installed but not wired up)
- Side panel for destination details
- "Today's location" indicator
- AI-generated destination summaries and curated weblinks
- Per-destination photos (committed locally with attribution)

These are tracked as follow-up tasks.
