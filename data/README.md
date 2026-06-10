# `data/` — pre-Phase-1 seed data

Two files live here, written during the planning phase so the data model and the diff‑highlighting design are grounded in real values before any app code is scaffolded:

- **`specCatalog.ts`** — the canonical list of every spec label we recognise, plus the section it belongs to, its display order, and whether absence means "no" (`booleanByDefault`) or "unknown."
- **`controllerSpecs.json`** — one entry per in‑scope controller, with the full spec set lifted from each product's official marketing page (`https://www.8bitdo.com/<slug>/`).

When Phase 0/1 lands, both files move into `src/data/` (their final home per the design doc). The contents stay the same.

## Coverage

8 controllers, all candidates from the user's "Switch + PC + Mac" use case:

| Controller                | Switch | PC  | Mac |
| ------------------------- | ------ | --- | --- |
| Pro 3                     | ✓      | ✓   | ✓   |
| Pro 2 (Hall Effect)       | ✓      | ✓   | ✓   |
| SN30 Pro (Hall Effect)    | ✓      | ✓   | ✓   |
| Ultimate 2 Bluetooth      | ✓      | ✓   | ✗   |
| Ultimate 2 Wireless       | ✗      | ✓   | ✓   |
| Ultimate 2C Wireless (PC) | ✗      | ✓   | ✗   |
| Ultimate 2C Wired         | ✗      | ✓   | ✗   |
| Lite 2                    | ✓      | ✗   | ✓   |

Only Pro 3, Pro 2, and SN30 Pro cover all three target platforms in a single device. The comparison view exists to surface this kind of asymmetry — the other 5 are still in the dataset so the user can see what they'd be giving up by going budget‑per‑platform vs flagship‑for‑everything.

## Curator notes

Every entry has a `_curatorNotes` field listing any spec rows that were ambiguous from the markdown rendering of 8BitDo's comparison tables (mostly checkmark icons that don't survive HTML‑to‑markdown conversion). A second pass against the rendered marketing pages would tighten the data, but the core comparison signal (compatibility, joystick tech, connectivity, charging dock, RGB) is reliable.

## How to add a new controller

1. Find the controller's marketing page at `https://www.8bitdo.com/<slug>/`. Most pages embed a comparison table near the bottom.
2. Add an entry to `controllerSpecs.json` keyed by Shopify product handle.
3. If the page introduces a spec label not already in `specCatalog.ts`, add it there with the right section and `booleanByDefault` setting.
4. If 8BitDo writes a known spec under a new wording, add the raw → canonical mapping in `rawLabelToCanonical`.
