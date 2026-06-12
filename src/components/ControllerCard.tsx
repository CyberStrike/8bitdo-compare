import { Check, Plus, ShieldAlert } from 'lucide-react'
import clsx from 'clsx'

import type { Controller } from '../types/controller'
import { useCompare } from '../context/useCompare'

function formatPrice(usd: number | null): string {
  if (usd === null) return '—'
  return `$${usd.toFixed(2)}`
}

type Props = {
  controller: Controller
}

export function ControllerCard({ controller }: Props) {
  const { isSelected, isFull, toggle } = useCompare()
  const selected = isSelected(controller.id)
  const disabled = !selected && (isFull || controller.specsPending)

  let buttonLabel = 'Compare'
  let buttonIcon = <Plus className="size-4" aria-hidden="true" />
  if (selected) {
    buttonLabel = 'In comparison'
    buttonIcon = <Check className="size-4" aria-hidden="true" />
  } else if (controller.specsPending) {
    buttonLabel = 'No Specs'
    buttonIcon = <ShieldAlert className="size-4" aria-hidden="true" />
  } else if (isFull) {
    buttonLabel = 'Cap reached'
  }

  return (
    <article className="flex flex-col rounded-lg border border-zinc-200 bg-white shadow-sm transition hover:border-zinc-300 hover:shadow dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
      <div className="aspect-square overflow-hidden rounded-t-lg bg-zinc-50 dark:bg-zinc-950">
        {controller.imageUrl ? (
          <img
            src={controller.imageUrl}
            alt={controller.name}
            loading="lazy"
            className="h-full w-full object-contain p-2"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
            no image
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
            {controller.name}
          </h2>
          {controller.family && controller.family !== 'Other' && (
            <span className="shrink-0 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
              {controller.family}
            </span>
          )}
        </div>

        {controller.tagline && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {controller.tagline}
          </p>
        )}

        <div className="flex items-baseline gap-2">
          <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {formatPrice(controller.basePriceUSD)}
          </span>
          {controller.onSale && controller.compareAtPriceUSD !== null && (
            <>
              <span className="text-sm text-zinc-400 line-through">
                {formatPrice(controller.compareAtPriceUSD)}
              </span>
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-900 dark:bg-rose-950 dark:text-rose-200">
                Sale
              </span>
            </>
          )}
          {!controller.available && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              Sold out
            </span>
          )}
        </div>

        <div className="mt-auto flex gap-2">
          <button
            type="button"
            onClick={() => toggle(controller.id)}
            disabled={disabled}
            aria-pressed={selected}
            className={clsx(
              'inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900',
              selected
                ? 'border-emerald-500 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 focus-visible:ring-emerald-500 dark:border-emerald-400 dark:bg-emerald-950 dark:text-emerald-100 dark:hover:bg-emerald-900'
                : disabled
                  ? 'cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-600'
                  : 'border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 focus-visible:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800',
            )}
          >
            {buttonIcon}
            {buttonLabel}
          </button>
          <a
            href={controller.shopUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            Store ↗
          </a>
        </div>
      </div>
    </article>
  )
}
