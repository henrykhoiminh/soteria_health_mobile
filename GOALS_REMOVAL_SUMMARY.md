# Goals Mechanic Removal - Summary

## Overview
Removed the generic "goals" mechanic from Soteria Health app as it doesn't align with the core focus on injury prevention and recovery. The `journey_focus` field already captures the user's primary goal.

**Important**: `recovery_goals` (specific to the Recovery journey) remains intact. Only the generic "goals" field has been removed.

---

## Changes Made

### 1. Database Changes
**File**: `sql/remove_goals.sql`

Created SQL script to:
- Drop `goals` column from `profiles` table
- Includes backup instructions (commented out)
- Includes verification queries

**To execute**: Run in Supabase SQL Editor

```sql
ALTER TABLE profiles DROP COLUMN IF EXISTS goals;
```

---

### 2. Type Definitions
**File**: `types/index.ts`

**Removed**:
```typescript
goals: string[]
```

**Result**: Profile interface no longer includes goals field

---

### 3. Onboarding Flow
**File**: `app/(auth)/onboarding.tsx`

**Removed**:
- `GOALS` constant array (lines 28-35)
- `selectedGoals` state variable
- `toggleGoal` function
- Step 5 (goals selection screen) entirely
- Goals validation in `handleComplete`
- Goals in profile updates

**Updated**:
- `getTotalSteps()`: Recovery path now has 4 steps (was 5), Injury Prevention has 2 steps (was 3)
- `getCurrentStepDisplay()`: Removed step 5 logic
- Button logic: Complete button now shows at step 4 instead of step 5

**New Flow**:
- Step 1: Journey Focus selection
- Step 2: Recovery Areas (Recovery path only)
- Step 3: Recovery Goals (Recovery path only)
- Step 4: Fitness Level → Complete Setup

---

### 4. Profile Screen
**File**: `app/(tabs)/profile.tsx`

**Removed**:
- "Your Goals" section display (lines 393-404)
- Goals rendering and styling

**Note**: The `goalsContainer` style is still used for displaying injuries, so it remains in the stylesheet.

---

### 5. Utility Functions
**File**: `lib/utils/auth.ts`

**Updated**: `hardResetUserData()` function
- Removed `goals: []` from profile reset update

---

### 6. Dashboard
**File**: `app/(tabs)/index.tsx`

**No changes needed** - Dashboard displays `recovery_goals` (specific to recovery journey), not the generic `goals` field.

---

## What Remains (Intentionally)

### recovery_goals
This field is **intentionally kept** and is different from the removed "goals":
- **recovery_goals**: Specific predefined goals for Recovery journey focus
- **goals** (removed): Generic wellness goals unrelated to injury/recovery

### Where recovery_goals is used:
- Dashboard: Displays recovery goals for users on Recovery path
- Onboarding: Step 3 for Recovery path
- Profile: Part of recovery-specific data

---

## Verification Steps

### 1. Run SQL Script
```bash
# In Supabase SQL Editor
Run: sql/remove_goals.sql
```

### 2. Verify Database
```sql
-- Should return 0
SELECT COUNT(*) as goals_column_exists
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'goals';
```

### 3. Test Onboarding Flow
- [ ] Injury Prevention path: Should have 2 steps (Journey → Fitness)
- [ ] Recovery path: Should have 4 steps (Journey → Areas → Goals → Fitness)
- [ ] No "What are your goals?" screen should appear
- [ ] Complete Setup button should appear at Fitness Level step

### 4. Test Profile Screen
- [ ] "Your Goals" section should not appear
- [ ] Injuries/Limitations section should still display correctly

### 5. Test Journey Reset
- [ ] Reset Journey should not attempt to clear goals field
- [ ] No errors should occur during reset

---

## Files Modified

1. ✅ `sql/remove_goals.sql` - New SQL script
2. ✅ `types/index.ts` - Removed goals from Profile interface
3. ✅ `app/(auth)/onboarding.tsx` - Removed goals selection (Step 5)
4. ✅ `app/(tabs)/profile.tsx` - Removed goals display section
5. ✅ `lib/utils/auth.ts` - Removed goals from profile reset

---

## Files NOT Modified (No goals references)

- `app/(tabs)/index.tsx` - Uses recovery_goals, not goals
- `app/(tabs)/routines.tsx` - No goals references
- `app/(tabs)/builder.tsx` - No goals references
- `app/(tabs)/social.tsx` - No goals references
- Database migration files - Kept for historical reference

---

## Breaking Changes

### Database
- ❌ `profiles.goals` column will be dropped
- ✅ All existing goals data will be permanently deleted
- ✅ No migration path needed (goals feature being completely removed)

### API
- ❌ Any API calls expecting `goals` field will return undefined
- ✅ No external APIs or third-party integrations affected

### User Impact
- ❌ Users will lose their previously selected generic goals
- ✅ Users on Recovery path will keep their recovery_goals
- ✅ journey_focus captures primary user goal

---

## Rollback Instructions

If you need to restore the goals mechanic:

### 1. Database
```sql
ALTER TABLE profiles ADD COLUMN goals text[] DEFAULT '{}';
```

### 2. Code
Restore from backup:
```bash
# If you created a backup branch
git checkout <backup-branch> -- app/(auth)/onboarding.tsx
git checkout <backup-branch> -- app/(tabs)/profile.tsx
git checkout <backup-branch> -- types/index.ts
git checkout <backup-branch> -- lib/utils/auth.ts
```

---

## Testing Checklist

- [ ] Run SQL removal script in Supabase
- [ ] Verify goals column is dropped
- [ ] Start app and test onboarding flow
  - [ ] Injury Prevention path (2 steps)
  - [ ] Recovery path (4 steps)
- [ ] Test profile screen displays correctly
- [ ] Test journey reset functionality
- [ ] Verify no console errors
- [ ] Test on iOS
- [ ] Test on Android

---

## Notes

1. **recovery_goals vs goals**: These are two different fields. recovery_goals is specific to the Recovery journey and remains in the app.

2. **journey_focus**: This field (`'Injury Prevention' | 'Recovery'`) serves as the primary goal indicator for users.

3. **No data migration needed**: Since the goals feature is being completely removed, no data migration is required. The column can be safely dropped.

4. **Backward compatibility**: The app will continue to work with older profiles that had goals data - those values will simply no longer be accessible after the column is dropped.

---

## Support

If you encounter any issues after removal:

1. Check TypeScript errors: `npx tsc --noEmit`
2. Check for undefined references: Search codebase for `\.goals` or `goals:`
3. Review console for runtime errors
4. Verify SQL script executed successfully

---

## Completed
✅ All goals references removed from codebase
✅ SQL script created for database cleanup
✅ Onboarding flow updated (4 steps max)
✅ Profile screen updated
✅ No breaking references remain
