# Soteria Health Mobile

React Native mobile app for Soteria Health - empowering individuals to take control of their wellness through community-driven, holistic routines.

## Project Overview

This is the mobile companion app to the Soteria Health web application, built with:

- **Expo Router** - File-based routing for React Native
- **TypeScript** - Type-safe development
- **Supabase** - Backend, authentication, and storage
- **React Native** - Cross-platform mobile development
- **Expo Image Picker** - Profile picture upload
- **React Native Picker** - Native dropdown selections

## Features

### Authentication & Onboarding
- User sign up with email verification
- Secure login with password visibility toggle
- Enhanced multi-step onboarding flow with mobile-optimized buttons
  - **Journey Focus Selection** - Detailed cards with icons and benefits
    - Injury Prevention: Shield icon (blue #3B82F6) with prevention-focused features
    - Recovery: Heart icon (red #EF4444) with recovery-focused features
  - **Initial Pain Check-In** (Recovery users only) - Baseline pain tracking
    - Pain level slider (0-10) with color-coded display
    - Pain-free (green) → Mild (yellow) → Moderate (orange) → Severe (red)
    - Establishes baseline for progress tracking
  - **Recovery Areas** (Recovery users only) - Optional body part selection
    - Filter by region: All, Upper Body, Lower Body
    - Select multiple affected areas
    - Body parts: Lower Back, Knee, Shoulder, Hip, Neck, Ankle, Wrist, Elbow, and more
  - **Recovery Goals** (Recovery users only) - Optional goal selection
    - Multiple predefined recovery goals
    - Personalization for recovery journey
  - **Fitness Level** (All users) - Select experience level
    - Beginner / Intermediate / Advanced
- Journey start date automatically recorded
- Fixed button positioning for easy thumb access on mobile

### Dashboard
- Personalized greeting with profile picture
- **Journey Tracking**
  - Journey badge with icon (Shield for Prevention, Heart for Recovery)
  - Day counter showing "Day X of [Journey Name]"
  - Recovery area display for Recovery users
- **Pain Progress Tracking** (Recovery users only)
  - Visual pain level chart showing trend over time
  - Daily pain check-in modal (appears once per day)
  - Multi-step pain check-in:
    1. Pain level slider (0-10) with color coding
    2. Pain location selection (body parts, Mind, Soul)
    3. Optional notes about pain experience
  - Pain history visualization
  - Track pain reduction progress over time
- Today's progress tracking (Mind, Body, Soul)
- Clickable progress cards that filter routines by category
- User statistics (Current Streak, Health Score, Total Routines)
- Balanced recommendations (one routine from each category, filtered by journey focus)

### Routines
- Browse all routines with search functionality
- Search routines by name and description
- Filter by category (Mind, Body, Soul, All)
- Filter between all routines and custom routines
- Category-specific color indicators:
  - Mind: Blue (#3B82F6)
  - Body: Red (#EF4444)
  - Soul: Amber (#F59E0B)
- Detailed routine view with exercises and benefits
- Routine execution with timer and progress tracking
- Completion tracking with automatic profile refresh

### Routine Builder
- Create custom routines from scratch
- Multi-step wizard interface:
  - Journey Focus selection (Injury Prevention, Recovery, or Both)
  - Exercise selection from existing exercise library
  - Configure duration for each exercise (in seconds)
  - Add up to 30 exercises per routine
  - Set routine name, description, category, and difficulty
  - **Advanced Tags (Optional)** - For future AI-powered search:
    - Add general tags with "type & add" interface (max 5 tags per routine)
    - Each tag can be up to 30 characters
    - Tags displayed as removable purple chips
    - Duplicate tag prevention with validation
    - Select targeted body parts via dropdown multi-select with region filters (All, Upper Body, Lower Body)
    - Selected body parts displayed as removable chips
  - **Review & Publish** - Comprehensive overview before publishing:
    - Routine Overview section shows name, description, category, difficulty, journey, duration
    - Tags displayed as purple chips (if added)
    - Body parts displayed as amber chips (if added)
    - Complete exercise list with durations
- Exercise counter shows progress (X/30 exercises)
- Published routines integrate seamlessly with existing routine execution
- Custom routines marked with `is_custom: true` flag
- Tracked by creator with `created_by` user ID
- Edit existing custom routines

### Profile Management
- View and edit profile information:
  - Full name
  - Username (unique, 3-20 characters, alphanumeric + _ .)
  - Journey focus (Injury Prevention / Recovery)
  - Recovery details (for Recovery users)
  - Fitness level
  - Age
- Upload and change profile picture
- View personal goals and injuries/limitations
- Journey progress tracking
- **Settings**
  - Account settings
  - **Reset Journey** - Fresh start feature
    - Completely resets user journey
    - Deletes all progress data (daily progress, routine completions, routine saves)
    - Deletes all pain check-in history
    - Clears friend activity feed
    - Resets stats to zero
    - Redirects to onboarding for new journey setup
    - Secure function with proper RLS bypass
- Sign out functionality

### Social Features
- **Friends System**
  - Search for users by name or username
  - Send and receive friend requests
  - Accept or decline friend requests
  - View friends list
  - Unfriend users
  - Activity feed showing friend activities

- **Circles (Groups)**
  - Create private or public circles
  - Invite friends to private circles (invitation-based system)
  - Accept or decline circle invitations
  - Join public circles directly
  - View circle members
  - Admin controls (invite, remove members)
  - **Enhanced Circle Routines**:
    - Add any routine to circle library
    - Browse circle routines with search and filters
    - Complete routines directly from circle
    - Track completion stats per routine
    - Popular badges for routines with 50%+ completion
    - Sort by popularity, recency, or name
    - View "X of Y members completed" stats
  - Circle activity feed
  - Leave circles

- **Activity Feed**
  - Track friend activities (routines completed, circles joined, etc.)
  - Circle-specific activity feeds
  - Activity logging for social interactions

- **Username System**
  - Unique usernames across the platform
  - Username validation and availability checking
  - Display @username throughout social features
  - Username setup modal for new users

### Journey Focus System
- **Two Journey Types:**
  - **Injury Prevention** - For users focused on preventing injuries through proactive wellness
  - **Recovery** - For users recovering from injuries or managing pain
- **Journey Tracking:**
  - Automatic start date recording when completing onboarding
  - Day counter showing journey progression
  - Visual journey badges throughout the app
- **Recovery-Specific Features:**
  - Optional recovery area selection (specific body part)
  - Recovery goals and notes for personalization
  - Recovery area displayed in journey badge and tracking
- **Personalized Recommendations:**
  - Routines filtered by journey focus and fitness level
  - Balanced recommendations across Mind, Body, Soul categories
  - Fallback to popular routines when no matches found

## Design System

### Color Palette

#### Primary Brand Colors
- **Primary Blue:** `#3533cd` - Primary buttons, links, and accents
- **Red (Destructive):** `#FF3B30` - Sign out and destructive actions

#### Category Colors
- **Mind Blue:** `#3B82F6` - Mind-related routines and indicators
- **Body Red:** `#EF4444` - Body-related routines and indicators
- **Soul Amber:** `#F59E0B` - Soul-related routines and indicators

#### UI Colors
- **Background:** `#F8FAFC` - Soft blue-gray main background
- **Surface:** `#fff` - Card and section backgrounds
- **Primary Text:** `#1a1a1a` - Main text color
- **Secondary Text:** `#666` - Subtitles and labels
- **Tertiary Text:** `#999` - Metadata and less important text
- **Border:** `#ddd` - Input borders and dividers
- **Light Border:** `#f0f0f0` - Subtle dividers
- **Card Border:** `#E2E8F0` - Card elevation borders
- **Light Background:** `#E3F2FD` - Goal tags (Mind)
- **Warning Background:** `#FFF3E0` - Injury tags
- **Input Background:** `#f5f5f5` - Form inputs and select buttons

#### Card Elevation
All cards in the app use consistent elevation styling for visual separation:
- **Border:** 1px solid `#E2E8F0`
- **Shadow:** Subtle shadow (iOS) / Elevation 2 (Android)
- **Effect:** Creates depth and clearly separates cards from background

#### Semantic Colors
- **Success:** `#34C759` - Completion states

### Typography

#### Font Sizes
- **Extra Large Title:** 32px - Page titles
- **Large Title:** 28px - Section headers
- **Title:** 24px - Profile name
- **Heading:** 20px - Section titles
- **Body Large:** 18px - Routine names
- **Body:** 16px - Standard text
- **Body Small:** 14px - Metadata, tags
- **Caption:** 12px - Small details

#### Font Weights
- **Bold:** 700 - Primary titles
- **Semibold:** 600 - Section headers, buttons
- **Medium:** 500 - Selected states, important text
- **Regular:** 400 - Body text

## Project Structure

```
soteria-health-mobile/
├── app/                          # Expo Router app directory
│   ├── (auth)/                   # Authentication screens
│   │   ├── login.tsx            # Login screen with logo
│   │   ├── signup.tsx           # Sign up screen
│   │   ├── verify-email.tsx     # Email verification screen
│   │   └── onboarding.tsx       # Multi-step user onboarding
│   ├── (tabs)/                   # Main app tabs (bottom navigation)
│   │   ├── index.tsx            # Dashboard with progress & stats
│   │   ├── routines.tsx         # Routines list with search & filter
│   │   ├── builder.tsx          # Routine Builder (create custom routines)
│   │   └── profile.tsx          # User profile with editing
│   ├── routines/                 # Routine-related screens
│   │   ├── [id].tsx             # Routine detail screen
│   │   └── [id]/
│   │       └── execute.tsx      # Routine execution with timer
│   └── _layout.tsx              # Root layout with auth check
├── assets/
│   └── images/
│       └── soteria-logo.png     # App logo
├── components/                   # Reusable components
│   ├── JourneyBadge.tsx         # Journey badge with icon and label
│   ├── PainCheckInModal.tsx     # Multi-step pain check-in modal
│   └── themed-text.tsx          # Themed text component
├── constants/
│   └── theme.ts                 # Theme constants and colors
├── lib/                          # Core utilities
│   ├── contexts/                # React contexts
│   │   └── AuthContext.tsx     # Authentication & profile context
│   ├── supabase/                # Supabase configuration
│   │   └── client.ts           # Supabase client with AsyncStorage
│   └── utils/                   # Utility functions
│       ├── auth.ts             # Auth, profile, journey tracking & upload
│       ├── dashboard.ts        # Dashboard data, balanced routines, search functions
│       ├── pain-checkin.ts     # Pain check-in submission & retrieval
│       └── routine-builder.ts  # Routine builder utilities & validation
├── sql/                          # Database migration files
│   ├── database_migration_journey_enhancements.sql  # Journey tracking migrations
│   ├── database_migration_routine_search_tagging.sql # Search & tagging migrations
│   ├── example_routine_tagging.sql                  # Example routine tags
│   ├── add_pain_checkins_table.sql                  # Pain check-in system
│   ├── add_hard_reset_function.sql                  # Reset journey function
│   └── social_migration/                            # Social features migrations
└── types/                        # TypeScript types
    └── index.ts                 # Shared type definitions
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### Key Packages
- `@supabase/supabase-js` - Supabase client
- `@react-native-async-storage/async-storage` - Persistent storage
- `react-native-url-polyfill` - URL polyfill for React Native
- `expo-image-picker` - Image selection and upload
- `base64-arraybuffer` - Base64 encoding for image uploads
- `date-fns` - Date utilities
- `@expo/vector-icons` - Icon library
- `@react-native-picker/picker` - Native dropdown component for selections
- `@react-native-community/slider` - Slider component for pain level input
- `react-native-dropdown-picker` - Multi-select dropdown component

### 2. Environment Variables

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Database Setup

Run the provided SQL migrations to set up all database tables and policies:

```bash
# Execute these migration files in your Supabase SQL Editor in order:

# 1. Journey enhancements (profiles, journey goals, journey_focus)
sql/database_migration_journey_enhancements.sql

# 2. Routine search and tagging (tags, body_parts with GIN indexes)
sql/database_migration_routine_search_tagging.sql

# 3. (Optional) Tag existing routines with example data
sql/example_routine_tagging.sql

# 4. Username system (usernames, validation, search)
sql/add_username_system.sql

# 5. Social features (friends, circles, activity)
sql/social_migration/01_create_social_tables.sql

# 6. Circle invitations system
sql/social_migration/add_circle_invitations.sql

# 7. Fix friend activity RLS for system operations
sql/social_migration/fix_friend_activity_rls.sql

# 8. Fix circle invitation constraint for re-invitations
sql/social_migration/fix_circle_invitation_constraint.sql

# 9. CRITICAL: Fix infinite recursion in RLS policies
sql/social_migration/MASTER_FIX_infinite_recursion.sql

# 10. IMPORTANT: Fix activity feeds separation (global vs circle)
sql/social_migration/fix_activity_feeds_separation.sql

# 11. FEATURE: Circle Routines Enhancements
sql/social_migration/add_circle_routines_enhancements.sql

# 12. UPDATE: Remove Circle Routine Daily Completion Limit
sql/social_migration/update_circle_routine_completions_constraint.sql

# 13. UPDATE: Circle Routine Stats to Total Completions
sql/social_migration/update_circle_routine_stats_to_total_completions.sql

# 14. FIX: Circle Routines Delete Policy for Admins
sql/social_migration/fix_circle_routines_delete_policy.sql

# 15. FEATURE: Pain Check-In System (Recovery Journey)
sql/add_pain_checkins_table.sql

# 16. FEATURE: Reset Journey Function (Hard Reset)
sql/add_hard_reset_function.sql
```

**⚠️ CRITICAL: RLS Infinite Recursion Fix**

The social features initially caused an infinite recursion error in PostgreSQL's Row Level Security (RLS) policies. This was caused by circular references between tables:
- `circle_routines` policies referenced `circles` table
- `circles` policies checked `circle_members`
- When queries joined these tables → infinite loop

**The MASTER_FIX_infinite_recursion.sql migration fixes this by:**
- Dropping all problematic custom functions
- Removing ALL existing policies on social tables
- Creating ultra-simple policies with **ZERO** circular references
- Adding `LIMIT 1` to all `EXISTS` clauses to prevent runaway queries
- Making `circle_routines` policies **never** reference the `circles` table directly

**This migration MUST be run** or you will encounter errors like:
```
Error: infinite recursion detected in policy for relation "circles"
```

**📊 IMPORTANT: Activity Feeds Separation**

The activity feed system properly separates global activities from circle-specific activities:
- **Global Activity Feed** (Social tab): Shows user's own activities, friends' activities, and activities from circles user is a member of
- **Circle Activity Feed** (Inside specific circle): Shows ONLY activities related to that specific circle

**The fix_activity_feeds_separation.sql migration adds:**
- Index on `related_circle_id` for efficient circle activity queries
- Composite index `(related_circle_id, created_at)` for chronological circle feeds
- Partial index for global activities (where `related_circle_id IS NULL`)
- Updated activity types constraint to include all activity types

**Activity Logging:**
- Use `recordUserActivity()` for global activities (completed routine outside circles, created custom routine, streak milestones)
- Use `recordCircleActivity()` for circle-specific activities (shared routine to circle, joined circle, left circle)
- Activities are automatically filtered by `related_circle_id` in queries

**🎯 Circle Routines Feature**

The Circle Routines enhancement adds comprehensive routine management within circles, including completion tracking, popularity detection, and advanced discovery features.

**The add_circle_routines_enhancements.sql migration adds:**

1. **Circle Routine Completions Table**
   - Tracks when members complete circle routines
   - No completion limit - users can complete same routine multiple times per day
   - Stores completion time, duration, and optional notes
   - Indexed for efficient queries by circle, routine, and user

2. **Completion Stats & Analytics**
   - Auto-calculating **total completion** counts per routine
   - Tracks all completions (not unique users)
   - Popular routine detection (top 3 by completion count per circle)
   - Real-time stats via database view (`circle_routine_stats`)
   - Stats display: "47 completions" (total times, not unique members)

3. **Auto-Update Trigger**
   - Automatically updates stats after each completion
   - Marks top 3 routines per circle as "Popular"
   - Rankings update dynamically as completions change
   - Efficient function with `SECURITY DEFINER` privileges

4. **New Activity Types**
   - `completed_circle_routine` - Member completes a routine from circle
   - `added_routine_to_circle` - Member adds routine to circle
   - `routine_became_popular` - Routine reaches popularity threshold (celebration! 🔥)

**Features Enabled:**
- ✅ Browse circle routines with search, filter, and sort
- ✅ Add any routine to circle (unique constraint prevents duplicates)
- ✅ Complete routines directly from circle page (unlimited completions)
- ✅ View completion stats: "47 completions" (total times completed)
- ✅ Popular badge for top 3 most-completed routines per circle
- ✅ Filter by category (Mind, Body, Soul) or search by name
- ✅ Sort by: Most Popular, Recently Added, or Name
- ✅ Admin controls to remove routines
- ✅ Activity logging for all circle routine events
- ✅ Users can complete same routine multiple times (no daily limit)

**UI Components:**
- **EnhancedCircleRoutinesTab**: Full-featured routines browser with:
  - Search bar with real-time filtering
  - Category and sort filters
  - Add Routine modal showing available routines
  - Completion tracking and stats display
  - Popular badges and completion percentages
  - Admin remove controls
- **ActivityCard**: Updated with new activity type icons
  - `checkmark-done-circle` for circle completions
  - `add-circle-outline` for added routines
  - `flame` for popular routines

**📝 Migration 12 - Completion Limit Update:**

The `update_circle_routine_completions_constraint.sql` migration removes the daily completion limit:

**What Changed:**
- ❌ **Removed**: Daily uniqueness constraint (users can now complete unlimited times)

**Why This Matters:**
- Users can complete the same routine multiple times per day (e.g., morning and evening meditation)
- More flexible for daily routines and repeated practices

**📝 Migration 13 - Total Completions Stats:**

The `update_circle_routine_stats_to_total_completions.sql` migration changes from unique user counts to total completion counts:

**📝 Migration 14 - Admin Delete Permissions:**

The `fix_circle_routines_delete_policy.sql` migration fixes the RLS policy to allow circle admins to delete routines:

**What Changed:**
- ✅ **Fixed**: Circle admins can now delete ANY routine in their circle
- ✅ **Preserved**: Users can still delete routines they added
- ✅ **Security**: Only admins and original posters can delete

**Why This Matters:**
- Admins need to be able to manage circle routines effectively
- Removes inappropriate or duplicate routines
- Original poster can still remove their own routines
- Proper permission hierarchy for circle management

**🩹 Pain Check-In System (Migration 15)**

The Pain Check-In System tracks pain levels and locations for Recovery journey users, enabling progress monitoring and personalized recommendations.

**The add_pain_checkins_table.sql migration creates:**

1. **Pain Check-Ins Table**
   - Stores daily pain check-ins with level (0-10) and locations
   - User ID reference with cascade deletion
   - Check-in date with automatic timestamp
   - Pain locations array (body parts, Mind, Soul)
   - Optional notes for additional context
   - Indexed for efficient queries by user and date

2. **Multi-Step Pain Modal**
   - Step 1: Pain level slider (0-10) with color coding
     - 0: Pain Free (green #34C759)
     - 1-3: Mild (yellow #FFD60A)
     - 4-6: Moderate (orange #FF9500)
     - 7-10: Severe (red #FF3B30)
   - Step 2: Pain location selection (multi-select dropdown)
     - Body parts (Lower Back, Knee, Shoulder, etc.)
     - Mind (mental/emotional pain)
     - Soul (spiritual pain)
   - Step 3: Optional notes text area

3. **Daily Check-In Logic**
   - Modal appears once per day for Recovery users
   - Checks if user has completed today's check-in
   - Only prompts when profile is complete (not during Reset Journey)
   - Stores check-in with date, level, locations, and notes

4. **Pain Progress Visualization**
   - Line chart showing pain level trend over time
   - Color-coded data points
   - Pain-free days highlighted
   - Recovery progress tracking

**Features Enabled:**
- ✅ Initial pain check-in during onboarding (Recovery only)
- ✅ Daily pain check-in modal with 3-step flow
- ✅ Pain level history and visualization
- ✅ Pain location tracking
- ✅ Progress monitoring and trend analysis
- ✅ Color-coded pain severity indicators
- ✅ Integration with dashboard for Recovery users

**🔄 Reset Journey Feature (Migration 16)**

The Reset Journey feature allows users to completely reset their wellness journey and start fresh with a new focus.

**The add_hard_reset_function.sql migration creates:**

1. **Hard Reset Function**
   - PostgreSQL function with `SECURITY DEFINER` to bypass RLS
   - Atomic transaction ensuring all-or-nothing execution
   - Returns detailed count of deleted records

2. **What Gets Deleted:**
   - Daily progress records (all historical progress)
   - Routine completions (all completed routines)
   - Routine saves (all saved routines)
   - Friend activity (user's activity feed entries)
   - **Pain check-ins** (all pain history)
   - User stats reset to zero (streak, health_score, total_routines)
   - Profile journey data cleared (journey_focus, fitness_level, recovery info)

3. **Reset Flow:**
   - User clicks "Reset Journey" in Settings
   - Confirmation dialog explains what will be deleted
   - Function executes hard reset
   - User redirected to onboarding
   - New journey setup with fresh baseline
   - Pain modal won't appear until profile complete

4. **Security & Safety:**
   - Requires authentication
   - Uses `SECURITY DEFINER` for RLS bypass
   - Atomic transaction prevents partial resets
   - Detailed logging of deleted records
   - User must confirm before reset

**Features Enabled:**
- ✅ Complete journey reset with one click
- ✅ Deletes ALL progress and pain data
- ✅ Redirects to onboarding for fresh start
- ✅ Prevents pain modal during reset
- ✅ Secure function with proper permissions
- ✅ Returns detailed deletion counts

**Use Cases:**
- User wants to switch from Recovery to Injury Prevention
- User wants to start completely fresh
- User had incorrect data during initial setup
- User completed recovery and wants to prevent future injuries

**📝 Migration 13 - Total Completions Stats (continued):**

The `update_circle_routine_stats_to_total_completions.sql` migration changes from unique user counts to total completion counts:

**What Changed:**
- ✅ **Updated**: Stats function to count **total completions** (not unique members)
- ✅ **Updated**: Popular detection now based on **top 3 ranking** per circle
- ✅ **Clarified**: `completion_count` column now stores total completions
- ✅ **Improved**: Only top 3 most-completed routines get the popular badge

**Why This Matters:**
- Popular badge stays meaningful as circles mature
- Only the 3 most-completed routines per circle get the badge
- Rankings update dynamically as members complete routines
- Ties broken by creation date (oldest routine wins)
- Encourages variety and prevents badge inflation
- Example: Circle with 20 routines → only top 3 by completion count get the flame
- Stats display shows total completions (e.g., "47 completions")

**Migration 1 - Journey Enhancements** includes:
- Profile table updates for journey tracking
- Journey goals table creation
- Routines table journey_focus support
- RLS policies for data security
- Indexes for query performance

**Migration 2 - Routine Search & Tagging** includes:
- Tags array column (text[]) for general categorization
- Body parts array column (text[]) for targeted body areas
- GIN indexes on array columns for efficient PostgreSQL array searching
- Text search index for name and description

**Migration 3 - Example Tagging** includes:
- Example UPDATE statements to tag 10+ existing routines
- Comprehensive tagging for upper body, lower body, mind, and full body routines
- Fallback tags for untagged routines by category

#### Manual Database Setup (Alternative)

If you prefer to set up tables manually, here are the key schemas:

#### Profiles Table Updates
```sql
-- Journey tracking fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS journey_started_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS recovery_area text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS recovery_notes text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
```

#### Journey Goals Table
```sql
CREATE TABLE IF NOT EXISTS journey_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  journey_focus text NOT NULL CHECK (journey_focus IN ('Injury Prevention', 'Recovery')),
  target_description text NOT NULL,
  target_date date,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_journey_goals_user_id ON journey_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_journey_goals_is_active ON journey_goals(is_active);
```

#### Routines Table Schema
The `routines` table should have the following structure to support both pre-built and custom routines:

```sql
-- The routines table should include:
-- id (uuid, primary key)
-- name (text)
-- description (text)
-- category (text) -- 'Mind', 'Body', or 'Soul'
-- difficulty (text) -- 'Beginner', 'Intermediate', or 'Advanced'
-- journey_focus (text[]) -- Array: ['Injury Prevention'] and/or ['Recovery']
-- duration_minutes (integer)
-- exercises (jsonb) -- Array of exercise objects
-- is_custom (boolean) -- true for user-created routines
-- created_by (uuid) -- user id of creator (for custom routines)
-- completion_count (integer)
-- benefits (text[])
-- tags (text[]) -- General tags for categorization (e.g., 'Desk Work', 'Upper Body')
-- body_parts (text[]) -- Body parts targeted (e.g., ['Neck', 'Shoulder', 'Lower Back'])
-- created_at (timestamp)

-- Ensure the routines table supports custom routines, journey focus, and tagging:
ALTER TABLE routines ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false;
ALTER TABLE routines ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE routines ADD COLUMN IF NOT EXISTS journey_focus text[];
ALTER TABLE routines ADD COLUMN IF NOT EXISTS tags text[];
ALTER TABLE routines ADD COLUMN IF NOT EXISTS body_parts text[];

-- Create GIN indexes for efficient array searching
CREATE INDEX IF NOT EXISTS idx_routines_tags_gin ON routines USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_routines_body_parts_gin ON routines USING GIN (body_parts);
```

#### Create Storage Bucket for Avatars

**Option A: Via Supabase Dashboard (Recommended)**
1. Go to Storage in Supabase Dashboard
2. Create a new bucket named `avatars`
3. Make it public

**Option B: Via SQL**
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;
```

#### Set Up Storage Policies
```sql
-- Public read access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Authenticated users can upload
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Authenticated users can update
CREATE POLICY "Authenticated users can update avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

-- Authenticated users can delete
CREATE POLICY "Authenticated users can delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');
```

#### Routine Builder Policies (Optional but Recommended)
```sql
-- Allow all users to read routines (both custom and pre-built)
CREATE POLICY "Anyone can view routines"
ON routines FOR SELECT
TO public
USING (true);

-- Authenticated users can create custom routines
CREATE POLICY "Authenticated users can create custom routines"
ON routines FOR INSERT
TO authenticated
WITH CHECK (is_custom = true AND created_by = auth.uid());

-- Users can only update their own custom routines
CREATE POLICY "Users can update own custom routines"
ON routines FOR UPDATE
TO authenticated
USING (is_custom = true AND created_by = auth.uid())
WITH CHECK (is_custom = true AND created_by = auth.uid());

-- Users can only delete their own custom routines
CREATE POLICY "Users can delete own custom routines"
ON routines FOR DELETE
TO authenticated
USING (is_custom = true AND created_by = auth.uid());
```

### 4. Start Development Server

```bash
npm start
```

This will start the Expo development server. You can then:
- Press `i` to open iOS Simulator
- Press `a` to open Android Emulator
- Scan QR code with Expo Go app on your phone

## Running on Different Platforms

### iOS (Mac only)
```bash
npm run ios
```

### Android
```bash
npm run android
```

### Web
```bash
npm run web
```

## Key Features Implementation

### Authentication Flow
1. User opens app → `_layout.tsx` checks auth state via AuthContext
2. If not authenticated → Redirects to login
3. After login → Checks email verification
4. If email not verified → Redirects to verify-email screen
5. After verification → Checks profile completion
6. If profile incomplete → Redirects to onboarding (3-4 steps depending on journey type)
7. If profile complete → Redirects to dashboard (tabs)

### Journey Focus Onboarding Flow

**Recovery Journey (5 Steps):**
1. **Step 1:** Journey selection with detailed cards
   - Injury Prevention card (blue) shows prevention benefits
   - Recovery card (red) shows recovery benefits
2. **Step 2 (Recovery only):** Initial Pain Check-In
   - Pain level slider (0-10) with color-coded display
   - Establishes baseline pain level for progress tracking
   - No pain locations collected (redundant with Step 3)
3. **Step 3 (Recovery only):** Recovery Areas
   - Filter by region (All, Upper Body, Lower Body)
   - Multi-select body parts affected
   - Optional personalization
4. **Step 4 (Recovery only):** Recovery Goals
   - Multi-select recovery goals
   - Optional personalization
5. **Step 5:** Fitness level selection (Beginner / Intermediate / Advanced)
6. **Completion:** Journey start date and initial pain level recorded

**Injury Prevention Journey (2 Steps):**
1. **Step 1:** Journey selection (select Injury Prevention)
2. **Step 5:** Fitness level selection (skips steps 2-4)
3. **Completion:** Journey start date recorded

**Mobile UX:**
- Fixed button positioning at bottom for easy thumb access
- Larger touch targets (56px minimum height)
- Smooth scrolling content with buttons always visible
- Border separator between content and action buttons

### Profile Picture Upload
- Uses Expo Image Picker for image selection
- Crops images to 1:1 aspect ratio
- Converts to base64 for upload
- Stores in Supabase Storage (avatars bucket)
- Updates profile with public URL
- Displays throughout app (Dashboard, Profile)

### Balanced Routine Recommendations
- Algorithm fetches one routine from each category (Mind, Body, Soul)
- **Intelligent Filtering:**
  - Primary filter: User's journey focus (Injury Prevention / Recovery)
  - Secondary filter: User's fitness level (Beginner / Intermediate / Advanced)
  - Routines can have multiple journey focuses (e.g., ['Injury Prevention', 'Recovery'])
- Orders by popularity (completion count)
- Falls back to most popular if no matches found
- Always returns exactly 3 routines (one per category)

### Journey Tracking System
- **Day Counter:** Calculates days since `journey_started_at` timestamp
- **Journey Badge Component:** Reusable component showing journey type with icon
  - Props: `focus`, `size`, `showLabel`, `recoveryArea`
  - Shield icon for Prevention (blue)
  - Heart icon for Recovery (red)
- **Recovery Area Display:** Shows specific body part for Recovery users
- **Journey Functions:**
  - `calculateJourneyDays()` - Calculates days from start date
  - `setJourneyStartDate()` - Sets or resets journey start date
  - `updateRecoveryInfo()` - Updates recovery-specific details

### Routine Search & Tagging System
- **Search Functions:**
  - `searchRoutinesByName()` - Searches name and description fields using PostgreSQL ILIKE
  - `searchRoutinesByTags()` - Searches tags and body_parts arrays (prepared for future AI)
- **Database Architecture:**
  - Tags stored as PostgreSQL text[] array for efficient querying (max 5 per routine)
  - Body parts stored as PostgreSQL text[] array with predefined options
  - GIN (Generalized Inverted Index) indexes for fast array containment queries
  - Text search index on name and description for ILIKE queries
- **Tagging in Routine Builder:**
  - Optional "Advanced Tags" section (collapsed by default)
  - **Tag Input UI:**
    - Type-and-add interface with add button (plus circle icon)
    - Maximum 5 tags per routine (30 characters each)
    - Duplicate prevention with validation alerts
    - Tags displayed as removable purple chips
    - Press Enter or click add button to add tag
  - **Body Parts Selection:**
    - Dropdown modal with region filters (All / Upper Body / Lower Body)
    - Multi-select from predefined body parts (matching onboarding options)
    - Selected parts displayed as removable chips
  - **Review Step Display:**
    - "Routine Overview" section (formerly "Basic Info")
    - Tags shown as purple chips
    - Body parts shown as amber chips
    - Both sections only appear if data is present
- **Future AI Integration:**
  - Tags and body_parts prepared for AI-powered routine recommendations
  - AI will reference: description, category, difficulty, tags, body_parts
  - Relevance scoring algorithm already implemented for tag-based search

### Progress Tracking
- Daily progress stored per user per date
- Tracks completion of Mind, Body, Soul routines
- Updates health score and streaks
- Refreshes automatically when returning to dashboard

## Architecture Decisions

### State Management
- **AuthContext** for global authentication and profile state
- Local state (useState) for component-specific data
- Supabase as source of truth, with context caching

### Navigation
- **Expo Router** for file-based routing
- Stack navigation for auth flow
- Tab navigation for main app
- Modal presentation for detail screens

### Styling
- StyleSheet for performance
- Inline styles for dynamic values
- Consistent spacing (4, 8, 12, 16, 24, 32, 40 px)
- Border radius: 8px (inputs), 12px (cards), 16px (badges)

### Data Fetching
- Direct Supabase queries in utility functions
- Promise.all for parallel data loading
- Error handling with try/catch and alerts
- Loading states for better UX

## Common Issues

### Metro Bundler Cache Issues
```bash
npm start -- --clear
```

### iOS Simulator Not Opening
```bash
npx expo start --ios
```

### Supabase Connection Issues
- Check `.env` file exists and has correct values
- Verify Supabase URL and anon key
- Check network connectivity

### Image Upload Issues
- Ensure avatars storage bucket is created
- Verify storage policies are set up
- Check image file size (keep under 5MB)

### Profile Picture Not Showing
- Clear app cache and restart
- Verify image URL in database
- Check storage bucket is public

## Recent Updates

### Pain Check-In System & Reset Journey (Latest)
- ✅ **Pain Check-In System for Recovery Journey:**
  - Initial pain check-in during onboarding (Step 2 for Recovery users)
  - Daily pain check-in modal with 3-step flow
  - Pain level slider (0-10) with color-coded visualization
  - Pain location tracking (body parts, Mind, Soul)
  - Optional notes for additional context
  - Pain progress chart on dashboard
  - Database table with RLS policies
- ✅ **Reset Journey Feature:**
  - Complete journey reset with confirmation dialog
  - PostgreSQL function with SECURITY DEFINER
  - Deletes all progress, completions, pain data, and activity
  - Resets stats to zero and clears profile journey data
  - Redirects to onboarding for fresh start
  - Pain modal prevented during reset (checks profile completion)
- ✅ **Onboarding Reorganization:**
  - Pain check-in moved from Step 5 to Step 2 (Recovery only)
  - Recovery flow: Journey → Pain → Areas → Goals → Fitness (5 steps)
  - Injury Prevention flow: Journey → Fitness (2 steps)
  - Fixed button positioning at bottom for mobile thumb access
  - Larger touch targets (56px minimum) for accessibility
  - No pain locations collected in onboarding (redundant with Recovery Areas)

### Routine Search & Tagging System
- ✅ Added search functionality for routines by name and description
- ✅ Database schema enhancements:
  - Tags array column (text[]) for general categorization
  - Body parts array column (text[]) for targeted body areas
  - GIN indexes on array columns for efficient PostgreSQL searching
- ✅ Routine Builder advanced tags section (optional):
  - Type-and-add tag input interface with add button
  - Maximum 5 tags per routine (30 characters each)
  - Duplicate prevention and validation
  - Tags displayed as removable purple chips
  - Select body parts via dropdown multi-select with region filters (All, Upper Body, Lower Body)
  - Selected body parts displayed as removable chips
- ✅ Enhanced Review step:
  - "Routine Overview" section (renamed from "Basic Info")
  - Tags displayed as purple chips
  - Body parts displayed as amber chips
- ✅ Prepared for future AI-powered search functionality
- ✅ Example tagging SQL for 10+ existing routines

### Journey Focus Enhancement
- ✅ Enhanced journey selection with detailed cards and icons
- ✅ Recovery-specific details collection (area and notes)
- ✅ Journey start date tracking
- ✅ Day counter on dashboard
- ✅ Journey badge component throughout app
- ✅ Recovery area display for Recovery users
- ✅ Journey goals table for future goal tracking
- ✅ Updated recommendation algorithm with journey filtering
- ✅ Dynamic onboarding steps (3 for Prevention, 4 for Recovery)

## Future Enhancements

### Features to Add
1. **AI-Powered Routine Search** - Leverage tags and body_parts for intelligent recommendations
2. Journey goals management (using journey_goals table)
3. Recovery progress tracking and milestones
4. Push notifications for daily reminders
5. Offline support with local caching
6. Progress animations and celebrations
7. Social features (share routines, community)
8. Routine scheduling and calendar view
9. Exercise video demonstrations
10. Achievement badges and milestones
11. Dark mode support
12. Accessibility improvements

### Technical Improvements
1. Add unit and integration tests
2. Implement error boundary
3. Add analytics tracking
4. Optimize image loading and caching
5. Add pull-to-refresh on lists
6. Implement infinite scroll for routines
7. Add skeleton loaders
8. Optimize bundle size

## Related Projects

- **Web App:** `../soteria_health` (Next.js)
- **Backend:** Supabase project
- **Design:** Figma (if applicable)

## Contributing

1. Create a feature branch
2. Make your changes
3. Test on both iOS and Android
4. Submit a pull request

## License

[Your License Here]

## Support

For issues or questions, please contact [Your Contact Info]
