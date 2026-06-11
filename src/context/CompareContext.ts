import { createContext } from 'react'

import { COMPARE_CAP } from '../services/compare'

export type CompareContextValue = {
  selectedIds: string[]
  cap: number
  isFull: boolean
  isSelected: (id: string) => boolean
  add: (id: string) => void
  remove: (id: string) => void
  toggle: (id: string) => void
  clear: () => void
  setIds: (ids: string[]) => void
}

export const initialCompareValue: CompareContextValue = {
  selectedIds: [],
  cap: COMPARE_CAP,
  isFull: false,
  isSelected: () => false,
  add: () => {},
  remove: () => {},
  toggle: () => {},
  clear: () => {},
  setIds: () => {},
}

export const CompareContext =
  createContext<CompareContextValue>(initialCompareValue)
