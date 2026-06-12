import { Check, X } from 'lucide-react'

import type { SpecValue } from '../types/controller'

type Props = {
  value: SpecValue | null
}

/**
 * Renders a single SpecValue cell. The shape of the value drives the layout:
 *   - `text`     → wrapping prose
 *   - `boolean`  → ✓ or ✕ icon
 *   - `number`   → "1000 mAh"
 *   - `list`     → bulleted-looking inline pills (Tailwind doesn't need <ul>)
 *   - `perPlatform` → a small two-column key/value list
 *
 * `null` renders as an em dash with a tooltip explaining "not listed by
 * 8BitDo for this model" (the partial-match signal from design §7).
 */
export function SpecValueCell({ value }: Props) {
  if (value === null) {
    return (
      <span
        className="text-zinc-400"
        title="Not listed by 8BitDo for this model"
      >
        —
      </span>
    )
  }

  switch (value.kind) {
    case 'text':
      return (
        <span className="text-zinc-900 dark:text-zinc-100">{value.value}</span>
      )

    case 'boolean':
      return value.value ? (
        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
          <Check className="size-4" aria-hidden="true" />
          <span className="sr-only">Yes</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-zinc-400">
          <X className="size-4" aria-hidden="true" />
          <span className="sr-only">No</span>
        </span>
      )

    case 'number':
      return (
        <span className="text-zinc-900 dark:text-zinc-100">
          {value.value.toLocaleString()} {value.unit}
        </span>
      )

    case 'list':
      return (
        <span className="flex flex-wrap gap-1">
          {value.value.map((item) => (
            <span
              key={item}
              className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {item}
            </span>
          ))}
        </span>
      )

    case 'perPlatform':
      return (
        <dl className="space-y-1 text-sm">
          {Object.entries(value.value).map(([platform, modes]) => (
            <div key={platform} className="flex flex-wrap gap-x-2">
              <dt className="font-medium text-zinc-700 dark:text-zinc-300">
                {platform}:
              </dt>
              <dd className="text-zinc-600 dark:text-zinc-400">{modes}</dd>
            </div>
          ))}
        </dl>
      )
  }
}
