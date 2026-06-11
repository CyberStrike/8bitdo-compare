import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import {
  loadCatalog,
  loadCatalogSWR,
  type CatalogSnapshot,
} from '../services/catalog'
import {
  CatalogContext,
  initialCatalogValue,
  type CatalogContextValue,
} from './CatalogContext'

type Props = {
  children: ReactNode
}

export function CatalogProvider({ children }: Props) {
  const [snapshot, setSnapshot] = useState<CatalogSnapshot | null>(null)
  const [observedAt, setObservedAt] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      for await (const next of loadCatalogSWR()) {
        if (cancelled) return
        setSnapshot(next)
        setObservedAt(Date.now())
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const refresh = useCallback(async () => {
    const next = await loadCatalog()
    setSnapshot(next)
    setObservedAt(Date.now())
  }, [])

  const value = useMemo<CatalogContextValue>(
    () =>
      snapshot
        ? {
            controllers: snapshot.controllers,
            status: snapshot.status,
            fetchedAt: snapshot.fetchedAt,
            fromCache: snapshot.fromCache,
            error: snapshot.error,
            observedAt,
            refresh,
          }
        : { ...initialCatalogValue, refresh },
    [snapshot, observedAt, refresh],
  )

  return (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  )
}
