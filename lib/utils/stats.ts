import { supabase } from '../supabase/client'
import { UserStats, RoutineCategory, AvatarState, AvatarLightState } from '@/types'

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

  // Convert to dates (YYYY-MM-DD format)
  const completionDates = new Set(
    completions.map(c => new Date(c.completed_at).toISOString().split('T')[0])
  )

  // Calculate current streak
  let currentStreak = 0
  const today = new Date().toISOString().split('T')[0]
  let checkDate = new Date()

  // Start checking from today backwards
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0]

    if (completionDates.has(dateStr)) {
      currentStreak++
      // Move to previous day
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      // Streak broken
      break
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
  let checkDate = new Date()

  // Start checking from today backwards
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0]

    if (harmonyDates.includes(dateStr)) {
      currentStreak++
      // Move to previous day
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      // Streak broken
      break
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
 * Calculate harmony score (0-100)
 * Measures balance across Mind/Body/Soul based on last 7 days
 *
 * Formula:
 * - +30 points: All three categories active in last 7 days
 * - +20 points: Smallest category streak is healthy (≥3 days)
 * - +50 points: Distribution score (closer to 33/33/33 split = higher)
 */
export async function calculateHarmonyScore(userId: string): Promise<number> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  // Get completions from last 7 days
  const { data: recentCompletions, error } = await supabase
    .from('routine_completions')
    .select('category')
    .eq('user_id', userId)
    .gte('completed_at', sevenDaysAgo.toISOString())

  if (error) throw error
  if (!recentCompletions || recentCompletions.length === 0) return 0

  // Count completions per category
  const counts = {
    Mind: 0,
    Body: 0,
    Soul: 0,
  }

  recentCompletions.forEach(c => {
    if (c.category === 'Mind') counts.Mind++
    else if (c.category === 'Body') counts.Body++
    else if (c.category === 'Soul') counts.Soul++
  })

  let score = 0

  // Check 1: All three categories active (+30 points)
  const allActive = counts.Mind > 0 && counts.Body > 0 && counts.Soul > 0
  if (allActive) score += 30

  // Check 2: Get current streaks for each category
  const mindStreak = await calculateCategoryStreak(userId, 'Mind')
  const bodyStreak = await calculateCategoryStreak(userId, 'Body')
  const soulStreak = await calculateCategoryStreak(userId, 'Soul')

  const smallestStreak = Math.min(
    mindStreak.currentStreak,
    bodyStreak.currentStreak,
    soulStreak.currentStreak
  )

  // Smallest category streak is healthy (≥3 days) (+20 points)
  if (smallestStreak >= 3) score += 20

  // Check 3: Distribution score (+50 points)
  // Calculate how close the distribution is to perfect balance (33/33/33)
  const total = counts.Mind + counts.Body + counts.Soul
  if (total > 0) {
    const mindPercent = (counts.Mind / total) * 100
    const bodyPercent = (counts.Body / total) * 100
    const soulPercent = (counts.Soul / total) * 100

    // Calculate deviation from ideal 33.33%
    const idealPercent = 33.33
    const deviation =
      Math.abs(mindPercent - idealPercent) +
      Math.abs(bodyPercent - idealPercent) +
      Math.abs(soulPercent - idealPercent)

    // Max deviation is 66.66 (100% in one category, 0% in others)
    // Convert deviation to 0-50 scale (lower deviation = higher score)
    const distributionScore = Math.max(0, 50 - (deviation / 66.66) * 50)
    score += Math.round(distributionScore)
  }

  return Math.min(100, Math.round(score))
}

/**
 * Update all enhanced stats for a user
 * Call this after every routine completion
 */
export async function updateEnhancedStats(userId: string): Promise<UserStats | null> {
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

  // Calculate harmony score
  const harmonyScore = await calculateHarmonyScore(userId)

  // Calculate harmony-based streak (consecutive days with all 3 categories)
  const harmonyStreak = await calculateHarmonyStreak(userId)

  // Update user_stats table
  const { data, error } = await supabase
    .from('user_stats')
    .update({
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
      // Harmony score
      harmony_score: harmonyScore,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating enhanced stats:', error)
    throw error
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

  return new Date(data.completed_at).toISOString().split('T')[0]
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
 * Based on TODAY's progress, not historical streaks
 */
export async function getAllAvatarStates(userId: string): Promise<AvatarState[]> {
  // Get today's progress
  const today = new Date().toISOString().split('T')[0]

  const { data: todayProgress, error } = await supabase
    .from('daily_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle() // Use maybeSingle to avoid error when no rows exist

  console.log('[Avatar States] Today progress:', { todayProgress, error, date: today })

  // Check yesterday's harmony to determine if avatars should be "Sleepy" or "Dormant"
  let yesterdayHadHarmony = false
  if (!todayProgress) {
    // No progress today yet, check yesterday
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    const { data: yesterdayProgress } = await supabase
      .from('daily_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('date', yesterdayStr)
      .maybeSingle() // Use maybeSingle to avoid error when no rows exist

    console.log('[Avatar States] Yesterday progress:', { yesterdayProgress, date: yesterdayStr })

    // Check if yesterday had harmony (all 3 categories completed)
    // If no yesterdayProgress exists (e.g., after Journey Reset), this evaluates to false
    yesterdayHadHarmony =
      yesterdayProgress?.mind_complete &&
      yesterdayProgress?.body_complete &&
      yesterdayProgress?.soul_complete

    // Return default states:
    // - "Sleepy" if had harmony yesterday (continuing positive streak)
    // - "Dormant" if no harmony yesterday OR no data (fresh start/reset)
    const defaultState: AvatarLightState = yesterdayHadHarmony ? 'Sleepy' : 'Dormant'

    console.log('[Avatar States] Default state:', defaultState, 'yesterdayHadHarmony:', yesterdayHadHarmony)

    return [
      {
        category: 'Mind',
        lightState: defaultState,
        lastActivity: null,
        currentStreak: 0,
        color: '#3B82F6',
      },
      {
        category: 'Body',
        lightState: defaultState,
        lastActivity: null,
        currentStreak: 0,
        color: '#EF4444',
      },
      {
        category: 'Soul',
        lightState: defaultState,
        lastActivity: null,
        currentStreak: 0,
        color: '#F59E0B',
      },
    ]
  }

  // Check if all categories completed (perfect harmony = Radiant for all)
  const allCategoriesCompleted =
    todayProgress.mind_complete &&
    todayProgress.body_complete &&
    todayProgress.soul_complete

  return [
    {
      category: 'Mind',
      lightState: getAvatarLightState(
        todayProgress.mind_complete,
        allCategoriesCompleted,
        false // Not executing (will be true during routine execution)
      ),
      lastActivity: null,
      currentStreak: 0,
      color: '#3B82F6',
    },
    {
      category: 'Body',
      lightState: getAvatarLightState(
        todayProgress.body_complete,
        allCategoriesCompleted,
        false // Not executing (will be true during routine execution)
      ),
      lastActivity: null,
      currentStreak: 0,
      color: '#EF4444',
    },
    {
      category: 'Soul',
      lightState: getAvatarLightState(
        todayProgress.soul_complete,
        allCategoriesCompleted,
        false // Not executing (will be true during routine execution)
      ),
      lastActivity: null,
      currentStreak: 0,
      color: '#F59E0B',
    },
  ]
}
