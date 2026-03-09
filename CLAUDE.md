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
    ├── companion-images.ts      # PNG image mapping for companion characters (Mind states)
    ├── dashboard.ts             # Dashboard data, recommendations
    ├── dashboard-cache.ts       # In-memory cache for fluid navigation
    ├── haptics.ts               # Centralized haptic feedback (light/medium/heavy/selection)
    ├── harmony.ts               # Harmony status checking
    ├── pain-checkin.ts          # Pain check-in logic
    ├── filter-options.ts        # Filter options CRUD (body parts management)
    ├── routine-builder.ts       # Builder utilities & validation
    └── health-team.ts           # Health team functions

assets/
├── images/
│   └── mind_states/             # Mind companion PNG art (7 images for 5 light states)
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

**Last Updated:** 2026-03-01
**Current Version:** Expo SDK 54, React Native 0.76+

## Next Objectives

### 1. Soteria Level on Friend Cards (Social/Friends Tab)
- Replace "Friends since [date]" text on friend cards with the friend's Soteria level
- Use `getLevelFromXp()` or `getUserLevelSummary()` from `lib/utils/leveling.ts`
- Requires fetching friend's XP data (may need `get_user_public_stats` RPC since `user_stats` has RLS)
- Display format TBD: level number, title (e.g., "Lv. 5 Seeker"), or compact XP bar

### 2. Routine Completion Animations & Loading Screens
- Update routine completion animations to be category-specific (Mind/Body/Soul)
- Update loading screens per category with unique visuals

### 3. All Three Companions Completed Animation
- Update animation and loading for when all three companions are completed daily
- Should inform the user that they have completed all three categories for the day

### 4. Push Notifications (Mobile)
- Implement push notifications using `expo-notifications`
- Register device push tokens and store in Supabase (new `push_tokens` table)
- Notification triggers: friend requests, circle invitations, health team invitations, streak reminders
- Handle notification permissions, foreground/background handling
- Deep linking from notifications to relevant screens

### 5. Onboarding Soul icon
- Update onboarding to use Soul assets for the onboarding icons. 

### 6. Clean up specific circles page
- Remove unnecessary icon on top of the specified circles page. 
- The page should be optimized for activity and action promoting member participation in the circle.
- Reorganize the page to make more sense by moving the Leave Circle button to an icon to the top right. 
- Have a slot where a member can add a "Routine of the Day" for all members to do. There should be a progress bar indicating how many members have completed the routine of the day. If all memebers complete that routine, then their companion on that routine category gets a major boost in allocated points that feeds their level up.