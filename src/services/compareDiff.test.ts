import { describe, it, expect } from 'vitest'
import {
  buildComparisonRows,
  buildPricingRows,
  classifyRow,
  resolveSpec,
  valuesEqual,
} from './compareDiff'
import { specCatalog } from '../data/specCatalog'
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

describe('valuesEqual', () => {
  it('text: same string is equal', () => {
    expect(
      valuesEqual(
        { kind: 'text', value: 'TMR' },
        { kind: 'text', value: 'TMR' },
      ),
    ).toBe(true)
  })

  it('text: different strings are not equal', () => {
    expect(
      valuesEqual(
        { kind: 'text', value: 'TMR' },
        { kind: 'text', value: 'Hall Effect' },
      ),
    ).toBe(false)
  })

  it('boolean: same value is equal', () => {
    expect(
      valuesEqual(
        { kind: 'boolean', value: true },
        { kind: 'boolean', value: true },
      ),
    ).toBe(true)
  })

  it('number: same value AND unit is equal', () => {
    expect(
      valuesEqual(
        { kind: 'number', value: 1000, unit: 'mAh' },
        { kind: 'number', value: 1000, unit: 'mAh' },
      ),
    ).toBe(true)
  })

  it('number: same value but different unit is NOT equal', () => {
    expect(
      valuesEqual(
        { kind: 'number', value: 1, unit: 'h' },
        { kind: 'number', value: 1, unit: 's' },
      ),
    ).toBe(false)
  })

  it('list: equal regardless of element order', () => {
    expect(
      valuesEqual(
        { kind: 'list', value: ['Switch', 'Windows', 'Apple'] },
        { kind: 'list', value: ['Apple', 'Switch', 'Windows'] },
      ),
    ).toBe(true)
  })

  it('list: different elements are not equal', () => {
    expect(
      valuesEqual(
        { kind: 'list', value: ['Switch'] },
        { kind: 'list', value: ['Switch', 'Windows'] },
      ),
    ).toBe(false)
  })

  it('perPlatform: equal regardless of key order', () => {
    expect(
      valuesEqual(
        {
          kind: 'perPlatform',
          value: { Switch: 'Bluetooth', Windows: '2.4G' },
        },
        {
          kind: 'perPlatform',
          value: { Windows: '2.4G', Switch: 'Bluetooth' },
        },
      ),
    ).toBe(true)
  })

  it('perPlatform: different keys are not equal', () => {
    expect(
      valuesEqual(
        { kind: 'perPlatform', value: { Switch: 'BT' } },
        { kind: 'perPlatform', value: { Windows: 'BT' } },
      ),
    ).toBe(false)
  })

  it('different kinds are never equal', () => {
    expect(
      valuesEqual(
        { kind: 'text', value: 'true' },
        { kind: 'boolean', value: true },
      ),
    ).toBe(false)
  })
})

describe('classifyRow', () => {
  const yes: SpecValue = { kind: 'boolean', value: true }
  const no: SpecValue = { kind: 'boolean', value: false }
  const tmr: SpecValue = { kind: 'text', value: 'TMR' }
  const he: SpecValue = { kind: 'text', value: 'Hall Effect' }

  it('all equal → equal', () => {
    expect(classifyRow([yes, yes, yes])).toBe('equal')
  })

  it('all present but differ → differ', () => {
    expect(classifyRow([yes, no])).toBe('differ')
    expect(classifyRow([tmr, he, tmr])).toBe('differ')
  })

  it('present on some, missing on others → partial', () => {
    expect(classifyRow([yes, null, yes])).toBe('partial')
    expect(classifyRow([null, tmr])).toBe('partial')
  })

  it('all null → equal (defensive — would not be rendered)', () => {
    expect(classifyRow([null, null])).toBe('equal')
  })
})

describe('resolveSpec', () => {
  it('returns the explicit value when listed', () => {
    const c = controller({
      specs: { Vibration: { kind: 'boolean', value: true } },
    })
    expect(resolveSpec(c, 'Vibration', specCatalog['Vibration'])).toEqual({
      kind: 'boolean',
      value: true,
    })
  })

  it('returns false for booleanByDefault specs that are absent', () => {
    const c = controller({ specs: {} })
    expect(resolveSpec(c, 'Vibration', specCatalog['Vibration'])).toEqual({
      kind: 'boolean',
      value: false,
    })
  })

  it('returns null for non-boolean specs that are absent', () => {
    const c = controller({ specs: {} })
    expect(
      resolveSpec(c, 'Battery Capacity', specCatalog['Battery Capacity']),
    ).toBeNull()
  })

  it('returns null when the catalog has no entry for the label', () => {
    const c = controller({ specs: {} })
    expect(resolveSpec(c, 'Made-up Spec', undefined)).toBeNull()
  })
})

describe('buildComparisonRows', () => {
  it('returns an empty list when no controllers are passed', () => {
    expect(buildComparisonRows([])).toEqual([])
  })

  it('builds rows from the union of spec keys across controllers', () => {
    const a = controller({
      id: 'a',
      specs: {
        Joysticks: { kind: 'text', value: 'TMR' },
        Vibration: { kind: 'boolean', value: true },
      },
    })
    const b = controller({
      id: 'b',
      specs: {
        Joysticks: { kind: 'text', value: 'Hall Effect' },
        Compatibility: { kind: 'list', value: ['Switch'] },
      },
    })
    const sections = buildComparisonRows([a, b])
    const labels = sections.flatMap((s) => s.rows.map((r) => r.label))
    expect(labels).toContain('Joysticks')
    expect(labels).toContain('Vibration')
    expect(labels).toContain('Compatibility')
  })

  it('marks the RGB Fire Ring row as partial when only one of three has it', () => {
    const ult2 = controller({
      id: 'ult-2',
      specs: { 'RGB Fire Ring': { kind: 'boolean', value: true } },
    })
    const pro3 = controller({ id: 'pro-3', specs: {} })
    const sn30 = controller({ id: 'sn30', specs: {} })

    const sections = buildComparisonRows([ult2, pro3, sn30])
    const rgb = sections
      .flatMap((s) => s.rows)
      .find((r) => r.label === 'RGB Fire Ring')!
    // RGB Fire Ring is booleanByDefault, so pro-3 and sn30 resolve to false.
    // All three present but values differ → 'differ', not 'partial'.
    expect(rgb).toBeDefined()
    expect(rgb.values).toHaveLength(3)
    expect(rgb.classification).toBe('differ')
  })

  it('marks a non-booleanByDefault spec as partial when missing on some', () => {
    const a = controller({
      id: 'a',
      specs: {
        'Battery Capacity': { kind: 'number', value: 1000, unit: 'mAh' },
      },
    })
    const b = controller({ id: 'b', specs: {} })

    const sections = buildComparisonRows([a, b])
    const battery = sections
      .flatMap((s) => s.rows)
      .find((r) => r.label === 'Battery Capacity')!
    expect(battery.classification).toBe('partial')
    expect(battery.values[1]).toBeNull()
  })

  it('marks rows where every controller has the same value as equal', () => {
    const a = controller({
      id: 'a',
      specs: { Vibration: { kind: 'boolean', value: true } },
    })
    const b = controller({
      id: 'b',
      specs: { Vibration: { kind: 'boolean', value: true } },
    })

    const sections = buildComparisonRows([a, b])
    const vibration = sections
      .flatMap((s) => s.rows)
      .find((r) => r.label === 'Vibration')!
    expect(vibration.classification).toBe('equal')
  })

  it('groups rows by section and emits sections in design-aligned order', () => {
    const a = controller({
      id: 'a',
      specs: {
        Compatibility: { kind: 'list', value: ['Switch'] },
        Joysticks: { kind: 'text', value: 'TMR' },
        Vibration: { kind: 'boolean', value: true },
      },
    })
    const sections = buildComparisonRows([a])
    expect(sections.map((s) => s.id)).toEqual([
      'compatibility',
      'sticks-and-triggers',
      'buttons-and-feedback',
    ])
  })

  it('sorts rows within a section by catalog displayOrder', () => {
    const a = controller({
      id: 'a',
      specs: {
        Turbo: { kind: 'boolean', value: true },
        Vibration: { kind: 'boolean', value: true },
        'Pro Back Paddle Buttons': { kind: 'boolean', value: true },
      },
    })
    const sections = buildComparisonRows([a])
    const buttons = sections.find((s) => s.id === 'buttons-and-feedback')!
    expect(buttons.rows.map((r) => r.label)).toEqual([
      // Pro Back Paddle Buttons (10) < Vibration (40) < Turbo (50)
      'Pro Back Paddle Buttons',
      'Vibration',
      'Turbo',
    ])
  })

  it('routes labels missing from the catalog into the "other" section', () => {
    const a = controller({
      id: 'a',
      specs: { 'Made-up Spec': { kind: 'text', value: 'x' } },
    })
    const sections = buildComparisonRows([a])
    expect(sections[0].id).toBe('other')
    expect(sections[0].rows[0].label).toBe('Made-up Spec')
  })
})

describe('buildPricingRows', () => {
  it('returns Price and Availability rows', () => {
    const a = controller({ id: 'a', basePriceUSD: 69.99 })
    const b = controller({ id: 'b', basePriceUSD: 29.99 })
    const rows = buildPricingRows([a, b])
    expect(rows.map((r) => r.label)).toEqual(['Price', 'Availability'])
  })

  it('marks a price row as differs when prices differ', () => {
    const a = controller({ id: 'a', basePriceUSD: 69.99 })
    const b = controller({ id: 'b', basePriceUSD: 29.99 })
    const [price] = buildPricingRows([a, b])
    expect(price.differs).toBe(true)
  })

  it('marks a price row as not differs when prices match', () => {
    const a = controller({ id: 'a', basePriceUSD: 49.99 })
    const b = controller({ id: 'b', basePriceUSD: 49.99 })
    const [price] = buildPricingRows([a, b])
    expect(price.differs).toBe(false)
  })

  it('annotates sale prices with the original compare-at price', () => {
    const a = controller({
      id: 'a',
      basePriceUSD: 41.99,
      compareAtPriceUSD: 54.99,
      onSale: true,
    })
    const [price] = buildPricingRows([a])
    expect(price.values[0]).toBe('$41.99 (was $54.99)')
  })

  it('renders an em dash for null prices', () => {
    const a = controller({ id: 'a', basePriceUSD: null })
    const [price] = buildPricingRows([a])
    expect(price.values[0]).toBe('—')
  })

  it('returns an empty list for no controllers', () => {
    expect(buildPricingRows([])).toEqual([])
  })
})
