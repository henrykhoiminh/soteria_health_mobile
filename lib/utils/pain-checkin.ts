import { PainCheckIn, PainStatistics } from '@/types'
import { supabase } from '../supabase/client'
import { getLocalDateString } from './timezone'

/**
 * Calculate a weighted composite pain level from Mind/Body/Soul scores.
 * Uses root-mean-square so higher scores carry more weight — a single
 * high-pain category won't get diluted by low scores elsewhere.
 *
 * Examples:
 *   (7, 7, 1) → 6  (simple avg would be 5)
 *   (10, 0, 0) → 6  (simple avg would be 3)
 *   (5, 5, 5)  → 5  (same as simple avg when equal)
 */
export function calculateCompositePain(mind: number, body: number, soul: number): number {
  return Math.round(Math.sqrt((mind * mind + body * body + soul * soul) / 3))
}

/**
 * Get today's date in YYYY-MM-DD format (local timezone)
 */
export function getTodayDate(): string {
  return getLocalDateString()
}

/**
 * Check if user has already checked in today
 * @param userId - User ID
 * @returns Promise<boolean> - true if checked in today, false otherwise
 */
export async function hasCheckedInToday(userId: string): Promise<boolean> {
  try {
    const today = getTodayDate()

    const { data, error } = await supabase
      .from('pain_checkins')
      .select('id')
      .eq('user_id', userId)
      .eq('check_in_date', today)
      .maybeSingle()

    if (error) {
      console.error('Error checking today\'s check-in:', error)
      return false
    }

    return !!data
  } catch (error) {
    console.error('Error in hasCheckedInToday:', error)
    return false
  }
}

/**
 * Get today's pain check-in for a user
 * @param userId - User ID
 * @returns Promise<PainCheckIn | null>
 */
export async function getTodayCheckIn(userId: string): Promise<PainCheckIn | null> {
  try {
    const today = getTodayDate()

    const { data, error } = await supabase
      .from('pain_checkins')
      .select('*')
      .eq('user_id', userId)
      .eq('check_in_date', today)
      .maybeSingle()

    if (error) {
      console.error('Error getting today\'s check-in:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getTodayCheckIn:', error)
    return null
  }
}

/**
 * Submit a pain check-in with Mind/Body/Soul scores
 * @param userId - User ID
 * @param mindScore - Mind wellness score (0-10, higher = worse)
 * @param bodyScore - Body wellness score (0-10, higher = worse)
 * @param soulScore - Soul wellness score (0-10, higher = worse)
 * @param notes - Optional notes
 * @returns Promise<PainCheckIn | null>
 */
export async function submitPainCheckIn(
  userId: string,
  mindScore: number,
  bodyScore: number,
  soulScore: number,
  notes: string | null
): Promise<PainCheckIn | null> {
  try {
    const today = getTodayDate()

    // Validate scores
    const validateScore = (score: number, name: string) => {
      if (score < 0 || score > 10) {
        throw new Error(`${name} score must be between 0 and 10`)
      }
    }
    validateScore(mindScore, 'Mind')
    validateScore(bodyScore, 'Body')
    validateScore(soulScore, 'Soul')

    // Calculate overall pain level (weighted — higher scores pull the result up)
    const painLevel = calculateCompositePain(mindScore, bodyScore, soulScore)

    // Check if already checked in today
    const existingCheckIn = await getTodayCheckIn(userId)

    if (existingCheckIn) {
      // Update existing check-in
      const { data, error } = await supabase
        .from('pain_checkins')
        .update({
          mind_score: mindScore,
          body_score: bodyScore,
          soul_score: soulScore,
          pain_level: painLevel,
          pain_locations: [], // Deprecated field
          notes: notes,
        })
        .eq('id', existingCheckIn.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating pain check-in:', error)
        throw error
      }

      return data
    } else {
      // Create new check-in
      const { data, error } = await supabase
        .from('pain_checkins')
        .insert({
          user_id: userId,
          mind_score: mindScore,
          body_score: bodyScore,
          soul_score: soulScore,
          pain_level: painLevel,
          pain_locations: [], // Deprecated field
          notes: notes,
          check_in_date: today,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating pain check-in:', error)
        throw error
      }

      return data
    }
  } catch (error) {
    console.error('Error in submitPainCheckIn:', error)
    throw error
  }
}

/**
 * Get wellness level description and color for a category score
 * @param score - Wellness score (0-10, higher = more impact/worse)
 * @returns Object with label and color
 */
export function getWellnessLevelInfo(score: number): { label: string; color: string } {
  if (score === 0) {
    return { label: 'Not at all', color: '#34C759' } // Green
  } else if (score <= 2) {
    return { label: 'Barely there', color: '#34C759' } // Green
  } else if (score <= 4) {
    return { label: 'I feel it sometimes', color: '#FFD60A' } // Yellow
  } else if (score <= 6) {
    return { label: 'Gets in the way', color: '#FF9500' } // Orange
  } else if (score <= 8) {
    return { label: 'I feel it a lot', color: '#FF9500' } // Orange
  }
   else if (score <= 9) {
    return { label: 'Deeply affects it', color: '#FF3B30' } // Red
  } else {
    return { label: 'Ruining my life', color: '#FF3B30' } // Red
  }
}

/**
 * Get pain check-in history for a user
 * @param userId - User ID
 * @param daysBack - Number of days to look back (default: 30)
 * @returns Promise<PainCheckIn[]>
 */
export async function getPainCheckInHistory(
  userId: string,
  daysBack: number = 30
): Promise<PainCheckIn[]> {
  try {
    const { data, error } = await supabase
      .from('pain_checkins')
      .select('*')
      .eq('user_id', userId)
      .gte('check_in_date', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('check_in_date', { ascending: false })

    if (error) {
      console.error('Error getting pain check-in history:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getPainCheckInHistory:', error)
    return []
  }
}

/**
 * Get pain statistics for a user
 * @param userId - User ID
 * @param daysBack - Number of days to analyze (default: 30)
 * @returns Promise<PainStatistics>
 */
export async function getPainStatistics(
  userId: string,
  daysBack: number = 30
): Promise<PainStatistics> {
  try {
    const { data, error } = await supabase.rpc('get_pain_statistics', {
      target_user_id: userId,
      days_back: daysBack,
    })

    if (error) {
      console.error('Error getting pain statistics:', error)
      throw error
    }

    return data as PainStatistics
  } catch (error) {
    console.error('Error in getPainStatistics:', error)
    // Return default statistics
    return {
      current_pain: 0,
      avg_7_days: 0,
      avg_30_days: 0,
      pain_free_days: 0,
      trend: 'insufficient_data',
      // Per-category defaults
      current_mind: 0,
      current_body: 0,
      current_soul: 0,
      mind_avg_7_days: 0,
      body_avg_7_days: 0,
      soul_avg_7_days: 0,
    }
  }
}

/**
 * Get pain level description and color
 * @param painLevel - Pain level (0-10)
 * @returns Object with label and color
 */
export function getPainLevelInfo(painLevel: number): { label: string; color: string } {
  if (painLevel === 0) {
    return { label: 'Pain Free', color: '#34C759' } // Green
  } else if (painLevel <= 3) {
    return { label: 'Mild', color: '#FFD60A' } // Yellow
  } else if (painLevel <= 6) {
    return { label: 'Moderate', color: '#FF9500' } // Orange
  } else {
    return { label: 'Severe', color: '#FF3B30' } // Red
  }
}

/**
 * Get encouragement message based on pain level
 * @param painLevel - Pain level (0-10)
 * @returns Encouragement message
 */
export function getEncouragementMessage(painLevel: number): string {
  if (painLevel <= 2) {
    return "Great job staying pain-free! Keep it up!"
  } else if (painLevel <= 5) {
    return "You're managing well. Keep up with your routines!"
  } else if (painLevel <= 8) {
    return "We're here to help. Check out recovery routines for your pain areas."
  } else {
    return "We recommend consulting a healthcare professional for severe pain."
  }
}

/**
 * Get pain trend description and icon
 * @param trend - Pain trend
 * @returns Object with description, icon, and color
 */
export function getPainTrendInfo(trend: string): { description: string; icon: string; color: string } {
  switch (trend) {
    case 'decreasing':
      return {
        description: 'Pain decreasing',
        icon: '↓',
        color: '#34C759', // Green
      }
    case 'stable':
      return {
        description: 'Pain stable',
        icon: '→',
        color: '#FFD60A', // Yellow
      }
    case 'increasing':
      return {
        description: 'Pain increasing',
        icon: '↑',
        color: '#FF3B30', // Red
      }
    default:
      return {
        description: 'Not enough data',
        icon: '—',
        color: '#808080', // Gray
      }
  }
}
