/**
 * Pure merge between Shopify pricing and curated specs. Has no side effects
 * and no module-load dependencies — safe to import from build-time scripts
 * and from the runtime cache layer alike.
 */

import type { Controller, ControllerSpecEntry } from '../../types/controller'
import type { NormalisedShopifyProduct } from '../shopify'

const OFFICIAL_BASE_URL = 'https://www.8bitdo.com/'

/**
 * Merge a single Shopify product onto its curated spec entry (if any) into
 * the runtime `Controller` shape the UI consumes. When no spec entry exists,
 * the controller comes back with `specsPending: true` so the grid can mark
 * it and the comparison view can exclude it.
 */
export function mergeOne(
  shopify: NormalisedShopifyProduct,
  spec: ControllerSpecEntry | undefined,
): Controller {
  if (spec) {
    return {
      ...spec,
      id: spec.shopifyHandle,
      storeTitle: shopify.storeTitle,
      imageUrl: shopify.imageUrl,
      shopUrl: shopify.shopUrl,
      officialUrl: `${OFFICIAL_BASE_URL}${spec.officialSlug}/`,
      basePriceUSD: shopify.basePriceUSD,
      compareAtPriceUSD: shopify.compareAtPriceUSD,
      onSale: shopify.onSale,
      available: shopify.available,
      specsPending: false,
    }
  }
  return {
    id: shopify.shopifyHandle,
    shopifyHandle: shopify.shopifyHandle,
    officialSlug: shopify.shopifyHandle,
    name: shopify.storeTitle.replace(/^8BitDo\s+/i, ''),
    family: 'Other',
    tagline: '',
    specs: {},
    storeTitle: shopify.storeTitle,
    imageUrl: shopify.imageUrl,
    shopUrl: shopify.shopUrl,
    officialUrl: `${OFFICIAL_BASE_URL}${shopify.shopifyHandle}/`,
    basePriceUSD: shopify.basePriceUSD,
    compareAtPriceUSD: shopify.compareAtPriceUSD,
    onSale: shopify.onSale,
    available: shopify.available,
    specsPending: true,
  }
}

/**
 * Merge a list of Shopify products with a curated spec map. Curated entries
 * with no matching Shopify product are dropped — the live store is the
 * source of truth for what's currently sold.
 */
export function mergeCatalog(
  shopifyProducts: NormalisedShopifyProduct[],
  specs: Record<string, ControllerSpecEntry>,
): Controller[] {
  return shopifyProducts.map((p) => mergeOne(p, specs[p.shopifyHandle]))
}

/**
 * Helper that strips the `_meta` key from `controllerSpecs.json` and returns
 * the per-handle map of `ControllerSpecEntry` values.
 */
export function curatedSpecsFromRaw(
  raw: Record<string, unknown>,
): Record<string, ControllerSpecEntry> {
  const out: Record<string, ControllerSpecEntry> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (key.startsWith('_')) continue
    out[key] = value as ControllerSpecEntry
  }
  return out
}
