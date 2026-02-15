import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { FilterOptionGroup, UPPER_BODY_AREAS, LOWER_BODY_AREAS } from '@/types'
import { getGroupedFilterOptions } from '../utils/filter-options'
import { useAuth } from './AuthContext'

interface FilterOptionsContextType {
  bodyParts: FilterOptionGroup[]
  upperBodyParts: readonly string[]
  lowerBodyParts: readonly string[]
  loading: boolean
  refreshFilterOptions: () => Promise<void>
}

const FilterOptionsContext = createContext<FilterOptionsContextType | undefined>(undefined)

export function FilterOptionsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [bodyParts, setBodyParts] = useState<FilterOptionGroup[]>([])
  const [upperBodyParts, setUpperBodyParts] = useState<readonly string[]>(UPPER_BODY_AREAS)
  const [lowerBodyParts, setLowerBodyParts] = useState<readonly string[]>(LOWER_BODY_AREAS)
  const [loading, setLoading] = useState(true)

  const loadFilterOptions = useCallback(async () => {
    try {
      setLoading(true)
      const groups = await getGroupedFilterOptions('body_part')

      if (groups.length > 0) {
        setBodyParts(groups)

        // Build flat arrays for drop-in replacement of constants
        const upper = groups.find(g => g.group_name === 'Upper Body')
        const lower = groups.find(g => g.group_name === 'Lower Body')

        setUpperBodyParts(upper ? upper.options.map(o => o.value) : [...UPPER_BODY_AREAS])
        setLowerBodyParts(lower ? lower.options.map(o => o.value) : [...LOWER_BODY_AREAS])
      }
      // If no groups returned, keep hardcoded defaults (already set as initial state)
    } catch (error) {
      console.error('Error loading filter options:', error)
      // Keep hardcoded defaults on error
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) {
      loadFilterOptions()
    } else {
      setLoading(false)
    }
  }, [user, loadFilterOptions])

  const refreshFilterOptions = useCallback(async () => {
    await loadFilterOptions()
  }, [loadFilterOptions])

  return (
    <FilterOptionsContext.Provider
      value={{
        bodyParts,
        upperBodyParts,
        lowerBodyParts,
        loading,
        refreshFilterOptions,
      }}
    >
      {children}
    </FilterOptionsContext.Provider>
  )
}

export function useFilterOptions(): FilterOptionsContextType {
  const context = useContext(FilterOptionsContext)
  if (context === undefined) {
    throw new Error('useFilterOptions must be used within a FilterOptionsProvider')
  }
  return context
}
