/**
 * Canonical spec labels recognised by the comparison view.
 *
 * This file is the source of truth for:
 *   - which section a spec is rendered in
 *   - whether a missing spec means "no" (`booleanByDefault: true`) or
 *     "unknown / not listed by 8BitDo"
 *   - the display order within a section
 *
 * When a new spec label appears on an 8BitDo product page, add it here AND
 * add the corresponding raw-label mapping below if 8BitDo writes it
 * differently across pages (e.g. "Joysticks" vs "Joystick" vs "Stick Type").
 *
 * v1 seed — derived from the comparison tables embedded on
 *   https://www.8bitdo.com/{pro3,pro2,ultimate-2-wireless-controller,
 *   ultimate-2-bluetooth-controller,ultimate-2c-wireless-controller,
 *   ultimate-2c-wired-controller,sn30-pro-g-classic-or-sn30-pro-sn,lite2}/
 */

import type { SpecCatalog } from '../types/controller'

export const specCatalog: SpecCatalog = {
  'Color/Edition': { section: 'identity', displayOrder: 10 },
  Layout: { section: 'identity', displayOrder: 20 },

  Compatibility: { section: 'compatibility', displayOrder: 10 },

  Connectivity: { section: 'connectivity', displayOrder: 10 },
  '2.4G Adapter': { section: 'connectivity', displayOrder: 20 },
  'Polling Rate': { section: 'connectivity', displayOrder: 30 },

  Joysticks: { section: 'sticks-and-triggers', displayOrder: 10 },
  'Wear-resistant Joystick Rings': {
    section: 'sticks-and-triggers',
    booleanByDefault: true,
    displayOrder: 20,
  },
  Triggers: { section: 'sticks-and-triggers', displayOrder: 30 },
  Bumpers: { section: 'sticks-and-triggers', displayOrder: 40 },
  'Fast Bumpers (L4/R4)': {
    section: 'sticks-and-triggers',
    booleanByDefault: true,
    displayOrder: 50,
  },

  'Pro Back Paddle Buttons': {
    section: 'buttons-and-feedback',
    booleanByDefault: true,
    displayOrder: 10,
  },
  '3.5mm Audio Jack': {
    section: 'buttons-and-feedback',
    booleanByDefault: true,
    displayOrder: 20,
  },
  '6-axis Motion Control': {
    section: 'buttons-and-feedback',
    booleanByDefault: true,
    displayOrder: 30,
  },
  Vibration: {
    section: 'buttons-and-feedback',
    booleanByDefault: true,
    displayOrder: 40,
  },
  Turbo: {
    section: 'buttons-and-feedback',
    booleanByDefault: true,
    displayOrder: 50,
  },
  'Shake to wake': { section: 'buttons-and-feedback', displayOrder: 60 },
  'RGB Fire Ring': {
    section: 'buttons-and-feedback',
    booleanByDefault: true,
    displayOrder: 70,
  },

  'Charging Dock': {
    section: 'battery-physical',
    booleanByDefault: true,
    displayOrder: 10,
  },
  'Battery Capacity': { section: 'battery-physical', displayOrder: 20 },
  'Battery Life': { section: 'battery-physical', displayOrder: 30 },
  Dimensions: { section: 'battery-physical', displayOrder: 40 },
  Weight: { section: 'battery-physical', displayOrder: 50 },

  'Ultimate Software Support': { section: 'software', displayOrder: 10 },
  'Mode Switch': { section: 'software', displayOrder: 20 },
}

/**
 * 8BitDo writes the same spec slightly differently across product pages.
 * Map every raw label we've seen to the canonical key above.
 *
 * Keys are case-sensitive. When you add a new page's data, drop any unseen
 * raw labels in here so they collapse to the canonical key.
 */
export const rawLabelToCanonical: Record<string, string> = {
  'Color/Edition': 'Color/Edition',
  Layout: 'Layout',
  Compatibility: 'Compatibility',
  Connectivity: 'Connectivity',
  Triggers: 'Triggers',
  Bumpers: 'Bumpers',
  'Fast Bumpers (L4/R4)': 'Fast Bumpers (L4/R4)',
  Joysticks: 'Joysticks',
  // 8bitdo.com renders this without a space between "resistant" and "Joystick".
  'Wear-resistantJoystick Rings': 'Wear-resistant Joystick Rings',
  'Wear-resistant Joystick Rings': 'Wear-resistant Joystick Rings',
  'Polling Rate': 'Polling Rate',
  'Pro Back Paddle Buttons': 'Pro Back Paddle Buttons',
  '3.5mm Audio Jack': '3.5mm Audio Jack',
  'Charging Dock': 'Charging Dock',
  '6-axis Motion Control': '6-axis Motion Control',
  'Shake to wake': 'Shake to wake',
  Vibration: 'Vibration',
  Turbo: 'Turbo',
  'RGB Fire Ring': 'RGB Fire Ring',
  'Ultimate Software Support': 'Ultimate Software Support',
  'Battery Capacity': 'Battery Capacity',
  'Battery Life': 'Battery Life',
  '2.4G Adapter': '2.4G Adapter',
  Dimensions: 'Dimensions',
  Weight: 'Weight',
  'Mode Switch': 'Mode Switch',
}

/**
 * Normalise a raw spec label as it appears on an 8BitDo product page to its
 * canonical form. Returns `null` when the label is unrecognised — callers
 * should treat that as a curator follow-up (add the mapping here).
 */
export function normaliseSpecLabel(rawLabel: string): string | null {
  const trimmed = rawLabel.trim()
  return rawLabelToCanonical[trimmed] ?? null
}
