# Routine Discovery System - Implementation Guide

## Overview
This document provides comprehensive instructions for implementing the Routine Discovery System in Soteria Health. The system enables users to discover public routines (both official and community-created), save routines to their personal collection, and track engagement metrics.

## Architecture

### Key Components
1. **Database Schema** (`routine_discovery_system.sql`)
2. **Utility Functions** (`lib/utils/routine-discovery.ts`)
3. **UI Components** (`app/(tabs)/routines.tsx`)
4. **Type Definitions** (`types/index.ts`)

---

## Database Setup

### Step 1: Run the SQL Script

Connect to your Supabase database and execute the SQL script:

```bash
# Option 1: Via Supabase Dashboard
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of sql/routine_discovery_system.sql
3. Paste and click "Run"

# Option 2: Via psql command line
psql -h YOUR_SUPABASE_HOST \
     -U postgres \
     -d postgres \
     -f sql/routine_discovery_system.sql
```

### What the Script Does

1. **Creates `routine_saves` table**
   - Tracks which users have saved/bookmarked routines
   - Enforces unique constraint (one save per user per routine)

2. **Adds `is_public` column to `routines`**
   - Controls visibility of custom routines
   - All official routines (is_custom=false) are public by default

3. **Adds `save_count` column to `routines`**
   - Cached count of saves for performance
   - Automatically maintained by triggers

4. **Creates indexes for performance**
   - Discover feed queries
   - Sorting by completion count, save count, date
   - Filtering by category, difficulty, duration

5. **Creates triggers**
   - Auto-updates save_count when users save/unsave routines

6. **Sets up Row Level Security (RLS)**
   - Users can view/insert/delete their own saves
   - Users can view public routines

7. **Creates helper view**
   - `routine_discover_feed` view with all metrics and badges

---

## Verification

After running the SQL script, verify the setup:

```sql
-- Check that routine_saves table exists
SELECT * FROM routine_saves LIMIT 5;

-- Check save_count column
SELECT id, name, completion_count, save_count
FROM routines
ORDER BY save_count DESC
LIMIT 10;

-- Check discover feed view
SELECT id, name, completion_count, save_count,
       badge_popular, badge_trending, badge_new, badge_official
FROM routine_discover_feed
LIMIT 10;

-- Check indexes
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('routines', 'routine_saves')
ORDER BY tablename, indexname;
```

---

## Feature Details

### 1. Metrics System

#### Completion Count (Primary Metric)
- **What**: Number of users who completed the routine
- **Purpose**: Quality signal - shows routine effectiveness
- **Usage**: Used for "Popular" sorting (default)

#### Save Count (Secondary Metric)
- **What**: Number of users who bookmarked the routine
- **Purpose**: Discovery intent signal + personal collection
- **Usage**: Used for "Most Saved" sorting and Trending calculation

**NO Upvoting System**: Saves serve dual purpose - personal bookmarks AND community signals

### 2. Badge System

#### 🔥 Popular Badge
- **Criteria**: Routine has > 100 completions
- **Visual**: Flame icon + "Popular" text on orange background
- **Styling**: Matches circle UI - icon with text label
- **Purpose**: Indicates proven, high-quality routine

#### ⭐ Trending Badge
- **Criteria**: Routine has > 20 saves in last 7 days
- **Visual**: Star icon + "Trending" text on gold/yellow background
- **Styling**: Matches circle UI - icon with text label
- **Purpose**: Shows currently popular routines

#### ✨ New Badge
- **Criteria**: Routine created within last 7 days
- **Visual**: Sparkles icon + "New" text on blue background
- **Styling**: Matches circle UI - icon with text label
- **Purpose**: Highlights fresh content

#### Official Badge (Not Displayed)
- **Criteria**: Pre-built routine (is_custom = false)
- **Visual**: None (badge is calculated but not shown in UI)
- **Purpose**: Available in data for filtering (Official vs Community source filter)
- **Note**: Soteria-created routines don't need a visual indicator as they're high-quality by default

### 3. Tab Structure

#### Discover Tab
- Shows ALL public routines (official + community)
- Search bar with keyword filtering
- Sort options: Popular (default), Trending, Newest, Most Saved
- Filter options: Category, Difficulty, Journey Focus, Source (Official/Community)
- Each card shows: completion count, save count, badges, save button

#### My Routines Tab
Three sections:
1. **Recently Completed**: Last 5 routines user completed (quick access)
2. **Saved Routines**: Bookmarked routines from Discover
3. **My Custom Routines**: User's created routines with public/private toggle

### 4. Sorting Options

| Sort Option | Description | SQL Order |
|------------|-------------|-----------|
| Popular (default) | Most completed routines | `completion_count DESC` |
| Trending | Most saved in last 7 days | Calculated: recent saves count |
| Newest | Recently created | `created_at DESC` |
| Most Saved | Most bookmarked | `save_count DESC` |

### 5. Filtering Options

- **Category**: Mind, Body, Soul
- **Difficulty**: Beginner, Intermediate, Advanced
- **Journey Focus**: Injury Prevention, Recovery
- **Source**: All, Official, Community
- **Search**: Keyword search in name and description

---

## Implementation Checklist

### Backend (Database)
- [x] Run SQL script to create schema
- [x] Verify tables and indexes created
- [x] Verify RLS policies active
- [x] Test save/unsave functionality
- [x] Verify triggers working (save_count updates)

### Frontend (Code)
- [x] Add new types to `types/index.ts`
- [x] Create utility functions in `lib/utils/routine-discovery.ts`
- [x] Update routines screen UI
- [x] Implement Discover tab with sorting/filtering
- [x] Implement My Routines tab with sections
- [x] Add routine card with badges and metrics
- [x] Test save/unsave functionality
- [x] Test all sorting options
- [x] Test all filters

### Testing
- [ ] Test Discover feed loads correctly
- [ ] Test Popular sort shows high completion routines first
- [ ] Test Trending shows recently saved routines
- [ ] Test Newest shows recent routines
- [ ] Test Most Saved shows most bookmarked routines
- [ ] Test filters work correctly
- [ ] Test search functionality
- [ ] Test save/unsave updates UI immediately
- [ ] Test badges appear correctly (Popular, Trending, New)
- [ ] Test My Routines sections show correct data
- [ ] Test public/private toggle for custom routines
- [ ] Test Recently Completed section
- [ ] Test on both iOS and Android
- [ ] Verify dark mode styling

---

## API Endpoints Usage

All database operations are handled through Supabase client:

```typescript
import {
  getDiscoverRoutines,
  getSavedRoutines,
  getUserCustomRoutines,
  saveRoutine,
  unsaveRoutine,
  toggleRoutinePublicStatus,
  getRecentlyCompletedRoutines,
} from '@/lib/utils/routine-discovery';

// Get discover feed with sorting/filtering
const routines = await getDiscoverRoutines(userId, {
  sort: 'popular',
  filters: {
    category: 'Body',
    difficulty: 'Beginner',
  },
});

// Save a routine
await saveRoutine(userId, routineId);

// Unsave a routine
await unsaveRoutine(userId, routineId);

// Get user's saved routines
const saved = await getSavedRoutines(userId);

// Get user's custom routines
const custom = await getUserCustomRoutines(userId);

// Toggle routine visibility
await toggleRoutinePublicStatus(userId, routineId, true);

// Get recently completed
const recent = await getRecentlyCompletedRoutines(userId, 5);
```

---

## Performance Considerations

### Indexes Created
The SQL script creates optimized indexes for:
- Discover feed queries (is_public, completion_count, created_at)
- User saves lookup (user_id, routine_id)
- Trending calculation (routine_id, created_at)
- Category, difficulty, duration filtering

### Caching Strategy
- `save_count` is cached in routines table
- Updated automatically via triggers
- No need for real-time joins on every query

### Query Optimization
- View uses LEFT JOIN for creator info (only for community routines)
- Pagination support (limit/offset)
- Badge calculations done in application layer for flexibility

---

## Troubleshooting

### Issue: Saves not updating count
**Solution**: Check that trigger is active:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'trigger_update_save_count';
```

### Issue: RLS blocking queries
**Solution**: Verify policies are correctly set:
```sql
SELECT * FROM pg_policies WHERE tablename IN ('routines', 'routine_saves');
```

### Issue: Trending not showing correct routines
**Solution**: Verify recent saves query:
```sql
SELECT routine_id, COUNT(*) as recent_saves
FROM routine_saves
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY routine_id
HAVING COUNT(*) > 20
ORDER BY recent_saves DESC;
```

### Issue: Badges not appearing
**Solution**: Check badge calculation logic in frontend and verify dates

---

## Security Notes

1. **RLS Policies**: All tables have Row Level Security enabled
2. **User Isolation**: Users can only save/unsave their own routines
3. **Public Routines**: Only public routines visible in discover feed
4. **Creator Privacy**: Creator info only shown for community routines

---

## Future Enhancements

Potential features to add:

1. **Personalized Recommendations**: ML-based routine suggestions
2. **Collections**: Users can create themed collections of routines
3. **Sharing**: Direct routine sharing with friends
4. **Comments/Reviews**: User feedback on routines
5. **Difficulty Rating**: Community-driven difficulty adjustment
6. **Duration Estimates**: Average completion times from user data
7. **Follow Creators**: Follow favorite routine creators
8. **Notifications**: Notify when followed creator publishes new routine

---

## Support

For issues or questions:
1. Check verification queries above
2. Review Supabase logs for errors
3. Check browser console for frontend errors
4. Verify RLS policies not blocking legitimate queries

---

## Version History

- **v1.0** - Initial implementation with Discover feed, save functionality, badges, and metrics

---

## License

This implementation is part of the Soteria Health mobile application.
