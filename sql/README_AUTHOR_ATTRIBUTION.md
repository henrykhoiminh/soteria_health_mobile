# Routine Author Attribution System - Implementation Guide

## Overview

The Routine Author Attribution System distinguishes between official Soteria-created routines and community-created custom routines throughout the app. This system provides clear visual attribution and filtering capabilities.

---

## Implementation Summary

### ✅ Completed Components

#### 1. Database Migration (`sql/migrations/add_routine_author_attribution.sql`)

**Added Columns:**
- `author_type` - TEXT with CHECK constraint ('official' or 'community')
- `official_author` - TEXT for official routine creator names (e.g., "Soteria Health Team", "Dr. Smith")

**Indexes Created:**
- `idx_routines_author_type` - For filtering by author type
- `idx_routines_public_author` - Composite index for public routines by author type

**Data Migration:**
- All existing non-custom routines → `author_type: 'official'`, `official_author: 'Soteria Health Team'`
- All existing custom routines → `author_type: 'community'`, `official_author: NULL`

**RLS Policies Updated:**
- Users can see all official routines
- Users can see public community routines
- Users can see their own private community routines
- Only authenticated users can create community routines
- Users can only edit/delete their own community routines

**Helper Function:**
- `create_official_routine()` - For seeding/admin use only (service_role access)

#### 2. TypeScript Types (`types/index.ts`)

**Added:**
```typescript
export type RoutineAuthorType = 'official' | 'community'

// Added to Routine interface:
author_type: RoutineAuthorType
official_author?: string | null
creator_name?: string
creator_username?: string
creator_avatar?: string
```

**Deprecated:**
- `badge_official` - Use `author_type` instead

#### 3. Author Badge Component (`components/RoutineAuthorBadge.tsx`)

**Features:**
- Official badge: Dark blue background with crown emoji (👑) + "Soteria Official"
- Shows `official_author` name if provided (e.g., "Dr. Smith")
- Community badge: Shows @username with optional profile picture
- Three sizes: 'small', 'medium', 'large'
- Proper dark mode styling

**Props:**
```typescript
interface RoutineAuthorBadgeProps {
  authorType: RoutineAuthorType;
  officialAuthor?: string | null;
  creatorUsername?: string;
  creatorAvatar?: string;
  creatorName?: string;
  size?: 'small' | 'medium' | 'large';
  showAvatar?: boolean;
}
```

#### 4. Updated Files

**`app/(tabs)/routines.tsx`:**
- ✅ Imported RoutineAuthorBadge component
- ✅ Added SOURCE_FILTERS constant for filtering
- ✅ Updated RoutineCard to display author badge (size: small)
- ✅ Source filter UI already exists in FilterModal (lines 730-779)

**`lib/utils/routine-discovery.ts`:**
- ✅ Updated `getSavedRoutines()` - includes author_type, official_author
- ✅ Updated `buildDiscoverQuery()` - includes author_type, official_author, profiles join
- ✅ Updated `getUserCustomRoutines()` - includes author_type, official_author
- ✅ Updated `getRecentlyCompletedRoutines()` - includes author_type, official_author

**`app/routines/[id].tsx`:**
- ✅ Imported RoutineAuthorBadge component
- ✅ Added author badge display (size: medium, prominent placement)
- ✅ Added authorBadgeContainer style

**`lib/utils/dashboard.ts`:**
- ✅ Updated `getRoutineById()` - joins profiles table and maps creator fields

**`lib/utils/social.ts`:**
- ⚠️ `getAvailableRoutinesForCircle()` - uses `select('*')` which will auto-include new columns
- ⚠️ `searchCircleRoutines()` - uses `circle_routine_stats` view (may need DB view update)

---

## Database Migration Instructions

### Step 1: Run the Migration

Execute the SQL migration in your Supabase SQL Editor:

```sql
-- File: sql/migrations/add_routine_author_attribution.sql
```

**Important:** This migration:
1. Adds new columns with default values
2. Migrates all existing data automatically
3. Updates RLS policies (drops and recreates)
4. Creates helper function for seeding official routines

### Step 2: Verify Migration

Run verification queries (included in migration):

```sql
-- Check official routines
SELECT COUNT(*) as official_count FROM routines WHERE author_type = 'official';

-- Check community routines
SELECT COUNT(*) as community_count FROM routines WHERE author_type = 'community';

-- Verify indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'routines'
AND indexname LIKE '%author%';
```

### Step 3: Update Database View (if needed)

If the `circle_routine_stats` view exists, update it to include the new author fields:

```sql
-- Check if view exists
SELECT * FROM information_schema.views WHERE table_name = 'circle_routine_stats';

-- If it exists, recreate it with new fields:
CREATE OR REPLACE VIEW circle_routine_stats AS
SELECT
  cr.id as circle_routine_id,
  cr.circle_id,
  cr.routine_id,
  cr.shared_by,
  cr.shared_at,
  r.name as routine_name,
  r.description as routine_description,
  r.category,
  r.difficulty,
  r.duration_minutes,
  r.completion_count,
  r.author_type,           -- ← NEW
  r.official_author,       -- ← NEW
  -- Include any other fields from the original view
FROM circle_routines cr
JOIN routines r ON cr.routine_id = r.id;
```

---

## Creating Official Routines

### Using the Helper Function

For seeding official routines or admin operations:

```sql
SELECT create_official_routine(
  p_name := 'Morning Mobility Flow',
  p_description := 'Gentle morning stretches...',
  p_category := 'Body',
  p_difficulty := 'Beginner',
  p_duration_minutes := 15,
  p_exercises := '[{"name": "...", ...}]'::JSONB,
  p_image_url := NULL,
  p_journey_focus := ARRAY['Recovery'],
  p_tags := ARRAY['Morning', 'Stretching'],
  p_official_author := 'Dr. Sarah Johnson'  -- Optional, defaults to "Soteria Health Team"
);
```

### Direct SQL (Service Role Only)

```sql
INSERT INTO routines (
  name, description, category, difficulty,
  duration_minutes, exercises, journey_focus,
  is_custom, author_type, official_author, is_public
) VALUES (
  'Morning Mobility Flow',
  'Gentle morning stretches...',
  'Body',
  'Beginner',
  15,
  '[...]'::JSONB,
  ARRAY['Recovery'],
  false,
  'official',
  'Soteria Health Team',
  true
);
```

---

## UI Components Usage

### In Routine Cards

```tsx
<RoutineAuthorBadge
  authorType={routine.author_type}
  officialAuthor={routine.official_author}
  creatorUsername={routine.creator_username}
  creatorAvatar={routine.creator_avatar}
  creatorName={routine.creator_name}
  size="small"
  showAvatar={true}
/>
```

### In Routine Detail Pages

```tsx
<RoutineAuthorBadge
  authorType={routine.author_type}
  officialAuthor={routine.official_author}
  creatorUsername={routine.creator_username}
  creatorAvatar={routine.creator_avatar}
  creatorName={routine.creator_name}
  size="medium"
  showAvatar={true}
/>
```

### Filtering by Source

The `RoutineSourceFilter` type is already implemented:

```typescript
type RoutineSourceFilter = 'all' | 'official' | 'community'

// In your filters:
const filters: RoutineFilters = {
  source: 'official', // Shows only official routines
  // ... other filters
};
```

---

## Testing Checklist

### ⬜ Database Testing

- [ ] Migration runs successfully without errors
- [ ] All existing non-custom routines are marked as `author_type: 'official'`
- [ ] All existing custom routines are marked as `author_type: 'community'`
- [ ] Indexes are created correctly
- [ ] `create_official_routine()` function works
- [ ] RLS policies work correctly:
  - [ ] Users can see all official routines
  - [ ] Users can see public community routines
  - [ ] Users can see their own private community routines
  - [ ] Users cannot see other users' private community routines

### ⬜ UI Testing

**Routines Tab:**
- [ ] Official routines show "👑 Soteria Official" badge
- [ ] Community routines show "@username" with avatar
- [ ] Source filter works: All / Official / Community
- [ ] Badges display correctly in all routine cards

**Routine Detail Page:**
- [ ] Author badge displays prominently (medium size)
- [ ] Official routines show correct official_author name
- [ ] Community routines show creator info correctly

**Discover Tab:**
- [ ] Filter by source works correctly
- [ ] Official and community routines are properly distinguished
- [ ] Saved routines maintain author attribution

**Circles:**
- [ ] Circle routines display with author badges
- [ ] Adding routines to circles preserves attribution
- [ ] Official and community routines both work in circles

**Custom Routine Builder:**
- [ ] New custom routines are created with `author_type: 'community'`
- [ ] User cannot change author_type via the app

### ⬜ Edge Cases

- [ ] Routines without creator profile (NULL created_by) display correctly
- [ ] Official routines with different official_author names display correctly
- [ ] Search and filtering maintain author attribution
- [ ] Pagination maintains author attribution

---

## Known Limitations

1. **Circle Routine Stats View:** The `circle_routine_stats` database view may need manual updating to include `author_type` and `official_author` fields. Check if this view exists and update accordingly.

2. **Existing Official Routines:** All existing non-custom routines were automatically set to `official_author: 'Soteria Health Team'`. If specific routines should have different authors (e.g., "Dr. Smith"), update them manually:

```sql
UPDATE routines
SET official_author = 'Dr. Sarah Johnson'
WHERE name = 'Advanced Recovery Protocol'
AND author_type = 'official';
```

3. **Profile Picture URLs:** Community routine badges rely on `creator_avatar` from the profiles table. Ensure profile pictures are properly set up for users who create public routines.

---

## Future Enhancements

- [ ] Admin UI for managing official routines
- [ ] Verified community creator badges
- [ ] Author profile pages
- [ ] Featured official authors section
- [ ] Analytics by author type

---

## Rollback Instructions

If you need to roll back this migration:

```sql
-- WARNING: This will remove author attribution data

-- Drop helper function
DROP FUNCTION IF EXISTS create_official_routine;

-- Drop indexes
DROP INDEX IF EXISTS idx_routines_public_author;
DROP INDEX IF EXISTS idx_routines_author_type;

-- Remove columns
ALTER TABLE routines DROP COLUMN IF EXISTS official_author;
ALTER TABLE routines DROP COLUMN IF EXISTS author_type;

-- Restore old RLS policies (you'll need to recreate your original policies)
```

---

## Support

For questions or issues:
1. Check verification queries in the migration file
2. Review TypeScript types in `types/index.ts`
3. Examine the RoutineAuthorBadge component for styling
4. Check console logs for database errors

---

**Implementation Date:** 2025-11-15
**Migration File:** `sql/migrations/add_routine_author_attribution.sql`
**Documentation:** This file + inline comments in migration SQL
