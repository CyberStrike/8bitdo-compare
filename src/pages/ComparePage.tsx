import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

import { useCatalog } from '../context/useCatalog'
import { useCompare } from '../context/useCompare'
import { parseIdsParam } from '../services/compare'

/**
 * Phase 2 stub. Phase 3 builds the real CSS-Grid comparison view per
 * design §7.
 */
export function ComparePage() {
  const [params] = useSearchParams()
  const { controllers, status } = useCatalog()
  const { setIds, selectedIds } = useCompare()

  useEffect(() => {
    const fromUrl = parseIdsParam(params.get('ids'))
    if (fromUrl.length === 0) return
    if (
      fromUrl.length === selectedIds.length &&
      fromUrl.every((id, i) => id === selectedIds[i])
    ) {
      return
    }
    setIds(fromUrl)
  }, [params, setIds, selectedIds])

  const selected = selectedIds
    .map((id) => controllers.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => c !== undefined)

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

      {status === 'loading' ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : selected.length === 0 ? (
        <p className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          No controllers selected. Pick up to 3 from the{' '}
          <Link to="/browse" className="underline">
            browse page
          </Link>
          .
        </p>
      ) : (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
          <p className="mb-2 font-medium">Compare view ships in Phase 3.</p>
          <p className="mb-2">Currently selected:</p>
          <ul className="list-disc pl-5">
            {selected.map((c) => (
              <li key={c.id}>
                <strong>{c.name}</strong> — ${c.basePriceUSD?.toFixed(2)}{' '}
                <span className="text-amber-700 dark:text-amber-300">
                  ({Object.keys(c.specs).length} specs)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
