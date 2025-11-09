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
- Enhanced multi-step onboarding flow
  - **Journey Focus Selection** - Detailed cards with icons and benefits
    - Injury Prevention: Shield icon (blue #3B82F6) with prevention-focused features
    - Recovery: Heart icon (red #EF4444) with recovery-focused features
  - **Recovery Details** (Recovery users only) - Optional personalization
    - Recovery area selection (Lower Back, Knee, Shoulder, Hip, Neck, Ankle, Wrist, Elbow, Other)
    - Recovery goals and notes text area
  - Fitness level selection (Beginner / Intermediate / Advanced)
  - Personal goals selection (multi-select)
- Journey start date automatically recorded

### Dashboard
- Personalized greeting with profile picture
- **Journey Tracking**
  - Journey badge with icon (Shield for Prevention, Heart for Recovery)
  - Day counter showing "Day X of [Journey Name]"
  - Recovery area display for Recovery users
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
  - Share routines within circles
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
│       └── routine-builder.ts  # Routine builder utilities & validation
├── sql/                          # Database migration files
│   ├── database_migration_journey_enhancements.sql  # Journey tracking migrations
│   ├── database_migration_routine_search_tagging.sql # Search & tagging migrations
│   └── example_routine_tagging.sql                  # Example routine tags
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
- `@react-native-picker/picker` - Native dropdown component for recovery area selection

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
1. **Step 1:** Journey selection with detailed cards
   - Injury Prevention card (blue) shows prevention benefits
   - Recovery card (red) shows recovery benefits
2. **Step 2 (Recovery only):** Recovery details
   - Optional recovery area dropdown
   - Optional recovery notes text area
3. **Step 3:** Fitness level selection
4. **Step 4:** Personal goals selection
5. **Completion:** Journey start date automatically recorded

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

### Routine Search & Tagging System (Latest)
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
