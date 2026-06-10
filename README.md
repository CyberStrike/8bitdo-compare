# 8bitdo-compare

A side‑by‑side comparison tool for 8BitDo game controllers. Pick up to 3 controllers from the [official 8BitDo store](https://shop.8bitdo.com/collections/all-products?filter.p.product_type=Game+Controllers) and see prices and the full published spec set lined up next to each other.

> **Status:** Phase 0 — project scaffolded, no product UI yet. Browse and Compare views land in Phase 2 and 3 (see the plan doc).

## Why

8BitDo sells dozens of overlapping controllers (Pro 2, Pro 3, Ultimate, Ultimate 2, Ultimate 2C, SN30, Lite 2, 64, M30, Zero 2, PCE…) under inconsistent names. The official store shows one product at a time with no compare view. The most egregious example: there are two completely different controllers both called "Ultimate 2," with non‑overlapping platform support, distinguished only by "Wireless" vs "Bluetooth" in the name.

## Quickstart

```bash
pnpm install
pnpm dev          # http://localhost:5173
```

Other scripts:

| Script               | What it does                               |
| -------------------- | ------------------------------------------ |
| `pnpm dev`           | Vite dev server with HMR                   |
| `pnpm build`         | Type‑check + production build into `dist/` |
| `pnpm preview`       | Preview the production build locally       |
| `pnpm test`          | Run the Vitest suite once                  |
| `pnpm test:watch`    | Re‑run tests on file change                |
| `pnpm test:coverage` | Tests with v8 coverage report              |
| `pnpm lint`          | ESLint over the repo                       |
| `pnpm format`        | Format everything with Prettier            |
| `pnpm format:check`  | Verify formatting without writing          |

CI runs `lint`, `format:check`, `test`, and `build` on every PR (see `.github/workflows/ci.yml`).

## Tech

Vite 8 + React 19 + TypeScript, Tailwind CSS v4 (`@tailwindcss/vite` plugin), React Router 7, lucide‑react, Vitest + React Testing Library. No backend, no SSR. Static build deployable to Vercel, Netlify, or GH Pages.

## Project layout

```
/
├── data/                          seed data, will move to src/data in Phase 1
│   ├── specCatalog.ts             canonical spec labels, sections, types
│   ├── controllerSpecs.json       per-controller spec entries
│   └── README.md                  data conventions
├── docs/specs/                    design and implementation plan
│   ├── 2026-06-10-controller-comparison-design.md
│   └── 2026-06-10-controller-comparison-plan.md
├── public/                        static assets served as-is
├── src/
│   ├── App.tsx                    landing page (Phase 0 placeholder)
│   ├── App.test.tsx               smoke test
│   ├── index.css                  Tailwind import + base layer
│   ├── main.tsx                   React entry point
│   └── setupTests.ts              Vitest + jest-dom setup
├── .github/workflows/ci.yml       lint / format / test / build on every PR
├── eslint.config.js               flat-config ESLint
├── vite.config.ts                 Vite + Vitest + Tailwind plugin
└── package.json
```

## Planning documents

Read these in order:

1. [Design — what we're building and why](docs/specs/2026-06-10-controller-comparison-design.md)
2. [Implementation plan — how we'll build it, in phases](docs/specs/2026-06-10-controller-comparison-plan.md)

If you want to push back on any assumption, the explicit ones are in §12 of the design doc.
