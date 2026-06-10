# 8BitDo Controller Comparison Tool — Implementation Plan

**Companion to:** `2026-06-10-controller-comparison-design.md`
**Status:** Draft, awaiting review

This plan turns the design into ordered, independently‑shippable phases. Each phase ends in something demonstrable — that's the unit of review. Sub‑items inside a phase are intended to land in roughly one commit each.

---

## Phase 0 — Repository scaffolding ✅

**Status:** done — landed on `cursor/initial-project-plan-2069`.

**Goal:** a `pnpm dev` that boots an empty React + TypeScript app, with linting, formatting, and CI smoke‑checking PRs.

1. ✅ Scaffolded with `pnpm create vite@latest --template react-ts` (Vite 8, React 19, TypeScript 6 — newer than originally planned, adopted as the current Vite default). Files merged into the repo without overwriting `LICENSE`, `README.md`, `docs/`, or `data/`.
2. ✅ Tailwind CSS **v4** wired via `@tailwindcss/vite` plugin and `@import "tailwindcss"` in `src/index.css` — the v4 setup replaces the old `tailwind.config.js` + PostCSS dance.
3. ✅ `react-router-dom` v7, `lucide-react`, `clsx` installed (router not yet used; Phase 2 wires it).
4. ✅ Dev deps: `vitest`, `@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, `prettier`, `eslint-config-prettier`. ESLint is the flat config that ships with the Vite template, extended with the Prettier config to disable formatting rules.
5. ✅ Scripts: `dev`, `build`, `preview`, `test`, `test:watch`, `test:coverage`, `lint`, `format`, `format:check`.
6. ✅ `.github/workflows/ci.yml` runs `pnpm install --frozen-lockfile` then `lint`, `format:check`, `test`, `build` on every push/PR (Node 22, pnpm 10).
7. ✅ `README.md` updated with quickstart, script table, project layout, and links to the planning docs.

**Exit criterion (met):** `pnpm dev` boots, all four CI gates pass locally.

## Phase 1 — Data layer

**Goal:** the merged `Controller[]` is observable in‑app, with live prices from Shopify and the full per‑device spec set from a hand‑curated file.

1. Define `src/types/controller.ts` matching §5 of the design doc (`SpecValue` union, `Controller` with open `specs: Record<string, SpecValue>`, `SpecCatalog` typed separately).
2. Create `src/data/specCatalog.ts` — the canonical list of every spec label we know about, each with `{ section, booleanByDefault, displayOrder }`. Seed it from the rows on the Pro 3 and Ultimate 2 marketing‑page comparison tables (Color/Edition, Compatibility, Connectivity, Triggers, Bumpers, Fast Bumpers (L4/R4), Joysticks, Wear‑resistant Joystick Rings, Polling Rate, Pro Back Paddle Buttons, 3.5mm Audio Jack, Charging Dock, 6‑axis Motion Control, Shake to wake, Vibration, Turbo, RGB Fire Ring, Ultimate Software Support, Battery Capacity, Dimensions, Weight). Also include a raw‑label → canonical‑label map so per‑page label variations collapse.
3. Create `src/data/controllerSpecs.json` with one entry per in‑scope controller. **In scope after the user's Switch/PC/Mac answer:**
   - `8bitdo-pro-3-bluetooth-gamepad`
   - `8bitdo-pro-2-bluetooth-controller` (treat Hall Effect and Special Edition as the same base spec entry; note the joystick‑tech difference in the `Joysticks` row by having two SKU entries that share most rows)
   - `8bitdo-ultimate-2-wireless-controller`
   - `8bitdo-ultimate-2-bluetooth-controller`
   - `8bitdo-ultimate-2c-wireless-controller-pc`
   - `8bitdo-ultimate-2c-wired-controller`
   - `8bitdo-sn30-pro-hall-effect-joystick`
   - `8bitdo-lite-2`
     Each entry's specs are filled from the corresponding `8bitdo.com/<slug>/` marketing page — the comparison table on that page IS the spec source. The file is the project's source of truth for specs.
4. Implement `src/services/shopify.ts`:
   - `fetchControllerProducts(): Promise<ShopifyProduct[]>` that pages `https://shop.8bitdo.com/collections/all-products/products.json?limit=250&page=N` until an empty page is returned, filters to `product_type === "Game Controllers"`.
   - Normalises each product into the subset of fields we care about (`handle`, `title`, `featured_image`, lowest available `variants[].price`, `compare_at_price`, `available`).
5. Implement `src/services/catalog.ts` — `loadCatalog()`:
   - Calls `fetchControllerProducts()`.
   - Joins to `controllerSpecs.json` by `shopifyHandle`. Products without an entry are flagged `specsPending: true` and are listed in the grid but excluded from comparison.
   - Caches the merged result in `localStorage` under `catalog:v1` with a `fetchedAt` timestamp; stale‑while‑revalidate on subsequent loads.
6. Build `data/fallbackCatalog.json` once (a snapshot of the merged catalog with `fetchedAt`) and ship it as the bootstrap fallback for the very first load when Shopify is unreachable. Add a script `pnpm refresh-fallback` that regenerates it.
7. Tests:
   - Unit test for the price‑minimum logic (multiple variants, some unavailable, sale prices).
   - Unit test for the merge: spec found, spec missing, Shopify product missing.
   - Unit test for the cache: stale read, fresh write.
   - Unit test for the raw‑label normalisation in `specCatalog.ts`.

**Exit criterion:** in a small dev page, the merged catalog renders as a JSON dump with correct prices and the full spec set per controller.

## Phase 2 — Browse view

**Goal:** the user can see, filter, and select controllers.

1. `CatalogContext` and `CatalogProvider` exposing `controllers`, `status`, `fetchedAt`, `refresh()`. Provider sits at the app root.
2. `CompareContext` and `CompareProvider`:
   - Holds `selectedIds: string[]` (cap 3), with `add(id)`, `remove(id)`, `clear()`, `toggle(id)`.
   - `toggle` is a no‑op when at cap and the id isn't already selected.
   - Persists to `localStorage` under `compare:v1`.
3. `ControllerCard` component — image, name, family chip, price (with strike‑through compare‑at if on sale), spec icons (connectivity badges, Hall‑Effect/TMR badge if applicable, Switch/PC/Mac glyphs), and the "+ Compare" / "✓ In comparison" / "Cap reached" button states.
4. `FiltersSidebar` component — compatibility multi‑select, connectivity multi‑select, joystick‑type select, price‑range slider, on‑sale toggle, text search. Filters live in component state and produce a filter predicate composed in a single memoised selector.
5. `CompareBar` component — fixed bottom bar visible on Browse when 1+ controllers are selected; shows chips with name + remove ✕, and a "Compare (N)" CTA that routes to `/compare?ids=…`.
6. Wire the Browse page (`/`) to: `CatalogProvider` data + `FiltersSidebar` + grid of `ControllerCard` + `CompareBar`.
7. Tests:
   - Filter predicate unit tests (each filter dimension independently and combined).
   - `CompareContext` reducer tests (add at cap is a no‑op; remove; persist round‑trip).
   - One RTL test that renders Browse with stubbed catalog, selects two controllers, asserts the CompareBar count.

**Exit criterion:** I can browse, filter, and accumulate up to 3 controllers; the bottom bar reflects the selection across refreshes.

## Phase 3 — Compare view

**Goal:** the selected controllers render as a side‑by‑side comparison with differences highlighted.

1. `/compare` route reads `ids` from the query string, resolves to `Controller[]`, drops missing ones with a toast.
2. `ComparisonGrid` component — built with CSS Grid on `<div>` elements (no `<table>`, see design §11). Rows are derived from the union of all `specs` keys across the selected controllers, then grouped by the section assigned in `specCatalog.ts` (`Pricing & availability`, `Connectivity`, `Compatibility`, `Sticks & triggers`, `Buttons & feedback`, `Battery & physical`, `Software`, `Other`). Each row is a `{ canonicalLabel, values: SpecValue[] }` where `values[i]` is the spec value for the `i`th selected controller (or a `missing` marker if that controller does not list this spec). The renderer is per‑`SpecValue.kind` (price formatter for pricing rows, list‑of‑pill renderer for `list`, boolean check/✕ for `boolean`, key:value table for `perPlatform`, etc).
3. Three‑state difference highlighting (per design §7):
   - **All equal** → quiet row.
   - **All present but values differ** → row accent + emphasised cell background + non‑colour dot indicator on differing cells.
   - **Present on some, missing on others** → stronger row accent; missing cells render `—` with a tooltip. A small `classifyRow(values, catalogEntry)` helper returns one of `"equal" | "differ" | "partial"`.
     Section groups that end up with zero rows after filtering (none of the selected controllers expose any spec in that section) are collapsed.
4. Column header — image, name, sale badge, link to the official product page, "✕ Remove" button that updates `CompareContext` and the URL.
5. Empty‑column slot when fewer than 3 are selected — a "+ Add controller" cell that links back to `/`.
6. Responsive: the grid template collapses from `minmax(140px, auto) repeat(N, 1fr)` on `≥ md` to `1fr` on `< md`. On mobile each controller becomes a vertical card with the row label shown inline next to each value (e.g. "Connectivity: Bluetooth, 2.4G"). Same DOM, different `grid-template-columns` and a couple of `display` swaps — no conditional rendering.
7. Tests:
   - `classifyRow` unit tests across each `SpecValue.kind` and all three classification outcomes (equal / differ / partial), including array order normalisation for `list` and key‑order normalisation for `perPlatform`.
   - Row‑derivation unit test: union of spec keys across 3 controllers produces the expected ordered row list per section.
   - RTL test: render with 3 fixture controllers — assert that the price row has the differ accent, the equal Vibration row is quiet, and an "RGB Fire Ring" row present on only one controller renders the partial accent + `—` cells for the other two.

**Exit criterion:** dropping 2–3 fixtures into the URL produces a readable comparison; removing a column updates URL + state in sync.

## Phase 4 — Polish, a11y, deploy

**Goal:** the app feels intentional and ships.

1. Accessibility pass: semantic `<section>` + heading structure (no `<table>`), focus rings, keyboard navigation of the compare bar, `aria-live="polite"` toast region, colour‑independent diff indicator (small dot/icon).
2. Empty/loading/error states: skeleton cards on first load, banner for "live pricing unavailable — showing cached prices from <time>", toast for dropped URL ids, "no results" state for filters.
3. Lighthouse pass on `pnpm preview`; fix anything below 90 / 95 perf / a11y.
4. Vercel deployment: add `vercel.json` if needed (likely not — Vite default works), connect repo, verify preview URLs on PRs.
5. README updates: live link, screenshot, contribution guide for adding a new controller to the spec file.

**Exit criterion:** the deployed URL loads in < 2s on a fresh visit, scores ≥ 90/95 on Lighthouse, and one fresh visitor can complete the primary flow without prompting.

---

## Risks & how each is addressed

| Risk                                                                            | Mitigation                                                                                                                                                                                |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8BitDo locks `products.json` behind CORS                                        | Add a tiny Vercel Edge Function proxy; the rest of the app does not change because `shopify.ts` is the only caller.                                                                       |
| Spec file drifts as 8BitDo releases new controllers                             | `specsPending: true` path keeps the app functional; CI can grow a daily job that diffs Shopify's catalog against the spec file and opens an issue. Out of scope for v1, but cheap to add. |
| "Base price" misrepresents bundles where the cheapest variant is a stripped SKU | We display the same number the store card shows. If this is ever misleading for a specific controller, add a `priceFloorOverride` field to the spec entry.                                |
| Shopify pagination shape changes                                                | The fetcher pages until an empty response and is the only contact point with Shopify; one focused unit test pins the shape we depend on.                                                  |
| Project bloats with feature requests                                            | Non‑goals in the design doc are explicit. New asks land as separate spec docs, not as scope creep on v1.                                                                                  |

## What I did NOT include and why

- **Server‑side rendering / Next.js.** No SEO benefit (the app is for an individual decision, not discovery), no auth, no per‑request data. The cost of an SSR runtime would not be repaid.
- **A component library (shadcn, MUI, Mantine).** Two screens, ~6 components total; utility CSS is faster and leaves no abandoned dependencies.
- **A backend / database.** All data is either public (Shopify) or static (spec file). Adding a backend is the kind of decision that's easy to add later and hard to remove.
- **State libraries (Redux, Zustand, Jotai).** Two contexts cover the entire state surface; reaching for a library here would be ceremony.
- **An LLM extraction pipeline for specs.** ~16 SKUs; manual curation is faster than building and reviewing an extraction.

---

## Suggested first PR after approval

Phase 0 only — scaffolding, CI, README, design doc, plan doc. Keeps the first review focused on the bones of the project. Phases 1–4 land as their own PRs against `main`.
