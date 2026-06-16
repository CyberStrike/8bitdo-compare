import { useMemo, useState } from 'react'
import { Gamepad2, RefreshCw } from 'lucide-react'

import { CompareBar } from '../components/CompareBar'
import { ControllerCard } from '../components/ControllerCard'
import { ControllerCardSkeleton } from '../components/ControllerCardSkeleton'
import { FiltersSidebar } from '../components/FiltersSidebar'
import { useCatalog } from '../context/useCatalog'
import {
  buildFilterPredicate,
  emptyFilters,
  type FilterState,
} from '../services/filter'

function formatRelative(ms: number, now: number): string {
  const diff = Math.max(0, now - ms)
  const minutes = Math.round(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export function BrowsePage() {
  const {
    controllers,
    status,
    fetchedAt,
    fromCache,
    error,
    observedAt,
    refresh,
  } = useCatalog()
  const [filters, setFilters] = useState<FilterState>(emptyFilters)

  const filtered = useMemo(() => {
    const predicate = buildFilterPredicate(filters)
    return controllers.filter(predicate)
  }, [controllers, filters])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-32">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm text-zinc-500">
            <Gamepad2 className="size-4" aria-hidden="true" />
            <span className="tracking-wide uppercase">8bitdo-compare</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Browse 8BitDo controllers
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            Pick up to 3 controllers to compare. Prices come live from the
            8BitDo store; specs come from each product&rsquo;s official page.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void refresh()
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Refresh prices
        </button>
      </header>

      {status === 'error' && (
        <div
          role="status"
          className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
        >
          Live pricing unavailable
          {error?.message ? ` — ${error.message}` : ''}. Showing cached prices
          {fetchedAt !== null && observedAt !== null
            ? ` from ${formatRelative(fetchedAt, observedAt)}`
            : ''}
          .
        </div>
      )}
      {status === 'ready' &&
        fromCache &&
        fetchedAt !== null &&
        observedAt !== null && (
          <p className="mb-6 text-xs text-zinc-500">
            Showing cached prices from {formatRelative(fetchedAt, observedAt)} —
            revalidating.
          </p>
        )}

      <div className="grid gap-8 md:grid-cols-[18rem_1fr]">
        <FiltersSidebar
          filters={filters}
          onChange={setFilters}
          resultCount={filtered.length}
          totalCount={controllers.length}
        />

        <section aria-label="Controllers" aria-busy={status === 'loading'}>
          {status === 'loading' ? (
            <>
              <p className="sr-only" role="status">
                Loading controllers…
              </p>
              <ul
                aria-hidden="true"
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <li key={i}>
                    <ControllerCardSkeleton />
                  </li>
                ))}
              </ul>
            </>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No controllers match the current filters.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((controller) => (
                <li key={controller.id}>
                  <ControllerCard controller={controller} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <CompareBar />
    </div>
  )
}
