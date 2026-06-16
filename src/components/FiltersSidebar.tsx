import { Search } from 'lucide-react'

import {
  emptyFilters,
  type ConnectivityBucket,
  type FilterState,
  type JoystickBucket,
  type PlatformBucket,
} from '../services/filter'

const PLATFORMS: PlatformBucket[] = [
  'Switch',
  'Windows',
  'Mac/Apple',
  'SteamOS',
  'Android',
  'Raspberry Pi',
]
const CONNECTIVITY: ConnectivityBucket[] = ['Bluetooth', '2.4G', 'Wired']
const JOYSTICKS: JoystickBucket[] = ['TMR', 'Hall Effect', 'Standard']

type Props = {
  filters: FilterState
  onChange: (next: FilterState) => void
  resultCount: number
  totalCount: number
}

function toggleInArray<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value]
}

function PriceInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: number | null
  onChange: (next: number | null) => void
  placeholder: string
  ariaLabel: string
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      min={0}
      placeholder={placeholder}
      aria-label={ariaLabel}
      value={value ?? ''}
      onChange={(event) => {
        const raw = event.target.value
        if (raw === '') {
          onChange(null)
          return
        }
        const parsed = parseFloat(raw)
        onChange(Number.isFinite(parsed) ? parsed : null)
      }}
      className="w-20 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
    />
  )
}

export function FiltersSidebar({
  filters,
  onChange,
  resultCount,
  totalCount,
}: Props) {
  const allDefault = JSON.stringify(filters) === JSON.stringify(emptyFilters)

  return (
    <aside aria-label="Filters" className="space-y-6 text-sm">
      <div>
        <label className="relative block">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={filters.search}
            onChange={(event) =>
              onChange({ ...filters, search: event.target.value })
            }
            placeholder="Search controllers"
            aria-label="Search controllers"
            className="w-full rounded-md border border-zinc-300 bg-white py-2 pr-3 pl-9 text-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <p
          className="mt-2 text-xs text-zinc-500"
          role="status"
          aria-live="polite"
        >
          {resultCount} of {totalCount} controllers
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="font-medium text-zinc-900 dark:text-zinc-100">
          Compatibility
        </legend>
        <p className="text-xs text-zinc-500">
          Controller must support all selected platforms.
        </p>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => {
            const active = filters.platforms.includes(p)
            return (
              <button
                key={p}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  onChange({
                    ...filters,
                    platforms: toggleInArray(filters.platforms, p),
                  })
                }
                className={
                  active
                    ? 'rounded-full border border-emerald-500 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-900 dark:border-emerald-400 dark:bg-emerald-950 dark:text-emerald-100'
                    : 'rounded-full border border-zinc-300 bg-white px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
                }
              >
                {p}
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="font-medium text-zinc-900 dark:text-zinc-100">
          Connectivity
        </legend>
        <div className="flex flex-wrap gap-2">
          {CONNECTIVITY.map((c) => {
            const active = filters.connectivity.includes(c)
            return (
              <button
                key={c}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  onChange({
                    ...filters,
                    connectivity: toggleInArray(filters.connectivity, c),
                  })
                }
                className={
                  active
                    ? 'rounded-full border border-emerald-500 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-900 dark:border-emerald-400 dark:bg-emerald-950 dark:text-emerald-100'
                    : 'rounded-full border border-zinc-300 bg-white px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
                }
              >
                {c}
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="font-medium text-zinc-900 dark:text-zinc-100">
          Joystick tech
        </legend>
        <div className="flex flex-wrap gap-2">
          {JOYSTICKS.map((j) => {
            const active = filters.joysticks.includes(j)
            return (
              <button
                key={j}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  onChange({
                    ...filters,
                    joysticks: toggleInArray(filters.joysticks, j),
                  })
                }
                className={
                  active
                    ? 'rounded-full border border-emerald-500 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-900 dark:border-emerald-400 dark:bg-emerald-950 dark:text-emerald-100'
                    : 'rounded-full border border-zinc-300 bg-white px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
                }
              >
                {j}
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="font-medium text-zinc-900 dark:text-zinc-100">
          Price
        </legend>
        <div className="flex items-center gap-2">
          <PriceInput
            value={filters.priceRange.min}
            onChange={(min) =>
              onChange({
                ...filters,
                priceRange: { ...filters.priceRange, min },
              })
            }
            placeholder="Min"
            ariaLabel="Minimum price"
          />
          <span className="text-zinc-400">–</span>
          <PriceInput
            value={filters.priceRange.max}
            onChange={(max) =>
              onChange({
                ...filters,
                priceRange: { ...filters.priceRange, max },
              })
            }
            placeholder="Max"
            ariaLabel="Maximum price"
          />
          <span className="text-xs text-zinc-500">USD</span>
        </div>
      </fieldset>

      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.onSaleOnly}
            onChange={(event) =>
              onChange({ ...filters, onSaleOnly: event.target.checked })
            }
            className="size-4"
          />
          <span>On sale only</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.hideSpecsPending}
            onChange={(event) =>
              onChange({
                ...filters,
                hideSpecsPending: event.target.checked,
              })
            }
            className="size-4"
          />
          <span>Hide controllers without curated specs</span>
        </label>
      </div>

      {!allDefault && (
        <button
          type="button"
          onClick={() => onChange(emptyFilters)}
          className="text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Reset filters
        </button>
      )}
    </aside>
  )
}
