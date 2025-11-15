# Timezone Support Implementation

## Overview

The Soteria Health app now supports timezone-aware daily progress tracking. This ensures that users around the world experience daily resets at midnight in their **local timezone**, not UTC midnight.

## Problem

Previously, the app used UTC dates everywhere (`new Date().toISOString().split('T')[0]`). This caused issues for users in different timezones:

- A user in EST (UTC-5) completing a routine at 10:00 PM local time would see it counted for the next day
- A user in EST at 7:00 AM local time would still see the previous day's progress because UTC hadn't rolled over yet
- Daily streaks and progress didn't align with the user's actual day

## Solution

We've implemented a comprehensive timezone-aware system that:

1. **Calculates local dates on the client** - Uses device timezone
2. **Stores local dates in the database** - Daily progress uses local dates
3. **Performs all date comparisons using local dates** - Streaks calculate correctly
4. **Updates at midnight local time** - Daily resets happen when users expect them

---

## Files Changed

### New Files

#### `lib/utils/timezone.ts`
Central timezone utility library with functions for:
- `getLocalDateString()` - Get current date in user's local timezone (YYYY-MM-DD)
- `getLocalYesterdayString()` - Get yesterday's date in local timezone
- `getLocalDateWithOffset(days)` - Get date offset by N days in local timezone
- `timestampToLocalDateString(timestamp)` - Convert any timestamp to local date
- `getCurrentTimestamp()` - Get current ISO timestamp
- `daysBetween(date1, date2)` - Calculate days between two dates
- `isToday(dateString)` - Check if date is today
- `isYesterday(dateString)` - Check if date is yesterday

#### `sql/migrations/add_timezone_support.sql`
Database migration that adds:
- `update_daily_progress_for_date()` function - Updates daily progress with client-provided local date
- Updated triggers for milestone system
- Comments and documentation

### Modified Files

#### `lib/utils/stats.ts`
Updated all date operations to use local timezone:
- Category streak calculations use local dates
- Harmony streak calculations use local dates
- Avatar state calculations use local dates
- Last activity dates use local timezone conversion

#### `lib/utils/dashboard.ts`
- `getTodayProgress()` - Now uses local date for queries
- `completeRoutine()` - Calls database function with local date to update daily progress

#### `lib/utils/pain-checkin.ts`
- `getTodayDate()` - Now uses timezone utility for local dates

---

## How It Works

### 1. User Completes a Routine

```typescript
// Client calculates local date
const localDate = getLocalDateString() // e.g., "2025-01-15" in EST

// Client calls database function
await supabase.rpc('update_daily_progress_for_date', {
  p_user_id: userId,
  p_local_date: localDate,  // Local date, not UTC!
  p_category: category,
})
```

### 2. Database Stores Local Date

```sql
-- daily_progress table stores the local date
INSERT INTO daily_progress (user_id, date, mind_complete, body_complete, soul_complete)
VALUES (user_id, '2025-01-15', TRUE, FALSE, FALSE)  -- Local date
```

### 3. Streak Calculations Use Local Dates

```typescript
// All completions are converted to local dates
const completionDates = new Set(
  completions.map(c => timestampToLocalDateString(c.completed_at))
)

// Compare with local today/yesterday
const today = getLocalDateString()
const yesterday = getLocalYesterdayString()

// Streak calculation works correctly
if (completionDates.has(today) || completionDates.has(yesterday)) {
  // Streak continues
}
```

---

## Installation Steps

### 1. Run Database Migration

1. Open Supabase SQL Editor
2. Copy contents of `sql/migrations/add_timezone_support.sql`
3. Execute the script
4. Verify no errors

**What this creates:**
- `update_daily_progress_for_date()` function
- Updated milestone triggers
- Permissions for authenticated users

### 2. Verify Installation

```sql
-- Check function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'update_daily_progress_for_date';

-- Should return one row
```

### 3. Test the System

**Test Case: Complete a routine at different times**

1. Complete a routine before midnight local time
2. Check daily progress - should show for today
3. Wait until after midnight local time
4. Complete another routine
5. Check daily progress - should show for new day

**Expected Behavior:**
- Routines completed before midnight count for current day
- Routines completed after midnight count for next day
- All based on LOCAL time, not UTC

---

## Examples

### User in EST (UTC-5)

**Scenario 1: Evening completion**
- Local time: 10:00 PM EST (Jan 14)
- UTC time: 3:00 AM (Jan 15)
- **Result**: Counts for Jan 14 (local date) ✅

**Scenario 2: Morning completion**
- Local time: 7:00 AM EST (Jan 15)
- UTC time: 12:00 PM (Jan 15)
- **Result**: Counts for Jan 15 (local date) ✅

### User in JST (UTC+9)

**Scenario 1: Late night completion**
- Local time: 11:30 PM JST (Jan 15)
- UTC time: 2:30 PM (Jan 15)
- **Result**: Counts for Jan 15 (local date) ✅

**Scenario 2: Early morning completion**
- Local time: 12:30 AM JST (Jan 16)
- UTC time: 3:30 PM (Jan 15 - still previous day in UTC!)
- **Result**: Counts for Jan 16 (local date) ✅

---

## Technical Details

### Date Storage

- **routine_completions.completed_at**: Stores precise timestamp (ISO 8601)
- **daily_progress.date**: Stores local date (DATE type, YYYY-MM-DD)
- **pain_checkins.check_in_date**: Stores local date (DATE type, YYYY-MM-DD)

### Date Calculations

All date calculations now follow this pattern:

```typescript
// ❌ OLD (UTC-based)
const today = new Date().toISOString().split('T')[0]

// ✅ NEW (Timezone-aware)
const today = getLocalDateString()
```

### Streak Logic

Streaks are calculated by:
1. Fetching all completions from database
2. Converting each `completed_at` timestamp to local date
3. Creating a Set of unique local dates
4. Checking consecutive days using local dates

### Database Function

The `update_daily_progress_for_date()` function:
- Accepts a user ID, local date, and category
- Inserts or updates daily_progress for that specific date
- Uses `ON CONFLICT ... DO UPDATE` to handle multiple completions per day
- Runs with `SECURITY DEFINER` to bypass RLS

---

## Migration Notes

### Backwards Compatibility

✅ **Fully backwards compatible**
- Existing data continues to work
- Old dates are interpreted as-is
- New completions use local dates going forward

### Data Consistency

The migration does NOT modify existing data. Historical data remains unchanged. Going forward:
- New routine completions use local dates
- New pain check-ins use local dates
- Streak calculations work with both old and new data

### Performance

- Minimal performance impact
- Database function is lightweight
- Client-side date calculations are instant
- No additional database queries needed

---

## Testing Checklist

- [ ] Complete a routine before midnight local time → Verify counts for current day
- [ ] Complete a routine after midnight local time → Verify counts for new day
- [ ] Check pain check-in → Verify uses local date
- [ ] View daily progress → Verify shows correct day
- [ ] Check streaks → Verify calculated correctly
- [ ] Test in different timezones (if possible)

---

## Troubleshooting

### Issue: Dates still seem to be UTC

**Solution**: Ensure you've run the database migration and restarted the app. The app may cache old functions.

### Issue: Daily progress not updating

**Check**:
1. Run SQL migration: `sql/migrations/add_timezone_support.sql`
2. Verify function exists: `SELECT * FROM pg_proc WHERE proname = 'update_daily_progress_for_date';`
3. Check permissions: Function should have `GRANT EXECUTE TO authenticated`

### Issue: Streaks broken after migration

**Cause**: Old code is still running
**Solution**:
1. Hard refresh the app (close completely and reopen)
2. Clear any caches
3. Verify code changes were deployed

---

## Future Enhancements

Potential improvements:
1. **User Profile Timezone Setting**: Allow users to manually set their timezone
2. **Daylight Saving Time Handling**: Automatically handle DST transitions
3. **Timezone Display**: Show user's detected timezone in settings
4. **Multi-timezone Support**: For users who travel frequently

---

**Version**: 1.0.0
**Last Updated**: 2025-01-15
**Author**: Soteria Health Development Team
