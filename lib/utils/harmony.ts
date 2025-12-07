import { supabase } from '../supabase/client'
import { UserStats, RoutineCategory, HarmonyStatus, UserType, AvatarLightState, DailySuggestedRoutines } from '@/types'
import { getLocalDateString, getLocalDateWithOffset } from './timezone'

/**
 * Calculate 7-day rolling counts for each category
 * @param userId - The user's ID
 * @returns Object with mind, body, soul counts
 */
export async function calculate7DayRollingCounts(userId: string): Promise<{
  mind: number
  body: number
  soul: number
}> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data, error } = await supabase
    .from('routine_completions')
    .select('category')
    .eq('user_id', userId)
    .gte('completed_at', sevenDaysAgo.toISOString())

  if (error) {
    console.error('Error calculating 7-day counts:', error)
    throw error
  }

  const counts = { mind: 0, body: 0, soul: 0 }
  if (data) {
    for (const completion of data) {
      const cat = completion.category.toLowerCase() as 'mind' | 'body' | 'soul'
      if (cat in counts) {
        counts[cat]++
      }
    }
  }

  return counts
}

/**
 * Check if user's activity is balanced
 * All categories must be within 1 routine of each other
 */
export function checkBalance(mind: number, body: number, soul: number): boolean {
  const max = Math.max(mind, body, soul)
  const min = Math.min(mind, body, soul)
  return max - min <= 1
}

/**
 * Determine user's type based on 7-day activity
 * Must be 2+ routines ahead to be considered a "type"
 */
export function getUserType(mind: number, body: number, soul: number): UserType {
  const counts = [
    { name: 'mind' as UserType, count: mind },
    { name: 'body' as UserType, count: body },
    { name: 'soul' as UserType, count: soul },
  ]

  // Sort by count descending
  counts.sort((a, b) => b.count - a.count)

  const highest = counts[0]
  const secondHighest = counts[1]

  // Must be 2+ ahead to be a "type"
  if (highest.count - secondHighest.count >= 2) {
    return highest.name
  }

  return 'balanced'
}

/**
 * Get type display message for user
 */
export function getTypeMessage(userType: UserType, mind: number, body: number, soul: number): string {
  if (userType === 'balanced') {
    return "You're in perfect balance this week!"
  }

  const typeNames: Record<UserType, string> = {
    mind: 'Mind',
    body: 'Body',
    soul: 'Soul',
    balanced: 'Balanced',
  }

  const neglected: string[] = []
  const counts = { mind, body, soul }
  const typeCounts = counts[userType]

  for (const [key, value] of Object.entries(counts)) {
    if (key !== userType && typeCounts - value >= 2) {
      neglected.push(typeNames[key as keyof typeof typeNames])
    }
  }

  if (neglected.length === 0) {
    return `This week you've been a ${typeNames[userType]} type.`
  }

  return `This week you've been a ${typeNames[userType]} type. Your ${neglected.join(' and ')} could use some attention.`
}

/**
 * Check if any avatar is dormant (48+ hours since last routine)
 * Uses vacation mode threshold (96 hours) if active
 */
export async function checkForDormantAvatars(
  userId: string,
  vacationModeActive: boolean = false
): Promise<{
  mindDormant: boolean
  bodyDormant: boolean
  soulDormant: boolean
  anyDormant: boolean
}> {
  const { data: stats, error } = await supabase
    .from('user_stats')
    .select('mind_last_routine_at, body_last_routine_at, soul_last_routine_at')
    .eq('user_id', userId)
    .single()

  if (error || !stats) {
    console.error('Error checking dormant avatars:', error)
    // If no stats, consider all dormant
    return {
      mindDormant: true,
      bodyDormant: true,
      soulDormant: true,
      anyDormant: true,
    }
  }

  const decayHours = vacationModeActive ? 96 : 48
  const now = new Date()
  const decayThreshold = new Date(now.getTime() - decayHours * 60 * 60 * 1000)

  const isDormant = (lastRoutineAt: string | null): boolean => {
    if (!lastRoutineAt) return true
    return new Date(lastRoutineAt) < decayThreshold
  }

  const mindDormant = isDormant(stats.mind_last_routine_at)
  const bodyDormant = isDormant(stats.body_last_routine_at)
  const soulDormant = isDormant(stats.soul_last_routine_at)

  return {
    mindDormant,
    bodyDormant,
    soulDormant,
    anyDormant: mindDormant || bodyDormant || soulDormant,
  }
}

/**
 * Calculate hours until avatar goes dormant
 */
export function getHoursUntilDormant(
  lastRoutineAt: string | null,
  vacationModeActive: boolean = false
): number | null {
  if (!lastRoutineAt) return 0 // Already dormant

  const decayHours = vacationModeActive ? 96 : 48
  const now = new Date()
  const lastRoutine = new Date(lastRoutineAt)
  const decayTime = new Date(lastRoutine.getTime() + decayHours * 60 * 60 * 1000)

  const hoursRemaining = (decayTime.getTime() - now.getTime()) / (1000 * 60 * 60)

  if (hoursRemaining <= 0) return 0 // Already dormant
  return Math.round(hoursRemaining * 10) / 10 // Round to 1 decimal
}

/**
 * Get daily routine counts for a specific date
 */
export async function getDailyRoutineCounts(userId: string, date: string): Promise<{
  mind: number
  body: number
  soul: number
}> {
  const { data, error } = await supabase
    .from('routine_completions')
    .select('category')
    .eq('user_id', userId)
    .gte('completed_at', `${date}T00:00:00`)
    .lt('completed_at', `${date}T23:59:59.999`)

  if (error) {
    console.error('Error getting daily counts:', error)
    return { mind: 0, body: 0, soul: 0 }
  }

  const counts = { mind: 0, body: 0, soul: 0 }
  if (data) {
    for (const completion of data) {
      const cat = completion.category.toLowerCase() as 'mind' | 'body' | 'soul'
      if (cat in counts) {
        counts[cat]++
      }
    }
  }

  return counts
}

/**
 * Calculate consecutive balanced days
 * A day is "balanced" if the user completed at least 1 routine in each category
 * AND all categories are within ±1 of each other for that day
 */
export async function calculateConsecutiveBalancedDays(userId: string): Promise<{
  consecutiveDays: number
  dailyHistory: Array<{
    date: string
    mind: number
    body: number
    soul: number
    isBalanced: boolean
  }>
}> {
  const dailyHistory: Array<{
    date: string
    mind: number
    body: number
    soul: number
    isBalanced: boolean
  }> = []

  let consecutiveDays = 0
  let streakBroken = false

  // Check the last 14 days (enough to show history and calculate streak)
  for (let i = 0; i < 14; i++) {
    const date = getLocalDateWithOffset(-i)
    const counts = await getDailyRoutineCounts(userId, date)

    // A day is balanced if:
    // 1. At least 1 routine in each category (mind >= 1, body >= 1, soul >= 1)
    // 2. All categories within ±1 of each other
    const hasAllCategories = counts.mind >= 1 && counts.body >= 1 && counts.soul >= 1
    const isWithinBalance = checkBalance(counts.mind, counts.body, counts.soul)
    const isBalanced = hasAllCategories && isWithinBalance

    dailyHistory.push({
      date,
      ...counts,
      isBalanced,
    })

    // Count consecutive balanced days (starting from today/yesterday)
    if (!streakBroken) {
      if (isBalanced) {
        consecutiveDays++
      } else if (i > 0) {
        // Day 0 (today) might not be complete yet, so we're lenient
        // But if any past day is not balanced, streak is broken
        streakBroken = true
      }
    }
  }

  return {
    consecutiveDays,
    dailyHistory,
  }
}

/**
 * Generate a suggested daily routine plan to reach harmony
 * The plan suggests 1 routine per category per day for the remaining days needed
 */
export function generateSuggestedPlan(
  daysUntilHarmony: number,
  currentMind: number,
  currentBody: number,
  currentSoul: number
): DailySuggestedRoutines[] {
  const plan: DailySuggestedRoutines[] = []

  if (daysUntilHarmony <= 0) {
    return plan // Already in harmony or will be today
  }

  // Generate plan for remaining days
  for (let day = 1; day <= daysUntilHarmony; day++) {
    const date = getLocalDateWithOffset(day)

    // Suggest 1 routine per category per day to maintain balance
    plan.push({
      day,
      date,
      mind: 1,
      body: 1,
      soul: 1,
      isCompleted: false,
    })
  }

  return plan
}

/**
 * Get days until calibration period completes
 * Calibration is 7 days from journey start
 */
export async function getDaysUntilCalibrationComplete(userId: string): Promise<number> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('journey_started_at')
    .eq('id', userId)
    .single()

  if (error || !profile?.journey_started_at) {
    return 7 // Default to 7 if no journey start date
  }

  const journeyStart = new Date(profile.journey_started_at)
  const now = new Date()
  const daysSinceStart = Math.floor(
    (now.getTime() - journeyStart.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (daysSinceStart >= 7) return 0
  return 7 - daysSinceStart
}

/**
 * Check all harmony requirements and return full status
 */
export async function checkHarmonyRequirements(userId: string): Promise<HarmonyStatus> {
  // Get user stats
  const { data: stats, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single()

  const defaultStatus: HarmonyStatus = {
    isInHarmony: false,
    harmonyAchievedAt: null,
    harmonyLostAt: null,
    userType: 'balanced',
    mind7d: 0,
    body7d: 0,
    soul7d: 0,
    isBalanced: false,
    totalRoutines7d: 0,
    daysUntilCalibrationComplete: 7,
    consecutiveBalancedDays: 0,
    daysUntilHarmony: 7,
    suggestedPlan: generateSuggestedPlan(7, 0, 0, 0),
  }

  if (error || !stats) {
    console.error('Error getting user stats for harmony check:', error)
    return defaultStatus
  }

  // Calculate fresh 7-day counts
  const counts = await calculate7DayRollingCounts(userId)
  const total = counts.mind + counts.body + counts.soul

  // Check balance for today's rolling window
  const isBalanced = checkBalance(counts.mind, counts.body, counts.soul)

  // Get user type
  const userType = getUserType(counts.mind, counts.body, counts.soul)

  // Check for dormant avatars
  const dormantStatus = await checkForDormantAvatars(userId, stats.vacation_mode_active)

  // Get calibration status
  const daysUntilCalibrationComplete = await getDaysUntilCalibrationComplete(userId)

  // Calculate consecutive balanced days (the key metric for harmony)
  const { consecutiveDays } = await calculateConsecutiveBalancedDays(userId)

  // Days until harmony = 7 - consecutive balanced days (minimum 0)
  const daysUntilHarmony = Math.max(0, 7 - consecutiveDays)

  // Generate suggested plan for remaining days
  const suggestedPlan = generateSuggestedPlan(daysUntilHarmony, counts.mind, counts.body, counts.soul)

  // Harmony requirements (natural achievement):
  // 1. Past calibration period (day 8+)
  // 2. 7 consecutive balanced days
  // 3. No dormant avatars
  const naturallyInHarmony =
    daysUntilCalibrationComplete === 0 &&
    consecutiveDays >= 7 &&
    !dormantStatus.anyDormant

  // Respect manually set harmony status (for health team testing)
  // If is_in_harmony is true in the database, respect it as a manual override
  // This allows health team to test harmony features without meeting all requirements
  const isInHarmony = stats.is_in_harmony === true || naturallyInHarmony

  return {
    isInHarmony,
    harmonyAchievedAt: stats.harmony_achieved_at,
    harmonyLostAt: stats.harmony_lost_at,
    userType,
    mind7d: counts.mind,
    body7d: counts.body,
    soul7d: counts.soul,
    isBalanced,
    totalRoutines7d: total,
    daysUntilCalibrationComplete,
    consecutiveBalancedDays: consecutiveDays,
    daysUntilHarmony,
    suggestedPlan,
  }
}

/**
 * Update harmony status in database
 * Call this after routine completion
 */
export async function updateHarmonyStatus(userId: string): Promise<void> {
  const status = await checkHarmonyRequirements(userId)

  // Get current status to detect changes
  const { data: currentStats } = await supabase
    .from('user_stats')
    .select('is_in_harmony')
    .eq('user_id', userId)
    .single()

  const wasInHarmony = currentStats?.is_in_harmony ?? false

  // Update stats
  const updateData: Partial<UserStats> = {
    mind_routines_7d: status.mind7d,
    body_routines_7d: status.body7d,
    soul_routines_7d: status.soul7d,
    is_in_harmony: status.isInHarmony,
    user_type: status.userType,
  }

  // Set achievement/loss timestamps
  if (status.isInHarmony && !wasInHarmony) {
    (updateData as any).harmony_achieved_at = new Date().toISOString()
  } else if (!status.isInHarmony && wasInHarmony) {
    (updateData as any).harmony_lost_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('user_stats')
    .update(updateData)
    .eq('user_id', userId)

  if (error) {
    console.error('Error updating harmony status:', error)
    throw error
  }
}

/**
 * Get enhanced avatar state using harmony mechanics
 * This replaces the simple getAvatarLightState for more nuanced states
 */
export async function getEnhancedAvatarState(
  userId: string,
  category: RoutineCategory,
  stats: UserStats,
  completedToday: boolean,
  allCompletedToday: boolean,
  isExecuting: boolean = false
): Promise<AvatarLightState> {
  // Priority 1: Check Radiant (all three completed today)
  if (allCompletedToday) {
    return 'Radiant'
  }

  // Priority 2: Check Glowing (this category completed today)
  if (completedToday) {
    return 'Glowing'
  }

  // Priority 3: Check Dormant (48hr+ since last routine in category)
  const lastRoutineField = `${category.toLowerCase()}_last_routine_at` as keyof UserStats
  const lastRoutineAt = stats[lastRoutineField] as string | null

  const decayHours = stats.vacation_mode_active ? 96 : 48
  const now = new Date()
  const decayThreshold = new Date(now.getTime() - decayHours * 60 * 60 * 1000)

  if (!lastRoutineAt || new Date(lastRoutineAt) < decayThreshold) {
    // Check if executing this category
    if (isExecuting) {
      return 'Awakening' // Transitioning from Dormant during execution
    }
    return 'Dormant'
  }

  // Priority 4: Check Awakening (2+ routines in 48 hours for this category)
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)

  const { data: recentCompletions, error } = await supabase
    .from('routine_completions')
    .select('id')
    .eq('user_id', userId)
    .eq('category', category)
    .gte('completed_at', fortyEightHoursAgo.toISOString())

  if (!error && recentCompletions && recentCompletions.length >= 2) {
    return 'Awakening'
  }

  // Default: Sleepy
  return 'Sleepy'
}

/**
 * Manually set harmony status (for health team members only)
 * This bypasses all normal harmony requirements
 */
export async function setHarmonyStatusManually(
  userId: string,
  isInHarmony: boolean
): Promise<void> {
  const now = new Date().toISOString()

  const updateData: Partial<UserStats> = {
    is_in_harmony: isInHarmony,
  }

  if (isInHarmony) {
    (updateData as any).harmony_achieved_at = now
    ;(updateData as any).harmony_lost_at = null
  } else {
    (updateData as any).harmony_lost_at = now
  }

  const { error } = await supabase
    .from('user_stats')
    .update(updateData)
    .eq('user_id', userId)

  if (error) {
    console.error('Error setting harmony status manually:', error)
    throw error
  }
}

/**
 * Check if user can access advanced routines
 */
export async function canAccessAdvancedRoutines(userId: string): Promise<boolean> {
  const { data: stats, error } = await supabase
    .from('user_stats')
    .select('is_in_harmony')
    .eq('user_id', userId)
    .single()

  if (error || !stats) {
    return false
  }

  return stats.is_in_harmony ?? false
}

/**
 * Get harmony progress message for UI
 */
export function getHarmonyProgressMessage(status: HarmonyStatus): string {
  if (status.isInHarmony) {
    return 'You are in Harmony! Advanced routines are unlocked.'
  }

  const issues: string[] = []

  if (status.daysUntilCalibrationComplete > 0) {
    issues.push(`${status.daysUntilCalibrationComplete} days left in calibration period`)
  }

  if (status.totalRoutines7d < 7) {
    issues.push(`${7 - status.totalRoutines7d} more routines needed this week`)
  }

  if (!status.isBalanced) {
    issues.push('Balance your Mind, Body, and Soul activity')
  }

  // Note: Dormant avatar check would require additional state

  if (issues.length === 0) {
    return 'Keep all avatars active to maintain Harmony!'
  }

  return `To achieve Harmony: ${issues.join(', ')}`
}

/**
 * Get balance visualization data for charts
 */
export function getBalanceVisualization(mind: number, body: number, soul: number): {
  total: number
  mindPercent: number
  bodyPercent: number
  soulPercent: number
  isBalanced: boolean
} {
  const total = mind + body + soul

  if (total === 0) {
    return {
      total: 0,
      mindPercent: 33.33,
      bodyPercent: 33.33,
      soulPercent: 33.33,
      isBalanced: true,
    }
  }

  return {
    total,
    mindPercent: (mind / total) * 100,
    bodyPercent: (body / total) * 100,
    soulPercent: (soul / total) * 100,
    isBalanced: checkBalance(mind, body, soul),
  }
}
