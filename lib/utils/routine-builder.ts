import { supabase } from '../supabase/client'
import {
  Exercise,
  JourneyFocus,
  JourneyFocusOption,
  RoutineBuilderData,
  RoutineCategory,
  RoutineDifficulty
} from '@/types'
import { recordActivity } from './social'

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
 * Check if user is a Health Team member
 */
export async function isHealthTeamMember(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error checking health team status:', error)
    return false
  }

  return data?.role === 'health_team' || data?.role === 'admin'
}

/**
 * Get user's full name for official author attribution
 */
async function getUserFullName(userId: string): Promise<string> {
  const { data } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .single()

  return data?.full_name || 'Soteria Health Team'
}

/**
 * Create and publish a custom routine or official routine (for Health Team)
 */
export async function publishCustomRoutine(
  userId: string,
  routineData: RoutineBuilderData,
  isOfficialRoutine = false
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

  // Check if user is Health Team member for official routines
  const isHealthTeam = await isHealthTeamMember(userId)
  const shouldCreateOfficial = isOfficialRoutine && isHealthTeam

  // Get official author name if creating official routine
  const officialAuthor = shouldCreateOfficial
    ? await getUserFullName(userId)
    : null

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
      is_custom: !shouldCreateOfficial, // Official routines are not custom
      author_type: shouldCreateOfficial ? 'official' : 'community',
      official_author: officialAuthor,
      is_public: true, // All routines are public by default (can be made private later)
      created_by: userId,
      completion_count: 0,
      benefits: routineData.benefits || [], // Array of benefit strings
      created_at: new Date().toISOString(),
      // Optional tag fields for AI functionality
      tags: routineData.tags || [],
      body_parts: routineData.body_parts || [],
      // Harmony gating - only health team can set this
      is_advanced: shouldCreateOfficial ? (routineData.is_advanced || false) : false,
    })
    .select('id')
    .single()

  if (error) throw error
  if (!data) throw new Error('Failed to create routine')

  // Record activity for friends to see
  try {
    await recordActivity(userId, 'created_routine', {
      routine_id: data.id,
      routine_name: routineData.name,
      category: routineData.category,
    })
  } catch (activityError) {
    // Don't fail the creation if activity recording fails
    console.error('Failed to record activity:', activityError)
  }

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

  // Check if user is Health Team member
  const isHealthTeam = await isHealthTeamMember(userId)

  // Update routine in database
  // Note: Health team members can edit official routines (is_custom = false)
  // Regular users can only edit their own custom routines (is_custom = true)
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
      benefits: routineData.benefits || [], // Update benefits
      // Optional tag fields for AI functionality
      tags: routineData.tags || [],
      body_parts: routineData.body_parts || [],
      // Harmony gating - only health team can update this
      ...(isHealthTeam && { is_advanced: routineData.is_advanced || false }),
    })
    .eq('id', routineId)

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
 * Convert a custom routine to official (Health Team only)
 * Preserves original creator attribution, updates type to official
 */
export async function convertToOfficial(
  userId: string,
  routineId: string,
  routineData: RoutineBuilderData
): Promise<void> {
  // Verify user is Health Team member
  const isHealthTeam = await isHealthTeamMember(userId)
  if (!isHealthTeam) {
    throw new Error('Only Health Team members can convert routines to official')
  }

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

  // Get the routine to preserve original creator
  const { data: existingRoutine, error: fetchError } = await supabase
    .from('routines')
    .select('created_by, official_author')
    .eq('id', routineId)
    .single()

  if (fetchError) throw fetchError

  // Get official author name for display
  const officialAuthor = await getUserFullName(existingRoutine.created_by)

  // Update routine to official status while preserving original creator
  const updateData = {
    name: routineData.name,
    description: routineData.description,
    category: routineData.category,
    difficulty: routineData.difficulty,
    journey_focus: journeyFocusArray,
    duration_minutes: durationMinutes,
    exercises: exercises,
    benefits: routineData.benefits || [],
    tags: routineData.tags || [],
    body_parts: routineData.body_parts || [],
    // Conversion to official
    is_custom: false,
    author_type: 'official',
    official_author: officialAuthor,
    is_public: true, // Official routines are always public
    is_advanced: routineData.is_advanced || false, // Harmony gating
    // created_by stays the same (preserves original creator)
  }

  console.log('Converting routine to official:', routineId, updateData)

  const { error, data, count } = await supabase
    .from('routines')
    .update(updateData)
    .eq('id', routineId)
    .select()

  console.log('Conversion result:', { error, data, count })

  if (error) {
    console.error('Conversion error:', error)
    throw error
  }

  if (!data || data.length === 0) {
    throw new Error('Failed to convert routine - no rows updated. Check RLS policies.')
  }

  console.log('Successfully converted routine to official')
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

  // Validate benefits if provided
  if (routineData.benefits && routineData.benefits.length > 0) {
    if (routineData.benefits.length > 4) {
      errors.push('Maximum 4 benefits allowed')
    }

    routineData.benefits.forEach((benefit, index) => {
      const trimmedBenefit = benefit.trim()
      if (trimmedBenefit.length < 5) {
        errors.push(`Benefit ${index + 1} must be at least 5 characters`)
      }
      if (trimmedBenefit.length > 100) {
        errors.push(`Benefit ${index + 1} must be less than 100 characters`)
      }
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
