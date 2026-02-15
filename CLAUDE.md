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

---

## File Structure

### Critical Files & Their Purposes

```
app/(tabs)/
├── index.tsx           # Dashboard - Today's progress, pain tracking, recommendations
├── routines.tsx        # Browse/search routines with filters
├── builder.tsx         # 4-step routine builder (Journey → Exercises → Metadata → Review)
│                       # Metadata includes Advanced Tags: tags, body_parts, benefits
└── profile.tsx         # User profile with settings and Reset Journey

app/(auth)/
├── login.tsx           # Login with logo
├── signup.tsx          # Sign up
├── verify-email.tsx    # Email verification
└── onboarding.tsx      # Multi-step onboarding (2-5 steps based on journey type)

app/routines/
├── [id].tsx            # Routine detail view
└── [id]/execute.tsx    # Routine execution with timer

components/
├── DraggableExerciseList.tsx    # Exercise cards with reorder/edit/delete (NO gestures)
├── FilterOptionsManager.tsx     # Admin UI for managing body parts (chip-based, optimistic)
├── FilterOptionEditorModal.tsx  # Modal for adding/editing body parts and groups
├── HapticPressable.tsx          # Drop-in TouchableOpacity replacement with haptic feedback
├── JourneyBadge.tsx             # Journey type badge with icon
├── PainCheckInModal.tsx         # 3-step pain check-in modal
└── HealthTeamInvitationCard.tsx # Health team invitation UI

lib/
├── contexts/AuthContext.tsx     # Global auth + profile state
├── contexts/FilterOptionsContext.tsx # Dynamic body parts context (replaces hardcoded constants)
├── supabase/client.ts           # Supabase client config
└── utils/
    ├── auth.ts                  # Auth, profile, upload
    ├── audio.ts                 # Audio playback for countdown beeps
    ├── dashboard.ts             # Dashboard data, recommendations
    ├── dashboard-cache.ts       # In-memory cache for fluid navigation
    ├── haptics.ts               # Centralized haptic feedback (light/medium/heavy/selection)
    ├── harmony.ts               # Harmony status checking
    ├── pain-checkin.ts          # Pain check-in logic
    ├── filter-options.ts        # Filter options CRUD (body parts management)
    ├── routine-builder.ts       # Builder utilities & validation
    └── health-team.ts           # Health team functions

assets/
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

## Known Issues & Workarounds

### 1. Expo Metro Bundler Cache
**Issue:** Changes not reflecting, stale imports
**Fix:** `npm start -- --clear` or kill port 8081

### 2. RLS Policy "No Rows Returned"
**Issue:** Query returns empty even though data exists
**Fix:** Check RLS policies. Use `count: 'exact'` to verify if delete/update affected rows.

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

### Session 28 (Latest - Save from Circles, Optimistic UI & App-Wide Haptic Feedback)
- **Save/Unsave Routines from Circle Routine Cards:**
  - Extended `searchCircleRoutines()` in `lib/utils/social.ts` to accept optional `userId` parameter
  - Fetches user's saved routine IDs from `routine_saves` table, sets `is_saved` on each routine
  - Updated `EnhancedCircleRoutinesTab.tsx` to pass `user?.id`, added `handleSaveToggle`, passes `onSaveToggle` to `RoutineCard`

- **Optimistic Save Toggle (No Loading Spinner):**
  - Replaced `loadRoutines()` reload pattern (caused full-screen ActivityIndicator) with optimistic UI
  - Updated 3 save handlers: Discover tab, My Routines tab, Circle routines tab
  - Pattern: Toggle local state immediately → call API in background → revert on failure
  - Applies to both save and unsave actions across all routine card locations

- **App-Wide Haptic Feedback System:**
  - Created `lib/utils/haptics.ts` - Centralized haptic utilities using `expo-haptics`
    - Functions: `light()`, `medium()`, `heavy()`, `selection()`, `success()`, `warning()`, `error()`
    - iOS-only (no-op on Android via `Platform.OS === 'ios'` guard)
  - Created `components/HapticPressable.tsx` - Drop-in `TouchableOpacity` replacement
    - Adds `hapticStyle` prop: `'light'` | `'medium'` | `'heavy'` | `'selection'` | `'none'`
    - Default: `'light'` - fires haptic on `onPressIn` for immediate tactile response
  - Replaced `TouchableOpacity` with `HapticPressable` across **~240 interactive elements in ~40 files**:
    - Tab screens (5): index, routines, builder, social, profile (~112 elements)
    - Shared components (6): RoutineCard, ActivityCard, EnhancedCircleRoutinesTab, ExerciseLibrary, DraggableExerciseList, SwipeableTabs (~38 elements)
    - Route screens (3): routines/[id], routines/[id]/execute, circles/[id] (~33 elements)
    - Modal components (10): PainCheckIn, JourneyFocus, Harmony, WellnessCheckIn, RecommendedRoutine, CompletedRoutines, ExerciseEditor, FriendInvite, UsernameSetup, MilestoneCelebration
    - Auth screens (3): login, signup, verify-email
    - Other components (5): Avatar, CompanionAvatar, HealthTeamInvitationCard, MilestoneCard, PainProgressChart, companion-demo

  - **Haptic Style Assignments:**
    | Style | Use Case | Examples |
    |-------|----------|---------|
    | `light` (default) | Standard navigation, buttons, cards | Back buttons, action buttons, card taps |
    | `selection` | Toggles, filters, tabs, chips | Filter chips, tab switches, category segments |
    | `medium` | Destructive actions | Delete, leave, quit, unfriend, sign out, reset |
    | `none` | Modal backdrops | Dismiss overlay areas (`activeOpacity={1}`) |

  - **Files NOT converted** (intentionally): Onboarding screens, `components/ui/collapsible.tsx`
  - **Key dependency:** `expo-haptics` (already installed)

- **Key Files Created:**
  - `lib/utils/haptics.ts` - Haptic feedback utility functions
  - `components/HapticPressable.tsx` - Haptic-enabled pressable component

- **Key Files Modified:**
  - `lib/utils/social.ts` - `searchCircleRoutines` save status support
  - `components/EnhancedCircleRoutinesTab.tsx` - Save toggle + haptics
  - `app/(tabs)/routines.tsx` - Optimistic save + haptics
  - ~37 additional files for HapticPressable replacement

### Session 23 (Design System & Onboarding Improvements)
- **Primary Button Visibility Fix (via soteria-design-system agent):**
  - Fixed critical accessibility issue with primary buttons app-wide
  - Original: White text (#FFFFFF) on soft gold background (#F7DD6F) = 1.35:1 contrast (FAIL)
  - Fixed: Dark text (#1A1A1A) on soft gold background = 12.87:1 contrast (WCAG AAA)
  - Added `AppColors.primaryText` constant in `constants/theme.ts`
  - Updated 25+ files: auth screens (3), onboarding screens (9), modals (8), components (4)
  - Also fixed soul/harmony amber color (#F59E0B) contrast: 2.15:1 → 8.10:1

- **Onboarding Name Collection Moved Earlier:**
  - Name collection now happens on second screen (finding-soteria.tsx) instead of later
  - Flow: "Well, well..." (1.5s pause) → "Who do we have here?" → Name inputs
  - After name entry: Positive reinforcement "[Name]... I sense something very special about you."
  - Then "Who are you?" button leads to Soteria's introduction
  - Gives users a "quick win" with personalized acknowledgment early in onboarding

- **Finding Soteria Screen Updates (`app/onboarding/finding-soteria.tsx`):**
  - Added new phases: `mystery` → `name-entry` → `reinforcement` → `intro` → `choices` → `welcome` → `complete`
  - `mysteryCaptions` array with two-part dialogue
  - `mysteryIndex` state to track mystery caption progression
  - Name inputs with first/last name fields
  - Reinforcement message with italic styling and high intensity Soteria glow
  - KeyboardAvoidingView for proper keyboard handling

- **Updated Later Onboarding Screens:**
  - `introduce-yourself.tsx` - Removed name inputs, avatars now greet user by already-known name
  - `traveler-name.tsx` - Removed "Perfect. [Name]." caption since already acknowledged
  - Streamlined flow with less repetition

- **Key Files Modified:**
  - `constants/theme.ts` - Added `primaryText`, `destructiveText`, `successText`
  - `app/onboarding/index.tsx` - Kept as original value prop screen (reverted)
  - `app/onboarding/finding-soteria.tsx` - Added name collection and reinforcement
  - `app/onboarding/introduce-yourself.tsx` - Removed name inputs
  - `app/onboarding/traveler-name.tsx` - Removed redundant name caption
  - 25+ additional files for button text color updates

### Session 24 (Latest - Dashboard Tutorial Onboarding)
- **Dashboard Tutorial Implementation (Work in Progress):**
  - Replaced abstract narrative screens (world-intro, three-lights, the-offer) with interactive dashboard tutorial
  - Goal: Show users the actual dashboard layout during onboarding with guided tour
  - Status: Initial implementation complete, may explore alternative approaches

- **New Files Created:**
  - `app/onboarding/dashboard-tutorial.tsx` - Main tutorial screen with 5-step state machine
  - `app/onboarding/components/TutorialDashboard.tsx` - Full-screen dashboard with spotlight overlay
  - `app/onboarding/components/FloatingSoteriaGuide.tsx` - Animated floating Soteria orb
  - `lib/utils/tutorial-mock-data.ts` - Mock data for dashboard preview (avatar states, harmony, stats)

- **Tutorial Flow (5 Steps):**
  | Step | Focus | Soteria Position | Highlight |
  |------|-------|------------------|-----------|
  | intro | Black screen | Center | None |
  | avatars | Avatars section | Bottom-center (points up) | Avatars |
  | harmony | Harmony button | Left (points right) | Harmony |
  | stats | Stats section | Bottom-center (points up) | Stats |
  | transition | Black screen | Center | None |

- **TutorialDashboard Component:**
  - Full-screen dashboard layout matching actual app
  - Uses `onLayout` to dynamically measure section positions
  - Spotlight effect using 4 dark overlay boxes positioned around highlighted area
  - Gold border with glow effect around spotlighted section
  - 75% opacity dark overlay dims non-highlighted areas

- **FloatingSoteriaGuide Component:**
  - Animated floating Soteria orb with spring physics
  - Positions: top-left, top-right, bottom-left, bottom-right, center, left, right, bottom-center
  - Bobbing animation in pointing direction (up, down, left, right)
  - z-index 500 to float above overlay (z-index 10)
  - Pulsing and glow animations for visual interest

- **Navigation Flow Updated:**
  - Old: finding-soteria → world-intro → three-lights → the-offer → mind-extraction
  - New: finding-soteria → dashboard-tutorial → mind-extraction
  - `app/onboarding/_layout.tsx` - Added dashboard-tutorial, removed old screens
  - `app/onboarding/components/DevNavigation.tsx` - Updated to 11 screens (was 13)

- **Dialogue System:**
  - Typewriter effect with haptic feedback (40ms per character)
  - Dialogue box with semi-transparent background at bottom of screen
  - Step indicator dots showing progress through tutorial
  - Tap to skip typing, auto-advance between dialogue lines

- **Mock Data (`lib/utils/tutorial-mock-data.ts`):**
  ```typescript
  TUTORIAL_MOCK_DATA = {
    avatarStates: [
      { category: 'Mind', lightState: 'Glowing', name: 'Mind' },
      { category: 'Body', lightState: 'Awakening', name: 'Body' },
      { category: 'Soul', lightState: 'Sleepy', name: 'Soul' },
    ],
    harmonyStatus: { consecutiveBalancedDays: 3, daysUntilHarmony: 4 },
    stats: { current_streak: 5, harmony_streak: 0, total_routines: 24 },
  }
  ```

- **Deprecated Screens (Still in codebase, not in navigation):**
  - `app/onboarding/world-intro.tsx`
  - `app/onboarding/three-lights.tsx`
  - `app/onboarding/the-offer.tsx`

- **Alternative Approaches to Consider:**
  - Simpler tooltip-based tutorial (less immersive but more lightweight)
  - Video walkthrough instead of interactive tutorial
  - Skip tutorial entirely and use contextual hints in actual dashboard
  - Progressive disclosure - reveal features as user engages with app

### Session 29 (Latest - Dynamic Body Parts Management System & DB Cleanup)
- **Dynamic Body Parts Management System (Full Implementation):**
  - Replaced hardcoded `UPPER_BODY_AREAS`/`LOWER_BODY_AREAS` constants with database-driven values
  - Health team members can now add, edit, and remove body parts through the app

- **Phase 1 - Database Layer:**
  - Created `sql/migrations/add_filter_options_system.sql`
  - New `filter_options` table: id, filter_type, value, group_name, group_order, item_order, is_enabled, created_by, created_at
  - UNIQUE constraint on (filter_type, value), RLS policies (all users SELECT, health team INSERT/UPDATE, admin DELETE)
  - Seeded 11 body parts (6 Upper Body, 5 Lower Body)
  - RPC function `rename_body_part(old_value, new_value)` cascading to routines, exercises, profiles

- **Phase 2 - Utility Functions:**
  - Created `lib/utils/filter-options.ts` with CRUD functions
  - `getFilterOptions`, `getGroupedFilterOptions`, `getAllFilterOptions`, `getAllGroupedFilterOptions`
  - `createFilterOption`, `updateFilterOption`, `deleteFilterOption`, `reorderFilterOptions`
  - `renameBodyPart`, `getBodyParts` convenience wrappers

- **Phase 3 - React Context:**
  - Created `lib/contexts/FilterOptionsContext.tsx`
  - Provides: `bodyParts`, `upperBodyParts`, `lowerBodyParts`, `loading`, `refreshFilterOptions()`
  - Falls back to hardcoded constants while loading or on error
  - Added `FilterOption` and `FilterOptionGroup` interfaces to `types/index.ts`
  - Wired `FilterOptionsProvider` into `app/_layout.tsx` inside `<AuthProvider>`

- **Phase 4 - Updated 8 Consumer Files:**
  - Replaced `UPPER_BODY_AREAS`/`LOWER_BODY_AREAS` imports with `useFilterOptions()` hook
  - Files: `builder.tsx`, `routines.tsx`, `ExerciseLibrary.tsx`, `ExerciseEditorModal.tsx`, `JourneyFocusModal.tsx`, `recovery-areas.tsx`, `journey-focus.tsx`, `finding-soteria.tsx`

- **Phase 5 - Admin UI (`components/FilterOptionsManager.tsx`):**
  - Chip-based UI with inline TextInput per group for adding body parts
  - Optimistic add/remove: updates local state immediately, persists to DB in background, reverts on failure
  - Group management: pencil icon next to group name opens bottom sheet modal for rename/delete
  - Group edit modal uses `KeyboardAvoidingView` with flex-1 dismiss area pattern
  - Added `manage-filters` build mode to `builder.tsx` (health team only, 3rd card)
  - Created `components/FilterOptionEditorModal.tsx` for add/edit with `mode` and `defaultGroup` props

- **ExerciseEditorModal Keyboard Fix:**
  - Added `KeyboardAvoidingView` wrapping the `ScrollView` so bottom content is accessible when keyboard opens
  - Added `keyboardShouldPersistTaps="handled"` to ScrollView

- **ExerciseEditorModal Form Reset Fix:**
  - Fixed stale form data when opening modal for a new exercise after saving one
  - Added `visible` to `useEffect` dependency array so form resets on every modal open

- **Vacation Mode Removal (Database Cleanup):**
  - Created `sql/migrations/remove_vacation_mode.sql`
  - Drops 8 vacation-related functions (can_activate, request, activate, deactivate, expiry check, award, streak reward, cancel)
  - Drops `user_stats_vacation_days_check` constraint
  - Drops 6 columns: `vacation_days_banked`, `vacation_mode_active`, `vacation_mode_start`, `vacation_mode_end`, `last_vacation_ended_at`, `vacation_requested_at`
  - Updated `check_harmony_requirements` to remove vacation decay logic (always uses standard 48hr decay)

- **Key Fixes During Implementation:**
  - `routines.tsx`: Moved `useFilterOptions()` hook from `RoutinesScreen` into `DiscoverTab` sub-component where body parts are actually used
  - `builder.tsx`: Derived `isHealthTeam` synchronously from `profile?.role` instead of async `isHealthTeamMember()` call (fixed "Manage Filters" not showing on first load)
  - `FilterOptionsManager.tsx`: Removed loading spinner on every add/remove by making operations optimistic

- **Key Files Created:**
  - `sql/migrations/add_filter_options_system.sql` - Table, RLS, seed, RPC
  - `sql/migrations/remove_vacation_mode.sql` - Vacation cleanup migration
  - `lib/utils/filter-options.ts` - CRUD utilities
  - `lib/contexts/FilterOptionsContext.tsx` - Context + caching
  - `components/FilterOptionsManager.tsx` - Admin chip-based management UI
  - `components/FilterOptionEditorModal.tsx` - Add/edit modal

- **Key Files Modified:**
  - `types/index.ts` - Added FilterOption, FilterOptionGroup interfaces
  - `app/_layout.tsx` - Added FilterOptionsProvider
  - `app/(tabs)/builder.tsx` - Added manage-filters mode, useFilterOptions
  - `app/(tabs)/routines.tsx` - useFilterOptions in DiscoverTab
  - `components/ExerciseLibrary.tsx` - useFilterOptions
  - `components/ExerciseEditorModal.tsx` - useFilterOptions, KeyboardAvoidingView, form reset fix
  - `components/JourneyFocusModal.tsx` - useFilterOptions
  - `app/onboarding/recovery-areas.tsx` - useFilterOptions
  - `app/onboarding/journey-focus.tsx` - useFilterOptions
  - `app/onboarding/finding-soteria.tsx` - useFilterOptions

---

### Session 27 (Exercise Library Filters & Builder UX)
- **Expo Startup Troubleshooting:**
  - Created `EXPO-STARTUP-GUIDE.md` documenting slow startup causes and fixes
  - Key issue: Watchman file watches go stale after Mac sleeps
  - Quick fix: `watchman watch-del-all && npm start` (faster than reinstalling node_modules)
  - Added info on disabling telemetry and persistent Metro cache

- **Exercise Library Body Parts Filter (`components/ExerciseLibrary.tsx`):**
  - Added new "Body Part" filter to exercise selection in Builder tab
  - Converted filter row from flex-wrap to horizontal ScrollView carousel
  - All 4 filters now scroll horizontally: Created By, Category, Difficulty, Body Part
  - Filter chips redesigned with icons (via soteria-design-system agent):
    - `people-outline` for Created By
    - `apps-outline` for Category
    - `speedometer-outline` for Difficulty
    - `body-outline` for Body Part
  - Active state: gold background with primary color text/icons
  - Body Part modal shows grouped options: Upper Body / Lower Body sections
  - Fixed chip text cutoff with `flexShrink: 0` and fixed `height: 40`

- **Builder Tab Button Accessibility (via soteria-design-system agent):**
  - Updated all gold/primary buttons to use dark text (`AppColors.primaryText`)
  - Affected styles: `nextButtonText`, `continueButtonText`, `confirmButtonText`, `editDurationSaveText`
  - Updated arrow icons on Next and Review buttons
  - Contrast improved from 1.35:1 to 12.87:1 (WCAG AAA compliant)
  - Publish button (green background) correctly kept white text

- **Dashboard Dynamic Gradient Header Fix (`app/(tabs)/index.tsx`):**
  - Fixed `getHeaderBackground()` to show gradient for 2+ completed categories
  - Previous: Only showed gradient when all 3 complete, otherwise solid color of last
  - New logic:
    - 0 completed → solid surface color
    - 1 completed → solid color of that category
    - 2 completed → gradient of those 2 colors (in Mind→Body→Soul order)
    - 3 completed → full harmony gradient
  - Example: Mind + Body glowing = blue-to-red gradient

- **Key Files Modified:**
  - `components/ExerciseLibrary.tsx` - Body Parts filter, horizontal carousel, chip redesign
  - `app/(tabs)/builder.tsx` - Button text colors for accessibility
  - `app/(tabs)/index.tsx` - Dynamic gradient header for 2+ categories
  - `EXPO-STARTUP-GUIDE.md` - New troubleshooting documentation

---

### Session 26 (Onboarding UX Enhancements)
- **Glass Panel Dialogue Box (BotW-Inspired):**
  - Created `SoteriaDialogueBox` component with frosted glass effect using `expo-blur`
  - Features: luminous gold edge glow, semi-transparent background, italicized text
  - Applied to all onboarding screens replacing dark card dialogue boxes
  - Props: `text`, `glowPosition` (top/bottom), `isTyping` (shows cursor)

- **Character Summoning Animation:**
  - Created `CharacterSummoningAnimation` component for dramatic character introductions
  - Standard sequence (1.8s): screen dims → glow appears → sound → haptic pulses → character appears
  - Dramatic sequence (9s, for Soteria): extended with aggressive 4-phase haptic escalation
    - Phase 1 (1-3s): Heavy pulses + Warning notifications at 500ms intervals
    - Phase 2 (3-5s): Rapid double-tap Heavy + Medium at 300ms intervals
    - Phase 3 (5-6s): Aggressive rapid-fire Heavy impacts at 80ms intervals
    - Phase 4 (6-6.5s): Maximum chaos - alternating Heavy + Error at 60ms intervals
    - Finale (7.5s): Explosive burst of multiple Heavy impacts + Success notifications
  - Used for Soteria, Mind, Body, and Soul introductions in onboarding

- **Dashboard Updates:**
  - Stats moved to headline section (replaced subtitle text)
  - Inline stats: streak, routines, harmony counter with tooltips
  - Dynamic header background based on completed routine categories
    - Mind complete: Dark blue (#1E3A5F)
    - Body complete: Dark red (#4A1F1F)
    - Soul complete: Dark amber (#4A3A1F)
    - All complete (Harmony): Gradient across all three colors
  - Fixed harmony counter to use `consecutiveBalancedDays` field

- **Social Tab Updates:**
  - Moved "Create Circle" button to bottom as floating action button
  - Fixed button text colors to use `AppColors.primaryText` (dark on gold)

- **Routines Tab:**
  - Added `SortModal` component for dropdown sort selection (Popular, Trending, Newest, Most Saved)
  - Replaced click-to-cycle sorting with modal picker

- **Key Files Created/Modified:**
  - `app/onboarding/components/SoteriaDialogueBox.tsx` - New glass panel dialogue
  - `app/onboarding/components/CharacterSummoningAnimation.tsx` - New summoning animation
  - `app/(tabs)/index.tsx` - Stats in headline, dynamic header backgrounds
  - `app/(tabs)/social.tsx` - Floating Create Circle button
  - `app/(tabs)/routines.tsx` - Sort modal dropdown
  - `constants/theme.ts` - Added headerMind, headerBody, headerSoul colors
  - `lib/utils/audio.ts` - Audio playback (reverted to expo-av)
  - Multiple onboarding screens - Applied new dialogue and summoning components

- **Audio Issue (TODO - Next Session):**
  - Attempted migration from `expo-av` to `expo-audio` but it broke sound playback
  - Reverted back to `expo-av` for now
  - **Next session:** Investigate audio implementation in the application
    - Review `expo-av` vs `expo-audio` usage and best practices
    - Test sound playback on both iOS and Android
    - Ensure extraction_mystical.mp3 plays during summoning animation
    - Consider audio initialization timing and component lifecycle

---

### Session 25 (Dashboard Header Redesign & Profile Pictures)
- **Dashboard Header Compact Redesign (`app/(tabs)/index.tsx`):**
  - Changed from vertical stacked layout to horizontal inline layout
  - Profile picture (72px) on left with greeting text on right
  - Removed separate JourneyBadge chip component from header
  - More space-efficient design

- **Journey Focus Badge Overlay:**
  - Journey focus now shown as small colored circle badge on profile picture (top-right)
  - Recovery: Red/body color with heart icon
  - Injury Prevention: Blue/mind color with shield icon
  - Tapping profile picture opens Journey Focus modal
  - Health Team shield badge remains at bottom-right for health_team/admin users

- **Dynamic Dashboard Subtitles:**
  - Subtitle now changes based on companion (avatar) completion states
  - `getDynamicSubtitle()` function checks `lightState` of each avatar
  - Messages:
    | State | Message |
    |-------|---------|
    | None complete | "Let's get your first routine done!" |
    | 2 remaining | "Looks like {Body name} and {Soul name} still need some love!" |
    | 1 remaining | "Almost there! {name} is waiting to awaken with the others!" |
    | All complete | "Great job! All your companions have awakened. Keep it up!" |
  - Uses custom companion names from profile (mind_name, body_name, soul_name)

- **Friend Activity Cards - Profile Pictures:**
  - Replaced activity type icons with user profile pictures
  - Shows profile picture if available, or initial letter (gold background) as fallback
  - Removed unused `getActivityIcon()` function
  - More personal/social feel to the activity feed

- **Social Tab - Profile Pictures (`app/(tabs)/social.tsx`):**
  - Added profile pictures to all user cards:
    - Search Results
    - Pending Friend Requests
    - My Friends list
  - Shows profile picture if available, or initial letter fallback
  - Added `Image` import and new styles: `userAvatarImage`, `userAvatarText`
  - Fixed pre-existing TypeScript errors: replaced `full_name` with `first_name`/`last_name`

- **Style Updates:**
  - `headerRow` - New horizontal flex container for avatar + text
  - `headerTextContainer` - Flex container for greeting text
  - `journeyBadge` - 26px circular badge positioned top-right of avatar
  - `avatar` - Increased from 56px to 72px
  - `greeting` - Increased from 22px to 26px
  - `activityAvatar`, `activityAvatarImage`, `activityAvatarText` - New styles for activity cards

- **Cleanup:**
  - Removed unused `JourneyBadge` import from dashboard
  - Removed unused `calculateJourneyDays` import and variable
  - Removed unused `getActivityIcon()` function

---

**Last Updated:** 2026-02-15
**Current Version:** Expo SDK 54, React Native 0.76+

## Known Issues & Pending Investigations

### Audio Playback (High Priority - Next Session)
- **Issue:** Audio playback for `extraction_mystical.mp3` during character summoning may not be working
- **Background:** Attempted migration from `expo-av` to `expo-audio` broke sound; reverted to `expo-av`
- **Files involved:** `lib/utils/audio.ts`, `assets/sounds/extraction_mystical.mp3`
- **TODO:**
  1. Test audio playback on physical iOS and Android devices
  2. Review `expo-av` initialization and audio mode settings
  3. Check if `playExtractionSound()` is being called at correct timing in summoning sequence
  4. Consider preloading audio assets for better performance
  5. Investigate if `expo-audio` is the recommended replacement and migration path
