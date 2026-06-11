# AGENTS.md

## Cursor Cloud specific instructions

This is a static front-end app (Vite 8 + React 19 + TypeScript). There is **no backend, database, or other service** — running it is just the Vite dev server. Node 22 + pnpm 10 (matches `.github/workflows/ci.yml`).

Standard commands live in `package.json` scripts and the README table; use those (`pnpm dev`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm build`). CI runs `lint`, `format:check`, `test`, and `build` on every PR, so run those before pushing.

Non-obvious notes:

- The catalog loads from the bundled snapshot `src/data/fallbackCatalog.json` for first paint, then SWR-fetches **live** pricing from the public 8BitDo Shopify `/products.json` at runtime (see `src/services/shopify.ts` and `src/services/catalog/`). With network access the status badge shows green "OK"; in a network-restricted environment it shows an amber "Live fetch failed" badge and still renders the fallback catalog — that is expected, not a bug.
- `pnpm install` prints `Ignored build scripts: esbuild`. This is harmless — `pnpm dev`/`pnpm build`/`pnpm test` all work without approving it. Do not run the interactive `pnpm approve-builds`.
