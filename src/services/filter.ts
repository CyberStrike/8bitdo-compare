/**
 * Pure filter predicate for the Browse view.
 *
 * Lives outside the React tree so it's trivially testable and so the Browse
 * page can `useMemo` a single composed predicate from a `FilterState`. Each
 * filter dimension is independent — the empty/default value for a dimension
 * is "include everything" so combining filters is just AND.
 */

import type { Controller, SpecValue } from '../types/controller'

/** High-level platform buckets used by the compatibility filter. */
export type PlatformBucket =
  | 'Switch'
  | 'Windows'
  | 'Mac/Apple'
  | 'SteamOS'
  | 'Android'
  | 'Raspberry Pi'

/** Connectivity options used by the connectivity filter. */
export type ConnectivityBucket = 'Bluetooth' | '2.4G' | 'Wired'

/** Joystick technology buckets used by the joystick-type filter. */
export type JoystickBucket = 'TMR' | 'Hall Effect' | 'Standard'

export type FilterState = {
  platforms: PlatformBucket[]
  connectivity: ConnectivityBucket[]
  joysticks: JoystickBucket[]
  /**
   * Inclusive USD price range. `null` for either end means "unbounded."
   */
  priceRange: { min: number | null; max: number | null }
  onSaleOnly: boolean
  /** Case-insensitive substring search across name, storeTitle, family, tagline. */
  search: string
  /**
   * When `true`, controllers without a curated spec entry are excluded.
   * Defaults to false so the Browse view shows the full live catalog with
   * a "Specs pending" badge for the un-curated entries.
   */
  hideSpecsPending: boolean
}

export const emptyFilters: FilterState = {
  platforms: [],
  connectivity: [],
  joysticks: [],
  priceRange: { min: null, max: null },
  onSaleOnly: false,
  search: '',
  hideSpecsPending: false,
}

/* ----------------------- spec extractors (per-dim) ----------------------- */

/**
 * Match the user-facing `PlatformBucket` against an 8BitDo compatibility
 * label. We collapse Switch 1 / Switch 2 into "Switch" and treat 8BitDo's
 * "Apple" umbrella (iOS/iPadOS/macOS/tvOS/visionOS) as "Mac/Apple."
 */
function matchesPlatform(
  bucket: PlatformBucket,
  compatibility: string[],
): boolean {
  return compatibility.some((label) => {
    const l = label.toLowerCase()
    switch (bucket) {
      case 'Switch':
        return l.startsWith('switch')
      case 'Windows':
        return l === 'windows' || l.startsWith('windows')
      case 'Mac/Apple':
        return l === 'apple' || l === 'macos' || l === 'mac'
      case 'SteamOS':
        return l === 'steamos'
      case 'Android':
        return l === 'android'
      case 'Raspberry Pi':
        return l === 'raspberry pi'
    }
  })
}

/**
 * Pull the compatibility platform list off a controller. Falls back to an
 * empty array if the spec is missing or the wrong shape.
 */
export function getCompatibility(controller: Controller): string[] {
  const value = controller.specs?.['Compatibility']
  if (value?.kind === 'list') return value.value
  return []
}

/**
 * Pull the connectivity description off a controller as a single searchable
 * string. Handles both the `text` shape (e.g. Pro 2: "Bluetooth, Wired") and
 * the `perPlatform` shape (e.g. Pro 3 split per platform).
 */
export function getConnectivityHaystack(controller: Controller): string {
  const value: SpecValue | undefined = controller.specs?.['Connectivity']
  if (!value) return ''
  if (value.kind === 'text') return value.value
  if (value.kind === 'perPlatform') return Object.values(value.value).join(' ')
  if (value.kind === 'list') return value.value.join(' ')
  return ''
}

/**
 * Pull the joystick type as a string for substring matching.
 */
export function getJoysticks(controller: Controller): string {
  const value = controller.specs?.['Joysticks']
  if (value?.kind === 'text') return value.value
  return ''
}

/**
 * The text the search box matches against. Lower-cased for cheap substring
 * comparison.
 */
export function getSearchHaystack(controller: Controller): string {
  return [
    controller.name,
    controller.storeTitle,
    controller.family,
    controller.tagline,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

/* --------------------------- predicate builder --------------------------- */

/**
 * Build a single predicate from a `FilterState`. The result is referentially
 * stable for a given filters object, but components should still memoise
 * what they pass in.
 */
export function buildFilterPredicate(
  filters: FilterState,
): (controller: Controller) => boolean {
  const search = filters.search.trim().toLowerCase()

  return (controller) => {
    if (filters.hideSpecsPending && controller.specsPending) return false

    if (filters.onSaleOnly && !controller.onSale) return false

    if (filters.priceRange.min !== null) {
      if (
        controller.basePriceUSD === null ||
        controller.basePriceUSD < filters.priceRange.min
      ) {
        return false
      }
    }
    if (filters.priceRange.max !== null) {
      if (
        controller.basePriceUSD === null ||
        controller.basePriceUSD > filters.priceRange.max
      ) {
        return false
      }
    }

    if (filters.platforms.length > 0) {
      const compat = getCompatibility(controller)
      const ok = filters.platforms.every((p) => matchesPlatform(p, compat))
      if (!ok) return false
    }

    if (filters.connectivity.length > 0) {
      const haystack = getConnectivityHaystack(controller).toLowerCase()
      const ok = filters.connectivity.every((c) =>
        haystack.includes(c.toLowerCase()),
      )
      if (!ok) return false
    }

    if (filters.joysticks.length > 0) {
      const value = getJoysticks(controller).toLowerCase()
      const ok = filters.joysticks.some((j) => {
        if (j === 'TMR') return /\btmr\b/.test(value)
        if (j === 'Hall Effect') return value.includes('hall effect')
        if (j === 'Standard') {
          return (
            value.length > 0 &&
            !value.includes('hall effect') &&
            !/\btmr\b/.test(value)
          )
        }
        return false
      })
      if (!ok) return false
    }

    if (search) {
      if (!getSearchHaystack(controller).includes(search)) return false
    }

    return true
  }
}

/**
 * Convenience: apply a `FilterState` to a list of controllers. The Browse
 * view inlines `controllers.filter(buildFilterPredicate(filters))` instead
 * because it uses the same predicate for "no results" / count messaging,
 * but the helper is useful in tests.
 */
export function applyFilters(
  controllers: Controller[],
  filters: FilterState,
): Controller[] {
  return controllers.filter(buildFilterPredicate(filters))
}
