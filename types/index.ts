// User Types
export type FitnessLevel = 'Beginner' | 'Intermediate' | 'Advanced'
export type JourneyFocus = 'Injury Prevention' | 'Recovery'
export type JourneyFocusOption = 'Injury Prevention' | 'Recovery' | 'Both'

export interface Profile {
  id: string
  full_name: string | null
  age: number | null
  fitness_level: FitnessLevel | null
  journey_focus: JourneyFocus | null
  journey_started_at: string | null // Timestamp when user began their journey
  recovery_areas: string[] // Array of body parts user is recovering from
  recovery_goals: string[] // Array of predefined recovery goals
  injuries: string[]
  goals: string[]
  profile_picture_url: string | null
  created_at: string
  updated_at: string
}

// Routine Types
export type RoutineCategory = 'Mind' | 'Body' | 'Soul'
export type RoutineDifficulty = 'Beginner' | 'Intermediate' | 'Advanced'

export interface Exercise {
  name: string
  instructions: string
  duration_seconds: number
  demo_image_url?: string
}

export interface Routine {
  id: string
  name: string
  category: RoutineCategory
  description: string
  duration_minutes: number
  difficulty: RoutineDifficulty
  journey_focus: JourneyFocus[] // Routines can target one or both journey focuses
  benefits: string[]
  exercises: Exercise[]
  completion_count: number
  is_custom: boolean
  created_by?: string
  created_at: string
}

// Completion Types
export interface RoutineCompletion {
  id: string
  user_id: string
  routine_id: string
  completed_at: string
  category: RoutineCategory
}

// Progress Types
export interface DailyProgress {
  id: string
  user_id: string
  date: string
  mind_complete: boolean
  body_complete: boolean
  soul_complete: boolean
}

// Stats Types
export interface UserStats {
  user_id: string
  current_streak: number
  longest_streak: number
  health_score: number
  total_routines: number
  mind_routines: number
  body_routines: number
  soul_routines: number
  last_activity_date: string | null
  updated_at: string
}

// Health Score Tiers
export type HealthScoreTier = 'Getting Started' | 'Building Momentum' | 'Thriving' | 'Optimal Health'

export interface HealthScoreInfo {
  score: number
  tier: HealthScoreTier
  color: string
}

// Routine Builder Types
export interface RoutineBuilderExercise extends Exercise {
  id: string // Temporary ID for tracking in the builder
}

export interface RoutineBuilderData {
  name: string
  description: string
  category: RoutineCategory
  difficulty: RoutineDifficulty
  journeyFocus: JourneyFocusOption
  exercises: RoutineBuilderExercise[]
}

// Journey Goals Types
export interface JourneyGoal {
  id: string
  user_id: string
  journey_focus: JourneyFocus
  target_description: string
  target_date: string | null
  is_active: boolean
  created_at: string
  completed_at: string | null
}

// Recovery area options organized by body region
export const UPPER_BODY_AREAS = [
  'Neck',
  'Shoulder',
  'Upper Back',
  'Elbow',
  'Wrist',
  'Hand',
] as const

export const LOWER_BODY_AREAS = [
  'Lower Back',
  'Hip',
  'Knee',
  'Ankle',
  'Foot',
] as const

export const ALL_RECOVERY_AREAS = [...UPPER_BODY_AREAS, ...LOWER_BODY_AREAS] as const

export type RecoveryArea = typeof ALL_RECOVERY_AREAS[number]
export type BodyRegion = 'Upper Body' | 'Lower Body' | 'All'

// Predefined recovery goals
export const RECOVERY_GOALS = [
  'Reduce pain and discomfort',
  'Improve range of motion',
  'Increase strength',
  'Return to daily activities',
  'Return to sports/exercise',
  'Prevent re-injury',
  'Improve posture',
  'Reduce inflammation',
] as const

export type RecoveryGoal = typeof RECOVERY_GOALS[number]
