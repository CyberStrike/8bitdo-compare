/**
 * The shape of every value 8BitDo lists for a controller. The discriminator
 * (`kind`) drives how the comparison view renders the cell and how the
 * three-state diff classifier compares two values.
 *
 * See `docs/specs/2026-06-10-controller-comparison-design.md` §5 for the
 * design rationale (open spec model rather than a fixed struct).
 */
export type SpecValue =
  | { kind: 'text'; value: string }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'number'; value: number; unit: string }
  | { kind: 'list'; value: string[] }
  | { kind: 'perPlatform'; value: Record<string, string> }

/**
 * Section ids used by `SpecCatalog`. Must be kept in sync with the section
 * groups rendered by `ComparisonGrid` in Phase 3.
 */
export type SpecSection =
  | 'identity'
  | 'connectivity'
  | 'compatibility'
  | 'sticks-and-triggers'
  | 'buttons-and-feedback'
  | 'battery-physical'
  | 'software'
  | 'other'

export type SpecCatalogEntry = {
  section: SpecSection
  /**
   * When `true`, a controller that does NOT list this spec is treated as
   * "does not have this feature." Use only for binary features where 8BitDo's
   * convention is presence-in-the-table = has-it, absence = doesn't-have-it.
   */
  booleanByDefault?: boolean
  /** Sort order within the section. */
  displayOrder: number
}

export type SpecCatalog = Record<string, SpecCatalogEntry>

/**
 * One curated entry per controller, keyed by Shopify product handle in
 * `controllerSpecs.json`. Pricing and availability are joined in at runtime
 * from the live Shopify feed (see `services/shopify.ts`).
 */
export type ControllerSpecEntry = {
  shopifyHandle: string
  officialSlug: string
  name: string
  family: string
  tagline: string
  /** `_curatorNotes` is informational only; not rendered. */
  _curatorNotes?: string
  /** Open dictionary keyed by canonical spec label (see `specCatalog.ts`). */
  specs: Record<string, SpecValue>
}

/**
 * The runtime representation of a controller after Shopify pricing has been
 * merged onto a `ControllerSpecEntry`. This is what the UI consumes.
 */
export type Controller = ControllerSpecEntry & {
  id: string
  storeTitle: string
  imageUrl: string | null
  shopUrl: string
  officialUrl: string
  basePriceUSD: number | null
  compareAtPriceUSD: number | null
  onSale: boolean
  available: boolean
  /**
   * `true` when a Shopify product matches `shopifyHandle` but no spec entry
   * exists yet. Such controllers are listed in the grid with a "Specs pending"
   * badge and are excluded from comparison.
   */
  specsPending: boolean
}
