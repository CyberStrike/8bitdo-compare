/**
 * `localStorage`-backed catalog cache. Pure function surface — the storage
 * implementation is injected so tests can drive an in-memory map.
 */

import type { Controller } from '../../types/controller'

export const CACHE_KEY = 'catalog:v1'
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000

export type CachedCatalog = {
  fetchedAt: number
  controllers: Controller[]
}

/**
 * Minimal `Storage` shape we need; lets tests inject without `globalThis`.
 */
export type CatalogStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function defaultStorage(): CatalogStorage | null {
  try {
    if (typeof globalThis.localStorage === 'undefined') return null
    return globalThis.localStorage
  } catch {
    return null
  }
}

export function readCache(
  storage: CatalogStorage | null = defaultStorage(),
): CachedCatalog | null {
  if (!storage) return null
  const raw = storage.getItem(CACHE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as CachedCatalog
    if (
      typeof parsed?.fetchedAt !== 'number' ||
      !Array.isArray(parsed.controllers)
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function writeCache(
  cache: CachedCatalog,
  storage: CatalogStorage | null = defaultStorage(),
): void {
  if (!storage) return
  try {
    storage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Quota exceeded or disabled storage — non-fatal, the next load retries.
  }
}

export function isCacheStale(
  cache: CachedCatalog,
  now: number = Date.now(),
): boolean {
  return now - cache.fetchedAt > CACHE_TTL_MS
}
