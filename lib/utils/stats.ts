import { supabase } from '../supabase/client'
import { UserStats, RoutineCategory, AvatarState, AvatarLightState } from '@/types'
import { getLocalDateString, getLocalYesterdayString, getLocalDateWithOffset, timestampToLocalDateString } from './timezone'
import { updateHarmonyStatus, calculate7DayRollingCounts, checkForDormantAvatars, getHoursUntilDormant } from './harmony'

/**
 * Calculate per-category streak for a user
 * Logic: If user completed a routine of this category yesterday, increment streak
 *        If not, reset streak to 1 (today's completion)
 *        If no completion today yet, return 0
 */
export async function calculateCategoryStreak(
  userId: string,
  category: RoutineCategory
): Promise<{ currentStreak: number; longestStreak: number }> {
  // Get all completions for this category, ordered by date (most recent first)
  const { data: completions, error } = await supabase
    .from('routine_completions')
    .select('completed_at')
    .eq('user_id', userId)
    .eq('category', category)
    .order('completed_at', { ascending: false })
    .limit(365) // Look back max 1 year for streak calculation

  if (error) throw error
  if (!completions || completions.length === 0) {
    return { currentStreak: 0, longestStreak: 0 }
  }

  // Convert to dates (YYYY-MM-DD format) using local timezone
  const completionDates = new Set(
    completions.map(c => timestampToLocalDateString(c.completed_at))
  )

  // Calculate current streak
  let currentStreak = 0
  const today = getLocalDateString()
  const yesterdayStr = getLocalYesterdayString()

  // Check if user completed today OR yesterday
  // If neither, streak is broken (missed a day)
  const hasCompletionToday = completionDates.has(today)
  const hasCompletionYesterday = completionDates.has(yesterdayStr)

  if (!hasCompletionToday && !hasCompletionYesterday) {
    // User missed yesterday (and hasn't completed today), streak is 0
    currentStreak = 0
  } else {
    // Start checking from today backwards
    let daysBack = 0

    while (true) {
      const dateStr = getLocalDateWithOffset(-daysBack)

      if (completionDates.has(dateStr)) {
        currentStreak++
        // Move to previous day
        daysBack++
      } else {
        // Streak broken
        break
      }
    }
  }

  // Calculate longest streak (historical)
  let longestStreak = 0
  let tempStreak = 0
  let prevDate: Date | null = null

  // Sort dates for longest streak calculation
  const sortedDates = Array.from(completionDates).sort()

  for (const dateStr of sortedDates) {
    const currentDate = new Date(dateStr)

    if (prevDate === null) {
      // First date
      tempStreak = 1
    } else {
      // Check if this date is consecutive to previous
      const daysDiff = Math.floor(
        (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (daysDiff === 1) {
        // Consecutive day
        tempStreak++
      } else {
        // Streak broken, start new streak
        longestStreak = Math.max(longestStreak, tempStreak)
        tempStreak = 1
      }
    }

    prevDate = currentDate
  }

  // Check final streak
  longestStreak = Math.max(longestStreak, tempStreak)

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
  }
}

/**
 * Calculate unique routines completed per category
 */
export async function calculateUniqueRoutines(
  userId: string,
  category: RoutineCategory
): Promise<number> {
  const { data: completions, error } = await supabase
    .from('routine_completions')
    .select('routine_id')
    .eq('user_id', userId)
    .eq('category', category)

  if (error) throw error
  if (!completions || completions.length === 0) return 0

  // Count unique routine IDs
  const uniqueRoutineIds = new Set(completions.map(c => c.routine_id))
  return uniqueRoutineIds.size
}

/**
 * Calculate harmony streak
 * Counts consecutive days where user achieved daily harmony (all 3 categories completed)
 */
export async function calculateHarmonyStreak(
  userId: string
): Promise<{ currentStreak: number; longestStreak: number }> {
  // Get all daily_progress records, ordered by date (most recent first)
  const { data: progressRecords, error } = await supabase
    .from('daily_progress')
    .select('date, mind_complete, body_complete, soul_complete')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(365) // Look back max 1 year

  if (error) throw error
  if (!progressRecords || progressRecords.length === 0) {
    return { currentStreak: 0, longestStreak: 0 }
  }

  // Filter to only days with harmony (all 3 categories complete)
  const harmonyDates = progressRecords
    .filter(p => p.mind_complete && p.body_complete && p.soul_complete)
    .map(p => p.date)

  if (harmonyDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 }
  }

  // Calculate current streak
  let currentStreak = 0
  const today = getLocalDateString()
  const yesterdayStr = getLocalYesterdayString()

  // Check if user achieved harmony today OR yesterday
  const hasHarmonyToday = harmonyDates.includes(today)
  const hasHarmonyYesterday = harmonyDates.includes(yesterdayStr)

  // Streak resets to 0 if user did NOT achieve harmony yesterday (missed a day)
  // Grace period: If harmony was achieved yesterday, streak continues even if today not yet complete
  if (!hasHarmonyToday && !hasHarmonyYesterday) {
    // User missed yesterday (and hasn't completed today), streak is 0
    currentStreak = 0
  } else {
    // Calculate streak from most recent harmony day backwards
    // Start from today if completed, otherwise yesterday
    let daysBack = hasHarmonyToday ? 0 : 1

    while (true) {
      const dateStr = getLocalDateWithOffset(-daysBack)

      if (harmonyDates.includes(dateStr)) {
        currentStreak++
        // Move to previous day
        daysBack++
      } else {
        // Streak broken
        break
      }
    }
  }

  // Calculate longest streak (historical)
  let longestStreak = 0
  let tempStreak = 0
  let prevDate: Date | null = null

  // Sort dates in ascending order for longest streak calculation
  const sortedDates = [...harmonyDates].sort()

  for (const dateStr of sortedDates) {
    const currentDate = new Date(dateStr)

    if (prevDate === null) {
      // First date
      tempStreak = 1
    } else {
      // Check if this date is consecutive to previous
      const daysDiff = Math.floor(
        (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (daysDiff === 1) {
        // Consecutive day
        tempStreak++
      } else {
        // Streak broken, start new streak
        longestStreak = Math.max(longestStreak, tempStreak)
        tempStreak = 1
      }
    }

    prevDate = currentDate
  }

  // Check final streak
  longestStreak = Math.max(longestStreak, tempStreak)

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
  }
}

/**
 * Update all enhanced stats for a user
 * Call this after every routine completion
 */
export async function updateEnhancedStats(userId: string, completedCategory?: RoutineCategory): Promise<UserStats | null> {
  // Calculate per-category streaks
  const mindStreak = await calculateCategoryStreak(userId, 'Mind')
  const bodyStreak = await calculateCategoryStreak(userId, 'Body')
  const soulStreak = await calculateCategoryStreak(userId, 'Soul')

  // Calculate unique routines per category
  const uniqueMind = await calculateUniqueRoutines(userId, 'Mind')
  const uniqueBody = await calculateUniqueRoutines(userId, 'Body')
  const uniqueSoul = await calculateUniqueRoutines(userId, 'Soul')

  // Get last activity dates per category
  const lastMindActivity = await getLastActivityDate(userId, 'Mind')
  const lastBodyActivity = await getLastActivityDate(userId, 'Body')
  const lastSoulActivity = await getLastActivityDate(userId, 'Soul')

  // Calculate harmony-based streak (consecutive days with all 3 categories)
  const harmonyStreak = await calculateHarmonyStreak(userId)

  // Calculate 7-day rolling counts for harmony system
  const counts7d = await calculate7DayRollingCounts(userId)

  // Build update object
  const updateData: Record<string, any> = {
    // Harmony-based streaks (overall day streaks)
    current_streak: harmonyStreak.currentStreak,
    longest_streak: harmonyStreak.longestStreak,
    // Per-category streaks
    mind_current_streak: mindStreak.currentStreak,
    body_current_streak: bodyStreak.currentStreak,
    soul_current_streak: soulStreak.currentStreak,
    mind_longest_streak: mindStreak.longestStreak,
    body_longest_streak: bodyStreak.longestStreak,
    soul_longest_streak: soulStreak.longestStreak,
    // Unique routines
    unique_mind_routines: uniqueMind,
    unique_body_routines: uniqueBody,
    unique_soul_routines: uniqueSoul,
    // Last activity dates
    last_mind_activity: lastMindActivity,
    last_body_activity: lastBodyActivity,
    last_soul_activity: lastSoulActivity,
    // 7-day rolling counts for harmony
    mind_routines_7d: counts7d.mind,
    body_routines_7d: counts7d.body,
    soul_routines_7d: counts7d.soul,
    updated_at: new Date().toISOString(),
  }

  // Update the last routine timestamp for the completed category
  if (completedCategory) {
    const timestampField = `${completedCategory.toLowerCase()}_last_routine_at`
    updateData[timestampField] = new Date().toISOString()
  }

  // Update user_stats table
  const { data, error } = await supabase
    .from('user_stats')
    .update(updateData)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating enhanced stats:', error)
    throw error
  }

  // Update harmony status (checks requirements and updates is_in_harmony)
  try {
    await updateHarmonyStatus(userId)
  } catch (harmonyError) {
    console.error('Error updating harmony status:', harmonyError)
    // Don't throw - harmony update is secondary
  }

  return data
}

/**
 * Get last activity date for a category
 */
async function getLastActivityDate(
  userId: string,
  category: RoutineCategory
): Promise<string | null> {
  const { data, error } = await supabase
    .from('routine_completions')
    .select('completed_at')
    .eq('user_id', userId)
    .eq('category', category)
    .order('completed_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  if (!data) return null

  return timestampToLocalDateString(data.completed_at)
}

/**
 * Get avatar light state based on today's progress
 *
 * State Hierarchy (highest state persists):
 * - Dormant: Category not completed today AND user missed yesterday (no harmony)
 * - Sleepy: New day begins after achieving harmony yesterday (all categories completed)
 * - Awakening: User is currently executing a routine in this category (only if not already Glowing)
 * - Glowing: Category routine completed today (stays Glowing even if doing another routine)
 * - Radiant: ALL three categories completed today (perfect harmony)
 *
 * Important:
 * - Once Glowing, stays Glowing. Awakening only shows when going from Dormant/Sleepy during execution.
 * - Sleepy state is determined by getAllAvatarStates when checking start-of-day state
 */
export function getAvatarLightState(
  categoryCompleted: boolean,
  allCategoriesCompleted: boolean,
  isExecutingThisCategory?: boolean
): AvatarLightState {
  // Radiant: All three categories completed today (perfect harmony) - HIGHEST STATE
  if (allCategoriesCompleted) return 'Radiant'

  // Glowing: This category completed today - STAYS GLOWING even if executing another routine
  if (categoryCompleted) return 'Glowing'

  // Awakening: Currently executing a routine in this category (only if not yet completed)
  if (isExecutingThisCategory) return 'Awakening'

  // Dormant: Not completed today and not currently executing
  // Note: "Sleepy" state is set by getAllAvatarStates when no progress exists yet
  return 'Dormant'
}

/**
 * Get all three avatar states (Mind/Body/Soul) for dashboard display
 * Uses enhanced harmony mechanics with proper decay (48hr/96hr thresholds)
 */
export async function getAllAvatarStates(userId: string): Promise<AvatarState[]> {
  // Get today's progress using local timezone
  const today = getLocalDateString()

  // Fetch today's progress and user stats in parallel
  const [progressResult, statsResult] = await Promise.all([
    supabase
      .from('daily_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle(),
    supabase
      .from('user_stats')
      .select('mind_last_routine_at, body_last_routine_at, soul_last_routine_at, vacation_mode_active')
      .eq('user_id', userId)
      .maybeSingle()
  ])

  const todayProgress = progressResult.data
  const userStats = statsResult.data

  console.log('[Avatar States] Today progress:', { todayProgress, date: today })
  console.log('[Avatar States] User stats:', userStats)

  // Determine decay threshold based on vacation mode
  const decayHours = userStats?.vacation_mode_active ? 96 : 48
  const now = new Date()
  const decayThreshold = new Date(now.getTime() - decayHours * 60 * 60 * 1000)
  const awakeningThreshold = new Date(now.getTime() - 48 * 60 * 60 * 1000)

  // Helper to check if category is dormant
  const isDormant = (lastRoutineAt: string | null): boolean => {
    if (!lastRoutineAt) return true
    return new Date(lastRoutineAt) < decayThreshold
  }

  // Helper to check awakening (2+ routines in 48 hours - calculated separately if needed)
  // For now, we'll use a simpler check: activity within 48 hours but not today
  const couldBeAwakening = (lastRoutineAt: string | null): boolean => {
    if (!lastRoutineAt) return false
    const lastTime = new Date(lastRoutineAt)
    return lastTime >= awakeningThreshold && lastTime >= decayThreshold
  }

  // Check if all categories completed today (for Radiant state)
  const allCompletedToday = todayProgress?.mind_complete &&
                            todayProgress?.body_complete &&
                            todayProgress?.soul_complete

  // Determine state for each category
  const getStateForCategory = (
    _category: RoutineCategory,
    completedToday: boolean,
    lastRoutineAt: string | null
  ): AvatarLightState => {
    // Priority 1: Radiant (all completed today)
    if (allCompletedToday) {
      return 'Radiant'
    }

    // Priority 2: Glowing (this category completed today)
    if (completedToday) {
      return 'Glowing'
    }

    // Priority 3: Dormant (no activity within decay threshold)
    if (isDormant(lastRoutineAt)) {
      return 'Dormant'
    }

    // Priority 4: Awakening (recent activity, building momentum)
    // This would ideally check for 2+ routines in 48 hours
    // For simplicity, we'll use recent activity without completion today
    if (couldBeAwakening(lastRoutineAt)) {
      return 'Awakening'
    }

    // Default: Sleepy
    return 'Sleepy'
  }

  return [
    {
      category: 'Mind',
      lightState: getStateForCategory(
        'Mind',
        todayProgress?.mind_complete ?? false,
        userStats?.mind_last_routine_at ?? null
      ),
      lastActivity: userStats?.mind_last_routine_at ?? null,
      currentStreak: 0,
      color: '#3B82F6',
    },
    {
      category: 'Body',
      lightState: getStateForCategory(
        'Body',
        todayProgress?.body_complete ?? false,
        userStats?.body_last_routine_at ?? null
      ),
      lastActivity: userStats?.body_last_routine_at ?? null,
      currentStreak: 0,
      color: '#EF4444',
    },
    {
      category: 'Soul',
      lightState: getStateForCategory(
        'Soul',
        todayProgress?.soul_complete ?? false,
        userStats?.soul_last_routine_at ?? null
      ),
      lastActivity: userStats?.soul_last_routine_at ?? null,
      currentStreak: 0,
      color: '#F59E0B',
    },
  ]
}
