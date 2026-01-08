// User Types
export type JourneyFocus = 'Injury Prevention' | 'Recovery'
export type JourneyFocusOption = 'Injury Prevention' | 'Recovery' | 'Both'
export type UserRole = 'user' | 'health_team' | 'admin'

export interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  username: string | null
  journey_focus: JourneyFocus | null
  journey_started_at: string | null // Timestamp when user began their journey
  profile_picture_url: string | null
  role: UserRole // User role: 'user' (default), 'health_team', or 'admin'
  // Avatar names (narrative onboarding)
  mind_name: string | null
  body_name: string | null
  soul_name: string | null
  // Onboarding status
  onboarding_completed: boolean
  onboarding_completed_at: string | null
  created_at: string
  updated_at: string
}

// Routine Types
export type RoutineCategory = 'Mind' | 'Body' | 'Soul'
export type RoutineDifficulty = 'Beginner' | 'Intermediate' | 'Advanced'
export type RoutineAuthorType = 'official' | 'community'

// Exercise in routine (simple version)
export interface Exercise {
  name: string
  instructions: string
  duration_seconds: number
  demo_image_url?: string
  demo_video_url?: string
}

// Exercise Library Item (full database model)
export interface ExerciseLibraryItem {
  id: string
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
  created_by?: string
  is_official: boolean
  is_public: boolean
  requires_equipment: boolean
  usage_count: number
  created_at: string
  updated_at: string
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
  // Author attribution fields
  author_type: RoutineAuthorType // 'official' or 'community'
  official_author?: string | null // Name of official author (e.g., "Soteria Health Team", "Dr. Smith")
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
  badge_official?: boolean // Pre-built by Soteria team (deprecated - use author_type instead)
  // Creator info (for community routines)
  creator_name?: string
  creator_username?: string
  creator_avatar?: string
  // Harmony gating
  is_advanced?: boolean // Advanced routines require Harmony to access
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
  isAdvanced?: boolean // Filter for Advanced routines (Harmony required)
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
  // Harmony System: 7-day rolling counts
  mind_routines_7d: number
  body_routines_7d: number
  soul_routines_7d: number
  // Harmony System: Status tracking
  is_in_harmony: boolean
  harmony_achieved_at: string | null
  harmony_lost_at: string | null
  // Harmony System: User type (based on 7-day activity)
  user_type: 'mind' | 'body' | 'soul' | 'balanced'
  // Harmony System: Per-category last routine timestamps (for decay)
  mind_last_routine_at: string | null
  body_last_routine_at: string | null
  soul_last_routine_at: string | null
  // Deprecated fields (still in DB but no longer used)
  health_score?: number
  harmony_score?: number
}

// Avatar Light States (Phase 2)
export type AvatarLightState = 'Dormant' | 'Sleepy' | 'Awakening' | 'Glowing' | 'Radiant'

// Harmony System Types
export type UserType = 'mind' | 'body' | 'soul' | 'balanced'

export interface HarmonyStatus {
  isInHarmony: boolean
  harmonyAchievedAt: string | null
  harmonyLostAt: string | null
  userType: UserType
  // 7-day rolling counts
  mind7d: number
  body7d: number
  soul7d: number
  totalRoutines7d: number
  // Today's completions
  mindToday: number
  bodyToday: number
  soulToday: number
  isTodayBalanced: boolean // Did user complete 1+ in each category today?
  isBalanced: boolean // Is the 7-day rolling window balanced?
  // Consecutive balanced days tracking
  consecutiveBalancedDays: number // How many days in a row user has been balanced
  daysUntilHarmony: number // How many more balanced days needed (7 - consecutiveBalancedDays)
  // Daily history for visual progress tracker (last 7-14 days)
  dailyHistory: DailyBalanceRecord[]
  // Daily suggested plan to reach harmony
  suggestedPlan: DailySuggestedRoutines[]
}

export interface DailyBalanceRecord {
  date: string // YYYY-MM-DD
  mind: number
  body: number
  soul: number
  isBalanced: boolean
  isToday: boolean
}

export interface DailySuggestedRoutines {
  day: number // 1, 2, 3... days from now
  date: string // YYYY-MM-DD
  mind: number // Suggested Mind routines for this day
  body: number // Suggested Body routines for this day
  soul: number // Suggested Soul routines for this day
  isCompleted?: boolean // If this day has passed and was balanced
}

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
  // Optional fields for AI-powered search
  tags?: string[]
  body_parts?: string[]
  benefits?: string[] // Array of benefit strings (max 4, each 5-100 chars)
  // Harmony gating - only health team can set this
  is_advanced?: boolean // Advanced routines require Harmony to access
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

// Body part options organized by body region (used for routine tagging)
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

export type BodyRegion = 'Upper Body' | 'Lower Body' | 'All'

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
  first_name: string | null
  last_name: string | null
  full_name?: string | null // Kept for backwards compatibility with database queries
  username: string | null
  profile_picture_url: string | null
  journey_focus: JourneyFocus | null
  friendship_status?: FriendshipStatus | null
  match_score?: number
  role?: UserRole
}

// Pain Check-In Types (Mind/Body/Soul Wellness System)
// Note: Higher scores = worse state (0 = thriving, 10 = struggling)

export interface PainCheckIn {
  id: string
  user_id: string
  // Mind/Body/Soul scores (0-10, higher = worse)
  mind_score: number
  body_score: number
  soul_score: number
  // Overall pain level (derived from average of mind/body/soul)
  pain_level: number // 0-10
  // Legacy field - deprecated, kept for backwards compatibility
  pain_locations: string[] // DEPRECATED: Previously stored body part locations
  notes: string | null
  check_in_date: string // Date in YYYY-MM-DD format
  created_at: string
  updated_at: string
}

export type PainTrend = 'decreasing' | 'stable' | 'increasing' | 'insufficient_data'

export interface PainStatistics {
  // Overall scores
  current_pain: number
  avg_7_days: number
  avg_30_days: number
  pain_free_days: number
  trend: PainTrend
  // Per-category current scores
  current_mind: number
  current_body: number
  current_soul: number
  // Per-category 7-day averages
  mind_avg_7_days: number
  body_avg_7_days: number
  soul_avg_7_days: number
}

// Legacy constant - deprecated but kept for backwards compatibility
export const PAIN_LOCATIONS = [
  'Mind',
  'Soul',
  'Neck',
  'Shoulders',
  'Upper Back',
  'Lower Back',
  'Hips',
  'Knees',
  'Ankles',
  'Wrists',
  'Elbows',
  'Other',
] as const

export type PainLocation = typeof PAIN_LOCATIONS[number]

// Milestone System Types
export type MilestoneCategory =
  | 'streak'
  | 'completion'
  | 'balance'
  | 'specialization'
  | 'pain'
  | 'journey'
  | 'social'
  | 'consistency'

export type MilestoneRarity = 'common' | 'rare' | 'epic' | 'legendary'

export type MilestoneThresholdType = 'count' | 'days' | 'percentage' | 'boolean'

export interface MilestoneDefinition {
  id: string
  category: MilestoneCategory
  name: string
  description: string
  icon_name: string
  icon_color: string
  threshold: number
  threshold_type: MilestoneThresholdType
  rarity: MilestoneRarity
  order_index: number
  created_at: string
}

export interface UserMilestone {
  id: string
  user_id: string
  milestone_id: string
  achieved_at: string
  progress_value: number | null
  shown_celebration: boolean
  shared_to_activity: boolean
  created_at: string
}

export interface MilestoneProgress {
  id: string
  user_id: string
  milestone_id: string
  current_value: number
  last_updated: string
}

export interface MilestoneSummary {
  milestone_id: string
  category: MilestoneCategory
  name: string
  description: string
  icon_name: string
  icon_color: string
  rarity: MilestoneRarity
  threshold: number
  current_progress: number
  is_achieved: boolean
  achieved_at: string | null
  percentage_complete: number
}

export interface UncelebratedMilestone {
  milestone_id: string
  name: string
  description: string
  icon_name: string
  icon_color: string
  rarity: MilestoneRarity
  achieved_at: string
}

// Health Team Types
export type HealthTeamInvitationStatus = 'pending' | 'accepted' | 'declined'

export interface HealthTeamInvitation {
  id: string
  inviter_id: string
  invitee_id: string
  status: HealthTeamInvitationStatus
  created_at: string
  responded_at: string | null
  // Joined data from profiles
  inviter_name?: string
  inviter_username?: string
  inviter_avatar?: string
}

export interface HealthTeamStats {
  official_routines_created: number
  total_official_completions: number
  official_routines_saved: number
}
