# Destination extract schema

Each `<researchId>.json` file in this folder contains content harvested by
the research loop. Files are written by sub-agents and intended to be
merged back into `src/data/destinations.json` (or read at build time).

```jsonc
{
  "researchId": "sydney-australia",
  "name": "Sydney",
  "country": "Australia",
  "summary": "Two to three short, friendly sentences a 7–10 year old can read.",
  "funFacts": [
    "Bullet 1 — concrete, kid-interesting fact.",
    "Bullet 2",
    "Bullet 3",
    "Bullet 4",
    "Bullet 5"
  ],
  "thingsToDo": [
    "Short verb-led activity 1",
    "Activity 2",
    "Activity 3",
    "Activity 4",
    "Activity 5"
  ],
  "localWord": {
    "word": "Optional local greeting or phrase",
    "meaning": "What it means in English",
    "pronunciation": "Roughly how it sounds"
  },
  "images": [
    {
      "filename": "hero.jpg",
      "alt": "Sydney Opera House at sunrise from across the harbour.",
      "credit": "Photographer Name",
      "license": "CC BY-SA 4.0",
      "sourceUrl": "https://commons.wikimedia.org/wiki/File:..."
    }
  ],
  "links": [
    { "url": "https://...", "label": "Wikipedia: Sydney", "description": "Overview article." }
  ],
  "sources": [
    "https://en.wikipedia.org/wiki/Sydney",
    "https://commons.wikimedia.org/wiki/Category:Sydney"
  ],
  "researchedAt": "2026-05-09T11:30:00Z"
}
```

Image files live in `public/images/<researchId>/<filename>`.
Only freely licensed images (CC0, CC BY, CC BY-SA, public domain) are used.

## Research sources

Content (summary, fun facts, things to do, local word) may be drawn from
any reputable public source — Wikipedia, official tourism boards
(visitsydney.com.au, visiticeland.com, etc.), Britannica, Lonely Planet,
National Geographic, UNESCO listings, museum and park sites. Always list
each consulted URL in `sources` so claims are traceable.

Images are still restricted to clearly free-licensed sources to avoid
copyright issues — Wikimedia Commons is the default; tourism boards or
government sites are usable when their press/media page states the
licence.
