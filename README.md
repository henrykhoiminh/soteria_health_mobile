# Soteria Health Mobile

React Native mobile app for Soteria Health - empowering individuals to take control of their wellness through community-driven, holistic routines.

## Project Overview

This is the mobile companion app to the Soteria Health web application, built with:

- **Expo Router** - File-based routing for React Native
- **TypeScript** - Type-safe development
- **Supabase** - Backend and authentication
- **React Native** - Cross-platform mobile development

## Features

- User authentication (Sign up, Sign in, Onboarding)
- Dashboard with daily progress tracking
- Wellness routines (Mind, Body, Soul)
- Health score and streak tracking
- User profile management

## Project Structure

```
soteria-health-mobile/
├── app/                          # Expo Router app directory
│   ├── (auth)/                   # Authentication screens
│   │   ├── login.tsx            # Login screen
│   │   ├── signup.tsx           # Sign up screen
│   │   └── onboarding.tsx       # User onboarding
│   ├── (tabs)/                   # Main app tabs
│   │   ├── index.tsx            # Dashboard
│   │   ├── routines.tsx         # Routines list
│   │   └── profile.tsx          # User profile
│   └── _layout.tsx              # Root layout with navigation
├── components/                   # Reusable components
│   ├── Dashboard/
│   ├── HealthScore/
│   ├── Modal/
│   ├── Routine/
│   └── Streak/
├── lib/                          # Core utilities
│   ├── contexts/                # React contexts
│   │   └── AuthContext.tsx     # Authentication context
│   ├── supabase/                # Supabase configuration
│   │   └── client.ts           # Supabase client
│   └── utils/                   # Utility functions
│       ├── auth.ts             # Auth helpers
│       └── dashboard.ts        # Dashboard data
└── types/                        # TypeScript types
    └── index.ts                 # Shared type definitions
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

The following packages are included:
- `@supabase/supabase-js` - Supabase client
- `@react-native-async-storage/async-storage` - Persistent storage
- `react-native-url-polyfill` - URL polyfill for React Native
- `date-fns` - Date utilities

### 2. Environment Variables

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Note:** The `.env` file is already configured with the Supabase credentials from your Next.js app.

### 3. Start Development Server

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

## Key Differences from Next.js App

### 1. Supabase Client
- Uses `@supabase/supabase-js` instead of `@supabase/ssr`
- Configured with AsyncStorage for session persistence
- No server-side rendering considerations

### 2. Navigation
- Uses Expo Router instead of Next.js App Router
- File-based routing with similar structure
- Tab navigation instead of client-side routing

### 3. Styling
- StyleSheet instead of Tailwind CSS
- React Native components instead of HTML elements
- Platform-specific styling when needed

## Authentication Flow

1. User opens app → `app/_layout.tsx` checks auth state
2. If not authenticated → Redirects to `app/(auth)/login.tsx`
3. After login → Redirects to `app/(tabs)/index.tsx` (Dashboard)
4. Auth state managed by `AuthContext` provider

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

## Next Steps

### Components to Add
1. Routine Detail Screen - `/app/routines/[id].tsx`
2. Routine Execution Screen - `/app/routines/[id]/execute.tsx`
3. Enhanced components (Health Score, Streak Display, Modals)

### Features to Implement
1. Push notifications for daily reminders
2. Offline support with local caching
3. Progress animations and celebrations
4. Social features (share routines, community)
5. Custom routine creation

## Related Projects

- **Web App:** `../soteria_health` (Next.js)
- **Backend:** Supabase project
