import { supabase } from '../supabase/client'
import { PainCheckIn, PainStatistics } from '@/types'

/**
 * Get today's date in YYYY-MM-DD format (local timezone)
 */
export function getTodayDate(): string {
  const today = new Date()
  return today.toISOString().split('T')[0]
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
 * Submit a pain check-in
 * @param userId - User ID
 * @param painLevel - Pain level (0-10)
 * @param painLocations - Array of pain locations
 * @param notes - Optional notes
 * @returns Promise<PainCheckIn | null>
 */
export async function submitPainCheckIn(
  userId: string,
  painLevel: number,
  painLocations: string[],
  notes: string | null
): Promise<PainCheckIn | null> {
  try {
    const today = getTodayDate()

    // Validate pain level
    if (painLevel < 0 || painLevel > 10) {
      throw new Error('Pain level must be between 0 and 10')
    }

    // Check if already checked in today
    const existingCheckIn = await getTodayCheckIn(userId)

    if (existingCheckIn) {
      // Update existing check-in
      const { data, error } = await supabase
        .from('pain_checkins')
        .update({
          pain_level: painLevel,
          pain_locations: painLocations,
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
          pain_level: painLevel,
          pain_locations: painLocations,
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
    return "Great job staying pain-free! Keep it up! 🎉"
  } else if (painLevel <= 5) {
    return "You're managing well. Keep up with your routines! 💪"
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
