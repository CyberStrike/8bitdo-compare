import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'

import { defaultStorage } from '../services/catalog/cache'
import {
  COMPARE_CAP,
  compareReducer,
  emptyCompareState,
  readCompareState,
  writeCompareState,
} from '../services/compare'
import { CompareContext, type CompareContextValue } from './CompareContext'

type Props = {
  children: ReactNode
}

export function CompareProvider({ children }: Props) {
  // `defaultStorage()` is a stable lookup of `globalThis.localStorage`. Calling
  // it inside the lazy initializer is safe; it has no render-time side effects
  // beyond reading the persisted selection once on mount.
  const [state, dispatch] = useReducer(compareReducer, emptyCompareState, () =>
    readCompareState(defaultStorage()),
  )

  useEffect(() => {
    writeCompareState(state, defaultStorage())
  }, [state])

  const add = useCallback((id: string) => dispatch({ type: 'add', id }), [])
  const remove = useCallback(
    (id: string) => dispatch({ type: 'remove', id }),
    [],
  )
  const toggle = useCallback(
    (id: string) => dispatch({ type: 'toggle', id }),
    [],
  )
  const clear = useCallback(() => dispatch({ type: 'clear' }), [])
  const setIds = useCallback(
    (ids: string[]) => dispatch({ type: 'set', ids }),
    [],
  )

  const isSelected = useCallback(
    (id: string) => state.selectedIds.includes(id),
    [state.selectedIds],
  )

  const value = useMemo<CompareContextValue>(
    () => ({
      selectedIds: state.selectedIds,
      cap: COMPARE_CAP,
      isFull: state.selectedIds.length >= COMPARE_CAP,
      isSelected,
      add,
      remove,
      toggle,
      clear,
      setIds,
    }),
    [state.selectedIds, isSelected, add, remove, toggle, clear, setIds],
  )

  return (
    <CompareContext.Provider value={value}>{children}</CompareContext.Provider>
  )
}
