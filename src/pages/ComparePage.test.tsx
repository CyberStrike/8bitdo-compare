import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { CatalogContext } from '../context/CatalogContext'
import { CompareProvider } from '../context/CompareProvider'
import { ComparePage } from './ComparePage'
import { COMPARE_STORAGE_KEY } from '../services/compare'
import type { Controller, SpecValue } from '../types/controller'

function rowVariant(label: string): string | null {
  const node = document.querySelector(`[data-row-label="${label}"]`)
  return node?.getAttribute('data-variant') ?? null
}

function controller(overrides: Partial<Controller>): Controller {
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

function renderCompare(
  controllers: Controller[],
  initialEntries: string[] = [
    '/compare?ids=' + controllers.map((c) => c.id).join(','),
  ],
) {
  const refresh = vi.fn().mockResolvedValue(undefined)
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <CatalogContext.Provider
        value={{
          controllers,
          status: 'ready',
          fetchedAt: 1000,
          fromCache: false,
          error: null,
          observedAt: 1000,
          refresh,
        }}
      >
        <CompareProvider>
          <ComparePage />
        </CompareProvider>
      </CatalogContext.Provider>
    </MemoryRouter>,
  )
}

describe('ComparePage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('renders an empty state with no ids in the URL', () => {
    renderCompare([controller({ id: 'pro-3' })], ['/compare'])
    expect(screen.getByText(/no controllers selected/i)).toBeInTheDocument()
  })

  it('renders one header card per selected controller', () => {
    renderCompare([
      controller({ id: 'pro-3', name: 'Pro 3', basePriceUSD: 69.99 }),
      controller({ id: 'lite-2', name: 'Lite 2', basePriceUSD: 24.99 }),
    ])
    expect(
      screen.getByRole('heading', { level: 2, name: 'Pro 3' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Lite 2' }),
    ).toBeInTheDocument()
  })

  it('renders an "Add controller" slot when below the cap', () => {
    renderCompare([controller({ id: 'pro-3', name: 'Pro 3' })])
    expect(
      screen.getByRole('link', { name: /add controller/i }),
    ).toBeInTheDocument()
  })

  it('omits the add slot at the cap', () => {
    renderCompare([
      controller({ id: 'a', name: 'A' }),
      controller({ id: 'b', name: 'B' }),
      controller({ id: 'c', name: 'C' }),
    ])
    expect(screen.queryByRole('link', { name: /add controller/i })).toBeNull()
  })

  it('shows a banner when URL ids reference controllers not in the catalog', () => {
    renderCompare(
      [controller({ id: 'pro-3', name: 'Pro 3' })],
      ['/compare?ids=pro-3,deleted-sku'],
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      /1 controller in your link is no longer available/i,
    )
  })

  it('classifies the price row as differ when prices differ', () => {
    renderCompare([
      controller({ id: 'pro-3', basePriceUSD: 69.99 }),
      controller({ id: 'lite-2', basePriceUSD: 24.99 }),
    ])
    expect(rowVariant('Price')).toBe('differ')
  })

  it('adds screen-reader text for differing and partial rows', () => {
    renderCompare([
      controller({
        id: 'pro-3',
        basePriceUSD: 69.99,
        specs: specs({
          'Battery Capacity': { kind: 'number', value: 1000, unit: 'mAh' },
        }),
      }),
      controller({ id: 'lite-2', basePriceUSD: 24.99, specs: {} }),
    ])
    // Price differs across the two controllers.
    expect(screen.getAllByText(/\(values differ\)/i).length).toBeGreaterThan(0)
    // Battery Capacity present on only one → partial.
    expect(
      screen.getByText(/\(only some controllers have this\)/i),
    ).toBeInTheDocument()
  })

  it('classifies the price row as equal when prices match', () => {
    renderCompare([
      controller({ id: 'a', basePriceUSD: 49.99 }),
      controller({ id: 'b', basePriceUSD: 49.99 }),
    ])
    expect(rowVariant('Price')).toBe('equal')
  })

  it('marks a spec present on only one controller as partial and renders — for the others', () => {
    renderCompare([
      controller({
        id: 'pro-3',
        specs: specs({
          'Battery Capacity': { kind: 'number', value: 1000, unit: 'mAh' },
        }),
      }),
      controller({ id: 'sn30', specs: {} }),
    ])
    expect(rowVariant('Battery Capacity')).toBe('partial')
  })

  it('marks an equal spec as equal across controllers', () => {
    renderCompare([
      controller({
        id: 'a',
        specs: specs({ Vibration: { kind: 'boolean', value: true } }),
      }),
      controller({
        id: 'b',
        specs: specs({ Vibration: { kind: 'boolean', value: true } }),
      }),
    ])
    expect(rowVariant('Vibration')).toBe('equal')
  })

  it('removing a controller via the header X drops it from the comparison', async () => {
    const user = userEvent.setup()
    renderCompare([
      controller({ id: 'pro-3', name: 'Pro 3' }),
      controller({ id: 'lite-2', name: 'Lite 2' }),
    ])
    await user.click(
      screen.getByRole('button', { name: /remove Pro 3 from comparison/i }),
    )
    expect(
      screen.queryByRole('heading', { level: 2, name: 'Pro 3' }),
    ).toBeNull()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Lite 2' }),
    ).toBeInTheDocument()
  })

  it('does NOT wipe a persisted selection when /compare is visited without ?ids=', () => {
    // Seed the same localStorage key CompareProvider lazy-inits from.
    window.localStorage.setItem(
      COMPARE_STORAGE_KEY,
      JSON.stringify({ selectedIds: ['pro-3'] }),
    )
    renderCompare([controller({ id: 'pro-3', name: 'Pro 3' })], ['/compare'])
    expect(
      screen.getByRole('heading', { level: 2, name: 'Pro 3' }),
    ).toBeInTheDocument()
  })

  it('clicking "Remove from link" prunes dead ids and clears the banner', async () => {
    const user = userEvent.setup()
    renderCompare(
      [controller({ id: 'pro-3', name: 'Pro 3' })],
      ['/compare?ids=pro-3,deleted-sku'],
    )

    const banner = screen.getByRole('status')
    expect(banner).toHaveTextContent(
      /1 controller in your link is no longer available/i,
    )

    await user.click(
      within(banner).getByRole('button', { name: /remove from link/i }),
    )

    expect(screen.queryByRole('status')).toBeNull()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Pro 3' }),
    ).toBeInTheDocument()
  })
})
