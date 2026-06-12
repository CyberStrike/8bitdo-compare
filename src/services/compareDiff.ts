/**
 * Pure comparison-row builder + three-state diff classifier.
 *
 * Lives outside the React tree so the diff logic — which is the
 * comparison view's main interesting behaviour — is trivially testable.
 *
 * Design rules (see `docs/specs/2026-06-10-controller-comparison-design.md`
 * §7 "differences highlighting", three states):
 *   - All present and equal → quiet (`equal`).
 *   - All present but values differ → highlighted (`differ`).
 *   - Present on some, missing on others → strongly highlighted (`partial`).
 *     This is the case that surfaces unique features, the most valuable
 *     signal in the whole view.
 */

import { specCatalog } from '../data/specCatalog'
import type {
  Controller,
  SpecCatalogEntry,
  SpecSection,
  SpecValue,
} from '../types/controller'

export type RowClassification = 'equal' | 'differ' | 'partial'

export type ComparisonRow = {
  label: string
  section: SpecSection
  /** Per-controller value, or `null` when this controller doesn't list it. */
  values: (SpecValue | null)[]
  classification: RowClassification
}

export type ComparisonSection = {
  id: SpecSection
  rows: ComparisonRow[]
}

/* --------------------------- value equality --------------------------- */

function listsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  // Order-insensitive — the user input doesn't control list order, and a
  // controller's compatibility list shouldn't be different from another's
  // just because 8BitDo wrote it in a different order.
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((v, i) => v === sortedB[i])
}

function recordsEqual(
  a: Record<string, string>,
  b: Record<string, string>,
): boolean {
  const aKeys = Object.keys(a).sort()
  const bKeys = Object.keys(b).sort()
  if (aKeys.length !== bKeys.length) return false
  return aKeys.every((k, i) => k === bKeys[i] && a[k] === b[k])
}

export function valuesEqual(a: SpecValue, b: SpecValue): boolean {
  if (a.kind !== b.kind) return false
  switch (a.kind) {
    case 'text':
      return a.value === (b as Extract<SpecValue, { kind: 'text' }>).value
    case 'boolean':
      return a.value === (b as Extract<SpecValue, { kind: 'boolean' }>).value
    case 'number': {
      const other = b as Extract<SpecValue, { kind: 'number' }>
      return a.value === other.value && a.unit === other.unit
    }
    case 'list':
      return listsEqual(
        a.value,
        (b as Extract<SpecValue, { kind: 'list' }>).value,
      )
    case 'perPlatform':
      return recordsEqual(
        a.value,
        (b as Extract<SpecValue, { kind: 'perPlatform' }>).value,
      )
  }
}

/* ----------------------------- classifier ----------------------------- */

/**
 * Classify a row's values into one of the three diff states. A row whose
 * values are all `null` is never rendered — `buildComparisonRows` filters
 * those out before this is called.
 */
export function classifyRow(values: (SpecValue | null)[]): RowClassification {
  const present = values.filter((v): v is SpecValue => v !== null)
  if (present.length === 0) return 'equal' // shouldn't happen; defensive

  if (present.length < values.length) return 'partial'

  const first = present[0]
  const allEqual = present.every((v) => valuesEqual(first, v))
  return allEqual ? 'equal' : 'differ'
}

/* -------------------------- per-spec resolution ------------------------ */

/**
 * Resolve the displayed value for a single spec on a single controller.
 * Returns `null` when the controller doesn't list the spec AND the spec's
 * catalog entry is not `booleanByDefault: true`. For boolean-by-default
 * specs we treat "absent" as "no" so the comparison row shows a real
 * boolean cell rather than the "missing" marker — that's how 8BitDo's own
 * comparison tables present those rows.
 */
export function resolveSpec(
  controller: Controller,
  label: string,
  catalogEntry: SpecCatalogEntry | undefined,
): SpecValue | null {
  const direct = controller.specs?.[label]
  if (direct !== undefined) return direct
  if (catalogEntry?.booleanByDefault) {
    return { kind: 'boolean', value: false }
  }
  return null
}

/* ------------------------- row + section builder ----------------------- */

/**
 * Build the rows of the comparison grid from the selected controllers.
 *
 * Rules:
 *   - The row set is the union of every spec key across the selected
 *     controllers AND every `booleanByDefault: true` key in the catalog
 *     that any selected controller mentions. (The latter would also be
 *     in the union via the explicit-mention path.)
 *   - Rows are grouped by their catalog `section`; rows whose label isn't
 *     in the catalog land in the `other` section.
 *   - Within a section, rows are sorted by the catalog `displayOrder`
 *     ascending, then alphabetically by label as a tiebreaker.
 *   - Empty sections (zero rows) are dropped.
 *   - Rows where every selected controller resolves to `null` are dropped.
 *     (This can happen only if a spec was once in the catalog but neither
 *     controller lists it.)
 */
export function buildComparisonRows(
  controllers: Controller[],
): ComparisonSection[] {
  if (controllers.length === 0) return []

  // Union of explicit spec keys across the selected controllers.
  const labels = new Set<string>()
  for (const controller of controllers) {
    for (const key of Object.keys(controller.specs ?? {})) {
      labels.add(key)
    }
  }

  // Resolve every label across every controller. Drop rows that resolve to
  // null for everyone (no signal).
  const rows: ComparisonRow[] = []
  for (const label of labels) {
    const catalogEntry = specCatalog[label]
    const section: SpecSection = catalogEntry?.section ?? 'other'
    const values = controllers.map((c) => resolveSpec(c, label, catalogEntry))
    if (values.every((v) => v === null)) continue
    rows.push({
      label,
      section,
      values,
      classification: classifyRow(values),
    })
  }

  // Group by section, sort rows within each section by displayOrder then
  // label.
  const bySection = new Map<SpecSection, ComparisonRow[]>()
  for (const row of rows) {
    const list = bySection.get(row.section) ?? []
    list.push(row)
    bySection.set(row.section, list)
  }

  for (const list of bySection.values()) {
    list.sort((a, b) => {
      const aOrder = specCatalog[a.label]?.displayOrder ?? 999
      const bOrder = specCatalog[b.label]?.displayOrder ?? 999
      if (aOrder !== bOrder) return aOrder - bOrder
      return a.label.localeCompare(b.label)
    })
  }

  // Output sections in a deterministic, design-aligned order.
  const SECTION_ORDER: SpecSection[] = [
    'identity',
    'compatibility',
    'connectivity',
    'sticks-and-triggers',
    'buttons-and-feedback',
    'battery-physical',
    'software',
    'other',
  ]
  return SECTION_ORDER.filter((id) => bySection.has(id)).map((id) => ({
    id,
    rows: bySection.get(id)!,
  }))
}

/* -------------------------- pricing synthetic ------------------------- */

/**
 * The pricing/availability row set is synthesised from `Controller` fields
 * (not from `specs`), so it lives outside `buildComparisonRows`. The
 * comparison page renders this section above the spec sections.
 *
 * Returns up to two rows: Price, Availability. The Price row carries a
 * compare-at price annotation when any controller is on sale.
 */
export type PricingRow = {
  label: string
  /** Free-form per-controller display strings — the cell renderer prints these verbatim. */
  values: string[]
  /** True if not every visible value is the same. */
  differs: boolean
}

function formatPrice(usd: number | null): string {
  if (usd === null) return '—'
  return `$${usd.toFixed(2)}`
}

export function buildPricingRows(controllers: Controller[]): PricingRow[] {
  if (controllers.length === 0) return []

  const priceValues = controllers.map((c) => {
    const base = formatPrice(c.basePriceUSD)
    if (c.onSale && c.compareAtPriceUSD !== null) {
      return `${base} (was ${formatPrice(c.compareAtPriceUSD)})`
    }
    return base
  })

  const availabilityValues = controllers.map((c) =>
    c.available ? 'In stock' : 'Sold out',
  )

  const rows: PricingRow[] = [
    {
      label: 'Price',
      values: priceValues,
      differs: new Set(priceValues).size > 1,
    },
    {
      label: 'Availability',
      values: availabilityValues,
      differs: new Set(availabilityValues).size > 1,
    },
  ]
  return rows
}

/* --------------------------- section labels --------------------------- */

export const SECTION_LABELS: Record<SpecSection, string> = {
  identity: 'Identity',
  compatibility: 'Compatibility',
  connectivity: 'Connectivity',
  'sticks-and-triggers': 'Sticks & triggers',
  'buttons-and-feedback': 'Buttons & feedback',
  'battery-physical': 'Battery & physical',
  software: 'Software',
  other: 'Other',
}
