# Soteria Health Mobile

React Native mobile app for Soteria Health - empowering individuals to take control of their wellness through community-driven, holistic routines.

## Project Overview

This is the mobile companion app to the Soteria Health web application, built with:

- **Expo Router** - File-based routing for React Native
- **TypeScript** - Type-safe development
- **Supabase** - Backend, authentication, and storage
- **React Native** - Cross-platform mobile development
- **Expo Image Picker** - Profile picture upload

## Features

### Authentication & Onboarding
- User sign up with email verification
- Secure login with password visibility toggle
- Multi-step onboarding flow
  - Journey focus selection (Injury Prevention / Recovery)
  - Fitness level selection (Beginner / Intermediate / Advanced)
  - Personal goals selection

### Dashboard
- Personalized greeting with profile picture
- Today's progress tracking (Mind, Body, Soul)
- Clickable progress cards that filter routines by category
- User statistics (Current Streak, Health Score, Total Routines)
- Balanced recommendations (one routine from each category)

### Routines
- Browse all routines with search functionality
- Filter by category (Mind, Body, Soul, All)
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
  - Review all details before publishing
- Exercise counter shows progress (X/30 exercises)
- Published routines integrate seamlessly with existing routine execution
- Custom routines marked with `is_custom: true` flag
- Tracked by creator with `created_by` user ID

### Profile Management
- View and edit profile information:
  - Full name
  - Journey focus
  - Fitness level
  - Age
- Upload and change profile picture
- View personal goals and injuries/limitations
- Sign out functionality

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
│   └── themed-text.tsx          # Themed text component
├── constants/
│   └── theme.ts                 # Theme constants and colors
├── lib/                          # Core utilities
│   ├── contexts/                # React contexts
│   │   └── AuthContext.tsx     # Authentication & profile context
│   ├── supabase/                # Supabase configuration
│   │   └── client.ts           # Supabase client with AsyncStorage
│   └── utils/                   # Utility functions
│       ├── auth.ts             # Auth helpers & profile picture upload
│       ├── dashboard.ts        # Dashboard data & balanced routines
│       └── routine-builder.ts  # Routine builder utilities & validation
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

### 2. Environment Variables

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Database Setup

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
-- created_at (timestamp)

-- Ensure the routines table supports custom routines:
ALTER TABLE routines ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false;
ALTER TABLE routines ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
```

#### Add Profile Picture Column
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
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
6. If profile incomplete → Redirects to onboarding
7. If profile complete → Redirects to dashboard (tabs)

### Profile Picture Upload
- Uses Expo Image Picker for image selection
- Crops images to 1:1 aspect ratio
- Converts to base64 for upload
- Stores in Supabase Storage (avatars bucket)
- Updates profile with public URL
- Displays throughout app (Dashboard, Profile)

### Balanced Routine Recommendations
- Algorithm fetches one routine from each category (Mind, Body, Soul)
- Filters by user's journey focus and fitness level
- Orders by popularity (completion count)
- Falls back to most popular if no matches found
- Always returns exactly 3 routines

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

## Future Enhancements

### Features to Add
1. Push notifications for daily reminders
2. Offline support with local caching
3. Progress animations and celebrations
4. Social features (share routines, community)
5. Custom routine creation
6. Routine scheduling and calendar view
7. Exercise video demonstrations
8. Achievement badges and milestones
9. Dark mode support
10. Accessibility improvements

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
