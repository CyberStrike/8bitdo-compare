import { createContext } from 'react'

import type { CatalogSnapshot } from '../services/catalog'
import type { Controller } from '../types/controller'

export type CatalogContextValue = {
  controllers: Controller[]
  status: CatalogSnapshot['status'] | 'loading'
  fetchedAt: number | null
  fromCache: boolean
  error: Error | null
  observedAt: number | null
  refresh: () => Promise<void>
}

export const initialCatalogValue: CatalogContextValue = {
  controllers: [],
  status: 'loading',
  fetchedAt: null,
  fromCache: false,
  error: null,
  observedAt: null,
  refresh: async () => {},
}

export const CatalogContext =
  createContext<CatalogContextValue>(initialCatalogValue)
