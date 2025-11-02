import { supabase } from '../supabase/client'
import { DailyProgress, Routine, RoutineCategory, UserStats, JourneyFocus, FitnessLevel } from '@/types'
import { format } from 'date-fns'

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
  return data
}
