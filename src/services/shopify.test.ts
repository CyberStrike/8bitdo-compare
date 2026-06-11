import { describe, it, expect } from 'vitest'
import {
  fetchControllerProducts,
  normaliseProduct,
  pickImageUrl,
  pickPricing,
  type ShopifyProduct,
  type ShopifyVariant,
} from './shopify'

function variant(overrides: Partial<ShopifyVariant> = {}): ShopifyVariant {
  return {
    id: 1,
    price: '0',
    compare_at_price: null,
    available: true,
    featured_image: null,
    ...overrides,
  }
}

describe('pickPricing', () => {
  it('returns the lowest available variant price', () => {
    const result = pickPricing([
      variant({ price: '69.99' }),
      variant({ price: '59.99' }),
      variant({ price: '79.99' }),
    ])
    expect(result.basePriceUSD).toBe(59.99)
    expect(result.available).toBe(true)
  })

  it('ignores unavailable variants when at least one is available', () => {
    const result = pickPricing([
      variant({ price: '19.99', available: false }),
      variant({ price: '29.99', available: true }),
      variant({ price: '39.99', available: true }),
    ])
    expect(result.basePriceUSD).toBe(29.99)
  })

  it('falls back to the lowest unavailable variant when nothing is in stock', () => {
    const result = pickPricing([
      variant({ price: '49.99', available: false }),
      variant({ price: '39.99', available: false }),
    ])
    expect(result.basePriceUSD).toBe(39.99)
    expect(result.available).toBe(false)
  })

  it('detects sale when a lower compare_at_price exists', () => {
    const result = pickPricing([
      variant({ price: '41.99', compare_at_price: '54.99' }),
    ])
    expect(result.basePriceUSD).toBe(41.99)
    expect(result.compareAtPriceUSD).toBe(54.99)
    expect(result.onSale).toBe(true)
  })

  it('does not flag onSale when compare_at_price equals or is below price', () => {
    const equal = pickPricing([
      variant({ price: '29.99', compare_at_price: '29.99' }),
    ])
    expect(equal.onSale).toBe(false)
  })

  it('returns zeroed pricing for an empty variant list', () => {
    const result = pickPricing([])
    expect(result).toEqual({
      basePriceUSD: 0,
      compareAtPriceUSD: null,
      onSale: false,
      available: false,
    })
  })
})

describe('pickImageUrl', () => {
  it('prefers the first product-level image', () => {
    const product: ShopifyProduct = {
      id: 1,
      title: 't',
      handle: 'h',
      product_type: 'Game Controllers',
      variants: [variant({ featured_image: { src: 'variant.jpg' } })],
      images: [{ src: 'product.jpg' }],
    }
    expect(pickImageUrl(product)).toBe('product.jpg')
  })

  it('falls back to a variant featured_image when no product images', () => {
    const product: ShopifyProduct = {
      id: 1,
      title: 't',
      handle: 'h',
      product_type: 'Game Controllers',
      variants: [
        variant({ featured_image: null }),
        variant({ featured_image: { src: 'variant.jpg' } }),
      ],
      images: [],
    }
    expect(pickImageUrl(product)).toBe('variant.jpg')
  })

  it('returns null when no image is available anywhere', () => {
    const product: ShopifyProduct = {
      id: 1,
      title: 't',
      handle: 'h',
      product_type: 'Game Controllers',
      variants: [variant({ featured_image: null })],
      images: [],
    }
    expect(pickImageUrl(product)).toBeNull()
  })
})

describe('normaliseProduct', () => {
  it('builds the canonical shop URL from the handle', () => {
    const product: ShopifyProduct = {
      id: 42,
      title: '8BitDo Pro 3 Bluetooth Gamepad',
      handle: '8bitdo-pro-3-bluetooth-gamepad',
      product_type: 'Game Controllers',
      variants: [variant({ price: '69.99', available: true })],
      images: [{ src: 'pro3.jpg' }],
    }
    expect(normaliseProduct(product)).toEqual({
      shopifyHandle: '8bitdo-pro-3-bluetooth-gamepad',
      storeTitle: '8BitDo Pro 3 Bluetooth Gamepad',
      imageUrl: 'pro3.jpg',
      shopUrl:
        'https://shop.8bitdo.com/products/8bitdo-pro-3-bluetooth-gamepad',
      basePriceUSD: 69.99,
      compareAtPriceUSD: null,
      onSale: false,
      available: true,
    })
  })
})

describe('fetchControllerProducts', () => {
  function jsonResponse(body: unknown): Response {
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }

  it('filters out non-controller product types', async () => {
    const fetchImpl = async () =>
      jsonResponse({
        products: [
          {
            id: 1,
            title: 'Pro 3',
            handle: 'pro-3',
            product_type: 'Game Controllers',
            variants: [variant({ price: '69.99' })],
            images: [],
          },
          {
            id: 2,
            title: 'Mod Kit',
            handle: 'mod-kit',
            product_type: '',
            variants: [variant({ price: '39.99' })],
            images: [],
          },
        ],
      })

    const products = await fetchControllerProducts({ fetchImpl })
    expect(products.map((p) => p.shopifyHandle)).toEqual(['pro-3'])
  })

  it('paginates until an empty page is returned', async () => {
    const pages = [
      Array.from({ length: 250 }, (_, i) => ({
        id: i,
        title: `c-${i}`,
        handle: `c-${i}`,
        product_type: 'Game Controllers',
        variants: [variant({ price: '10.00' })],
        images: [],
      })),
      [
        {
          id: 999,
          title: 'last',
          handle: 'last',
          product_type: 'Game Controllers',
          variants: [variant({ price: '20.00' })],
          images: [],
        },
      ],
      [],
    ]
    let calls = 0
    const fetchImpl = async () => jsonResponse({ products: pages[calls++] })

    const products = await fetchControllerProducts({
      fetchImpl,
      maxPages: 5,
    })
    expect(products).toHaveLength(251)
    expect(calls).toBe(2)
  })

  it('throws on non-OK responses', async () => {
    const fetchImpl = async () => new Response('nope', { status: 503 })
    await expect(fetchControllerProducts({ fetchImpl })).rejects.toThrow(/503/)
  })
})
