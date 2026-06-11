/**
 * Compare-selection state. Lives outside the React tree so the reducer is
 * trivially testable, and so the cap (3) is enforced consistently — URL
 * parser, reducer, and UI all delegate to the same `addId` / `cap` here.
 */

import type { CatalogStorage } from './catalog/cache'

export const COMPARE_CAP = 3
export const COMPARE_STORAGE_KEY = 'compare:v1'

export type CompareState = {
  selectedIds: string[]
}

export const emptyCompareState: CompareState = { selectedIds: [] }

export type CompareAction =
  | { type: 'add'; id: string }
  | { type: 'remove'; id: string }
  | { type: 'toggle'; id: string }
  | { type: 'clear' }
  | { type: 'set'; ids: string[] }

/**
 * Adds `id` to `selectedIds` if not already present and the cap isn't
 * reached. Returns the same state instance when nothing changes so the
 * reducer's identity check works in React effects.
 */
function addId(state: CompareState, id: string): CompareState {
  if (state.selectedIds.includes(id)) return state
  if (state.selectedIds.length >= COMPARE_CAP) return state
  return { selectedIds: [...state.selectedIds, id] }
}

function removeId(state: CompareState, id: string): CompareState {
  if (!state.selectedIds.includes(id)) return state
  return { selectedIds: state.selectedIds.filter((x) => x !== id) }
}

export function compareReducer(
  state: CompareState,
  action: CompareAction,
): CompareState {
  switch (action.type) {
    case 'add':
      return addId(state, action.id)
    case 'remove':
      return removeId(state, action.id)
    case 'toggle':
      return state.selectedIds.includes(action.id)
        ? removeId(state, action.id)
        : addId(state, action.id)
    case 'clear':
      return state.selectedIds.length === 0 ? state : emptyCompareState
    case 'set': {
      // Dedupe FIRST (preserving order), then cap. Doing it in the other
      // order silently drops valid ids when the input has duplicates near
      // the front (e.g. ['a','b','a','c'] would be capped to ['a','b','a']
      // and then deduped down to ['a','b'] — wrong).
      const seen = new Set<string>()
      const deduped: string[] = []
      for (const id of action.ids) {
        if (seen.has(id)) continue
        seen.add(id)
        deduped.push(id)
      }
      return { selectedIds: deduped.slice(0, COMPARE_CAP) }
    }
  }
}

/* ---------------------------- persistence ----------------------------- */

export function readCompareState(storage: CatalogStorage | null): CompareState {
  if (!storage) return emptyCompareState
  const raw = storage.getItem(COMPARE_STORAGE_KEY)
  if (!raw) return emptyCompareState
  try {
    const parsed = JSON.parse(raw) as { selectedIds?: unknown }
    if (!Array.isArray(parsed?.selectedIds)) return emptyCompareState
    // Filter out any non-string entries — a tampered or schema-drifted
    // payload mustn't leak non-string ids into the reducer or into URL
    // serialisation (a number id would round-trip as e.g. "42" silently).
    const ids = parsed.selectedIds.filter(
      (id): id is string => typeof id === 'string',
    )
    return compareReducer(emptyCompareState, { type: 'set', ids })
  } catch {
    return emptyCompareState
  }
}

export function writeCompareState(
  state: CompareState,
  storage: CatalogStorage | null,
): void {
  if (!storage) return
  try {
    storage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Quota exceeded — non-fatal, the next render will retry.
  }
}

/**
 * Parse comparison ids from a `?ids=a,b,c` query string. Caps and dedupes
 * via the same reducer logic the UI uses.
 */
export function parseIdsParam(raw: string | null): string[] {
  if (!raw) return []
  const ids = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return compareReducer(emptyCompareState, { type: 'set', ids }).selectedIds
}

export function serialiseIdsParam(ids: string[]): string {
  return ids.join(',')
}
