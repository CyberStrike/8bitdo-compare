/**
 * Fetches the public Shopify storefront feed for shop.8bitdo.com and
 * normalises the subset of fields the comparison view needs.
 *
 * The endpoint is `/<collection>/products.json?limit=...&page=...` and is
 * available without auth or CORS preflight on shop.8bitdo.com (verified
 * during planning). If 8BitDo ever locks it down, swap the `BASE_URL` to a
 * thin server-side proxy — nothing else in the codebase touches Shopify.
 */

const BASE_URL =
  'https://shop.8bitdo.com/collections/all-products/products.json'
const PAGE_SIZE = 250
const CONTROLLER_PRODUCT_TYPE = 'Game Controllers'
const SHOP_PRODUCT_PATH = 'https://shop.8bitdo.com/products/'

/**
 * The raw shape of a Shopify product as returned by /products.json. We type
 * only the fields we read; everything else stays `unknown`.
 */
export type ShopifyProduct = {
  id: number
  title: string
  handle: string
  product_type: string
  variants: ShopifyVariant[]
  images: Array<{ src: string }>
}

export type ShopifyVariant = {
  id: number
  price: string
  compare_at_price: string | null
  available: boolean
  featured_image: { src: string } | null
}

/**
 * The normalised projection of a Shopify product that we actually care about.
 * Pricing fields are USD numbers, not the raw string-formatted variant prices.
 */
export type NormalisedShopifyProduct = {
  shopifyHandle: string
  storeTitle: string
  imageUrl: string | null
  shopUrl: string
  basePriceUSD: number
  compareAtPriceUSD: number | null
  onSale: boolean
  available: boolean
}

/**
 * Pick the price the comparison view should display for a product.
 *
 * Rules (matching what the store card shows for "From $X" multi-variant
 * products):
 *   - Prefer the lowest available variant's price.
 *   - If no variant is `available`, fall back to the lowest price across all
 *     variants so the product still has a number for sorting/filtering.
 *   - `compareAtPriceUSD` is the lowest non-null compare_at_price among the
 *     same set of variants used for `basePriceUSD`. The product is `onSale`
 *     when the compare-at value is strictly greater than the chosen price.
 *
 * Exposed for testing.
 */
export function pickPricing(variants: ShopifyVariant[]): {
  basePriceUSD: number
  compareAtPriceUSD: number | null
  onSale: boolean
  available: boolean
} {
  if (variants.length === 0) {
    return {
      basePriceUSD: 0,
      compareAtPriceUSD: null,
      onSale: false,
      available: false,
    }
  }

  const availableVariants = variants.filter((v) => v.available)
  const considered = availableVariants.length > 0 ? availableVariants : variants

  let basePriceUSD = Number.POSITIVE_INFINITY
  let compareAtPriceUSD: number | null = null

  for (const variant of considered) {
    const price = parseFloat(variant.price)
    if (Number.isFinite(price) && price < basePriceUSD) {
      basePriceUSD = price
    }
    if (variant.compare_at_price !== null) {
      const compare = parseFloat(variant.compare_at_price)
      if (
        Number.isFinite(compare) &&
        (compareAtPriceUSD === null || compare < compareAtPriceUSD)
      ) {
        compareAtPriceUSD = compare
      }
    }
  }

  if (!Number.isFinite(basePriceUSD)) {
    basePriceUSD = 0
  }

  const onSale = compareAtPriceUSD !== null && compareAtPriceUSD > basePriceUSD

  return {
    basePriceUSD,
    compareAtPriceUSD,
    onSale,
    available: availableVariants.length > 0,
  }
}

/**
 * Pick a product image — prefers the first product-level image, falls back
 * to the first variant's featured_image, returns null if neither exists.
 *
 * Exposed for testing.
 */
export function pickImageUrl(product: ShopifyProduct): string | null {
  const firstImage = product.images?.[0]?.src
  if (firstImage) return firstImage
  for (const variant of product.variants ?? []) {
    if (variant.featured_image?.src) return variant.featured_image.src
  }
  return null
}

export function normaliseProduct(
  product: ShopifyProduct,
): NormalisedShopifyProduct {
  return {
    shopifyHandle: product.handle,
    storeTitle: product.title,
    imageUrl: pickImageUrl(product),
    shopUrl: `${SHOP_PRODUCT_PATH}${product.handle}`,
    ...pickPricing(product.variants ?? []),
  }
}

/**
 * Optional dependency injection for the fetcher — overrides the global
 * `fetch` and lets tests stub the Shopify response without globalThis games.
 */
export type FetchControllerProductsOptions = {
  fetchImpl?: typeof fetch
  /** Caps the page loop so a misconfigured endpoint can't run forever. */
  maxPages?: number
}

/**
 * Pages through `/products.json` until an empty page comes back, filters to
 * Game Controllers only, and returns the normalised projection.
 */
export async function fetchControllerProducts(
  options: FetchControllerProductsOptions = {},
): Promise<NormalisedShopifyProduct[]> {
  const fetchImpl = options.fetchImpl ?? fetch
  const maxPages = options.maxPages ?? 10
  const out: NormalisedShopifyProduct[] = []

  for (let page = 1; page <= maxPages; page++) {
    const url = `${BASE_URL}?limit=${PAGE_SIZE}&page=${page}`
    const response = await fetchImpl(url)
    if (!response.ok) {
      throw new Error(
        `Shopify products.json page ${page} responded ${response.status}`,
      )
    }
    const body = (await response.json()) as { products?: ShopifyProduct[] }
    const products = body.products ?? []
    if (products.length === 0) break

    for (const product of products) {
      if (product.product_type !== CONTROLLER_PRODUCT_TYPE) continue
      out.push(normaliseProduct(product))
    }

    if (products.length < PAGE_SIZE) break
  }

  return out
}
