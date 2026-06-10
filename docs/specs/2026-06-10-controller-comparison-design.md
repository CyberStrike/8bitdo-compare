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

```ts
type Controller = {
  // Identity
  id: string;                       // stable slug, e.g. "ultimate-2-wireless"
  shopifyHandle: string;            // 8BitDo store product handle, used for URL + JSON lookup
  name: string;                     // display name we pick (cleaned up from store title)
  storeTitle: string;               // exact title from the store, kept for traceability
  imageUrl: string;
  productUrl: string;               // https://shop.8bitdo.com/products/<handle>

  // Pricing (sourced live from Shopify products.json)
  basePriceUSD: number;             // lowest available variant price
  compareAtPriceUSD: number | null; // strike-through price if on sale
  onSale: boolean;
  available: boolean;

  // Specs (curated, see §6)
  family: "Pro" | "Ultimate" | "Ultimate 2C" | "Retro" | "Micro" | "64" | "Other";
  layout: "Switch-style" | "Xbox-style" | "Retro D-pad" | "N64-style" | "PCE-style";
  connectivity: Array<"Bluetooth" | "2.4G" | "USB-C Wired" | "USB-A Wired">;
  compatibility: Array<"Switch" | "Switch 2" | "PC (Windows)" | "macOS" | "Android" | "iOS" | "Steam" | "Steam Deck" | "Raspberry Pi" | "Analogue 3D">;
  joystickType: "Standard" | "Hall Effect" | "TMR" | "None (D-pad only)";
  rumble: boolean;
  gyro: boolean;
  motionAim: boolean;               // PS-style gyro aiming
  batteryHours: number | null;      // null = wired only
  weightGrams: number | null;
  releaseYear: number | null;
  notes?: string;                   // short freeform, e.g. "Pre-order, ships Feb 2026"
};
```

## 6. Where the data comes from

This is the most important design decision and the place we will diverge from a naive "just hardcode it" plan.

| Field group | Source | Refresh model |
| --- | --- | --- |
| Price, availability, sale status, store title, image, product URL | Shopify Storefront JSON: `https://shop.8bitdo.com/collections/all-products/products.json?limit=250&page=N` (publicly accessible, returns full product objects including `variants[].price`, `variants[].available`, `featured_image.src`, `handle`) | Fetched live in the browser on app load; cached in `localStorage` for 24h with a "refresh" button |
| Curated specs (connectivity, compatibility, joystick type, layout, rumble, gyro, weight, battery, family, notes) | A hand‑maintained `src/data/controllerSpecs.ts` file in the repo, keyed by `shopifyHandle` | Bumped manually when 8BitDo releases new controllers |

**Why this split:** prices and availability change frequently and would go stale immediately if hardcoded; specs change essentially never per SKU. Curating specs is unavoidable because the Shopify API does not expose them in a structured form — they live in marketing copy on each product page, not in tags or metafields the storefront exposes. We deliberately do NOT try to scrape product‑page HTML at runtime: it's fragile, requires CORS workarounds, and the spec set per controller is small (~16 fields × ~16 controllers).

**CORS note:** `shop.8bitdo.com/collections/all-products/products.json` returns CORS headers permissive enough for browser fetches from any origin (verified manually). If 8BitDo ever locks this down, the fallback is a tiny serverless function (Vercel Edge Function or Cloudflare Worker) that proxies the call.

**Merge step:** at app bootstrap, the live Shopify list is joined to the curated specs by `shopifyHandle`. Any controller present in Shopify but missing a spec entry is shown in the grid with a "Specs pending" badge and is excluded from the comparison table until specs are added — this keeps the spec file honest without crashing the app when 8BitDo releases something new.

## 7. UI architecture

Three top‑level views, all client‑side routed:

1. **Browse (`/`)** — grid of controller cards. Filters in a left sidebar (compatibility multi‑select, connectivity multi‑select, joystick type, price range slider, on‑sale toggle, search box). Each card: image, name, base price (with strike‑through compare‑at price if on sale), key spec icons, "+ Compare" button (becomes "✓ In comparison" once selected, capped at 3).
2. **Compare (`/compare`)** — table view. Columns = selected controllers (1–3). Rows grouped: **Pricing & availability**, **Connectivity**, **Compatibility**, **Sticks & inputs**, **Physical**, **Notes**. The "differences highlighted" rule: for each row, if not all visible columns share the same value, the row gets a subtle accent and differing cells get an emphasised background. A column header has the image, name, link out, and a small "✕ Remove" button. A "+ Add controller" column appears when fewer than 3 are selected.
3. **Not‑found / empty states** — Compare with 0 selected redirects to Browse with a toast.

A persistent **CompareBar** is rendered on Browse showing the current selection as chips with a "Compare (N)" CTA. It is suppressed on the Compare view itself.

## 8. State management

State is small enough that React Context + `useReducer` is sufficient — no Redux/Zustand. Two contexts:

- **`CatalogContext`** — holds merged `Controller[]`, load state, last‑refreshed timestamp, refresh action. Populated once on mount.
- **`CompareContext`** — holds the selected `string[]` of controller ids (max length 3), with `add`, `remove`, `clear`, `swap` actions. Persisted to `localStorage` so a refresh keeps the comparison.

The comparison selection is also reflected in the URL on `/compare?ids=a,b,c` so a user can copy/share the link. The Compare view reads ids from the query string and asks `CatalogContext` to resolve them; on Browse, the URL is not modified by selection.

## 9. Tech stack

| Concern | Choice | Reason |
| --- | --- | --- |
| Framework | **Vite + React 18 + TypeScript** | User asked for ReactJS. Vite gives instant dev server and a static build that drops onto Vercel/Netlify/GitHub Pages. TypeScript pays for itself given the structured `Controller` model. |
| Routing | **React Router v6** | Two routes, simplest viable choice. |
| Styling | **Tailwind CSS** + a few hand‑rolled components | Comparison tables need a lot of one‑off layout; utility classes are faster than maintaining a component library here. Avoids pulling in a heavy UI kit for two screens. |
| Icons | **lucide-react** | Small footprint, good coverage for compatibility/connectivity glyphs. |
| Testing | **Vitest** + **React Testing Library** | Vite‑native, fast. We test the data merge and the difference‑highlighting reducer; UI gets a smoke test per route. |
| Lint/format | ESLint + Prettier with the Vite React‑TS template defaults | Standard. |
| Deployment | **Vercel** (static build) | One‑click from GitHub, free tier covers this trivially, the URL is shareable. |

Explicitly NOT used: Next.js (no SSR/server needs justify the complexity), Redux, Storybook, a component library.

## 10. Error handling

- **Shopify fetch fails:** show a banner with "Live pricing unavailable — showing last cached prices from <relative time>" and fall back to the `localStorage` snapshot. If there is no snapshot, show prices from a `data/fallbackPrices.json` committed to the repo (regenerated whenever someone bumps `controllerSpecs.ts`).
- **Controller in URL but not in catalog:** drop it silently and toast "1 controller in your link is no longer available."
- **More than 3 ids in URL:** keep the first 3, drop the rest with a toast.
- **Spec missing for a Shopify product:** show in the grid with a "Specs pending" badge, disable the "+ Compare" button on the card with a tooltip explaining why.

## 11. Accessibility & responsive

- The comparison table is a real `<table>` with proper `<th scope>` so screen readers announce row/column context. On narrow viewports (<768px) it switches to a stacked card‑per‑controller layout with each row repeated per card — easier to scan with one thumb.
- All interactive elements are buttons or links with visible focus rings (Tailwind `focus-visible:` utilities).
- Colour is never the only signal of "different" — differing cells also get a small dot indicator.

## 12. Open questions / explicit assumptions

These are decisions I made without being able to ask interactively. Each is a candidate to revisit before implementation starts.

1. **Scope is "Game Controllers" only.** The store filter the user linked includes `product_type=Game Controllers`. We exclude mod kits, arcade sticks, keyboards, receivers. (Easy to broaden later by adding more product types to the spec file.)
2. **"Base price" = lowest available variant price in USD.** Many 8BitDo controllers have multiple colorways or editions at different prices (e.g. Ultimate 2 "From $55.99"). Using the minimum matches what the store card shows.
3. **Hand‑curated spec file is acceptable.** Alternative would be an LLM extraction pass over each product description, but that is over‑engineered for ~16 SKUs and would still need human review. The spec file is small and a contributor can add a new controller in one PR.
4. **No backend.** Everything is static + a public Shopify JSON endpoint. If CORS ever changes we add a thin proxy then.
5. **No price history / alerts.** Out of scope for v1.
6. **3‑controller cap is enforced everywhere** — the URL parser caps, the reducer caps, the UI hides the "+ Compare" button at the cap.
7. **Currency is USD only**, matching the official store. International users see USD.
8. **Deployment target is Vercel.** Could also be GH Pages or Netlify; Vercel chosen for zero‑config preview deploys per PR.

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
