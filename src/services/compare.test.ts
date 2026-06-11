import { describe, it, expect } from 'vitest'
import {
  COMPARE_CAP,
  COMPARE_STORAGE_KEY,
  compareReducer,
  emptyCompareState,
  parseIdsParam,
  readCompareState,
  serialiseIdsParam,
  writeCompareState,
} from './compare'
import type { CatalogStorage } from './catalog/cache'

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

describe('compareReducer', () => {
  it('adds an id', () => {
    const result = compareReducer(emptyCompareState, { type: 'add', id: 'a' })
    expect(result.selectedIds).toEqual(['a'])
  })

  it('add is idempotent for the same id', () => {
    const first = compareReducer(emptyCompareState, { type: 'add', id: 'a' })
    const second = compareReducer(first, { type: 'add', id: 'a' })
    expect(second).toBe(first)
  })

  it('add at the cap is a no-op for a new id and returns the same instance', () => {
    let state = emptyCompareState
    state = compareReducer(state, { type: 'add', id: 'a' })
    state = compareReducer(state, { type: 'add', id: 'b' })
    state = compareReducer(state, { type: 'add', id: 'c' })
    expect(state.selectedIds).toHaveLength(COMPARE_CAP)

    const attempted = compareReducer(state, { type: 'add', id: 'd' })
    expect(attempted).toBe(state)
  })

  it('add at the cap is still idempotent for an existing id', () => {
    let state = emptyCompareState
    state = compareReducer(state, { type: 'add', id: 'a' })
    state = compareReducer(state, { type: 'add', id: 'b' })
    state = compareReducer(state, { type: 'add', id: 'c' })
    expect(compareReducer(state, { type: 'add', id: 'a' })).toBe(state)
  })

  it('remove drops the id and preserves order', () => {
    let state = emptyCompareState
    state = compareReducer(state, { type: 'add', id: 'a' })
    state = compareReducer(state, { type: 'add', id: 'b' })
    state = compareReducer(state, { type: 'add', id: 'c' })
    state = compareReducer(state, { type: 'remove', id: 'b' })
    expect(state.selectedIds).toEqual(['a', 'c'])
  })

  it('remove of an absent id is a no-op', () => {
    const state = compareReducer(emptyCompareState, { type: 'add', id: 'a' })
    expect(compareReducer(state, { type: 'remove', id: 'z' })).toBe(state)
  })

  it('toggle adds when absent, removes when present', () => {
    let state = compareReducer(emptyCompareState, { type: 'toggle', id: 'a' })
    expect(state.selectedIds).toEqual(['a'])
    state = compareReducer(state, { type: 'toggle', id: 'a' })
    expect(state.selectedIds).toEqual([])
  })

  it('toggle at cap is a no-op for a new id', () => {
    let state = emptyCompareState
    state = compareReducer(state, { type: 'toggle', id: 'a' })
    state = compareReducer(state, { type: 'toggle', id: 'b' })
    state = compareReducer(state, { type: 'toggle', id: 'c' })
    expect(compareReducer(state, { type: 'toggle', id: 'd' })).toBe(state)
  })

  it('clear resets to empty state', () => {
    let state = compareReducer(emptyCompareState, { type: 'add', id: 'a' })
    state = compareReducer(state, { type: 'clear' })
    expect(state.selectedIds).toEqual([])
  })

  it('clear on empty state returns the same instance', () => {
    expect(compareReducer(emptyCompareState, { type: 'clear' })).toBe(
      emptyCompareState,
    )
  })

  it('set caps at COMPARE_CAP and dedupes preserving order', () => {
    const result = compareReducer(emptyCompareState, {
      type: 'set',
      ids: ['a', 'b', 'a', 'c', 'd'],
    })
    expect(result.selectedIds).toEqual(['a', 'b', 'c'])
  })
})

describe('persistence', () => {
  it('reads empty state when nothing is stored', () => {
    expect(readCompareState(new MemoryStorage())).toEqual(emptyCompareState)
  })

  it('roundtrips through write/read', () => {
    const storage = new MemoryStorage()
    writeCompareState({ selectedIds: ['a', 'b'] }, storage)
    expect(readCompareState(storage).selectedIds).toEqual(['a', 'b'])
  })

  it('truncates and dedupes a persisted oversized payload on read', () => {
    const storage = new MemoryStorage()
    storage.setItem(
      COMPARE_STORAGE_KEY,
      JSON.stringify({ selectedIds: ['a', 'b', 'a', 'c', 'd', 'e'] }),
    )
    expect(readCompareState(storage).selectedIds).toEqual(['a', 'b', 'c'])
  })

  it('returns empty state for malformed JSON', () => {
    const storage = new MemoryStorage()
    storage.setItem(COMPARE_STORAGE_KEY, 'not json')
    expect(readCompareState(storage)).toEqual(emptyCompareState)
  })

  it('filters out non-string entries from a tampered payload', () => {
    const storage = new MemoryStorage()
    storage.setItem(
      COMPARE_STORAGE_KEY,
      JSON.stringify({ selectedIds: ['a', 42, null, 'b', { id: 'c' }] }),
    )
    expect(readCompareState(storage).selectedIds).toEqual(['a', 'b'])
  })

  it('handles null storage', () => {
    expect(readCompareState(null)).toEqual(emptyCompareState)
    expect(() => writeCompareState({ selectedIds: ['a'] }, null)).not.toThrow()
  })
})

describe('URL ids param', () => {
  it('parses empty / null', () => {
    expect(parseIdsParam(null)).toEqual([])
    expect(parseIdsParam('')).toEqual([])
  })

  it('parses, trims, dedupes, and caps', () => {
    expect(parseIdsParam(' a , b ,a, c ,d')).toEqual(['a', 'b', 'c'])
  })

  it('serialises back to comma-joined', () => {
    expect(serialiseIdsParam(['a', 'b', 'c'])).toBe('a,b,c')
  })
})
