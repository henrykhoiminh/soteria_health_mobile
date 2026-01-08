# Reset Journey & Pain Check-in Updates

## Summary
Updated the Reset Journey feature to include pain check-in data deletion and verified that pain check-ins properly prompt after profile setup.

## Changes Made

### 1. SQL Migration - Pain Data Deletion in Hard Reset
**File:** `sql/add_hard_reset_function.sql`

**Changes:**
- Added `pain_count` variable to track deleted pain check-ins
- Added step 5 to delete all pain check-ins: `DELETE FROM pain_checkins WHERE user_id = target_user_id`
- Updated step numbers (6 for stats reset, 7 for profile reset)
- Added `pain_checkins` count to the return JSON object

**What This Does:**
When a user performs a "Reset Journey", the function now deletes:
1. Daily progress records
2. Routine completions
3. Routine saves
4. Friend activity
5. **Pain check-ins** (NEW)
6. Resets user stats to zero
7. Resets profile journey data

**To Apply:**
Run the updated SQL migration in your Supabase SQL Editor:
```sql
-- Execute the contents of sql/add_hard_reset_function.sql
```

### 2. Pain Check-in Modal Logic (Already Correct)
**File:** `app/_layout.tsx`

**Current Implementation (No changes needed):**
The pain check-in modal already has proper logic:

```typescript
useEffect(() => {
  async function checkPainCheckIn() {
    if (!user || loading || !profile) return; // ✓ Checks for profile

    const inTabsGroup = segments[0] === '(tabs)';
    if (!inTabsGroup) return; // ✓ Only shows after onboarding

    const hasCheckedIn = await hasCheckedInToday(user.id);
    if (!hasCheckedIn) {
      setShowPainCheckIn(true); // ✓ Shows daily prompt
    }
  }

  checkPainCheckIn();
}, [user, profile, loading, segments]);
```

**Verification Checklist:**
- ✅ Modal only shows for authenticated users
- ✅ Modal only shows after profile is set up (checks `profile` existence)
- ✅ Modal only shows in tabs area (after completing onboarding)
- ✅ Modal shows daily (checks if user hasn't checked in today)
- ✅ After Reset Journey, profile will be cleared, so modal won't show until user completes onboarding again
- ✅ After completing onboarding (profile setup), the modal will automatically prompt on first app open

## User Flow After Reset Journey

1. **User clicks "Reset Journey"** in settings
2. **Hard reset function executes:**
   - Deletes all daily progress
   - Deletes all routine completions
   - Deletes all routine saves
   - Deletes all friend activity
   - **Deletes all pain check-ins** ✓ (NEW)
   - Resets stats to zero
   - Clears profile data (journey_focus, fitness_level, etc.)
3. **User is redirected to onboarding**
4. **User completes onboarding** and sets up their profile
5. **Profile is created** with journey_focus and fitness_level
6. **User is redirected to tabs/dashboard**
7. **Pain check-in modal automatically appears** (because profile now exists and user is in tabs area)

## Testing Steps

### Test 1: Reset Journey Deletes Pain Data
1. Log in as a user with existing pain check-ins
2. Navigate to Profile → Settings → Reset Journey
3. Confirm reset
4. Verify user is sent to onboarding
5. Complete onboarding
6. After reaching dashboard, verify pain check-in modal appears
7. Submit a pain check-in
8. Go to dashboard and verify "Pain Progress" section is empty/minimal (only today's data)

### Test 2: Pain Check-in After Profile Setup
1. Create a new user account
2. Complete email verification
3. Complete onboarding (set journey_focus, fitness_level, etc.)
4. After reaching tabs/dashboard, verify pain check-in modal appears
5. Submit check-in
6. Verify check-in was saved
7. Close and reopen app
8. Verify modal does NOT appear again same day
9. Wait until next day (or manually change system date)
10. Open app
11. Verify modal appears again

### Test 3: SQL Migration
1. Open Supabase Dashboard → SQL Editor
2. Run the updated `add_hard_reset_function.sql`
3. Verify function is created successfully
4. Test by calling: `SELECT hard_reset_user_data('user-id-here')`
5. Verify response JSON includes `pain_checkins` count

## Files Modified

1. `sql/add_hard_reset_function.sql` - Added pain check-ins deletion
2. `app/_layout.tsx` - No changes needed (already correct)
3. `RESET_JOURNEY_PAIN_UPDATES.md` - This documentation

## Database Schema Impact

The `pain_checkins` table has proper RLS policies and CASCADE delete:
- When a user's profile is deleted, pain check-ins are NOT automatically deleted
- The hard reset function explicitly deletes pain check-ins with SECURITY DEFINER to bypass RLS
- This is the correct approach for a "fresh start" reset

## Notes

- The pain check-in modal cannot be dismissed without submitting (by design)
- After reset, all pain tracking history is completely removed
- The user gets a truly fresh start with no historical pain data
- The modal will prompt immediately after completing onboarding
- The daily check-in logic ensures users are prompted once per day on first app open
