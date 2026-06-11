import { describe, it, expect } from 'vitest'
import { curatedSpecsFromRaw, mergeCatalog, mergeOne } from './merge'
import type { ControllerSpecEntry, SpecValue } from '../../types/controller'
import type { NormalisedShopifyProduct } from '../shopify'

function shopifyProduct(
  overrides: Partial<NormalisedShopifyProduct> = {},
): NormalisedShopifyProduct {
  return {
    shopifyHandle: 'test',
    storeTitle: '8BitDo Test',
    imageUrl: 'test.jpg',
    shopUrl: 'https://shop.8bitdo.com/products/test',
    basePriceUSD: 49.99,
    compareAtPriceUSD: null,
    onSale: false,
    available: true,
    ...overrides,
  }
}

function specEntry(
  overrides: Partial<ControllerSpecEntry> = {},
): ControllerSpecEntry {
  const baseSpecs: Record<string, SpecValue> = {
    Joysticks: { kind: 'text', value: 'Hall Effect' },
  }
  return {
    shopifyHandle: 'test',
    officialSlug: 'test-page',
    name: 'Test Controller',
    family: 'Pro',
    tagline: 'A controller.',
    specs: baseSpecs,
    ...overrides,
  }
}

describe('mergeOne', () => {
  it('merges shopify pricing onto a curated spec entry', () => {
    const result = mergeOne(
      shopifyProduct({
        shopifyHandle: 'pro-3',
        basePriceUSD: 69.99,
        onSale: false,
      }),
      specEntry({
        shopifyHandle: 'pro-3',
        officialSlug: 'pro3',
        name: 'Pro 3',
      }),
    )
    expect(result.id).toBe('pro-3')
    expect(result.name).toBe('Pro 3')
    expect(result.basePriceUSD).toBe(69.99)
    expect(result.officialUrl).toBe('https://www.8bitdo.com/pro3/')
    expect(result.specsPending).toBe(false)
    expect(result.specs.Joysticks).toEqual({
      kind: 'text',
      value: 'Hall Effect',
    })
  })

  it('marks specsPending: true when no curated entry is supplied', () => {
    const result = mergeOne(
      shopifyProduct({
        shopifyHandle: 'something-new',
        storeTitle: '8BitDo Something New',
      }),
      undefined,
    )
    expect(result.specsPending).toBe(true)
    expect(result.name).toBe('Something New')
    expect(result.family).toBe('Other')
    expect(result.specs).toEqual({})
  })

  it('strips the "8BitDo " prefix from the storeTitle when synthesising a name', () => {
    const result = mergeOne(
      shopifyProduct({ storeTitle: '8bitdo Lower Case Edition' }),
      undefined,
    )
    expect(result.name).toBe('Lower Case Edition')
  })

  it('keeps the storeTitle even after pulling .name from the spec', () => {
    const result = mergeOne(
      shopifyProduct({ storeTitle: '8BitDo Pro 3 Bluetooth Gamepad' }),
      specEntry({ name: 'Pro 3' }),
    )
    expect(result.name).toBe('Pro 3')
    expect(result.storeTitle).toBe('8BitDo Pro 3 Bluetooth Gamepad')
  })
})

describe('mergeCatalog', () => {
  const specs: Record<string, ControllerSpecEntry> = {
    'pro-3': specEntry({ shopifyHandle: 'pro-3', name: 'Pro 3' }),
    'lite-2': specEntry({ shopifyHandle: 'lite-2', name: 'Lite 2' }),
  }

  it('returns one Controller per Shopify product', () => {
    const products = [
      shopifyProduct({ shopifyHandle: 'pro-3' }),
      shopifyProduct({ shopifyHandle: 'lite-2' }),
    ]
    const result = mergeCatalog(products, specs)
    expect(result).toHaveLength(2)
    expect(result.every((c) => !c.specsPending)).toBe(true)
  })

  it('flags products without a spec entry as specsPending', () => {
    const products = [
      shopifyProduct({ shopifyHandle: 'pro-3' }),
      shopifyProduct({ shopifyHandle: 'mystery' }),
    ]
    const result = mergeCatalog(products, specs)
    expect(result.find((c) => c.id === 'mystery')?.specsPending).toBe(true)
    expect(result.find((c) => c.id === 'pro-3')?.specsPending).toBe(false)
  })

  it('drops curated specs that have no matching Shopify product', () => {
    const products = [shopifyProduct({ shopifyHandle: 'pro-3' })]
    const result = mergeCatalog(products, specs)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('pro-3')
  })
})

describe('curatedSpecsFromRaw', () => {
  it('skips _meta and other underscore-prefixed keys', () => {
    const raw = {
      _meta: { version: '1.0.0' },
      _internal: 'whatever',
      'pro-3': specEntry({ shopifyHandle: 'pro-3' }),
      'lite-2': specEntry({ shopifyHandle: 'lite-2' }),
    }
    const result = curatedSpecsFromRaw(raw)
    expect(Object.keys(result).sort()).toEqual(['lite-2', 'pro-3'])
  })

  it('returns an empty object when raw has only metadata', () => {
    expect(curatedSpecsFromRaw({ _meta: {} })).toEqual({})
  })
})
