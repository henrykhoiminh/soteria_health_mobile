// User Types
export type FitnessLevel = 'Beginner' | 'Intermediate' | 'Advanced'
export type JourneyFocus = 'Injury Prevention' | 'Recovery'

export interface Profile {
  id: string
  full_name: string | null
  age: number | null
  fitness_level: FitnessLevel | null
  journey_focus: JourneyFocus | null
  injuries: string[]
  goals: string[]
  time_availability: number | null
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
