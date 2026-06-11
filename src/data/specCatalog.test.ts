import { describe, it, expect } from 'vitest'
import {
  normaliseSpecLabel,
  rawLabelToCanonical,
  specCatalog,
} from './specCatalog'

describe('normaliseSpecLabel', () => {
  it('returns the canonical form for an exact match', () => {
    expect(normaliseSpecLabel('Joysticks')).toBe('Joysticks')
  })

  it('collapses the no-space variant to the canonical "Wear-resistant Joystick Rings"', () => {
    expect(normaliseSpecLabel('Wear-resistantJoystick Rings')).toBe(
      'Wear-resistant Joystick Rings',
    )
    expect(normaliseSpecLabel('Wear-resistant Joystick Rings')).toBe(
      'Wear-resistant Joystick Rings',
    )
  })

  it('trims whitespace before lookup', () => {
    expect(normaliseSpecLabel('  Joysticks  ')).toBe('Joysticks')
  })

  it('returns null for unknown labels (curator follow-up signal)', () => {
    expect(normaliseSpecLabel('Made-up Spec')).toBeNull()
  })
})

describe('specCatalog', () => {
  it('has every canonical label assigned to a real section', () => {
    const validSections = new Set([
      'identity',
      'connectivity',
      'compatibility',
      'sticks-and-triggers',
      'buttons-and-feedback',
      'battery-physical',
      'software',
      'other',
    ])
    for (const [label, entry] of Object.entries(specCatalog)) {
      expect(
        validSections.has(entry.section),
        `${label} → ${entry.section}`,
      ).toBe(true)
    }
  })

  it('every value in rawLabelToCanonical points at a key in specCatalog', () => {
    for (const [raw, canonical] of Object.entries(rawLabelToCanonical)) {
      expect(
        canonical in specCatalog,
        `${raw} → ${canonical} not in specCatalog`,
      ).toBe(true)
    }
  })

  it('every canonical key is itself a valid raw label that maps to itself', () => {
    for (const canonical of Object.keys(specCatalog)) {
      expect(
        rawLabelToCanonical[canonical],
        `${canonical} missing from rawLabelToCanonical`,
      ).toBe(canonical)
    }
  })
})
