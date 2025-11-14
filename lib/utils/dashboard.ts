import { supabase } from '../supabase/client'
import { DailyProgress, Routine, RoutineCategory, UserStats, JourneyFocus, FitnessLevel } from '@/types'
import { format } from 'date-fns'
import { recordActivity } from './social'
import { updateEnhancedStats } from './stats'

export async function getTodayProgress(userId: string): Promise<DailyProgress | null> {
  // Use UTC date to match database (CURRENT_DATE in Postgres uses UTC)
  const today = new Date().toISOString().split('T')[0] // Returns YYYY-MM-DD in UTC

  const { data, error } = await supabase
    .from('daily_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function getUserStats(userId: string): Promise<UserStats | null> {
  console.log('Querying user_stats for user:', userId); // Debug

  // Refresh stats to ensure streaks are up-to-date (handles missed days)
  try {
    await updateEnhancedStats(userId)
  } catch (statsError) {
    console.error('Failed to update stats on load:', statsError)
  }

  const { data, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single()

  console.log('User Stats result:', { data, error }); // Debug

  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function getRecommendedRoutines(limit: number = 6): Promise<Routine[]> {
  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .order('completion_count', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

// Get personalized routines based on user's journey focus and fitness level
export async function getPersonalizedRoutines(
  journeyFocus: JourneyFocus | null,
  fitnessLevel: FitnessLevel | null,
  limit: number = 6
): Promise<Routine[]> {
  let query = supabase
    .from('routines')
    .select('*')

  // Filter by journey focus if user has one
  if (journeyFocus) {
    query = query.contains('journey_focus', [journeyFocus])
  }

  // Filter by fitness level (difficulty) if user has one
  if (fitnessLevel) {
    query = query.eq('difficulty', fitnessLevel)
  }

  // Order by popularity and limit results
  query = query
    .order('completion_count', { ascending: false })
    .limit(limit)

  const { data, error } = await query

  if (error) throw error

  // If no routines match the criteria, fall back to general recommendations
  if (!data || data.length === 0) {
    return getRecommendedRoutines(limit)
  }

  return data
}

export async function getRoutinesByCategory(category: RoutineCategory): Promise<Routine[]> {
  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .eq('category', category)
    .order('completion_count', { ascending: false })

  if (error) throw error
  return data || []
}

// Get one routine from each category (Mind, Body, Soul) for a balanced recommendation
export async function getBalancedRoutines(
  journeyFocus: JourneyFocus | null,
  fitnessLevel: FitnessLevel | null
): Promise<Routine[]> {
  const categories: RoutineCategory[] = ['Mind', 'Body', 'Soul']
  const routines: Routine[] = []

  // Fetch one routine for each category
  for (const category of categories) {
    let query = supabase
      .from('routines')
      .select('*')
      .eq('category', category)

    // Filter by journey focus if user has one
    if (journeyFocus) {
      query = query.contains('journey_focus', [journeyFocus])
    }

    // Filter by fitness level (difficulty) if user has one
    if (fitnessLevel) {
      query = query.eq('difficulty', fitnessLevel)
    }

    // Order by popularity and get the top routine
    query = query
      .order('completion_count', { ascending: false })
      .limit(1)

    const { data, error } = await query

    if (error) throw error

    // If no routine matches the criteria for this category, get the most popular one without filters
    if (!data || data.length === 0) {
      const fallbackQuery = await supabase
        .from('routines')
        .select('*')
        .eq('category', category)
        .order('completion_count', { ascending: false })
        .limit(1)

      if (fallbackQuery.data && fallbackQuery.data.length > 0) {
        routines.push(fallbackQuery.data[0])
      }
    } else {
      routines.push(data[0])
    }
  }

  return routines
}

export async function getRoutineById(routineId: string): Promise<Routine | null> {
  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .eq('id', routineId)
    .single()

  if (error) throw error
  return data
}

export async function completeRoutine(userId: string, routineId: string, category: RoutineCategory) {
  const { data, error } = await supabase
    .from('routine_completions')
    .insert({
      user_id: userId,
      routine_id: routineId,
      category,
      completed_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error

  // Update enhanced stats (per-category streaks, unique routines, harmony score)
  try {
    await updateEnhancedStats(userId)
  } catch (statsError) {
    console.error('Failed to update enhanced stats:', statsError)
  }

  // Get current user stats for streak info
  const stats = await getUserStats(userId)
  const currentStreak = stats?.current_streak || 1

  // Record activity for friends to see
  try {
    await recordActivity(userId, 'completed_routine', {
      routine_id: routineId,
      streak: currentStreak,
      category,
    })
  } catch (activityError) {
    // Don't fail the completion if activity recording fails
    console.error('Failed to record activity:', activityError)
  }

  return data
}

export async function getUserCustomRoutines(userId: string): Promise<Routine[]> {
  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .eq('is_custom', true)
    .eq('created_by', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

// Search routines by name and description (for manual text input)
export async function searchRoutinesByName(
  searchQuery: string,
  category?: RoutineCategory | 'All',
  isCustom?: boolean,
  userId?: string
): Promise<Routine[]> {
  // Start building the query
  let query = supabase
    .from('routines')
    .select('*')

  // Filter by custom status if specified
  if (isCustom && userId) {
    query = query.eq('is_custom', true).eq('created_by', userId)
  } else if (isCustom === false) {
    query = query.eq('is_custom', false)
  }

  // Filter by category if not 'All'
  if (category && category !== 'All') {
    query = query.eq('category', category)
  }

  // Search only name and description
  if (searchQuery.trim()) {
    const searchTerm = searchQuery.trim()
    query = query.or(
      `name.ilike.%${searchTerm}%,` +
      `description.ilike.%${searchTerm}%`
    )
  }

  // Order by completion count (popularity)
  query = query.order('completion_count', { ascending: false })

  const { data, error } = await query

  if (error) throw error

  // Client-side relevance ranking
  if (searchQuery.trim() && data) {
    const searchTermLower = searchQuery.trim().toLowerCase()

    const scoredResults = data.map(routine => {
      let score = 0

      // Exact name match gets highest score
      if (routine.name.toLowerCase() === searchTermLower) score += 100
      else if (routine.name.toLowerCase().includes(searchTermLower)) score += 50

      // Description match
      if (routine.description?.toLowerCase().includes(searchTermLower)) score += 20

      return { routine, score }
    })

    // Sort by score (descending)
    return scoredResults
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.routine)
  }

  return data || []
}

// Search routines by tags, body_parts, symptoms, keywords (for Quick Search)
export async function searchRoutinesByTags(
  searchQuery: string,
  category?: RoutineCategory | 'All',
  isCustom?: boolean,
  userId?: string
): Promise<Routine[]> {
  // Start building the query
  let query = supabase
    .from('routines')
    .select('*')

  // Filter by custom status if specified
  if (isCustom && userId) {
    query = query.eq('is_custom', true).eq('created_by', userId)
  } else if (isCustom === false) {
    query = query.eq('is_custom', false)
  }

  // Filter by category if not 'All'
  if (category && category !== 'All') {
    query = query.eq('category', category)
  }

  // Order by completion count first (we'll do client-side filtering)
  query = query.order('completion_count', { ascending: false })

  const { data, error } = await query

  if (error) throw error

  // Client-side filtering and relevance ranking for tag-based search
  if (searchQuery.trim() && data) {
    const searchTermLower = searchQuery.trim().toLowerCase()

    // Score each routine based on tag field matches
    const scoredResults = data.map(routine => {
      let score = 0

      // Helper function to check array matches
      const checkArrayMatch = (arr?: string[], weight: number = 1) => {
        if (!arr || arr.length === 0) return 0

        let matchScore = 0
        arr.forEach(item => {
          const itemLower = item.toLowerCase()
          // Exact match
          if (itemLower === searchTermLower) {
            matchScore += weight * 2
          }
          // Partial match
          else if (itemLower.includes(searchTermLower) || searchTermLower.includes(itemLower)) {
            matchScore += weight
          }
        })
        return matchScore
      }

      // Weight different fields differently
      score += checkArrayMatch(routine.body_parts, 50)  // Body parts are most important
      score += checkArrayMatch(routine.tags, 30)        // Tags are important

      return { routine, score }
    })

    // Sort by score (descending) and return routines with matches
    return scoredResults
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.routine)
  }

  return data || []
}

/**
 * Get all unique routines that the user has completed
 * Returns full routine details with completion counts
 */
export async function getUniqueCompletedRoutines(userId: string): Promise<Routine[]> {
  // First, get all unique routine IDs that the user has completed
  const { data: completions, error: completionsError } = await supabase
    .from('routine_completions')
    .select('routine_id')
    .eq('user_id', userId)

  if (completionsError) throw completionsError
  if (!completions || completions.length === 0) return []

  // Get unique routine IDs
  const uniqueRoutineIds = [...new Set(completions.map(c => c.routine_id))]

  // Fetch full routine details for each unique routine
  const { data: routines, error: routinesError } = await supabase
    .from('routines')
    .select('*')
    .in('id', uniqueRoutineIds)

  if (routinesError) throw routinesError

  // Sort by category (Mind, Body, Soul) then by completion count
  const categoryOrder: Record<RoutineCategory, number> = { Mind: 0, Body: 1, Soul: 2 }
  return (routines || []).sort((a, b) => {
    // First sort by category
    const categoryDiff = categoryOrder[a.category as RoutineCategory] - categoryOrder[b.category as RoutineCategory]
    if (categoryDiff !== 0) return categoryDiff
    // Then by completion count (descending)
    return b.completion_count - a.completion_count
  })
}
