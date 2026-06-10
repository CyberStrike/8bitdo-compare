# 8BitDo Controller Comparison Tool — Design

**Status:** Draft, awaiting review
**Date:** 2026-06-10
**Author:** planning pass

---

## 1. Problem

8BitDo sells dozens of game controllers under overlapping product lines (Pro 2, Pro 3, Ultimate, Ultimate 2, Ultimate 2C, SN30, Lite 2, 64, M30, Zero 2, PCE…), each with multiple variants (Bluetooth, 2.4G, Wired, Hall Effect, TMR, special editions). The official store ([shop.8bitdo.com](https://shop.8bitdo.com/collections/all-products?filter.p.product_type=Game+Controllers)) shows one product at a time, with no side‑by‑side comparison and inconsistent naming. Picking the right controller for a given use case (Switch vs. PC vs. retro, wired vs. wireless, stock vs. Hall Effect sticks) is harder than it should be.

## 2. Goal

A small ReactJS web app that lets a shopper pick up to **3** 8BitDo controllers and see them compared side‑by‑side, including **base price** and the attributes that actually matter when choosing one (connectivity, compatibility, joystick type, layout, rumble/gyro). The output should make differences obvious at a glance.

## 3. Non‑goals (for v1)

- Tracking historical price changes.
- Buying / affiliate checkout integration. (We link out to the official product page.)
- User accounts, saved comparisons in a backend, sharing via login.
- Mobile‑first native app — we target a responsive web app, mobile usable but desktop‑optimised.
- Coverage of accessories (mod kits, receivers, arcade sticks, keyboards). v1 is **Game Controllers only**.
- Localised pricing / currency conversion — we display USD as shown on the official store.

## 4. Users & primary flow

**User:** someone (like the requester) trying to decide which 8BitDo controller to buy.

**Primary flow:**

1. Land on the app — see a grid of all current 8BitDo game controllers with name, photo, base price, and a "+ Compare" button.
2. Filter or search the grid (by compatibility, connectivity, price range, name).
3. Click "+ Compare" on up to 3 controllers. A persistent compare bar at the bottom shows the chosen controllers.
4. Click "Compare" in the bar → a comparison view renders a table: rows are attributes, columns are the selected controllers. Differences are visually highlighted.
5. From the comparison view, can swap a controller out or jump back to add/remove.
6. Each column links to the official 8BitDo product page.

## 5. Data model

Specs are an **open dictionary**, not a fixed struct. Different 8BitDo controllers expose different specs (RGB Fire Ring exists on Pro 3 but not Pro 2; Charging Dock is absent on most older models). Forcing a fixed schema would either drop the rare specs or pad them with `null` and hide the "this one has it, the others don't" signal — which is exactly the signal the user said they need (see §11 design directive: show every listed spec, that's how unique features become visible).

```ts
type SpecValue =
  | { kind: 'text'; value: string } // "TMR Joysticks"
  | { kind: 'boolean'; value: boolean } // Vibration: true
  | { kind: 'number'; value: number; unit: string } // 1000, "mAh"
  | { kind: 'list'; value: string[] } // ["Switch 1/2", "Windows", "SteamOS"]
  | { kind: 'perPlatform'; value: Record<string, string> } // { Switch: "Bluetooth, 2.4G, Wired", Windows: "2.4G, Wired" }

type Controller = {
  // Identity (curated)
  id: string // stable slug, e.g. "pro-3"
  shopifyHandle: string // 8BitDo store handle, used for shop URL + price lookup
  officialSlug: string // 8BitDo marketing-site slug, e.g. "pro3" → 8bitdo.com/pro3
  name: string // display name we pick (cleaned up from store title)
  storeTitle: string // exact title from the store, kept for traceability
  imageUrl: string
  shopUrl: string // https://shop.8bitdo.com/products/<handle>
  officialUrl: string // https://www.8bitdo.com/<slug>/

  // Pricing (sourced live from Shopify products.json, see §6)
  basePriceUSD: number // lowest available variant price
  compareAtPriceUSD: number | null // strike-through price if on sale
  onSale: boolean
  available: boolean

  // Specs (curated from the 8bitdo.com product page comparison tables)
  // Key is the canonical normalised spec label, e.g. "Joysticks", "Charging Dock"
  // A controller simply omits specs it does not have, so absent != false unless the
  // spec is canonically a boolean (Charging Dock, RGB Fire Ring, etc) where omission
  // means "this model does not have one".
  specs: Record<string, SpecValue>

  // Optional metadata
  releaseYear?: number
  notes?: string // freeform, e.g. "Pre-order, ships Feb 2026"
}

// Section assignment lives outside the Controller record so we can change grouping
// without touching the data. Keys are canonical spec labels; values are section ids.
type SpecCatalog = {
  [canonicalLabel: string]: {
    section:
      | 'connectivity'
      | 'compatibility'
      | 'sticks-and-triggers'
      | 'buttons-and-feedback'
      | 'battery-physical'
      | 'software'
      | 'other'
    booleanByDefault?: boolean // if true, absence means "no" rather than "unknown"
    displayOrder: number
  }
}
```

A single `SpecCatalog` lives next to the spec data and is the place that knows "Vibration is a boolean and absence means no" vs "Battery Capacity is a number and absence means unknown."

## 6. Where the data comes from

| Field group                                                    | Source                                                                                                                                          | Refresh model                                                                                     |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Price, availability, sale status, store title, image, shop URL | Shopify Storefront JSON: `https://shop.8bitdo.com/collections/all-products/products.json?limit=250&page=N` (public, CORS‑permissive — verified) | Fetched live in the browser on app load; cached in `localStorage` for 24h with a "refresh" button |
| All specs (every row 8BitDo lists for the device)              | `src/data/controllerSpecs.json` in the repo, hand‑curated from each product's official page at `https://www.8bitdo.com/<slug>/`                 | Bumped manually when 8BitDo updates the controller or ships a new one                             |
| `SpecCatalog` (canonical label, section, type)                 | `src/data/specCatalog.ts`                                                                                                                       | Bumped when a new canonical spec label appears                                                    |

**Why specs come from 8bitdo.com, not shop.8bitdo.com:** the marketing site for each product (e.g. `8bitdo.com/pro3/`) includes a structured "this model vs that model" comparison table. The rows of those tables are 8BitDo's own spec taxonomy — Color/Edition, Compatibility, Connectivity (broken out per platform), Triggers, Bumpers, Fast Bumpers, Joysticks, Polling Rate, Pro Back Paddle Buttons, 3.5mm Audio Jack, Charging Dock, 6‑axis Motion Control, Shake to wake, Vibration, Turbo, RGB Fire Ring, Ultimate Software Support, Battery Capacity, Dimensions/Weight. Using their taxonomy means we are showing the user the same labels they would see researching the product themselves, and the diff highlighting matches 8BitDo's own comparison framing.

**Why not scrape those pages at runtime:** the marketing pages do not have CORS headers for cross‑origin browser fetches, and the HTML layout is more brittle than the shop's JSON. Manual curation is fine at this scale (~7–8 controllers in v1 scope, see §12.1).

**Why this split** (live shop data + hand‑curated specs): prices and availability change frequently and would go stale immediately if hardcoded; specs change essentially never per SKU. Hand‑curation of specs is the same kind of work as making a spreadsheet to compare them, but it pays off in a reusable interface.

**Normalisation note:** 8BitDo uses slightly different row labels across product pages ("Joysticks" vs "Joystick" vs "Stick Type"). The spec file uses one canonical label per concept; the original page label is preserved in a sibling `_source` field on each spec entry for traceability. The mapping from raw labels → canonical labels lives in `specCatalog.ts`.

**Merge step:** at app bootstrap, the live Shopify list is joined to the curated specs by `shopifyHandle`. Any controller present in Shopify but missing a spec entry is shown in the grid with a "Specs pending" badge and is excluded from the comparison view until specs are added — this keeps the spec file honest without crashing the app when 8BitDo releases something new.

## 7. UI architecture

Three top‑level views, all client‑side routed:

1. **Browse (`/`)** — grid of controller cards. Filters in a left sidebar (compatibility multi‑select, connectivity multi‑select, joystick type, price range slider, on‑sale toggle, search box). Each card: image, name, base price (with strike‑through compare‑at price if on sale), key spec icons, "+ Compare" button (becomes "✓ In comparison" once selected, capped at 3).
2. **Compare (`/compare`)** — comparison view, built with CSS Grid on divs (not a `<table>` — see §11 for why). At the top, a row of "header cards" (image, name, price, link out, ✕ Remove) per selected controller. Below that, a series of `<section>` groups — **Pricing & availability**, **Connectivity**, **Compatibility**, **Sticks & triggers**, **Buttons & feedback**, **Battery & physical**, **Software**, **Other** — each containing one row per spec the catalog assigns to that section. A row is a label cell plus one value cell per controller. The union of every spec across the selected controllers is rendered (so a spec only one of them has still gets a row), with empty cells in the controllers that don't list it.

   **Diff highlighting has three states:**
   - **All equal across visible columns** — row is quiet, no accent.
   - **All present but values differ** — row gets a subtle accent and differing cells get an emphasised background plus a non‑colour indicator (small dot/icon).
   - **Present on some, missing on others** — row gets a stronger accent and the "missing" cells get an explicit muted "—" with a tooltip "Not listed by 8BitDo for this model." These are the rows that surface unique features and are the most valuable signal in the whole view.

   A "+ Add controller" slot appears in the header row when fewer than 3 are selected. Section groups with zero rows (because none of the selected controllers expose any spec in that section) are collapsed.

3. **Not‑found / empty states** — Compare with 0 selected redirects to Browse with a toast.

A persistent **CompareBar** is rendered on Browse showing the current selection as chips with a "Compare (N)" CTA. It is suppressed on the Compare view itself.

## 8. State management

State is small enough that React Context + `useReducer` is sufficient — no Redux/Zustand. Two contexts:

- **`CatalogContext`** — holds merged `Controller[]`, load state, last‑refreshed timestamp, refresh action. Populated once on mount.
- **`CompareContext`** — holds the selected `string[]` of controller ids (max length 3), with `add`, `remove`, `clear`, `swap` actions. Persisted to `localStorage` so a refresh keeps the comparison.

The comparison selection is also reflected in the URL on `/compare?ids=a,b,c` so a user can copy/share the link. The Compare view reads ids from the query string and asks `CatalogContext` to resolve them; on Browse, the URL is not modified by selection.

## 9. Tech stack

| Concern     | Choice                                                     | Reason                                                                                                                                                                                                                                                   |
| ----------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework   | **Vite 8 + React 19 + TypeScript 6**                       | User asked for ReactJS. Vite gives instant dev server and a static build that drops onto Vercel/Netlify/GitHub Pages. TypeScript pays for itself given the structured `Controller` model. Scaffolded with `pnpm create vite@latest --template react-ts`. |
| Routing     | **React Router v7**                                        | Two routes, simplest viable choice.                                                                                                                                                                                                                      |
| Styling     | **Tailwind CSS v4** (`@tailwindcss/vite` plugin)           | Comparison tables need a lot of one‑off layout; utility classes are faster than maintaining a component library here. v4 ships as a Vite plugin with `@import "tailwindcss"` in CSS — no `tailwind.config.js` or PostCSS dance.                          |
| Icons       | **lucide-react**                                           | Small footprint, good coverage for compatibility/connectivity glyphs.                                                                                                                                                                                    |
| Testing     | **Vitest** + **React Testing Library**                     | Vite‑native, fast. We test the data merge and the difference‑highlighting reducer; UI gets a smoke test per route.                                                                                                                                       |
| Lint/format | ESLint + Prettier with the Vite React‑TS template defaults | Standard.                                                                                                                                                                                                                                                |
| Deployment  | **Vercel** (static build)                                  | One‑click from GitHub, free tier covers this trivially, the URL is shareable.                                                                                                                                                                            |

Explicitly NOT used: Next.js (no SSR/server needs justify the complexity), Redux, Storybook, a component library.

## 10. Error handling

- **Shopify fetch fails:** show a banner with "Live pricing unavailable — showing last cached prices from <relative time>" and fall back to the `localStorage` snapshot. If there is no snapshot, show prices from a `data/fallbackPrices.json` committed to the repo (regenerated whenever someone bumps `controllerSpecs.ts`).
- **Controller in URL but not in catalog:** drop it silently and toast "1 controller in your link is no longer available."
- **More than 3 ids in URL:** keep the first 3, drop the rest with a toast.
- **Spec missing for a Shopify product:** show in the grid with a "Specs pending" badge, disable the "+ Compare" button on the card with a tooltip explaining why.

## 11. Accessibility & responsive

The comparison view is built with **CSS Grid on `<div>` elements, not `<table>`**. Reasons:

- A `<table>` couples layout to a 2D grid that fights with responsive design — on mobile we want one column per controller stacked vertically, which is the opposite of what a table is built for.
- We don't need 2D screen‑reader navigation. A linear "read each controller's section top to bottom" model matches how a user actually consumes a comparison on mobile, and it works equally well on desktop.

Instead the structure is:

- A `<section aria-label="Controller comparison">` wraps the whole thing.
- Inside, a header row of "controller cards" (one per selected controller) with `<h2>` for the controller name.
- A series of `<section>` groups (`<h3>` for the group name: Pricing, Connectivity, etc.), each containing rows.
- A row is a label `<div>` + one value `<div>` per controller. Labels use the same wording across mobile and desktop so the relayout is purely visual.
- Differing values are signalled with an accent background **and** a small icon — colour is never the only signal.

Responsive behaviour:

- Desktop (`≥ md`): grid template is `minmax(140px, auto) repeat(N, 1fr)`, label column on the left, controllers across the top.
- Mobile (`< md`): grid template collapses to `1fr`. Each controller's header card and all its values are rendered as a vertical card; the label is shown inline with each value (e.g. "Connectivity: Bluetooth, 2.4G") so context is preserved. This is achieved by switching `display` on a per‑section basis with `@media`, not by re‑rendering.

Other a11y items:

- All interactive elements are buttons or links with visible focus rings (Tailwind `focus-visible:` utilities).
- Toasts go through a single `aria-live="polite"` region.
- Keyboard: the compare bar is tabbable, each chip's ✕ is focusable, the "Compare (N)" CTA is the last tab stop in the bar.

## 12. Open questions / explicit assumptions

Updated through user dialogue. Each remaining item is still a candidate to revisit.

1. **Scope is the Switch / PC / Mac–compatible controllers.** Per user input: Switch (1 & 2), Windows, macOS. That prunes the v1 catalog to ~7–8 SKUs (Pro 3, Pro 2 + Hall Effect, Ultimate 2 Wireless, Ultimate 2 Bluetooth, Ultimate 2C Wireless (PC), Ultimate 2C Wired, SN30 Pro Hall Effect, Lite 2). Retro‑only and Analogue 3D–targeted SKUs are excluded. (The Shopify fetcher still pulls everything; the catalog filter is one place to broaden later.)
2. **"Base price" = lowest available variant price in USD**, matching what the store card shows for "From $X" controllers.
3. **No budget cap** per user — full price range in scope.
4. **Spec model is open** (`Record<string, SpecValue>`), not a fixed struct, because 8BitDo's published spec sets differ per controller and "this one has Feature X and the other doesn't" is the signal we most want to surface.
5. **Specs come from the 8bitdo.com marketing pages** (not the shop's `body_html`), curated by hand into `controllerSpecs.json`. ~7–8 controllers × ~20 spec rows is a small one‑time pull.
6. **No backend.** Public Shopify JSON + static spec file. Fallback to a thin Vercel Edge proxy only if Shopify's CORS ever changes.
7. **No price history / alerts.** Out of scope for v1.
8. **3‑controller cap enforced everywhere** — URL parser, reducer, UI.
9. **Currency is USD only**, matching the official store.
10. **Comparison view uses CSS Grid on `<div>`s, not `<table>`** (per user, see §11).
11. **Deployment target is Vercel** (could also be GH Pages or Netlify; Vercel chosen for zero‑config preview deploys per PR).
12. **Purpose:** personal one‑shot tool, outcome over polish, possible implementation tweaks later — this calibrates "MVP first, polish only where it serves the comparison."

## 13. Success criteria

- I can pick "Pro 3", "Ultimate 2 Wireless", and "Ultimate 2C Wireless (PC)" and immediately see: price delta, which support my Switch, which have Hall Effect sticks, which have gyro.
- The grid lists every currently‑available 8BitDo game controller with the same price the official store shows, within 24h of a store change.
- Adding a new controller to the spec file and pushing surfaces it in the app on the next deploy with no other code changes.
- Lighthouse: Performance ≥ 90, Accessibility ≥ 95 on a desktop run.

## 14. Out‑of‑scope but worth noting for later

- Save / share named comparisons.
- "Recommend a controller" wizard (a few questions → best match).
- Spec sourcing from the official 8BitDo support pages (more authoritative, but inconsistent HTML).
- i18n / currency conversion.
- Affiliate links if a revenue model ever appears.

---

## Review checklist (self)

- [x] No "TBD" left in the doc.
- [x] Each external dependency has a stated reason.
- [x] Each assumption is explicit and listed in §12 so the user can challenge it.
- [x] Scope (§3) and success criteria (§13) bracket what "done" means.
- [x] Data sourcing strategy (§6) addresses the staleness/correctness question head‑on.
