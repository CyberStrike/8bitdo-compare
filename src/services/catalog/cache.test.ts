import { describe, it, expect, beforeEach } from 'vitest'
import {
  CACHE_KEY,
  CACHE_TTL_MS,
  isCacheStale,
  readCache,
  writeCache,
  type CachedCatalog,
  type CatalogStorage,
} from './cache'
import type { Controller } from '../../types/controller'

class MemoryStorage implements CatalogStorage {
  store = new Map<string, string>()
  getItem(key: string) {
    return this.store.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.store.set(key, value)
  }
  removeItem(key: string) {
    this.store.delete(key)
  }
}

class ThrowingStorage implements CatalogStorage {
  getItem() {
    return null
  }
  setItem() {
    throw new Error('quota exceeded')
  }
  removeItem() {}
}

const sampleController: Controller = {
  id: 'pro-3',
  shopifyHandle: 'pro-3',
  officialSlug: 'pro3',
  name: 'Pro 3',
  family: 'Pro',
  tagline: '',
  specs: {},
  storeTitle: '8BitDo Pro 3',
  imageUrl: null,
  shopUrl: 'https://shop.8bitdo.com/products/pro-3',
  officialUrl: 'https://www.8bitdo.com/pro3/',
  basePriceUSD: 69.99,
  compareAtPriceUSD: null,
  onSale: false,
  available: true,
  specsPending: false,
}

describe('cache layer', () => {
  let storage: MemoryStorage

  beforeEach(() => {
    storage = new MemoryStorage()
  })

  it('readCache returns null when nothing is stored', () => {
    expect(readCache(storage)).toBeNull()
  })

  it('roundtrips a catalog through writeCache/readCache', () => {
    const cache: CachedCatalog = {
      fetchedAt: 1234567890,
      controllers: [sampleController],
    }
    writeCache(cache, storage)
    expect(readCache(storage)).toEqual(cache)
  })

  it('readCache returns null for malformed JSON', () => {
    storage.setItem(CACHE_KEY, 'not json')
    expect(readCache(storage)).toBeNull()
  })

  it('readCache returns null when the persisted shape is wrong', () => {
    storage.setItem(CACHE_KEY, JSON.stringify({ wrong: 'shape' }))
    expect(readCache(storage)).toBeNull()
  })

  it('writeCache silently swallows quota errors', () => {
    expect(() =>
      writeCache({ fetchedAt: 0, controllers: [] }, new ThrowingStorage()),
    ).not.toThrow()
  })

  it('readCache returns null when storage is null', () => {
    expect(readCache(null)).toBeNull()
  })
})

describe('isCacheStale', () => {
  const cache: CachedCatalog = {
    fetchedAt: 1_000_000,
    controllers: [],
  }

  it('returns false when within the TTL', () => {
    expect(isCacheStale(cache, cache.fetchedAt + CACHE_TTL_MS - 1)).toBe(false)
  })

  it('returns true when outside the TTL', () => {
    expect(isCacheStale(cache, cache.fetchedAt + CACHE_TTL_MS + 1)).toBe(true)
  })

  it('returns false at the exact TTL boundary', () => {
    expect(isCacheStale(cache, cache.fetchedAt + CACHE_TTL_MS)).toBe(false)
  })
})
