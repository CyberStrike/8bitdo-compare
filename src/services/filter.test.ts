import { describe, it, expect } from 'vitest'
import {
  applyFilters,
  buildFilterPredicate,
  emptyFilters,
  type FilterState,
} from './filter'
import type { Controller, SpecValue } from '../types/controller'

function controller(overrides: Partial<Controller> = {}): Controller {
  return {
    id: 'test',
    shopifyHandle: 'test',
    officialSlug: 'test',
    name: 'Test',
    family: 'Pro',
    tagline: '',
    specs: {},
    storeTitle: '8BitDo Test',
    imageUrl: null,
    shopUrl: 'https://shop.8bitdo.com/products/test',
    officialUrl: 'https://www.8bitdo.com/test/',
    basePriceUSD: 49.99,
    compareAtPriceUSD: null,
    onSale: false,
    available: true,
    specsPending: false,
    ...overrides,
  }
}

function specs(input: Record<string, SpecValue>): Record<string, SpecValue> {
  return input
}

describe('emptyFilters', () => {
  it('matches every controller when applied unchanged', () => {
    const controllers = [controller(), controller({ id: 'a' })]
    expect(applyFilters(controllers, emptyFilters)).toHaveLength(2)
  })
})

describe('platform filter', () => {
  const switchPro = controller({
    id: 'pro-3',
    specs: specs({
      Compatibility: {
        kind: 'list',
        value: ['Switch 1', 'Switch 2', 'Windows', 'Apple'],
      },
    }),
  })
  const ultimateWireless = controller({
    id: 'ult-2-wireless',
    specs: specs({
      Compatibility: {
        kind: 'list',
        value: ['Windows', 'Apple', 'Android', 'SteamOS'],
      },
    }),
  })
  const ultimateBT = controller({
    id: 'ult-2-bt',
    specs: specs({
      Compatibility: {
        kind: 'list',
        value: ['Switch 1', 'Switch 2', 'Windows'],
      },
    }),
  })

  function matches(filters: Partial<FilterState>): string[] {
    return applyFilters([switchPro, ultimateWireless, ultimateBT], {
      ...emptyFilters,
      ...filters,
    }).map((c) => c.id)
  }

  it('Switch matches both Switch 1 and Switch 2 labels', () => {
    expect(matches({ platforms: ['Switch'] })).toEqual(['pro-3', 'ult-2-bt'])
  })

  it('Mac/Apple matches the Apple umbrella', () => {
    expect(matches({ platforms: ['Mac/Apple'] })).toEqual([
      'pro-3',
      'ult-2-wireless',
    ])
  })

  it('multiple platforms is an AND — controller must support all', () => {
    expect(matches({ platforms: ['Switch', 'Mac/Apple'] })).toEqual(['pro-3'])
    expect(matches({ platforms: ['Switch', 'Windows', 'Mac/Apple'] })).toEqual([
      'pro-3',
    ])
  })

  it('controllers with no Compatibility spec are excluded when any platform is selected', () => {
    const noSpec = controller({ id: 'pending', specs: {}, specsPending: true })
    const result = applyFilters([noSpec, switchPro], {
      ...emptyFilters,
      platforms: ['Switch'],
    })
    expect(result.map((c) => c.id)).toEqual(['pro-3'])
  })
})

describe('connectivity filter', () => {
  const proPerPlatform = controller({
    id: 'pro-3',
    specs: specs({
      Connectivity: {
        kind: 'perPlatform',
        value: {
          Switch: 'Bluetooth, 2.4G, Wired',
          Windows: '2.4G, Wired',
        },
      },
    }),
  })
  const pro2Text = controller({
    id: 'pro-2',
    specs: specs({
      Connectivity: { kind: 'text', value: 'Bluetooth, Wired' },
    }),
  })

  function matches(buckets: ('Bluetooth' | '2.4G' | 'Wired')[]): string[] {
    return applyFilters([proPerPlatform, pro2Text], {
      ...emptyFilters,
      connectivity: buckets,
    }).map((c) => c.id)
  }

  it('Bluetooth matches both per-platform and text-shape Connectivity', () => {
    expect(matches(['Bluetooth'])).toEqual(['pro-3', 'pro-2'])
  })

  it('2.4G is only on the per-platform controller', () => {
    expect(matches(['2.4G'])).toEqual(['pro-3'])
  })

  it('multiple buckets is an AND', () => {
    expect(matches(['Bluetooth', '2.4G'])).toEqual(['pro-3'])
  })
})

describe('joystick filter', () => {
  const tmrController = controller({
    id: 'tmr',
    specs: specs({ Joysticks: { kind: 'text', value: 'TMR (12-bit ADC)' } }),
  })
  const heController = controller({
    id: 'he',
    specs: specs({ Joysticks: { kind: 'text', value: 'Hall Effect' } }),
  })
  const stdController = controller({
    id: 'std',
    specs: specs({
      Joysticks: { kind: 'text', value: 'Standard mini joysticks' },
    }),
  })

  function matches(buckets: ('TMR' | 'Hall Effect' | 'Standard')[]): string[] {
    return applyFilters([tmrController, heController, stdController], {
      ...emptyFilters,
      joysticks: buckets,
    }).map((c) => c.id)
  }

  it('TMR matches only TMR (not "Standard ... rotor" false positives)', () => {
    expect(matches(['TMR'])).toEqual(['tmr'])
  })

  it('Hall Effect matches only Hall Effect', () => {
    expect(matches(['Hall Effect'])).toEqual(['he'])
  })

  it('Standard matches everything that is not TMR or Hall Effect', () => {
    expect(matches(['Standard'])).toEqual(['std'])
  })

  it('multiple bucket selection is an OR (e.g. TMR or Hall Effect)', () => {
    expect(matches(['TMR', 'Hall Effect'])).toEqual(['tmr', 'he'])
  })
})

describe('price filter', () => {
  const cheap = controller({ id: 'cheap', basePriceUSD: 19.99 })
  const mid = controller({ id: 'mid', basePriceUSD: 49.99 })
  const expensive = controller({ id: 'expensive', basePriceUSD: 69.99 })

  it('respects min only', () => {
    const result = applyFilters([cheap, mid, expensive], {
      ...emptyFilters,
      priceRange: { min: 30, max: null },
    })
    expect(result.map((c) => c.id)).toEqual(['mid', 'expensive'])
  })

  it('respects max only', () => {
    const result = applyFilters([cheap, mid, expensive], {
      ...emptyFilters,
      priceRange: { min: null, max: 50 },
    })
    expect(result.map((c) => c.id)).toEqual(['cheap', 'mid'])
  })

  it('respects both bounds inclusively', () => {
    const result = applyFilters([cheap, mid, expensive], {
      ...emptyFilters,
      priceRange: { min: 49.99, max: 49.99 },
    })
    expect(result.map((c) => c.id)).toEqual(['mid'])
  })
})

describe('sale filter', () => {
  it('onSaleOnly excludes non-sale controllers', () => {
    const controllers = [
      controller({ id: 'sale', onSale: true }),
      controller({ id: 'full', onSale: false }),
    ]
    const result = applyFilters(controllers, {
      ...emptyFilters,
      onSaleOnly: true,
    })
    expect(result.map((c) => c.id)).toEqual(['sale'])
  })
})

describe('search filter', () => {
  it('matches case-insensitively against name', () => {
    const result = applyFilters(
      [
        controller({ id: 'pro-3', name: 'Pro 3', family: 'Pro' }),
        controller({
          id: 'lite',
          name: 'Lite 2',
          family: 'Lite',
          storeTitle: '8BitDo Lite 2',
        }),
      ],
      { ...emptyFilters, search: 'PRO' },
    )
    expect(result.map((c) => c.id)).toEqual(['pro-3'])
  })

  it('matches against family and tagline', () => {
    const ultimate = controller({
      id: 'u',
      family: 'Ultimate',
      tagline: 'Xbox-layout flagship',
    })
    expect(
      applyFilters([ultimate], { ...emptyFilters, search: 'xbox' }),
    ).toHaveLength(1)
    expect(
      applyFilters([ultimate], { ...emptyFilters, search: 'ultimate' }),
    ).toHaveLength(1)
  })

  it('whitespace-only search behaves like empty', () => {
    const c = controller()
    expect(applyFilters([c], { ...emptyFilters, search: '   ' })).toHaveLength(
      1,
    )
  })
})

describe('hideSpecsPending', () => {
  it('excludes specsPending controllers when set', () => {
    const result = applyFilters(
      [
        controller({ id: 'curated' }),
        controller({ id: 'pending', specsPending: true }),
      ],
      { ...emptyFilters, hideSpecsPending: true },
    )
    expect(result.map((c) => c.id)).toEqual(['curated'])
  })
})

describe('combined filters', () => {
  it('AND-combines independent dimensions', () => {
    const a = controller({
      id: 'a',
      basePriceUSD: 69.99,
      onSale: true,
      specs: specs({
        Compatibility: { kind: 'list', value: ['Switch 1'] },
        Joysticks: { kind: 'text', value: 'TMR' },
      }),
    })
    const b = controller({
      id: 'b',
      basePriceUSD: 19.99,
      onSale: true,
      specs: specs({
        Compatibility: { kind: 'list', value: ['Switch 1'] },
        Joysticks: { kind: 'text', value: 'TMR' },
      }),
    })
    const result = applyFilters([a, b], {
      ...emptyFilters,
      platforms: ['Switch'],
      joysticks: ['TMR'],
      onSaleOnly: true,
      priceRange: { min: 50, max: null },
    })
    expect(result.map((c) => c.id)).toEqual(['a'])
  })
})

describe('buildFilterPredicate', () => {
  it('returns a callable predicate', () => {
    const pred = buildFilterPredicate(emptyFilters)
    expect(pred(controller())).toBe(true)
  })
})
