import { useEffect, useState } from 'react'
import { Gamepad2 } from 'lucide-react'

import { loadCatalogSWR, type CatalogSnapshot } from './services/catalog'

function formatRelative(ms: number, now: number): string {
  const diff = Math.max(0, now - ms)
  const minutes = Math.round(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

type CatalogState = {
  snapshot: CatalogSnapshot
  observedAt: number
}

function useCatalog(): CatalogState | null {
  const [state, setState] = useState<CatalogState | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      for await (const next of loadCatalogSWR()) {
        if (cancelled) break
        setState({ snapshot: next, observedAt: Date.now() })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return state
}

function App() {
  const state = useCatalog()
  const snapshot = state?.snapshot ?? null
  const now = state?.observedAt ?? null

  return (
    <main className="mx-auto flex min-h-full max-w-5xl flex-col items-start gap-6 px-6 py-12">
      <div className="flex items-center gap-3 text-zinc-500">
        <Gamepad2 className="size-6" aria-hidden="true" />
        <span className="text-sm tracking-wide uppercase">8bitdo-compare</span>
      </div>

      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        8BitDo controller comparison tool
      </h1>

      <p className="text-zinc-600 dark:text-zinc-400">
        Phase 1 dev view: merged catalog from live Shopify pricing + curated
        specs. Browse and Compare UI lands in Phase 2 and 3.
      </p>

      {snapshot && (
        <div className="w-full">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            <span
              className={
                snapshot.status === 'error'
                  ? 'rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100'
                  : 'rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100'
              }
            >
              {snapshot.status === 'error'
                ? `Live fetch failed${snapshot.error ? `: ${snapshot.error.message}` : ''}`
                : 'OK'}
            </span>
            <span className="text-zinc-500">
              {snapshot.controllers.length} controllers
              {snapshot.fetchedAt !== null &&
                now !== null &&
                ` · fetched ${formatRelative(snapshot.fetchedAt, now)}`}
              {snapshot.fromCache && ' · from cache'}
            </span>
          </div>

          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left dark:border-zinc-800">
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Handle</th>
                <th className="py-2 pr-4 font-medium">Price</th>
                <th className="py-2 pr-4 font-medium">Sale?</th>
                <th className="py-2 pr-4 font-medium">Available?</th>
                <th className="py-2 pr-4 font-medium">Specs?</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.controllers.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-zinc-100 dark:border-zinc-900"
                >
                  <td className="py-2 pr-4">{c.name}</td>
                  <td className="py-2 pr-4 font-mono text-xs text-zinc-500">
                    {c.shopifyHandle}
                  </td>
                  <td className="py-2 pr-4">
                    {c.basePriceUSD === null
                      ? '—'
                      : `$${c.basePriceUSD.toFixed(2)}`}
                  </td>
                  <td className="py-2 pr-4">{c.onSale ? 'yes' : 'no'}</td>
                  <td className="py-2 pr-4">{c.available ? 'yes' : 'no'}</td>
                  <td className="py-2 pr-4">
                    {c.specsPending ? (
                      <span className="text-amber-600">pending</span>
                    ) : (
                      <span className="text-emerald-600">
                        {Object.keys(c.specs).length} specs
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}

export default App
