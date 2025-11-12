// User Types
export type FitnessLevel = 'Beginner' | 'Intermediate' | 'Advanced'
export type JourneyFocus = 'Injury Prevention' | 'Recovery'
export type JourneyFocusOption = 'Injury Prevention' | 'Recovery' | 'Both'

export interface Profile {
  id: string
  full_name: string | null
  username: string | null
  age: number | null
  fitness_level: FitnessLevel | null
  journey_focus: JourneyFocus | null
  journey_started_at: string | null // Timestamp when user began their journey
  recovery_areas: string[] // Array of body parts user is recovering from
  recovery_goals: string[] // Array of predefined recovery goals
  injuries: string[]
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
  // Advanced search fields
  tags?: string[] // General tags for categorization (e.g., "Desk Work", "Upper Body")
  body_parts?: string[] // Body parts targeted by this routine (e.g., ["Neck", "Shoulder"])
  // Discovery system fields
  is_public?: boolean // Whether custom routine is publicly discoverable
  save_count?: number // Number of users who saved/bookmarked this routine
  is_saved?: boolean // Whether current user has saved this routine
  // Badge fields
  badge_popular?: boolean // >100 completions
  badge_trending?: boolean // >20 saves in last 7 days
  badge_new?: boolean // Created within last 7 days
  badge_official?: boolean // Pre-built by Soteria team
  // Creator info (for community routines)
  creator_name?: string
  creator_username?: string
  creator_avatar?: string
}

// Routine Discovery Types
export type RoutineSortOption = 'popular' | 'trending' | 'newest' | 'most_saved'
export type RoutineSourceFilter = 'all' | 'official' | 'community'

export interface RoutineFilters {
  category?: RoutineCategory
  difficulty?: RoutineDifficulty
  journeyFocus?: JourneyFocus
  source?: RoutineSourceFilter
  durationMin?: number
  durationMax?: number
  searchQuery?: string
}

export interface RoutineDiscoverParams {
  sort?: RoutineSortOption
  filters?: RoutineFilters
  limit?: number
  offset?: number
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
  // Phase 1: Per-category streaks
  mind_current_streak: number
  body_current_streak: number
  soul_current_streak: number
  mind_longest_streak: number
  body_longest_streak: number
  soul_longest_streak: number
  // Phase 1: Unique routine tracking
  unique_mind_routines: number
  unique_body_routines: number
  unique_soul_routines: number
  // Phase 1: Last activity per category (for avatar light levels)
  last_mind_activity: string | null
  last_body_activity: string | null
  last_soul_activity: string | null
  // Phase 1: Harmony score (0-100)
  harmony_score: number
}

// Health Score Tiers
export type HealthScoreTier = 'Getting Started' | 'Building Momentum' | 'Thriving' | 'Optimal Health'

export interface HealthScoreInfo {
  score: number
  tier: HealthScoreTier
  color: string
}

// Avatar Light States (Phase 2)
export type AvatarLightState = 'Dormant' | 'Sleepy' | 'Awakening' | 'Glowing' | 'Radiant'

export interface AvatarState {
  category: RoutineCategory
  lightState: AvatarLightState
  lastActivity: string | null
  currentStreak: number
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
  // Optional tag fields for AI functionality
  tags?: string[]
  body_parts?: string[]
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

// Social Features Types

// Friendship Types
export type FriendshipStatus = 'pending' | 'accepted' | 'blocked'

export interface Friendship {
  id: string
  user_id: string
  friend_id: string
  status: FriendshipStatus
  created_at: string
  accepted_at: string | null
}

export interface FriendWithProfile extends Friendship {
  friend_profile: Profile
}

export interface FriendRequest {
  id: string
  user_id: string
  friend_id: string
  status: FriendshipStatus
  created_at: string
  requester_profile: Profile
}

// Circle Types
export type CircleRole = 'admin' | 'member'

export interface Circle {
  id: string
  name: string
  description: string | null
  created_by: string
  is_private: boolean
  created_at: string
  member_count?: number
  creator_profile?: Profile
}

export interface CircleMember {
  id: string
  circle_id: string
  user_id: string
  role: CircleRole
  joined_at: string
  profile?: Profile
}

export interface CircleWithMembers extends Circle {
  members: CircleMember[]
}

export interface CircleRoutine {
  id: string
  circle_id: string
  routine_id: string
  shared_by: string
  shared_at: string
  routine?: Routine
  sharer_profile?: Profile
}

// Activity Feed Types
export type ActivityType =
  | 'completed_routine'
  | 'created_routine'
  | 'streak_milestone'
  | 'joined_circle'
  | 'left_circle'
  | 'invited_to_circle'
  | 'removed_from_circle'
  | 'shared_routine'
  | 'completed_circle_routine'
  | 'added_routine_to_circle'
  | 'routine_became_popular'

export interface FriendActivity {
  id: string
  user_id: string
  activity_type: ActivityType
  related_routine_id: string | null
  related_circle_id: string | null
  activity_data: Record<string, any> | null
  created_at: string
  user_profile?: Profile
  routine?: Routine
  circle?: Circle
}

export interface ActivityFeedItem {
  id: string
  user: Profile
  activityType: ActivityType
  message: string
  timestamp: string
  routineId?: string
  routineName?: string
  circleId?: string
  circleName?: string
  metadata?: Record<string, any>
}

// Circle Invitation Types
export interface CircleInvitation {
  id: string
  circle_id: string
  inviter_id: string
  invitee_id: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  responded_at: string | null
  circle?: Circle
  inviter_profile?: Profile
}

// Search Types
export interface UserSearchResult {
  id: string
  full_name: string | null
  username: string | null
  profile_picture_url: string | null
  journey_focus: JourneyFocus | null
  fitness_level: FitnessLevel | null
  friendship_status?: FriendshipStatus | null
  match_score?: number
}
