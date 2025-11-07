import { supabase } from '../supabase/client'
import {
  Exercise,
  JourneyFocus,
  JourneyFocusOption,
  RoutineBuilderData,
  RoutineCategory,
  RoutineDifficulty
} from '@/types'

/**
 * Fetch all unique exercises from existing routines to populate the exercise library
 */
export async function getAvailableExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('routines')
    .select('exercises')

  if (error) throw error

  // Extract and deduplicate exercises
  const exerciseMap = new Map<string, Exercise>()

  data?.forEach((routine) => {
    if (routine.exercises && Array.isArray(routine.exercises)) {
      routine.exercises.forEach((exercise: Exercise) => {
        // Use exercise name as key to avoid duplicates
        if (!exerciseMap.has(exercise.name)) {
          exerciseMap.set(exercise.name, exercise)
        }
      })
    }
  })

  // Convert map to array and sort by name
  return Array.from(exerciseMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  )
}

/**
 * Create and publish a custom routine
 */
export async function publishCustomRoutine(
  userId: string,
  routineData: RoutineBuilderData
): Promise<string> {
  // Convert journey focus from "Both" to array format
  let journeyFocusArray: JourneyFocus[]
  if (routineData.journeyFocus === 'Both') {
    journeyFocusArray = ['Injury Prevention', 'Recovery']
  } else {
    journeyFocusArray = [routineData.journeyFocus as JourneyFocus]
  }

  // Calculate total duration in minutes
  const totalSeconds = routineData.exercises.reduce(
    (sum, exercise) => sum + exercise.duration_seconds,
    0
  )
  const durationMinutes = Math.ceil(totalSeconds / 60)

  // Prepare exercises data (remove temporary IDs)
  const exercises = routineData.exercises.map(({ id, ...exercise }) => exercise)

  // Insert routine into database
  const { data, error } = await supabase
    .from('routines')
    .insert({
      name: routineData.name,
      description: routineData.description,
      category: routineData.category,
      difficulty: routineData.difficulty,
      journey_focus: journeyFocusArray,
      duration_minutes: durationMinutes,
      exercises: exercises,
      is_custom: true,
      created_by: userId,
      completion_count: 0,
      benefits: [], // Can be expanded later
      created_at: new Date().toISOString(),
      // Optional tag fields for AI functionality
      tags: routineData.tags || [],
      body_parts: routineData.body_parts || [],
    })
    .select('id')
    .single()

  if (error) throw error
  if (!data) throw new Error('Failed to create routine')

  return data.id
}

/**
 * Get custom routines created by a specific user
 */
export async function getUserCustomRoutines(userId: string) {
  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .eq('is_custom', true)
    .eq('created_by', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Update an existing custom routine
 */
export async function updateCustomRoutine(
  userId: string,
  routineId: string,
  routineData: RoutineBuilderData
): Promise<void> {
  // Convert journey focus from "Both" to array format
  let journeyFocusArray: JourneyFocus[]
  if (routineData.journeyFocus === 'Both') {
    journeyFocusArray = ['Injury Prevention', 'Recovery']
  } else {
    journeyFocusArray = [routineData.journeyFocus as JourneyFocus]
  }

  // Calculate total duration in minutes
  const totalSeconds = routineData.exercises.reduce(
    (sum, exercise) => sum + exercise.duration_seconds,
    0
  )
  const durationMinutes = Math.ceil(totalSeconds / 60)

  // Prepare exercises data (remove temporary IDs)
  const exercises = routineData.exercises.map(({ id, ...exercise }) => exercise)

  // Update routine in database
  const { error } = await supabase
    .from('routines')
    .update({
      name: routineData.name,
      description: routineData.description,
      category: routineData.category,
      difficulty: routineData.difficulty,
      journey_focus: journeyFocusArray,
      duration_minutes: durationMinutes,
      exercises: exercises,
      // Optional tag fields for AI functionality
      tags: routineData.tags || [],
      body_parts: routineData.body_parts || [],
    })
    .eq('id', routineId)
    .eq('created_by', userId)
    .eq('is_custom', true)

  if (error) throw error
}

/**
 * Delete a custom routine (only if created by the user)
 */
export async function deleteCustomRoutine(userId: string, routineId: string) {
  const { error } = await supabase
    .from('routines')
    .delete()
    .eq('id', routineId)
    .eq('created_by', userId)
    .eq('is_custom', true)

  if (error) throw error
}

/**
 * Validate routine builder data before publishing
 */
export function validateRoutineData(routineData: RoutineBuilderData): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!routineData.name || routineData.name.trim().length === 0) {
    errors.push('Routine name is required')
  }

  if (routineData.name && routineData.name.length > 100) {
    errors.push('Routine name must be less than 100 characters')
  }

  if (!routineData.description || routineData.description.trim().length === 0) {
    errors.push('Routine description is required')
  }

  if (routineData.exercises.length === 0) {
    errors.push('At least one exercise is required')
  }

  if (routineData.exercises.length > 30) {
    errors.push('Maximum 30 exercises allowed')
  }

  // Check that all exercises have valid durations
  routineData.exercises.forEach((exercise, index) => {
    if (exercise.duration_seconds <= 0) {
      errors.push(`Exercise ${index + 1} must have a duration greater than 0`)
    }
    if (exercise.duration_seconds > 3600) {
      errors.push(`Exercise ${index + 1} duration cannot exceed 60 minutes`)
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
  }
}
