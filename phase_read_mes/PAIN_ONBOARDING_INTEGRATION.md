# Pain Check-In Integration into Onboarding

## Summary
Added an initial pain check-in step to the onboarding process specifically for users on the **Recovery** journey. This establishes a baseline pain level and allows for better progress tracking from day one.

## Changes Made

### File: `app/(auth)/onboarding.tsx`

#### 1. **Added Imports**
```typescript
import { submitPainCheckIn, getPainLevelInfo } from '@/lib/utils/pain-checkin';
import { PAIN_LOCATIONS } from '@/types';
import Slider from '@react-native-community/slider';
```

#### 2. **Added State Variables**
```typescript
const [painLevel, setPainLevel] = useState<number>(0);
const [painLocations, setPainLocations] = useState<string[]>([]);
```

#### 3. **Added Helper Function**
```typescript
const togglePainLocation = (location: string) => {
  setPainLocations((prev) =>
    prev.includes(location)
      ? prev.filter((l) => l !== location)
      : [...prev, location]
  );
};
```

#### 4. **Updated Navigation Logic**
- **`handleNextStep()`**: Added logic to navigate to Step 5 (pain check-in) after Step 4 (fitness level) for Recovery users
- **`handlePreviousStep()`**: Added back navigation from Step 5 to Step 4
- **`handleComplete()`**: Added pain check-in submission before completing onboarding for Recovery users:
  ```typescript
  // Submit initial pain check-in for Recovery users
  if (journeyFocus === 'Recovery') {
    await submitPainCheckIn(currentUser.id, painLevel, painLocations, null);
  }
  ```

#### 5. **Updated Step Calculations**
- **`getTotalSteps()`**: Updated from 4 to 5 steps for Recovery journey
- **`getCurrentStepDisplay()`**: Added case for step 5

#### 6. **Added Step 5 UI**
Created a new step (Step 5) that includes:
- Title: "How are you feeling today?"
- Subtitle: "Rate your current pain level to establish a baseline"
- Large color-coded pain level number display
- Pain level slider (0-10) with color-coded track
- Slider labels (0 = Pain Free, 10 = Severe)
- Optional pain locations (chips that appear only if pain > 0)

#### 7. **Updated Button Logic**
Modified button rendering to:
- Show "Next" button for steps 1-4 (including step 4 for Recovery users)
- Show "Complete Setup" button only on the final step (step 4 for Injury Prevention, step 5 for Recovery)

#### 8. **Added Styles**
Added comprehensive styles for the pain check-in step:
- `painLevelDisplay`: Centers the large pain number
- `painLevelNumber`: Large bold number (64px)
- `painLevelLabel`: Color-coded label (Pain Free/Mild/Moderate/Severe)
- `sliderContainer`, `slider`, `sliderLabels`, `sliderLabel`
- `painLocationsGrid`, `painLocationChip`, `painLocationChipSelected`
- `painLocationText`, `painLocationTextSelected`

## User Flow

### Recovery Journey (5 Steps):
1. **Step 1**: Journey Focus → Select "Recovery"
2. **Step 2**: Recovery Areas → Select affected body parts (optional)
3. **Step 3**: Recovery Goals → Select goals (optional)
4. **Step 4**: Fitness Level → Select Beginner/Intermediate/Advanced
5. **Step 5**: Pain Check-In → Rate current pain & select locations (NEW!)
6. Complete Setup → Profile created + Initial pain check-in submitted

### Injury Prevention Journey (2 Steps):
1. **Step 1**: Journey Focus → Select "Injury Prevention"
2. **Step 4**: Fitness Level → Select level
3. Complete Setup → Profile created (no pain check-in)

## Benefits

### 1. **Baseline Establishment**
- Captures the user's starting pain level immediately
- Provides a reference point for measuring progress

### 2. **Better Personalization**
- Can recommend routines based on current pain level
- Understand severity from the beginning

### 3. **Immediate Data**
- Dashboard's Pain Progress section will have data from day 1
- No need to wait for the first daily check-in

### 4. **Context for Recovery**
- Correlates pain locations with selected recovery areas
- Helps understand what they're recovering from

### 5. **Prevents Modal on First Day**
- Since they've already checked in during onboarding, the daily pain modal won't appear on their first day
- They'll be prompted again the next day

## Technical Details

### Pain Check-In Submission
```typescript
if (journeyFocus === 'Recovery') {
  await submitPainCheckIn(currentUser.id, painLevel, painLocations, null);
}
```

- Submits with today's date
- Uses the same `submitPainCheckIn` utility as the daily modal
- Pain locations are optional (empty array if user doesn't select any)
- Notes field is null for onboarding check-ins

### Color Coding
Pain levels are color-coded using the same system as the daily modal:
- **0**: Green (#34C759) - Pain Free
- **1-3**: Yellow (#FFD60A) - Mild
- **4-6**: Orange (#FF9500) - Moderate
- **7-10**: Red (#FF3B30) - Severe

### Optional Pain Locations
- Only shown if `painLevel > 0`
- Uses the same `PAIN_LOCATIONS` array (includes Mind, Soul, and all body parts)
- Displayed as selectable chips
- Multiple locations can be selected
- Selected chips are highlighted with gold background and primary color border

## Testing Steps

1. **Test Recovery Journey Flow**:
   - Create new account
   - Select "Recovery" on step 1
   - Complete steps 2-3 (recovery areas & goals)
   - Complete step 4 (fitness level)
   - **Verify Step 5 appears** with pain check-in UI
   - Move slider and select pain locations
   - Click "Complete Setup"
   - Verify you're redirected to dashboard
   - Check dashboard Pain Progress section has today's data

2. **Test Injury Prevention Flow**:
   - Create new account
   - Select "Injury Prevention" on step 1
   - Complete step 4 (fitness level)
   - **Verify Step 5 does NOT appear**
   - Click "Complete Setup" immediately after step 4
   - Verify you're redirected to dashboard
   - Pain Progress section should NOT appear (no data)

3. **Test Back Navigation**:
   - Start Recovery journey
   - Navigate to Step 5
   - Click "Back" button
   - Verify you return to Step 4 (fitness level)

4. **Test Pain Level Display**:
   - On Step 5, move slider to different values
   - Verify large number updates
   - Verify color changes based on pain level
   - Verify label changes (Pain Free/Mild/Moderate/Severe)

5. **Test Pain Locations**:
   - Set pain level to 0
   - Verify pain locations do NOT appear
   - Set pain level to 5
   - Verify pain locations chips appear
   - Select multiple locations
   - Verify selected chips are highlighted

## Files Modified

- `app/(auth)/onboarding.tsx` - Complete implementation of pain check-in step

## Dependencies

- Already installed: `@react-native-community/slider`
- Already implemented: `submitPainCheckIn`, `getPainLevelInfo` utilities
- Already defined: `PAIN_LOCATIONS` type

## Next Steps

None required - feature is complete and ready to test!

## Notes

- Pain check-in is **only for Recovery journey users**
- Injury Prevention users skip this step entirely
- Initial pain check-in data appears immediately in the dashboard
- Daily pain modal will still appear on subsequent days
- After Reset Journey, users will go through onboarding again and submit a new baseline pain check-in
