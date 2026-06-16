import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { CatalogContext } from '../context/CatalogContext'
import { CompareProvider } from '../context/CompareProvider'
import { BrowsePage } from './BrowsePage'
import type { Controller } from '../types/controller'

function controller(overrides: Partial<Controller>): Controller {
  return {
    id: 'test',
    shopifyHandle: 'test',
    officialSlug: 'test',
    name: 'Test',
    family: 'Pro',
    tagline: 'A controller.',
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

function renderBrowse(
  controllers: Controller[],
  status: 'loading' | 'ready' | 'error' = 'ready',
) {
  const refresh = vi.fn().mockResolvedValue(undefined)
  return render(
    <MemoryRouter>
      <CatalogContext.Provider
        value={{
          controllers,
          status,
          fetchedAt: 1000,
          fromCache: false,
          error: null,
          observedAt: 1000,
          refresh,
        }}
      >
        <CompareProvider>
          <BrowsePage />
        </CompareProvider>
      </CatalogContext.Provider>
    </MemoryRouter>,
  )
}

describe('BrowsePage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('announces a busy loading state with skeletons while the catalog loads', () => {
    renderBrowse([], 'loading')
    expect(screen.getByText(/loading controllers/i)).toBeInTheDocument()
    const region = screen.getByRole('region', { name: /controllers/i })
    expect(region).toHaveAttribute('aria-busy', 'true')
  })

  it('renders one card per controller', () => {
    renderBrowse([
      controller({ id: 'pro-3', name: 'Pro 3' }),
      controller({ id: 'lite-2', name: 'Lite 2' }),
    ])
    expect(screen.getByRole('heading', { name: 'Pro 3' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Lite 2' })).toBeInTheDocument()
  })

  it('selecting two controllers shows a Compare bar with the right count', async () => {
    const user = userEvent.setup()
    renderBrowse([
      controller({ id: 'pro-3', name: 'Pro 3' }),
      controller({ id: 'lite-2', name: 'Lite 2' }),
      controller({ id: 'sn30', name: 'SN30 Pro' }),
    ])

    expect(screen.queryByRole('region', { name: /comparison/i })).toBeNull()

    const compareButtons = () =>
      screen.getAllByRole('button', { name: 'Compare', pressed: false })

    await user.click(compareButtons()[0])
    await user.click(compareButtons()[0])

    const bar = screen.getByRole('region', { name: /comparison/i })
    expect(bar).toHaveTextContent('Comparing 2/3')
    expect(
      screen.getByRole('link', { name: /Compare \(2\)/i }),
    ).toBeInTheDocument()
  })

  it('the Compare button is disabled at the cap on a fourth card', async () => {
    const user = userEvent.setup()
    renderBrowse([
      controller({ id: 'a', name: 'A' }),
      controller({ id: 'b', name: 'B' }),
      controller({ id: 'c', name: 'C' }),
      controller({ id: 'd', name: 'D' }),
    ])

    await user.click(
      screen.getAllByRole('button', { name: 'Compare', pressed: false })[0],
    )
    await user.click(
      screen.getAllByRole('button', { name: 'Compare', pressed: false })[0],
    )
    await user.click(
      screen.getAllByRole('button', { name: 'Compare', pressed: false })[0],
    )

    const capButton = screen.getByRole('button', { name: 'Cap reached' })
    expect(capButton).toBeDisabled()
  })

  it('search filter narrows the visible cards', async () => {
    const user = userEvent.setup()
    renderBrowse([
      controller({ id: 'pro-3', name: 'Pro 3', family: 'Pro' }),
      controller({ id: 'lite-2', name: 'Lite 2', family: 'Lite' }),
    ])
    const search = screen.getByRole('searchbox', {
      name: /search controllers/i,
    })
    await user.type(search, 'lite')
    expect(screen.queryByRole('heading', { name: 'Pro 3' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Lite 2' })).toBeInTheDocument()
  })

  it('shows a disabled No Specs button (and no badge) for un-curated controllers', () => {
    renderBrowse([
      controller({ id: 'pending', name: 'Mystery', specsPending: true }),
    ])
    // The "Specs pending" badge was removed; the only signal is the disabled
    // "No Specs" compare button.
    expect(screen.queryByText(/specs pending/i)).toBeNull()
    expect(screen.getByRole('button', { name: 'No Specs' })).toBeDisabled()
  })
})
