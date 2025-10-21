import { supabase } from '../supabase/client'
import { DailyProgress, Routine, RoutineCategory, UserStats } from '@/types'
import { format } from 'date-fns'

export async function getTodayProgress(userId: string): Promise<DailyProgress | null> {
  const today = format(new Date(), 'yyyy-MM-dd')

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
  const { data, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single()

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
