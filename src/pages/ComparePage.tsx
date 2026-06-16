import { useEffect, useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft } from 'lucide-react'

import { ComparisonGrid } from '../components/ComparisonGrid'
import { useCatalog } from '../context/useCatalog'
import { useCompare } from '../context/useCompare'
import { parseIdsParam, serialiseIdsParam } from '../services/compare'

export function ComparePage() {
  const [params, setParams] = useSearchParams()
  const { controllers, status } = useCatalog()
  const { setIds, selectedIds } = useCompare()

  // Single direction-aware sync effect. Two separate URL↔state effects
  // race on the first render — both fire before either's update has
  // applied, so each "wins" and they stomp on each other forever. This
  // version chooses direction based on which side actually changed since
  // the last sync (tracked via refs that only update inside the effect).
  const lastUrlIds = useRef<string | null>(null)
  const lastStateIds = useRef<string | null>(null)

  useEffect(() => {
    const urlIds = params.get('ids') ?? ''
    const stateIds = serialiseIdsParam(selectedIds)

    if (urlIds === stateIds) {
      lastUrlIds.current = urlIds
      lastStateIds.current = stateIds
      return
    }

    const isFirstRun = lastUrlIds.current === null
    const urlChanged = lastUrlIds.current !== urlIds
    const stateChanged = lastStateIds.current !== stateIds

    // First-run reconciliation. CompareProvider may have restored a
    // selection from localStorage, AND the URL may have its own ids.
    // Three cases to handle so we don't wipe persisted state with an
    // empty URL (which would regress Phase 2 behaviour):
    //   - URL has ids → URL wins (explicit navigation), state catches up.
    //   - URL empty, state has ids → state wins, write it into the URL.
    //   - Both empty → no-op.
    if (isFirstRun) {
      if (urlIds !== '') {
        setIds(parseIdsParam(urlIds))
        lastUrlIds.current = urlIds
      } else if (stateIds !== '') {
        const next = new URLSearchParams(params)
        next.set('ids', stateIds)
        setParams(next, { replace: true })
        lastStateIds.current = stateIds
      } else {
        lastUrlIds.current = ''
        lastStateIds.current = ''
      }
      return
    }

    // Subsequent renders: classify by which side moved since the last
    // sync. URL changes (deep link, browser back) win over coincident
    // state changes; otherwise the state change propagates into the URL.
    if (urlChanged) {
      setIds(parseIdsParam(urlIds))
      lastUrlIds.current = urlIds
      return
    }

    if (stateChanged) {
      const next = new URLSearchParams(params)
      if (stateIds === '') next.delete('ids')
      else next.set('ids', stateIds)
      setParams(next, { replace: true })
      lastStateIds.current = stateIds
      return
    }
  }, [params, selectedIds, setIds, setParams])

  // Resolve selected ids to controllers. Drop ids whose product isn't in
  // the catalog (out-of-date URL after a SKU was retired) and surface a
  // banner — per design §10. Only fire once the catalog is ready, so the
  // initial-load "everything is missing" flicker doesn't trigger a false
  // positive.
  const { selected, dropped, resolvedIds } = useMemo(() => {
    if (status === 'loading') {
      return { selected: [], dropped: 0, resolvedIds: [] as string[] }
    }
    const resolved = selectedIds
      .map((id) => controllers.find((c) => c.id === id))
      .filter((c): c is NonNullable<typeof c> => c !== undefined)
    return {
      selected: resolved,
      dropped: selectedIds.length - resolved.length,
      resolvedIds: resolved.map((c) => c.id),
    }
  }, [selectedIds, controllers, status])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link
        to="/browse"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to browse
      </Link>

      <h1 className="mb-4 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        Compare
      </h1>

      {dropped > 0 && (
        <div
          role="status"
          className="mb-6 flex flex-wrap items-center gap-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
        >
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">
            {dropped === 1
              ? '1 controller in your link is no longer available.'
              : `${dropped} controllers in your link are no longer available.`}{' '}
            They&rsquo;re not in the comparison below.
          </span>
          <button
            type="button"
            onClick={() => setIds(resolvedIds)}
            className="rounded-md border border-amber-400 bg-white px-2.5 py-1 text-xs font-medium text-amber-900 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-amber-600 dark:bg-amber-900 dark:text-amber-100 dark:hover:bg-amber-800"
          >
            Remove from link
          </button>
        </div>
      )}

      {status === 'loading' ? (
        <div aria-busy="true">
          <p className="sr-only" role="status">
            Loading comparison…
          </p>
          <div
            aria-hidden="true"
            className="grid animate-pulse gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="aspect-square rounded-md bg-zinc-100 dark:bg-zinc-800" />
                <div className="h-5 w-2/3 rounded bg-zinc-100 dark:bg-zinc-800" />
                <div className="h-4 w-1/2 rounded bg-zinc-100 dark:bg-zinc-800" />
              </div>
            ))}
          </div>
        </div>
      ) : selected.length === 0 ? (
        <p className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          No controllers selected. Pick up to 3 from the{' '}
          <Link to="/browse" className="underline">
            browse page
          </Link>
          .
        </p>
      ) : (
        <ComparisonGrid controllers={selected} />
      )}
    </div>
  )
}
