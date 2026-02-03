import { supabase } from '../supabase/client'
import { DailyProgress, Routine, RoutineCategory, RoutineDifficulty, UserStats, JourneyFocus, PainCheckIn } from '@/types'
import { format } from 'date-fns'
import { recordActivity } from './social'
import { updateEnhancedStats } from './stats'
import { getLocalDateString, getCurrentTimestamp } from './timezone'
import { getTodayCheckIn } from './pain-checkin'

// Wellness-aware recommendation types
export interface WellnessContext {
  mindScore: number
  bodyScore: number
  soulScore: number
  compositeScore: number
}

export interface CategoryRecommendation {
  category: RoutineCategory
  routines: Routine[]
  message: string
  subtitle: string
}

export async function getTodayProgress(userId: string): Promise<DailyProgress | null> {
  // Use local timezone date so daily progress resets at midnight local time
  const today = getLocalDateString() // Returns YYYY-MM-DD in user's local timezone

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

// Get personalized routines based on user's journey focus
export async function getPersonalizedRoutines(
  journeyFocus: JourneyFocus | null,
  limit: number = 6
): Promise<Routine[]> {
  let query = supabase
    .from('routines')
    .select('*')

  // Filter by journey focus if user has one
  if (journeyFocus) {
    query = query.contains('journey_focus', [journeyFocus])
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

/**
 * Get max allowed difficulty based on wellness score
 * Higher score = worse state = gentler routines needed
 */
export function getMaxDifficultyForScore(score: number): RoutineDifficulty[] {
  if (score <= 3) {
    // Feeling good - any difficulty
    return ['Beginner', 'Intermediate', 'Advanced']
  } else if (score <= 6) {
    // Moderate impact - stick to easier routines
    return ['Beginner', 'Intermediate']
  } else {
    // High impact - gentle routines only
    return ['Beginner']
  }
}

/**
 * Get personalized message based on category score and recovery areas
 */
export function getCategoryMessage(
  category: RoutineCategory,
  score: number,
  recoveryAreas?: string[] | null
): { message: string; subtitle: string } {
  const physicalAreas = getPhysicalRecoveryAreas(recoveryAreas)
  const isRecoveryFocus = isCategoryRecoveryFocus(category, recoveryAreas)

  // Format body parts for display (e.g., "Wrist & Lower Back")
  const formatBodyParts = (areas: string[]) => {
    if (areas.length === 0) return ''
    if (areas.length === 1) return areas[0]
    if (areas.length === 2) return `${areas[0]} & ${areas[1]}`
    return `${areas.slice(0, -1).join(', ')} & ${areas[areas.length - 1]}`
  }

  // Recovery-specific messages for Body with physical areas
  if (category === 'Body' && physicalAreas.length > 0) {
    const areaText = formatBodyParts(physicalAreas)
    if (score <= 3) {
      return {
        message: `Your ${areaText} is feeling good`,
        subtitle: 'Keep up the progress with a strengthening routine',
      }
    } else if (score <= 6) {
      return {
        message: `Let's work on your ${areaText}`,
        subtitle: 'A targeted routine to support your recovery',
      }
    } else {
      return {
        message: `Your ${areaText} needs gentle attention`,
        subtitle: 'Easy movements to help with recovery',
      }
    }
  }

  // Default messages
  const messages: Record<RoutineCategory, { low: { message: string; subtitle: string }; mid: { message: string; subtitle: string }; high: { message: string; subtitle: string } }> = {
    Mind: {
      low: { message: 'Your mind is feeling clear', subtitle: 'Challenge yourself with something new' },
      mid: { message: 'Give your mind some attention', subtitle: 'A mindful routine could help' },
      high: { message: 'Your mind needs extra care', subtitle: 'Try a gentle, calming routine' },
    },
    Body: {
      low: { message: 'Your body is feeling strong', subtitle: 'Ready for any challenge' },
      mid: { message: 'Your body could use some movement', subtitle: 'A moderate routine might help' },
      high: { message: 'Your body needs gentle care', subtitle: 'Take it easy with restorative movements' },
    },
    Soul: {
      low: { message: 'Your spirit feels connected', subtitle: 'Explore something meaningful' },
      mid: { message: 'Nurture your inner self', subtitle: 'A soulful practice awaits' },
      high: { message: 'Your soul needs nourishment', subtitle: 'Find peace with a gentle practice' },
    },
  }

  if (score <= 3) {
    return messages[category].low
  } else if (score <= 6) {
    return messages[category].mid
  } else {
    return messages[category].high
  }
}

/**
 * Extract physical body parts from recovery areas (exclude Mind/Soul)
 */
function getPhysicalRecoveryAreas(recoveryAreas: string[] | null | undefined): string[] {
  if (!recoveryAreas) return []
  return recoveryAreas.filter(area => area !== 'Mind' && area !== 'Soul')
}

/**
 * Check if category is a recovery focus
 */
function isCategoryRecoveryFocus(category: RoutineCategory, recoveryAreas: string[] | null | undefined): boolean {
  if (!recoveryAreas) return false

  if (category === 'Mind') return recoveryAreas.includes('Mind')
  if (category === 'Soul') return recoveryAreas.includes('Soul')
  if (category === 'Body') return getPhysicalRecoveryAreas(recoveryAreas).length > 0

  return false
}

/**
 * Get wellness-aware routines for a specific category
 * Filters by difficulty based on the user's wellness score
 * Prioritizes routines matching user's recovery areas
 */
export async function getWellnessAwareRoutines(
  category: RoutineCategory,
  wellnessScore: number,
  journeyFocus?: JourneyFocus | null,
  recoveryAreas?: string[] | null,
  limit: number = 10
): Promise<Routine[]> {
  const allowedDifficulties = getMaxDifficultyForScore(wellnessScore)
  const physicalRecoveryAreas = getPhysicalRecoveryAreas(recoveryAreas)

  // For Body category with physical recovery areas, try to find matching routines first
  if (category === 'Body' && physicalRecoveryAreas.length > 0) {
    // First try: routines targeting user's specific recovery body parts
    let query = supabase
      .from('routines')
      .select('*')
      .eq('category', 'Body')
      .in('difficulty', allowedDifficulties)
      .overlaps('body_parts', physicalRecoveryAreas)

    if (journeyFocus) {
      query = query.contains('journey_focus', [journeyFocus])
    }

    query = query
      .order('completion_count', { ascending: false })
      .limit(limit)

    const { data, error } = await query

    if (!error && data && data.length > 0) {
      return data
    }

    // Second try: any Body routines at appropriate difficulty (no body_parts filter)
    let fallbackQuery = supabase
      .from('routines')
      .select('*')
      .eq('category', 'Body')
      .in('difficulty', allowedDifficulties)

    if (journeyFocus) {
      fallbackQuery = fallbackQuery.contains('journey_focus', [journeyFocus])
    }

    fallbackQuery = fallbackQuery
      .order('completion_count', { ascending: false })
      .limit(limit)

    const { data: fallbackData, error: fallbackError } = await fallbackQuery

    if (!fallbackError && fallbackData && fallbackData.length > 0) {
      return fallbackData
    }
  }

  // Standard query for Mind/Soul or Body without specific recovery areas
  let query = supabase
    .from('routines')
    .select('*')
    .eq('category', category)
    .in('difficulty', allowedDifficulties)

  // Filter by journey focus if provided
  if (journeyFocus) {
    query = query.contains('journey_focus', [journeyFocus])
  }

  query = query
    .order('completion_count', { ascending: false })
    .limit(limit)

  const { data, error } = await query

  if (error) throw error

  // If no routines match criteria, fall back to any routines in category
  if (!data || data.length === 0) {
    return getRoutinesByCategory(category)
  }

  return data
}

/**
 * Get today's wellness context for a user
 * Returns null if user hasn't checked in today
 */
export async function getWellnessContext(userId: string): Promise<WellnessContext | null> {
  const todayCheckIn = await getTodayCheckIn(userId)

  if (!todayCheckIn) {
    return null
  }

  return {
    mindScore: todayCheckIn.mind_score,
    bodyScore: todayCheckIn.body_score,
    soulScore: todayCheckIn.soul_score,
    compositeScore: Math.round((todayCheckIn.mind_score + todayCheckIn.body_score + todayCheckIn.soul_score) / 3),
  }
}

/**
 * Get the score for a specific category from wellness context
 */
export function getCategoryScore(category: RoutineCategory, wellness: WellnessContext): number {
  switch (category) {
    case 'Mind': return wellness.mindScore
    case 'Body': return wellness.bodyScore
    case 'Soul': return wellness.soulScore
  }
}

/**
 * Get prioritized categories based on wellness scores
 * Higher scores (more struggling) get higher priority
 */
export function getPrioritizedCategories(wellness: WellnessContext): RoutineCategory[] {
  const categories: { category: RoutineCategory; score: number }[] = [
    { category: 'Mind', score: wellness.mindScore },
    { category: 'Body', score: wellness.bodyScore },
    { category: 'Soul', score: wellness.soulScore },
  ]

  // Sort by score descending (higher = more need = higher priority)
  return categories
    .sort((a, b) => b.score - a.score)
    .map(c => c.category)
}

/**
 * Get full recommendation for a category including routines and messaging
 */
export async function getCategoryRecommendation(
  category: RoutineCategory,
  userId: string,
  journeyFocus?: JourneyFocus | null,
  recoveryAreas?: string[] | null
): Promise<CategoryRecommendation> {
  const wellness = await getWellnessContext(userId)

  // If no wellness check-in, use default score of 0 (assume feeling fine)
  const score = wellness ? getCategoryScore(category, wellness) : 0
  const { message, subtitle } = getCategoryMessage(category, score, recoveryAreas)

  const routines = await getWellnessAwareRoutines(category, score, journeyFocus, recoveryAreas)

  return {
    category,
    routines,
    message,
    subtitle,
  }
}

// Get one routine from each category (Mind, Body, Soul) for a balanced recommendation
export async function getBalancedRoutines(
  journeyFocus: JourneyFocus | null
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
    .select(`
      *,
      profiles (
        full_name,
        username,
        profile_picture_url
      )
    `)
    .eq('id', routineId)
    .single()

  if (error) throw error

  if (!data) return null

  const routine = data as any

  // Fetch source routine info separately (self-joins can be unreliable in Supabase)
  let sourceRoutineName: string | null = null
  let sourceRoutineIsOfficial: boolean = false
  if (routine.source_routine_id) {
    const { data: sourceData } = await supabase
      .from('routines')
      .select('name, author_type')
      .eq('id', routine.source_routine_id)
      .single()
    sourceRoutineName = sourceData?.name || null
    sourceRoutineIsOfficial = sourceData?.author_type === 'official'
  }

  return {
    ...routine,
    creator_name: routine.profiles?.full_name,
    creator_username: routine.profiles?.username,
    creator_avatar: routine.profiles?.profile_picture_url,
    source_routine_name: sourceRoutineName,
    source_routine_is_official: sourceRoutineIsOfficial,
  }
}

export async function completeRoutine(userId: string, routineId: string, category: RoutineCategory) {
  const { data, error } = await supabase
    .from('routine_completions')
    .insert({
      user_id: userId,
      routine_id: routineId,
      category,
      completed_at: getCurrentTimestamp(), // Use precise timestamp but local date calculations will use timezone
    })
    .select()
    .single()

  if (error) throw error

  // Update daily progress for today's local date
  try {
    const localDate = getLocalDateString()
    const { error: dailyProgressError } = await supabase.rpc('update_daily_progress_for_date', {
      p_user_id: userId,
      p_local_date: localDate,
      p_category: category,
    })

    if (dailyProgressError) {
      console.error('Failed to update daily progress:', dailyProgressError)
    }
  } catch (dailyProgressError) {
    console.error('Failed to update daily progress:', dailyProgressError)
  }

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
