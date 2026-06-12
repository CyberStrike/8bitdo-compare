import { Plus, X } from 'lucide-react'
import clsx from 'clsx'
import { Link } from 'react-router-dom'
import type { CSSProperties, ReactNode } from 'react'

import { useCompare } from '../context/useCompare'
import {
  SECTION_LABELS,
  buildComparisonRows,
  buildPricingRows,
  type ComparisonRow,
  type PricingRow,
} from '../services/compareDiff'
import { COMPARE_CAP } from '../services/compare'
import type { Controller } from '../types/controller'
import { SpecValueCell } from './SpecValueCell'

type Props = {
  controllers: Controller[]
}

/**
 * The comparison view. Built with CSS Grid on divs (no `<table>`) so the
 * same DOM can render side-by-side on desktop and stacked on mobile; see
 * design §11 for the rationale.
 *
 * Differences are highlighted with a three-state rule (see design §7):
 *   - All equal → quiet (no accent).
 *   - All present and differ → row accent + non-colour dot.
 *   - Present on some, missing on others → stronger accent; missing cells
 *     render as a dimmed `—` with a tooltip.
 */
export function ComparisonGrid({ controllers }: Props) {
  const { remove } = useCompare()
  const sections = buildComparisonRows(controllers)
  const pricingRows = buildPricingRows(controllers)

  const columnCount = controllers.length
  const hasOpenSlot = columnCount < COMPARE_CAP
  const visibleColumnCount = columnCount + (hasOpenSlot ? 1 : 0)
  // The label column is fixed-ish; each visible controller column shares
  // the remaining width. CSS var consumed by the .comparison-grid media
  // query in index.css.
  const gridStyle = {
    ['--comparison-grid-cols' as string]: `minmax(8rem, 12rem) repeat(${visibleColumnCount}, minmax(0, 1fr))`,
  } as CSSProperties

  return (
    <section
      aria-label="Controller comparison"
      className="comparison-grid"
      style={gridStyle}
    >
      <HeaderRow
        controllers={controllers}
        hasOpenSlot={hasOpenSlot}
        onRemove={remove}
      />

      {pricingRows.length > 0 && (
        <SectionGroup
          title="Pricing & availability"
          visibleColumnCount={visibleColumnCount}
        >
          {pricingRows.map((row) => (
            <PricingRowView
              key={row.label}
              row={row}
              hasOpenSlot={hasOpenSlot}
            />
          ))}
        </SectionGroup>
      )}

      {sections.map((section) => (
        <SectionGroup
          key={section.id}
          title={SECTION_LABELS[section.id]}
          visibleColumnCount={visibleColumnCount}
        >
          {section.rows.map((row) => (
            <SpecRowView key={row.label} row={row} hasOpenSlot={hasOpenSlot} />
          ))}
        </SectionGroup>
      ))}
    </section>
  )
}

/* -------------------------------- header ------------------------------ */

function HeaderRow({
  controllers,
  hasOpenSlot,
  onRemove,
}: {
  controllers: Controller[]
  hasOpenSlot: boolean
  onRemove: (id: string) => void
}) {
  return (
    <div className="contents">
      {/* Empty corner cell on desktop; hidden on mobile. */}
      <div className="hidden md:block" aria-hidden="true" />
      {controllers.map((controller) => (
        <div
          key={controller.id}
          className="mb-4 flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="aspect-square overflow-hidden rounded-md bg-zinc-50 dark:bg-zinc-950">
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
          <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
            {controller.name}
          </h2>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
            <a
              href={controller.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-600 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Official page ↗
            </a>
            <a
              href={controller.shopUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-600 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Shop ↗
            </a>
          </div>
          <button
            type="button"
            onClick={() => onRemove(controller.id)}
            aria-label={`Remove ${controller.name} from comparison`}
            className="mt-1 inline-flex items-center justify-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-600 transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <X className="size-3.5" aria-hidden="true" />
            Remove
          </button>
        </div>
      ))}
      {hasOpenSlot && (
        <Link
          to="/browse"
          className="mb-4 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 p-6 text-sm text-zinc-500 transition hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/50 dark:hover:border-zinc-600 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
        >
          <Plus className="size-6" aria-hidden="true" />
          Add controller
        </Link>
      )}
    </div>
  )
}

/* --------------------------- section + rows --------------------------- */

function SectionGroup({
  title,
  visibleColumnCount,
  children,
}: {
  title: string
  visibleColumnCount: number
  children: ReactNode
}) {
  return (
    <section className="contents" aria-label={title}>
      <h3
        className="mt-6 mb-1 border-b border-zinc-200 pb-1 text-sm font-medium tracking-wide text-zinc-500 uppercase dark:border-zinc-800"
        style={{ gridColumn: `1 / span ${1 + visibleColumnCount}` }}
      >
        {title}
      </h3>
      {children}
    </section>
  )
}

type RowVariant = 'equal' | 'differ' | 'partial'

function rowAccentClass(variant: RowVariant): string {
  switch (variant) {
    case 'equal':
      return ''
    case 'differ':
      return 'bg-amber-50/40 dark:bg-amber-950/20'
    case 'partial':
      // Strongest accent — these are the unique-feature rows the
      // comparison is built to surface (design §7).
      return 'bg-amber-100/60 dark:bg-amber-950/40'
  }
}

function DotIndicator({ variant }: { variant: RowVariant }) {
  if (variant === 'equal') return null
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'inline-block size-1.5 rounded-full',
        variant === 'partial' ? 'bg-amber-500' : 'bg-amber-400',
      )}
    />
  )
}

function PricingRowView({
  row,
  hasOpenSlot,
}: {
  row: PricingRow
  hasOpenSlot: boolean
}) {
  const variant: RowVariant = row.differs ? 'differ' : 'equal'
  const accent = rowAccentClass(variant)
  return (
    // No ARIA role/row/cell semantics — adding those outside a proper
    // role="table" / "grid" / "treegrid" container is invalid ARIA and
    // confuses screen readers more than it helps. The visual layout +
    // the heading hierarchy + the non-colour dot indicator carry the
    // information. A full role="table" / "rowgroup" / "row" / "cell"
    // pass is a Phase 4 a11y polish item if needed.
    <div className="contents text-sm">
      <div
        data-row-label={row.label}
        data-variant={variant}
        className={clsx(
          'flex items-center gap-1.5 px-3 py-2 text-xs font-medium tracking-wide text-zinc-600 uppercase dark:text-zinc-400',
          accent,
        )}
      >
        <DotIndicator variant={variant} />
        {row.label}
      </div>
      {row.values.map((value, i) => (
        <div
          key={i}
          className={clsx('px-3 py-2 text-zinc-900 dark:text-zinc-100', accent)}
        >
          {value}
        </div>
      ))}
      {hasOpenSlot && (
        <div aria-hidden="true" className={clsx('hidden md:block', accent)} />
      )}
    </div>
  )
}

function SpecRowView({
  row,
  hasOpenSlot,
}: {
  row: ComparisonRow
  hasOpenSlot: boolean
}) {
  const variant: RowVariant = row.classification
  const accent = rowAccentClass(variant)
  return (
    <div className="contents text-sm">
      <div
        data-row-label={row.label}
        data-variant={variant}
        className={clsx(
          'flex items-center gap-1.5 px-3 py-2 text-xs font-medium tracking-wide text-zinc-600 uppercase dark:text-zinc-400',
          accent,
        )}
      >
        <DotIndicator variant={variant} />
        {row.label}
      </div>
      {row.values.map((value, i) => (
        <div key={i} className={clsx('px-3 py-2', accent)}>
          <SpecValueCell value={value} />
        </div>
      ))}
      {hasOpenSlot && (
        <div aria-hidden="true" className={clsx('hidden md:block', accent)} />
      )}
    </div>
  )
}
