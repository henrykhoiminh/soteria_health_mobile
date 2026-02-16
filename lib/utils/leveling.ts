import { supabase } from '../supabase/client'
import { LevelInfo, CategoryLevelInfo, UserLevelSummary, LevelUpInfo, RoutineCategory, UserStats } from '@/types'

// =====================================================
// XP & Level Constants
// =====================================================

const BASE_XP = 10
const DEFAULT_DURATION = 10

// Soteria (overall) titles by level range
const SOTERIA_TITLES: [number, string][] = [
  [100, 'Guardian Spirit'],
  [70, 'Luminary'],
  [50, 'Sage'],
  [30, 'Guardian'],
  [20, 'Practitioner'],
  [10, 'Apprentice'],
  [1, 'Seeker'],
]

// Category titles by level range (mirrors Soteria breakpoints)
const CATEGORY_TITLES: Record<RoutineCategory, [number, string][]> = {
  Mind: [
    [100, 'Enlightened'],
    [70, 'Oracle'],
    [50, 'Mystic'],
    [30, 'Seer'],
    [20, 'Scholar'],
    [10, 'Thinker'],
    [1, 'Novice'],
  ],
  Body: [
    [100, 'Immortal'],
    [70, 'Colossus'],
    [50, 'Titan'],
    [30, 'Champion'],
    [20, 'Warrior'],
    [10, 'Mover'],
    [1, 'Novice'],
  ],
  Soul: [
    [100, 'Transcendent'],
    [70, 'Illuminated'],
    [50, 'Sage'],
    [30, 'Shepherd'],
    [20, 'Healer'],
    [10, 'Dreamer'],
    [1, 'Novice'],
  ],
}

// =====================================================
// Pure Functions (no DB calls)
// =====================================================

/** Calculate XP earned from a single routine completion */
export function calculateXpForCompletion(durationMinutes: number | null | undefined): number {
  return BASE_XP + (durationMinutes ?? DEFAULT_DURATION)
}

/** XP required to go from level N to level N+1 */
export function xpRequiredForLevel(level: number): number {
  return 10 * level + 40
}

/** Total cumulative XP needed to reach a given level */
export function totalXpForLevel(level: number): number {
  let total = 0
  for (let i = 1; i < level; i++) {
    total += xpRequiredForLevel(i)
  }
  return total
}

/** Determine level and progress from a raw XP value */
export function getLevelFromXp(xp: number): { level: number; currentXp: number; xpForNextLevel: number; progress: number } {
  let level = 1
  let remaining = xp

  while (true) {
    const needed = xpRequiredForLevel(level)
    if (remaining < needed) {
      return {
        level,
        currentXp: remaining,
        xpForNextLevel: needed,
        progress: needed > 0 ? remaining / needed : 0,
      }
    }
    remaining -= needed
    level++
  }
}

/** Get the Soteria (overall) title for a given level */
export function getSoteriaTitle(level: number): string {
  for (const [minLevel, title] of SOTERIA_TITLES) {
    if (level >= minLevel) return title
  }
  return 'Seeker'
}

/** Get the category-specific title for a given level */
export function getCategoryTitle(category: RoutineCategory, level: number): string {
  const titles = CATEGORY_TITLES[category]
  for (const [minLevel, title] of titles) {
    if (level >= minLevel) return title
  }
  return titles[titles.length - 1][1]
}

/** Build a full LevelInfo object from XP */
function buildLevelInfo(xp: number, titleFn: (level: number) => string): LevelInfo {
  const { level, currentXp, xpForNextLevel, progress } = getLevelFromXp(xp)
  return {
    level,
    currentXp,
    xpForNextLevel,
    progress,
    title: titleFn(level),
  }
}

/** Build a full UserLevelSummary from user stats */
export function getUserLevelSummary(stats: UserStats | null): UserLevelSummary {
  const totalXp = stats?.total_xp ?? 0
  const mindXp = stats?.mind_xp ?? 0
  const bodyXp = stats?.body_xp ?? 0
  const soulXp = stats?.soul_xp ?? 0

  return {
    soteria: buildLevelInfo(totalXp, getSoteriaTitle),
    mind: {
      ...buildLevelInfo(mindXp, (lvl) => getCategoryTitle('Mind', lvl)),
      category: 'Mind',
    },
    body: {
      ...buildLevelInfo(bodyXp, (lvl) => getCategoryTitle('Body', lvl)),
      category: 'Body',
    },
    soul: {
      ...buildLevelInfo(soulXp, (lvl) => getCategoryTitle('Soul', lvl)),
      category: 'Soul',
    },
  }
}

/** Detect if any level-ups occurred between previous and new XP values */
export function detectLevelUp(previousXp: number, newXp: number): { oldLevel: number; newLevel: number } | null {
  const oldLevel = getLevelFromXp(previousXp).level
  const newLevel = getLevelFromXp(newXp).level
  if (newLevel > oldLevel) {
    return { oldLevel, newLevel }
  }
  return null
}

// =====================================================
// DB Function
// =====================================================

/** Add XP for a routine completion and check for level-ups */
export async function addXpForCompletion(
  userId: string,
  category: RoutineCategory,
  durationMinutes: number | null | undefined
): Promise<{ xpGained: number; levelUps: LevelUpInfo[] }> {
  const xpGained = calculateXpForCompletion(durationMinutes)

  // Read current XP
  const { data: currentStats, error: readError } = await supabase
    .from('user_stats')
    .select('total_xp, mind_xp, body_xp, soul_xp')
    .eq('user_id', userId)
    .single()

  if (readError && readError.code !== 'PGRST116') throw readError

  const prevTotalXp = currentStats?.total_xp ?? 0
  const prevCategoryXp = category === 'Mind'
    ? (currentStats?.mind_xp ?? 0)
    : category === 'Body'
      ? (currentStats?.body_xp ?? 0)
      : (currentStats?.soul_xp ?? 0)

  const newTotalXp = prevTotalXp + xpGained
  const newCategoryXp = prevCategoryXp + xpGained

  // Build the update object
  const categoryXpField = category === 'Mind' ? 'mind_xp' : category === 'Body' ? 'body_xp' : 'soul_xp'
  const updatePayload: Record<string, number> = {
    total_xp: newTotalXp,
    [categoryXpField]: newCategoryXp,
  }

  const { error: updateError } = await supabase
    .from('user_stats')
    .update(updatePayload)
    .eq('user_id', userId)

  if (updateError) throw updateError

  // Detect level-ups
  const levelUps: LevelUpInfo[] = []

  const soteriaLevelUp = detectLevelUp(prevTotalXp, newTotalXp)
  if (soteriaLevelUp) {
    levelUps.push({
      category: 'soteria',
      oldLevel: soteriaLevelUp.oldLevel,
      newLevel: soteriaLevelUp.newLevel,
      newTitle: getSoteriaTitle(soteriaLevelUp.newLevel),
    })
  }

  const categoryLevelUp = detectLevelUp(prevCategoryXp, newCategoryXp)
  if (categoryLevelUp) {
    levelUps.push({
      category,
      oldLevel: categoryLevelUp.oldLevel,
      newLevel: categoryLevelUp.newLevel,
      newTitle: getCategoryTitle(category, categoryLevelUp.newLevel),
    })
  }

  return { xpGained, levelUps }
}
