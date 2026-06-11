import { useContext } from 'react'
import { CompareContext } from './CompareContext'

export function useCompare() {
  return useContext(CompareContext)
}
