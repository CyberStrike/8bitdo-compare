# 8bitdo-compare

A side‑by‑side comparison tool for 8BitDo game controllers. Pick up to 3 controllers from the [official 8BitDo store](https://shop.8bitdo.com/collections/all-products?filter.p.product_type=Game+Controllers) and see prices and key specs lined up next to each other.

> **Status:** planning phase. The design and implementation plan have been written and are awaiting review. No app code yet.

## Why

8BitDo sells dozens of overlapping controllers (Pro 2, Pro 3, Ultimate, Ultimate 2, Ultimate 2C, SN30, Lite 2, 64, M30, Zero 2, PCE…) under inconsistent names. The official store shows one product at a time with no compare view, so picking the right one is harder than it should be.

## Planning documents

Read these in order:

1. [Design — what we're building and why](docs/specs/2026-06-10-controller-comparison-design.md)
2. [Implementation plan — how we'll build it, in phases](docs/specs/2026-06-10-controller-comparison-plan.md)

If you want to push back on any assumption, the explicit ones are in §12 of the design doc.

## Planned stack

Vite + React 18 + TypeScript, Tailwind, React Router, Vitest. Deployed as a static site on Vercel. Live prices fetched from Shopify's public `products.json` endpoint; specs hand‑curated in a single file in the repo. See the design doc for the full rationale.
