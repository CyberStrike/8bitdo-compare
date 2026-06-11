import { useContext } from 'react'
import { CatalogContext } from './CatalogContext'

export function useCatalog() {
  return useContext(CatalogContext)
}
