import { Link } from 'react-router-dom'
import { ArrowRight, X } from 'lucide-react'

import { useCatalog } from '../context/useCatalog'
import { useCompare } from '../context/useCompare'
import { serialiseIdsParam } from '../services/compare'

export function CompareBar() {
  const { selectedIds, cap, remove, clear } = useCompare()
  const { controllers } = useCatalog()

  if (selectedIds.length === 0) return null

  const selectedControllers = selectedIds
    .map((id) => controllers.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => c !== undefined)

  return (
    <div
      role="region"
      aria-label="Comparison selection"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
        <span className="text-sm text-zinc-500">
          Comparing {selectedIds.length}/{cap}
        </span>
        <ul className="flex flex-wrap gap-2">
          {selectedControllers.map((controller) => (
            <li
              key={controller.id}
              className="flex items-center gap-1.5 rounded-full border border-zinc-300 bg-zinc-50 py-1 pr-1 pl-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <span className="text-zinc-900 dark:text-zinc-100">
                {controller.name}
              </span>
              <button
                type="button"
                onClick={() => remove(controller.id)}
                aria-label={`Remove ${controller.name} from comparison`}
                className="rounded-full p-1 text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={clear}
            className="rounded-md px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Clear
          </button>
          <Link
            to={`/compare?ids=${serialiseIdsParam(selectedIds)}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Compare ({selectedIds.length})
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  )
}
