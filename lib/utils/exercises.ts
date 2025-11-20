/**
 * Exercise Library Management Utilities
 *
 * Functions for creating, reading, updating, and deleting exercises
 * Used by health team to manage the exercise library
 */

import { supabase } from '../supabase/client'
import type { ExerciseLibraryItem, RoutineCategory, RoutineDifficulty } from '../../types'

export interface ExerciseFilters {
  category?: RoutineCategory
  difficulty?: RoutineDifficulty
  searchQuery?: string
  bodyParts?: string[]
  tags?: string[]
  isOfficial?: boolean
  requiresEquipment?: boolean
  createdBy?: string
}

export interface CreateExerciseInput {
  name: string
  description: string
  instructions: string
  category: RoutineCategory
  difficulty: RoutineDifficulty
  default_duration_seconds: number
  body_parts?: string[]
  tags?: string[]
  demo_image_url?: string
  demo_video_url?: string
  is_official?: boolean
  is_public?: boolean
  requires_equipment?: boolean
}

export interface UpdateExerciseInput extends Partial<CreateExerciseInput> {
  id: string
}

/**
 * Get all exercises (with optional filters)
 */
export async function getExercises(
  filters?: ExerciseFilters
): Promise<{ exercises: ExerciseLibraryItem[]; error: Error | null }> {
  try {
    let query = supabase.from('exercises').select('*')

    // Apply filters
    if (filters?.category) {
      query = query.eq('category', filters.category)
    }

    if (filters?.difficulty) {
      query = query.eq('difficulty', filters.difficulty)
    }

    if (filters?.isOfficial !== undefined) {
      query = query.eq('is_official', filters.isOfficial)
    }

    if (filters?.createdBy) {
      query = query.eq('created_by', filters.createdBy)
    }

    if (filters?.requiresEquipment !== undefined) {
      query = query.eq('requires_equipment', filters.requiresEquipment)
    }

    // Search by name/description/instructions
    if (filters?.searchQuery) {
      query = query.or(
        `name.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%,instructions.ilike.%${filters.searchQuery}%`
      )
    }

    // Filter by body parts (array contains)
    if (filters?.bodyParts && filters.bodyParts.length > 0) {
      query = query.contains('body_parts', filters.bodyParts)
    }

    // Filter by tags (array overlaps)
    if (filters?.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags)
    }

    // Order by most recently created
    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) throw error

    return { exercises: data || [], error: null }
  } catch (error) {
    console.error('Error fetching exercises:', error)
    return { exercises: [], error: error as Error }
  }
}

/**
 * Get a single exercise by ID
 */
export async function getExerciseById(
  exerciseId: string
): Promise<{ exercise: ExerciseLibraryItem | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('id', exerciseId)
      .single()

    if (error) throw error

    return { exercise: data, error: null }
  } catch (error) {
    console.error('Error fetching exercise:', error)
    return { exercise: null, error: error as Error }
  }
}

/**
 * Create a new exercise (health team only)
 */
export async function createExercise(
  input: CreateExerciseInput,
  userId: string
): Promise<{ exercise: ExerciseLibraryItem | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('exercises')
      .insert({
        ...input,
        created_by: userId,
        is_official: input.is_official ?? false,
        is_public: input.is_public ?? true,
      })
      .select()
      .single()

    if (error) throw error

    return { exercise: data, error: null }
  } catch (error) {
    console.error('Error creating exercise:', error)
    return { exercise: null, error: error as Error }
  }
}

/**
 * Update an existing exercise
 */
export async function updateExercise(
  input: UpdateExerciseInput
): Promise<{ exercise: ExerciseLibraryItem | null; error: Error | null }> {
  try {
    const { id, ...updates } = input

    const { data, error } = await supabase
      .from('exercises')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return { exercise: data, error: null }
  } catch (error) {
    console.error('Error updating exercise:', error)
    return { exercise: null, error: error as Error }
  }
}

/**
 * Delete an exercise
 */
export async function deleteExercise(
  exerciseId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase.from('exercises').delete().eq('id', exerciseId)

    if (error) throw error

    return { success: true, error: null }
  } catch (error) {
    console.error('Error deleting exercise:', error)
    return { success: false, error: error as Error }
  }
}

/**
 * Get official exercises (for routine builder)
 */
export async function getOfficialExercises(): Promise<{
  exercises: ExerciseLibraryItem[]
  error: Error | null
}> {
  return getExercises({ isOfficial: true })
}

/**
 * Get exercises by category (for routine builder)
 */
export async function getExercisesByCategory(
  category: RoutineCategory
): Promise<{ exercises: ExerciseLibraryItem[]; error: Error | null }> {
  return getExercises({ category, isOfficial: true })
}

/**
 * Search exercises
 */
export async function searchExercises(
  query: string
): Promise<{ exercises: ExerciseLibraryItem[]; error: Error | null }> {
  return getExercises({ searchQuery: query })
}

/**
 * Check if user is health team member (can create exercises)
 */
export async function canCreateExercises(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (error) throw error

    return data.role === 'health_team' || data.role === 'admin'
  } catch (error) {
    console.error('Error checking permissions:', error)
    return false
  }
}
