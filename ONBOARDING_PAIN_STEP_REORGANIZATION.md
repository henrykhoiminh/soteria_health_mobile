# Onboarding Pain Check-In Step Reorganization

## Summary
Moved the pain check-in step from Step 5 to Step 2 in the onboarding flow for Recovery journey users. Also updated the daily pain check-in modal to NOT appear when profile is incomplete (e.g., during/after Reset Journey).

## Changes Made

### 1. File: `app/_layout.tsx`
**Purpose:** Prevent pain modal from showing when profile is incomplete

**Changes:**
- Added `profileComplete` check in the pain check-in effect
- Modal only shows if BOTH `inTabsGroup` AND `profileComplete` are true
- `profileComplete` checks for `journey_focus` and `fitness_level`

```typescript
const profileComplete = profile?.journey_focus && profile?.fitness_level;

if (!inTabsGroup || !profileComplete) return;
```

**Impact:**
- Pain modal will NOT show during Reset Journey (when profile is cleared)
- Pain modal will NOT show until user completes onboarding after reset
- User will input their pain data during onboarding instead

---

### 2. File: `app/(auth)/onboarding.tsx`
**Purpose:** Reorganize onboarding steps to put pain check-in earlier in the flow

#### New Flow Structure

**Recovery Journey (5 Steps):**
1. **Step 1**: Journey Focus → Select "Recovery"
2. **Step 2**: Pain Check-In → Rate pain level & select locations (MOVED FROM STEP 5)
3. **Step 3**: Recovery Areas → Select affected body parts (MOVED FROM STEP 2)
4. **Step 4**: Recovery Goals → Select goals (MOVED FROM STEP 3)
5. **Step 5**: Fitness Level → Select level (MOVED FROM STEP 4)

**Injury Prevention Journey (2 Steps):**
1. **Step 1**: Journey Focus → Select "Injury Prevention"
2. **Step 5**: Fitness Level → Select level (skips steps 2-4)

#### Changes Made

**a) Step 2 - Now Pain Check-In (Recovery Only)**
- Moved pain check-in UI from old step 5 to step 2
- Only shown for Recovery journey users
- Includes:
  - Pain level slider (0-10)
  - Color-coded pain display
- **Note**: Pain locations are NOT collected during onboarding (Step 3 Recovery Areas serves this purpose)

**b) Step 3 - Now Recovery Areas (Recovery Only)**
- Moved from old step 2 to step 3
- Body part selection with filters
- Optional step

**c) Step 4 - Now Recovery Goals (Recovery Only)**
- Moved from old step 3 to step 4
- Goal selection
- Optional step

**d) Step 5 - Now Fitness Level (Both Journeys)**
- Moved from old step 4 to step 5
- Final step for both journeys
- Required step

**e) Navigation Logic - Updated**
- `handleNextStep()`:
  - Step 1 → Step 2 (Pain) for Recovery
  - Step 1 → Step 5 (Fitness) for Injury Prevention
  - Step 2 → Step 3 (Recovery Areas)
  - Step 3 → Step 4 (Recovery Goals)
  - Step 4 → Step 5 (Fitness Level)

- `handlePreviousStep()`:
  - Step 5 → Step 1 (Injury Prevention)
  - Step 5 → Step 4 (Recovery)
  - Step 4 → Step 3
  - Step 3 → Step 2
  - Step 2 → Step 1

**f) Button Logic - Simplified**
- Shows "Next" button for steps 1-4 (step < 5)
- Shows "Complete Setup" button at step 5
- Removed complex conditional for Recovery journey

**g) Step Display - Updated**
```typescript
const getCurrentStepDisplay = () => {
  if (step === 1) return 1; // Journey focus
  if (step === 2) return 2; // Pain check-in (Recovery only)
  if (step === 3) return 3; // Recovery areas (Recovery only)
  if (step === 4) return 4; // Recovery goals (Recovery only)
  if (step === 5) return journeyFocus === 'Recovery' ? 5 : 2; // Fitness
  return step;
};
```

---

## Benefits of This Change

### 1. **Earlier Pain Context**
- Users rate their pain immediately after selecting Recovery journey
- Provides context for subsequent recovery area and goal selections
- More intuitive flow
- Pain locations are not collected (avoids redundancy with Recovery Areas in Step 3)

### 2. **Prevents Modal During Reset**
- Pain modal no longer appears when profile is incomplete
- User completes pain check-in as part of onboarding instead
- Cleaner user experience after Reset Journey

### 3. **Better Recovery Flow**
- Pain → Recovery Areas → Goals → Fitness
- Natural progression from "how I feel" to "what I need"

### 4. **Consistent Final Step**
- Fitness Level is always the last step (step 5) for both journeys
- Simpler button logic
- Easier to understand and maintain

---

## Testing Steps

### Test 1: Recovery Journey Flow
1. Create new account
2. Select "Recovery" on step 1
3. **Step 2** should show pain check-in with slider (NO pain locations section)
4. Set pain level (0-10)
5. Click "Next"
6. **Step 3** should show Recovery Areas (body part selection)
7. Select areas and click "Next"
8. **Step 4** should show Recovery Goals
9. Select goals and click "Next"
10. **Step 5** should show Fitness Level
11. Select level and click "Complete Setup"
12. Verify redirect to dashboard
13. Check Pain Progress section has today's data (pain level only, no locations)

### Test 2: Injury Prevention Journey
1. Create new account
2. Select "Injury Prevention" on step 1
3. Should skip directly to **Step 5** (Fitness Level)
4. Select fitness level
5. Click "Complete Setup"
6. Verify redirect to dashboard
7. Pain Progress section should NOT appear

### Test 3: Reset Journey
1. Log in with existing user
2. Navigate to Settings → Reset Journey
3. Confirm reset
4. Should be redirected to onboarding
5. **Pain modal should NOT appear** (profile is incomplete)
6. Complete onboarding (including pain check-in at step 2)
7. After reaching dashboard, pain modal should NOT appear again
8. Dashboard should show today's pain data from onboarding

### Test 4: Back Navigation
1. Start Recovery journey
2. Navigate through steps 1-5
3. At each step, click "Back"
4. Verify navigation goes: 5→4→3→2→1
5. Verify all data is preserved during back navigation

### Test 5: Daily Pain Modal (After Profile Complete)
1. Complete onboarding fully
2. Close app
3. Wait until next day (or change system date)
4. Open app
5. Pain modal should appear (profile is complete)
6. Submit check-in
7. Modal should not appear again until next day

---

## Files Modified

1. `app/_layout.tsx` - Added profile completion check for pain modal
2. `app/(auth)/onboarding.tsx` - Reorganized step order and updated navigation

---

## Technical Notes

### Pain Check-In Timing
- **During Onboarding**: Pain check-in at Step 2 (Recovery only) - Only collects pain level (0-10), not locations
- **Daily Modal**: Only appears if profile is complete AND user hasn't checked in today - Collects pain level AND locations
- **After Reset**: Pain data is deleted, modal doesn't appear until onboarding is complete

### Profile Completion Check
```typescript
const profileComplete = profile?.journey_focus && profile?.fitness_level;
```
- Both fields must be set for profile to be considered complete
- Reset Journey clears these fields
- Daily pain modal respects this check

### Navigation Flow
- Recovery: 1 → 2 → 3 → 4 → 5
- Injury Prevention: 1 → 5
- Both end at step 5 (Fitness Level)

---

## Next Steps

None required - feature is complete and ready to test!

---

## Notes

- Pain check-in is only for Recovery journey users
- Injury Prevention users skip steps 2-4 entirely
- Step 5 (Fitness Level) is always the final step
- Daily pain modal won't appear until profile is complete
- After Reset Journey, users go through onboarding again with pain check-in at step 2
