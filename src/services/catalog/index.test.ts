import { describe, it, expect, beforeEach } from 'vitest'
import { loadCatalog, loadCatalogSWR } from './index'
import { CACHE_TTL_MS, type CatalogStorage } from './cache'

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

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function emptyShopify(): typeof fetch {
  return (async () => jsonResponse({ products: [] })) as unknown as typeof fetch
}

function failingShopify(): typeof fetch {
  return (async () => {
    throw new Error('network down')
  }) as unknown as typeof fetch
}

describe('loadCatalog', () => {
  let storage: MemoryStorage
  beforeEach(() => {
    storage = new MemoryStorage()
  })

  it('returns a fresh snapshot when the fetch succeeds', async () => {
    const snapshot = await loadCatalog({
      fetchImpl: emptyShopify(),
      storage,
      now: () => 42,
    })
    expect(snapshot.status).toBe('ready')
    expect(snapshot.fromCache).toBe(false)
    expect(snapshot.error).toBeNull()
    expect(snapshot.fetchedAt).toBe(42)
    expect(snapshot.controllers).toEqual([])
  })

  it('persists the result to storage on success', async () => {
    await loadCatalog({
      fetchImpl: emptyShopify(),
      storage,
      now: () => 7,
    })
    const cached = JSON.parse(storage.getItem('catalog:v1')!)
    expect(cached.fetchedAt).toBe(7)
    expect(cached.controllers).toEqual([])
  })

  it('falls back to cache + error status when the fetch fails', async () => {
    storage.setItem(
      'catalog:v1',
      JSON.stringify({ fetchedAt: 100, controllers: [] }),
    )
    const snapshot = await loadCatalog({
      fetchImpl: failingShopify(),
      storage,
    })
    expect(snapshot.status).toBe('error')
    expect(snapshot.fromCache).toBe(true)
    expect(snapshot.error).toBeInstanceOf(Error)
    expect(snapshot.fetchedAt).toBe(100)
  })

  it('falls back to bundled fallbackCatalog when fetch fails AND cache is empty', async () => {
    const snapshot = await loadCatalog({
      fetchImpl: failingShopify(),
      storage,
    })
    expect(snapshot.status).toBe('error')
    expect(snapshot.fromCache).toBe(true)
    // The committed fallbackCatalog is non-empty, so we just assert it is.
    expect(snapshot.controllers.length).toBeGreaterThan(0)
  })
})

async function collect<T>(it: AsyncGenerator<T>): Promise<T[]> {
  const out: T[] = []
  for await (const value of it) out.push(value)
  return out
}

describe('loadCatalogSWR', () => {
  let storage: MemoryStorage
  beforeEach(() => {
    storage = new MemoryStorage()
  })

  it('yields fallback first, then a fresh fetch when there is no cache', async () => {
    const snapshots = await collect(
      loadCatalogSWR({
        fetchImpl: emptyShopify(),
        storage,
        now: () => 1000,
      }),
    )
    expect(snapshots).toHaveLength(2)
    expect(snapshots[0].fromCache).toBe(true)
    expect(snapshots[1].fromCache).toBe(false)
    expect(snapshots[1].fetchedAt).toBe(1000)
  })

  it('yields the cache and skips revalidation when the cache is fresh', async () => {
    const now = 5_000_000
    storage.setItem(
      'catalog:v1',
      JSON.stringify({ fetchedAt: now, controllers: [] }),
    )
    const snapshots = await collect(
      loadCatalogSWR({
        fetchImpl: emptyShopify(),
        storage,
        now: () => now + 1000,
      }),
    )
    expect(snapshots).toHaveLength(1)
    expect(snapshots[0].fromCache).toBe(true)
  })

  it('revalidates when the cache is stale', async () => {
    const now = 10_000_000
    storage.setItem(
      'catalog:v1',
      JSON.stringify({
        fetchedAt: now - CACHE_TTL_MS - 1,
        controllers: [],
      }),
    )
    const snapshots = await collect(
      loadCatalogSWR({
        fetchImpl: emptyShopify(),
        storage,
        now: () => now,
      }),
    )
    expect(snapshots).toHaveLength(2)
    expect(snapshots[0].fromCache).toBe(true)
    expect(snapshots[1].fromCache).toBe(false)
  })
})
