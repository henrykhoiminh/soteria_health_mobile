# Claude AI Development Context

This file contains technical context, architectural decisions, and implementation details for AI-assisted development of the Soteria Health Mobile app.

## Project Overview

**Type:** React Native mobile app (Expo Router)
**Backend:** Supabase (PostgreSQL + Auth + Storage)
**Primary Users:** Individuals on wellness journeys (Injury Prevention or Recovery)
**Key Features:** Routine execution, custom routine builder, social features, health team system

---

## Current Architecture

### Tech Stack
- **Framework:** Expo Router (file-based routing)
- **Language:** TypeScript (strict mode)
- **UI:** React Native with StyleSheet
- **State:** React Context (AuthContext, FilterOptionsContext) + local useState
- **Backend:** Supabase (PostgreSQL, Auth, Storage, RLS)
- **Icons:** @expo/vector-icons (Ionicons)
- **Gestures:** react-native-gesture-handler (minimal usage after recent changes)

### Key Dependencies
```json
{
  "@supabase/supabase-js": "^2.x",
  "expo-router": "~6.x",
  "expo-image-picker": "latest",
  "expo-av": "~16.x",
  "expo-haptics": "latest",
  "lottie-react-native": "^7.x",
  "@react-native-async-storage/async-storage": "latest",
  "@react-native-picker/picker": "latest",
  "@react-native-community/slider": "latest",
  "react-native-gesture-handler": "latest"
}
```

## File Structure

### Critical Files & Their Purposes

```
app/(tabs)/
├── _layout.tsx         # Tab layout with SwipeableTabs (icon-only nav, fill/outline states)
├── index.tsx           # Dashboard - Today's progress, pain tracking, recommendations
├── routines.tsx        # Browse/search routines with filters
├── builder.tsx         # Mode select → 3 category exercise libraries + routine builder
│                       # Modes: Mind/Body/Soul Exercises, Routine Builder, Manage Filters
└── profile.tsx         # User profile with GlassCard sections over SanctumBackground

app/(auth)/
├── login.tsx           # Login with logo
├── signup.tsx          # Sign up
├── verify-email.tsx    # Email verification
└── onboarding.tsx      # Multi-step onboarding (2-5 steps based on journey type)

app/routines/
├── [id].tsx            # Routine detail view
└── [id]/execute.tsx    # Routine execution with timer

app/circles/
└── [id].tsx            # Circle detail page (Activity/Chat/Routines/Members tabs, ROTD card)

components/
├── Dashboard/
│   ├── GlassCard.tsx              # Frosted glass card with gold top edge glow (blur on iOS)
│   ├── SanctumBackground.tsx      # Time-of-day background with dark overlay + fade gradient
│   └── SanctumScene.tsx           # Companion avatars scene with top gradient overlay
├── SwipeableTabs.tsx              # PagerView-based tab navigation (icon-only, fill/outline)
├── ExerciseLibrary.tsx            # Exercise browser with filters (category, difficulty, body parts, tags)
├── DraggableExerciseList.tsx      # Exercise cards with reorder/edit/delete (NO gestures)
├── FilterOptionsManager.tsx       # Admin UI for managing body parts (chip-based, optimistic)
├── FilterOptionEditorModal.tsx    # Modal for adding/editing body parts and groups
├── HapticPressable.tsx            # Drop-in TouchableOpacity replacement with haptic feedback
├── JourneyBadge.tsx               # Journey type badge with icon
├── LevelUpCelebrationModal.tsx    # Level-up celebration with companion art (Radiant state)
├── MilestoneCelebrationModal.tsx  # Milestone achievement celebration modal
├── MilestoneCard.tsx              # Milestone progress/achievement card
├── PainCheckInModal.tsx           # 3-step pain check-in modal
├── UserProfileModal.tsx           # Bottom-sheet profile modal (Circles & Friends)
└── HealthTeamInvitationCard.tsx   # Health team invitation UI

lib/
├── contexts/AuthContext.tsx     # Global auth + profile state
├── contexts/FilterOptionsContext.tsx # Dynamic body parts context (replaces hardcoded constants)
├── supabase/client.ts           # Supabase client config
└── utils/
    ├── auth.ts                  # Auth, profile, upload
    ├── audio.ts                 # Audio playback for countdown beeps
    ├── companion-images.ts      # PNG image mapping for all 3 companions (Mind/Body/Soul × 5 light states)
    ├── dashboard.ts             # Dashboard data, recommendations
    ├── dashboard-cache.ts       # In-memory cache for fluid navigation
    ├── haptics.ts               # Centralized haptic feedback (light/medium/heavy/selection)
    ├── harmony.ts               # Harmony status checking
    ├── leveling.ts              # XP calculation, level-from-XP, titles, addXpForCompletion
    ├── milestones.ts            # Milestone CRUD, rarity/category helpers, progress tracking
    ├── pain-checkin.ts          # Pain check-in logic
    ├── filter-options.ts        # Filter options CRUD (body parts management)
    ├── routine-builder.ts       # Builder utilities & validation
    ├── social.ts                # Friendships, circles, activity feed, ROTD, bonus XP
    └── health-team.ts           # Health team functions

assets/
├── images/
│   ├── mind_states/             # Mind companion PNG art (7 images for 5 light states)
│   ├── body_states/             # Body companion PNG art (5 images for 5 light states)
│   └── soul_states/             # Soul companion PNG art (3 unique + 2 fallbacks — Glowing/Radiant needed)
├── sounds/
│   └── count_down_beep.mp3      # Countdown timer beep sound
└── animations/
    └── routine_complete.json    # Completion animation (Lottie)

sql/migrations/
├── add_health_team_system.sql           # Role system
├── add_health_team_invitations.sql      # Invitation system
├── add_health_team_stats.sql            # Stats tracking
├── add_leave_health_team_function.sql   # Leave/demote function
└── add_health_team_delete_policy.sql    # Delete RLS policy

sql/social_migration/
└── add_routine_of_the_day.sql           # ROTD columns + circle_rotd_bonus_log table
```

## Database Schema Reference

### Key Tables

**profiles**
- `id` (uuid, PK) - Links to auth.users
- `role` (text) - 'user' | 'health_team' | 'admin'
- `full_name`, `username`, `profile_picture_url`
- `journey_focus` (text) - 'Injury Prevention' | 'Recovery'
- `journey_started_at` (timestamptz)
- `recovery_area` (text), `recovery_notes` (text)
- `fitness_level` (text) - 'Beginner' | 'Intermediate' | 'Advanced'

**routines**
- `id` (uuid, PK)
- `name`, `description`
- `category` (text) - 'Mind' | 'Body' | 'Soul'
- `difficulty` (text) - 'Beginner' | 'Intermediate' | 'Advanced'
- `journey_focus` (text[]) - Array: ['Injury Prevention'] and/or ['Recovery']
- `exercises` (jsonb) - Array of exercise objects
- `is_custom` (boolean) - true for user-created
- `created_by` (uuid) - Creator user ID
- `author_type` (text) - 'official' | 'community' | null
- `tags` (text[]), `body_parts` (text[])
- `duration_minutes` (integer)

**health_team_invitations**
- `id` (uuid, PK)
- `inviter_id` (uuid) - Admin who sent invite
- `invitee_id` (uuid) - User being invited
- `status` (text) - 'pending' | 'accepted' | 'declined'
- `created_at`, `responded_at` (timestamptz)

**pain_checkins**
- `id` (uuid, PK)
- `user_id` (uuid)
- `check_in_date` (date)
- `pain_level` (integer) - 0-10
- `pain_locations` (text[]) - Body parts, Mind, Soul
- `notes` (text, optional)

**user_stats**
- `user_id` (uuid, PK)
- `total_xp`, `mind_xp`, `body_xp`, `soul_xp` (integer)
- Used by leveling system for XP tracking per category

**circle_rotd_bonus_log**
- `id` (uuid, PK)
- `circle_id` (uuid) - References circles
- `routine_id` (uuid) - References routines
- `bonus_date` (date) - Unique per circle per day
- `bonus_xp` (integer) - Amount awarded (50 XP)
- `awarded_at` (timestamptz)
- Constraint: `unique_circle_rotd_bonus_per_day (circle_id, bonus_date)`
---

## Common Commands

```bash
# Start with cache clear
npm start -- --clear

# Kill port 8081 (if stuck)
lsof -ti:8081 | xargs kill -9
```
---

## Code Style & Conventions

### TypeScript
- Use strict mode
- Explicit return types for functions
- Interface over type for objects
- Null checks before accessing properties

### React Components
- Functional components only
- Hooks at top of component
- Early returns for loading/error states
- Destructure props in function signature

### Styling
- StyleSheet.create() for all styles
- Consistent spacing: 4, 8, 12, 16, 24, 32, 40
- Border radius: 8 (inputs), 12 (cards), 16 (badges)
- Use AppColors constants, never hardcoded colors

### Naming
- Components: PascalCase
- Files: PascalCase for components, camelCase for utils
- Functions: camelCase, descriptive verbs (handleSubmit, fetchData)
- Constants: UPPER_SNAKE_CASE
- Styles: camelCase (buttonContainer, primaryText)

## Important Notes for AI

1. **Always check for existing patterns** before implementing new ones
2. **Test gesture-heavy features** extensively before committing
3. **Never use position: absolute** for navigation inside ScrollViews
4. **Always add error handling** to Supabase queries
5. **Check RLS policies** when users report "permission denied" errors
6. **Use confirmation dialogs** for all destructive actions
7. **Keep UI simple** - tap buttons over complex gestures
8. **Reference this file** at the start of each session for context

## Session History Summary

**Last Updated:** 2026-03-09
**Current Version:** Expo SDK 54, React Native 0.76+

### Recent Completions (2026-03-09)
- **Daily Circle Routine card** — Renamed header to "Daily Circle Routine!", added bonus XP subheader, member completion avatar tracker with detail modal, celebration state with golden glow when all members complete, auto-awarding 50 bonus XP (category-specific) via idempotent `circle_rotd_bonus_log` table
- **Level-up celebration companion art** — `LevelUpCelebrationModal` now shows the companion PNG at Radiant state for Mind/Body/Soul level-ups (trophy icon kept for Soteria overall level)
- **SQL migration** — Added `circle_rotd_bonus_log` table to `sql/social_migration/add_routine_of_the_day.sql`
- **Data layer** — Extended `RoutineOfTheDay` interface with `completedByUserIds[]` and `bonusAwarded`, added `awardRotdBonusXp()` function to `social.ts`
- **Today's Focus bonus recommendation** — When all 3 companions are complete, "Today's Focus" now shows a wellness-aware category recommendation (using `getBonusCategory()`) instead of a generic "Do another routine" button. Tapping opens `RecommendedRoutineModal` with a personalized routine.
- **Onboarding companion art** — `three-lights.tsx` now shows actual companion PNGs (Dormant state) instead of abstract Ionicon orbs
- **Soteria Level on Friend Cards** — Already done: `social.tsx` shows `Lv. X Title` on friend cards

## Next Objectives

### 1. Soul Companion Assets — Glowing & Radiant States
- **Status:** 2 assets needed — `soul_glowing.png` and `soul_radiant.png`
- Currently `companion-images.ts` falls back to `soul_awakening.png` for both Glowing and Radiant
- After creating the art, update `SOUL_STATE_IMAGES` in `lib/utils/companion-images.ts`:
  - `Glowing: [require('@/assets/images/soul_states/soul_glowing.png')]`
  - `Radiant: [require('@/assets/images/soul_states/soul_radiant.png')]`
- These will automatically propagate to: dashboard Avatar, LevelUpCelebrationModal, loading slideshows

### 2. Routine Builder UI/UX Overhaul
- Current flow: `app/(tabs)/builder.tsx` → mode select → exercise library + builder
- Key areas to improve:
  - **Builder entry point** — streamline the mode selection screen for clearer user intent
  - **Exercise selection flow** — make adding exercises to a routine more intuitive
  - **Routine configuration** — improve the name/description/category/difficulty form
  - **Exercise ordering** — `DraggableExerciseList.tsx` uses tap-based reorder (no gestures) — evaluate if this is sufficient
  - **Preview & save** — better routine preview before saving
- Related files: `app/(tabs)/builder.tsx`, `components/ExerciseLibrary.tsx`, `components/DraggableExerciseList.tsx`, `lib/utils/routine-builder.ts`

### ~~3. Soteria Level on Friend Cards~~ (DONE)
- Already implemented: `social.tsx` shows `Lv. X Title` on friend cards

### 4. Routine Completion Animations & Loading Screens
- Update routine completion animations to be category-specific (Mind/Body/Soul)
- Update loading screens per category with unique visuals

### 5. All Three Companions Completed Animation
- Update animation and loading for when all three companions are completed daily
- Should inform the user that they have completed all three categories for the day

### 6. Push Notifications (Mobile)
- Implement push notifications using `expo-notifications`
- Register device push tokens and store in Supabase (new `push_tokens` table)
- Notification triggers: friend requests, circle invitations, health team invitations, streak reminders
- Handle notification permissions, foreground/background handling
- Deep linking from notifications to relevant screens

### ~~7. Onboarding Companion Art~~ (DONE)
- `three-lights.tsx` now uses companion PNGs (Dormant state) via `getCompanionImage()` instead of abstract Ionicon orbs

### ~~8. Today's Focus Bonus Recommendation~~ (DONE)
- `getBonusCategory()` in `dashboard.ts` picks the highest-need category based on wellness check-in
- `DailyRecommendationsSection` shows category-specific recommendation row with dot, message, and subtitle
- Tapping opens `RecommendedRoutineModal` via the existing `handleRecommendationPress` flow