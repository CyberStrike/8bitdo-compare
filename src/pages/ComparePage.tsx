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

    const urlChanged = lastUrlIds.current !== urlIds
    const stateChanged = lastStateIds.current !== stateIds

    if (urlIds === stateIds) {
      // Already in sync — just record the snapshot so future deltas
      // are detected correctly.
      lastUrlIds.current = urlIds
      lastStateIds.current = stateIds
      return
    }

    if (urlChanged) {
      // URL → state (initial deep link, browser back/forward, manual
      // pasted link). Wins over a coincident state change because the
      // user navigated explicitly.
      setIds(parseIdsParam(urlIds))
      lastUrlIds.current = urlIds
      return
    }

    if (stateChanged) {
      // State → URL (user removed via the header X, programmatic clear).
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
  const { selected, dropped } = useMemo(() => {
    if (status === 'loading') {
      return { selected: [], dropped: 0 }
    }
    const resolved = selectedIds
      .map((id) => controllers.find((c) => c.id === id))
      .filter((c): c is NonNullable<typeof c> => c !== undefined)
    return {
      selected: resolved,
      dropped: selectedIds.length - resolved.length,
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
          className="mb-6 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            {dropped === 1
              ? '1 controller in your link is no longer available.'
              : `${dropped} controllers in your link are no longer available.`}{' '}
            They&rsquo;ve been dropped from the comparison below.
          </span>
        </div>
      )}

      {status === 'loading' ? (
        <p className="text-sm text-zinc-500">Loading catalog…</p>
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
