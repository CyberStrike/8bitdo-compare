# 8BitDo Controller Comparison Tool — Implementation Plan

**Companion to:** `2026-06-10-controller-comparison-design.md`
**Status:** Draft, awaiting review

This plan turns the design into ordered, independently‑shippable phases. Each phase ends in something demonstrable — that's the unit of review. Sub‑items inside a phase are intended to land in roughly one commit each.

---

## Phase 0 — Repository scaffolding

**Goal:** a `pnpm dev` that boots an empty React + TypeScript app, with linting, formatting, and CI smoke‑checking PRs.

1. `pnpm create vite@latest . -- --template react-ts`, accepting the standard layout. Move generated files into the existing repo (don't overwrite `LICENSE` / `README.md`).
2. Install Tailwind CSS following the official Vite guide. Wire `index.css` to include the three Tailwind directives.
3. Install `react-router-dom`, `lucide-react`, `clsx`.
4. Install dev deps: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `eslint-plugin-react`, `prettier`, `eslint-config-prettier`.
5. Add scripts: `dev`, `build`, `preview`, `test`, `test:watch`, `lint`, `format`.
6. Add a minimal `.github/workflows/ci.yml` running `pnpm install`, `pnpm lint`, `pnpm test --run`, `pnpm build` on every PR.
7. Update `README.md` with quickstart, what the app does, and a link to the design doc.

**Exit criterion:** clean `pnpm dev` shows a blank page; CI is green on the scaffolding PR.

## Phase 1 — Data layer

**Goal:** the merged `Controller[]` is observable in‑app, with live prices from Shopify and curated specs from the repo.

1. Define `src/types/controller.ts` matching §5 of the design doc.
2. Create `src/data/controllerSpecs.ts` with hand‑curated entries for the controllers currently on the linked store page:
   - `8bitdo-pro-3-bluetooth-gamepad`
   - `8bitdo-pro-2-bluetooth-controller` (Hall Effect + Special Edition share base specs; treat as one entry with notes)
   - `8bitdo-ultimate-2-wireless-controller`
   - `8bitdo-ultimate-2-bluetooth-controller`
   - `8bitdo-ultimate-2c-wireless-controller-pc`
   - `8bitdo-ultimate-2c-wired-controller`
   - `8bitdo-sn30-pro-hall-effect-joystick`
   - `8bitdo-sn30-2-4g`
   - `8bitdo-lite-2`
   - `8bitdo-m30`
   - `8bitdo-zero-2`
   - `8bitdo-pce-2-4g`
   - `8bitdo-64-bluetooth-controller-funtastic`
   - `8bitdo-64-bluetooth-controller-prototype`
   - `8bitdo-ultimate-2-wireless-controller-honkai-star-rail-evernight` (treat as cosmetic variant of Ultimate 2; spec entry points at base spec with a `cosmeticOf` field, or duplicate with a `notes` line — start with the latter for simplicity).
   Each entry is filled from the corresponding product page on shop.8bitdo.com. The file is the project's source of truth for specs.
3. Implement `src/services/shopify.ts`:
   - `fetchControllerProducts(): Promise<ShopifyProduct[]>` that pages `https://shop.8bitdo.com/collections/all-products/products.json?limit=250&page=N` until an empty page is returned, filters to `product_type === "Game Controllers"`.
   - Normalises each product into the subset of fields we care about (`handle`, `title`, `featured_image`, lowest available `variants[].price`, `compare_at_price`, `available`).
4. Implement `src/services/catalog.ts` — `loadCatalog()`:
   - Calls `fetchControllerProducts()`.
   - Joins to `controllerSpecs` by `handle`.
   - For products missing a spec entry, returns a `Controller` with `family: "Other"` and a `specsPending: true` flag (extend the type) so the UI can label and disable them.
   - Caches the merged result in `localStorage` under `catalog:v1` with a `fetchedAt` timestamp; on the next load returns the cache immediately and revalidates in the background (stale‑while‑revalidate).
5. Build `data/fallbackPrices.json` once (a snapshot of the merged catalog with `fetchedAt`) and ship it as the bootstrap fallback for the very first load when Shopify is unreachable. Add a script `pnpm refresh-fallback` that regenerates it by running the same Shopify code in Node.
6. Tests:
   - Unit test for the price‑minimum logic (multiple variants, some unavailable, sale prices).
   - Unit test for the merge: spec found, spec missing, Shopify product missing.
   - Unit test for the cache: stale read, fresh write.

**Exit criterion:** in a small dev page, the merged catalog renders as a JSON dump with correct prices.

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
2. `ComparisonGrid` component — built with CSS Grid on `<div>` elements (no `<table>`, see design §11). Rows grouped into `<section>`s (`Pricing & availability`, `Connectivity`, `Compatibility`, `Sticks & inputs`, `Physical`, `Notes`). Each row is a `{ label, values: ValueRenderer[] }`. The renderer is per‑attribute (price formatter, list‑of‑pill renderer, boolean check/✕, etc).
3. Difference highlighting — a small `areAllEqual(values)` helper. Rows where this is false get an accent border; differing cells get an emphasised background. Equal rows are quiet visually.
4. Column header — image, name, sale badge, link to the official product page, "✕ Remove" button that updates `CompareContext` and the URL.
5. Empty‑column slot when fewer than 3 are selected — a "+ Add controller" cell that links back to `/`.
6. Responsive: the grid template collapses from `minmax(140px, auto) repeat(N, 1fr)` on `≥ md` to `1fr` on `< md`. On mobile each controller becomes a vertical card with the row label shown inline next to each value (e.g. "Connectivity: Bluetooth, 2.4G"). Same DOM, different `grid-template-columns` and a couple of `display` swaps — no conditional rendering.
7. Tests:
   - `areAllEqual` unit tests across each value type (array order, null vs missing, numeric).
   - RTL test: render with 3 fixture controllers, assert that the price row has the differences accent and the two equal `rumble: true` cells do not.

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

| Risk | Mitigation |
| --- | --- |
| 8BitDo locks `products.json` behind CORS | Add a tiny Vercel Edge Function proxy; the rest of the app does not change because `shopify.ts` is the only caller. |
| Spec file drifts as 8BitDo releases new controllers | `specsPending: true` path keeps the app functional; CI can grow a daily job that diffs Shopify's catalog against the spec file and opens an issue. Out of scope for v1, but cheap to add. |
| "Base price" misrepresents bundles where the cheapest variant is a stripped SKU | We display the same number the store card shows. If this is ever misleading for a specific controller, add a `priceFloorOverride` field to the spec entry. |
| Shopify pagination shape changes | The fetcher pages until an empty response and is the only contact point with Shopify; one focused unit test pins the shape we depend on. |
| Project bloats with feature requests | Non‑goals in the design doc are explicit. New asks land as separate spec docs, not as scope creep on v1. |

## What I did NOT include and why

- **Server‑side rendering / Next.js.** No SEO benefit (the app is for an individual decision, not discovery), no auth, no per‑request data. The cost of an SSR runtime would not be repaid.
- **A component library (shadcn, MUI, Mantine).** Two screens, ~6 components total; utility CSS is faster and leaves no abandoned dependencies.
- **A backend / database.** All data is either public (Shopify) or static (spec file). Adding a backend is the kind of decision that's easy to add later and hard to remove.
- **State libraries (Redux, Zustand, Jotai).** Two contexts cover the entire state surface; reaching for a library here would be ceremony.
- **An LLM extraction pipeline for specs.** ~16 SKUs; manual curation is faster than building and reviewing an extraction.

---

## Suggested first PR after approval

Phase 0 only — scaffolding, CI, README, design doc, plan doc. Keeps the first review focused on the bones of the project. Phases 1–4 land as their own PRs against `main`.
