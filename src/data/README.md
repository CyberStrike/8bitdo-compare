# `src/data/`

Three files:

- **`specCatalog.ts`** — canonical spec labels, plus the section each belongs to, its display order, whether absence means "no" (`booleanByDefault`) or "unknown," and a raw → canonical normaliser for the slight wording differences between 8BitDo product pages.
- **`controllerSpecs.json`** — one entry per in‑scope controller, keyed by Shopify product handle, with the full spec set lifted from each product's official marketing page (`https://www.8bitdo.com/<slug>/`). The Shopify handles in the keys are checked against the live store; mismatched keys surface as `specsPending: true` rows in the catalog.
- **`fallbackCatalog.json`** — a snapshot of the merged catalog (Shopify pricing × curated specs) used as the bootstrap when `localStorage` is empty AND the live Shopify fetch fails. **Regenerate with `pnpm refresh-fallback` after touching `controllerSpecs.json`.**

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
