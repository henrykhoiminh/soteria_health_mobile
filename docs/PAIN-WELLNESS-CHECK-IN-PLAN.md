# Pain & Wellness Check-In System: "Optimizing Across Variables"

## Overview

Transform the current single-slider pain check-in into a holistic Mind/Body/Soul wellness assessment that:
1. Triggers automatically on first login of each day
2. Collects separate scores for physical, mental, and spiritual wellness
3. Calculates a composite wellness score
4. Influences routine recommendations based on current state

---

## Current State (Updated 2026-02-03)

| Aspect | Status |
|--------|--------|
| Database schema | ✅ Ready (mind_score, body_score, soul_score columns exist) |
| WellnessCheckInModal | ✅ Complete - 4-step Mind/Body/Soul check-in |
| First-login detection | ✅ Enabled in `_layout.tsx` |
| Manual re-check-in | ✅ Available from dashboard Pain Progress section |
| Recommendation integration | ✅ Difficulty + recovery area filtering |
| Recovery area selection | ✅ Available in onboarding (finding-soteria.tsx) |

---

## Journey Focus Integration

### Recovery Area Categories

The user's `recovery_areas` can include **body parts OR Mind/Soul categories**:

```typescript
type RecoveryArea =
  // Physical body parts
  | 'Neck' | 'Shoulder' | 'Upper Back' | 'Elbow' | 'Wrist' | 'Hand'
  | 'Lower Back' | 'Hip' | 'Knee' | 'Ankle' | 'Foot'
  // Mind/Soul categories
  | 'Mind' | 'Soul'
```

### Journey Types & Their Focus

| Journey | Primary Focus | Recovery Area Examples |
|---------|---------------|----------------------|
| Injury Prevention | Balanced wellness | N/A (no specific area) |
| Recovery (Physical) | Body routines | "Lower Back", "Knee", "Shoulder" |
| Recovery (Mental) | Mind routines | "Mind" |
| Recovery (Spiritual) | Soul routines | "Soul" |
| Recovery (Multiple) | Mixed | ["Lower Back", "Mind"] |

### Database Fields (Already Exist)

```sql
profiles (
  journey_focus text,           -- 'Injury Prevention' | 'Recovery'
  recovery_areas text[],        -- Array: body parts, 'Mind', or 'Soul'
  recovery_goals text[],        -- Optional: user's goals
)
```

### How Recovery Area Affects Wellness Check-In

**1. Contextual Questions**
When user has a specific recovery area, we can personalize the question:

```typescript
// If recovery_areas includes physical body parts
bodyQuestion = "How is your [Lower Back] affecting your daily activities?"

// If recovery_areas includes 'Mind'
mindQuestion = "How is your mental recovery progressing today?"

// If recovery_areas includes 'Soul'
soulQuestion = "How is your emotional/spiritual healing going today?"
```

**2. Weighted Scoring Based on Recovery Focus**

```typescript
function calculateWeightedScore(
  mindScore: number,
  bodyScore: number,
  soulScore: number,
  journeyFocus: JourneyFocus,
  recoveryAreas: string[]
): number {
  // Injury Prevention: Equal weights
  if (journeyFocus === 'Injury Prevention') {
    return (mindScore + bodyScore + soulScore) / 3
  }

  // Recovery: Weight based on recovery areas
  const weights = { mind: 1, body: 1, soul: 1 }

  // Check what categories are in recovery
  const hasPhysical = recoveryAreas.some(area =>
    !['Mind', 'Soul'].includes(area)
  )
  const hasMind = recoveryAreas.includes('Mind')
  const hasSoul = recoveryAreas.includes('Soul')

  // Boost weights for recovery areas (1.5x)
  if (hasPhysical) weights.body = 1.5
  if (hasMind) weights.mind = 1.5
  if (hasSoul) weights.soul = 1.5

  const totalWeight = weights.mind + weights.body + weights.soul
  return (
    (mindScore * weights.mind) +
    (bodyScore * weights.body) +
    (soulScore * weights.soul)
  ) / totalWeight
}
```

**3. Recommendation Priority Based on Recovery**

```typescript
function getRecommendationPriority(
  todayCheckIn: WellnessCheckIn,
  recoveryAreas: string[]
): RoutineCategory[] {
  const priorities: { category: RoutineCategory; score: number; isRecoveryFocus: boolean }[] = []

  // Physical recovery areas → prioritize Body
  const hasPhysical = recoveryAreas.some(a => !['Mind', 'Soul'].includes(a))

  priorities.push({
    category: 'Mind',
    score: todayCheckIn.mindScore,
    isRecoveryFocus: recoveryAreas.includes('Mind'),
  })
  priorities.push({
    category: 'Body',
    score: todayCheckIn.bodyScore,
    isRecoveryFocus: hasPhysical,
  })
  priorities.push({
    category: 'Soul',
    score: todayCheckIn.soulScore,
    isRecoveryFocus: recoveryAreas.includes('Soul'),
  })

  // Sort by: 1) Recovery focus areas first, 2) Higher scores (more need)
  return priorities
    .sort((a, b) => {
      if (a.isRecoveryFocus !== b.isRecoveryFocus) {
        return a.isRecoveryFocus ? -1 : 1
      }
      return b.score - a.score
    })
    .map(p => p.category)
}
```

### Recovery Area Selection UI (JourneyFocusModal)

When user selects "Recovery" journey, show a 3-category recovery area selector:

```
┌─────────────────────────────────────────────────────────────┐
│  Recovery Areas                                             │
│  Select the areas you're focusing on recovering            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [🧠] Mind                                    [ ✓ ]  │   │
│  │     Mental wellness & stress recovery               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [💪] Body                                    [ ✓ ]  │   │
│  │     Physical recovery                               │   │
│  │                                                     │   │
│  │     Selected: Lower Back, Knee                      │   │
│  │     [ Edit Body Parts ]                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [✨] Soul                                    [   ]  │   │
│  │     Emotional & spiritual healing                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Body Parts Dialog (opens when Body is selected):**

```
┌─────────────────────────────────────────────────────────────┐
│  Select Body Parts                              [ Done ]   │
│                                                             │
│  UPPER BODY                                                │
│  [Neck] [Shoulder] [Upper Back] [Elbow] [Wrist] [Hand]    │
│                                                             │
│  LOWER BODY                                                │
│  [Lower Back] [Hip] [Knee] [Ankle] [Foot]                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Storage Format:**
```typescript
// recovery_areas array examples:
['Mind']                           // Mental recovery only
['Lower Back', 'Knee']             // Physical recovery only
['Mind', 'Soul']                   // Mental + spiritual
['Mind', 'Lower Back', 'Shoulder'] // Mixed recovery
```

**UI Behavior:**
- Mind toggle: Adds/removes 'Mind' from recovery_areas
- Soul toggle: Adds/removes 'Soul' from recovery_areas
- Body toggle: When enabled, opens body parts picker
- Body parts stored directly in recovery_areas array (e.g., 'Lower Back', 'Knee')
- At least one area must be selected for Recovery journey

### Post-Onboarding Editing

Users can edit recovery areas anytime via:
1. **Dashboard** → Tap profile picture → Journey Focus modal
2. **Profile** → Edit → Journey Focus section

The JourneyFocusModal shows recovery areas section when:
- Current focus is "Recovery", OR
- User selects "Recovery" as new focus

### Onboarding Integration (TODO - Separate Task)

The recovery area selection should also be added to onboarding:

```
Journey Focus Screen
        ↓
   "Recovery" selected?
        ↓ Yes
Recovery Area Selection (inline or separate screen)
   - Same 3-category UI as JourneyFocusModal
   - Mind/Body/Soul toggles
   - Body parts picker for physical areas
        ↓
Continue with onboarding...
```

**Files to modify (future task):**
- `lib/contexts/OnboardingContext.tsx` - Add `recoveryAreas` field
- `app/onboarding/_layout.tsx` - Add new screen to flow (if separate)
- `app/onboarding/recovery-areas.tsx` - Create new screen (if separate)
- `app/onboarding/the-pact.tsx` - Save recovery areas to profile

---

## Proposed UX Flow

### Modal Journey (4 Steps)

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Body (Physical)                                    │
│                                                             │
│  "How is physical discomfort affecting                      │
│   your daily activities today?"                             │
│                                                             │
│  [0]─────────────────────────────────[10]                   │
│   Not at all                    Significantly               │
│                                                             │
│  Body companion visual reacts to slider position            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Mind (Mental)                                      │
│                                                             │
│  "How is mental strain affecting                            │
│   your enjoyment of life today?"                            │
│                                                             │
│  [0]─────────────────────────────────[10]                   │
│   Not at all                    Significantly               │
│                                                             │
│  Mind companion visual reacts to slider position            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: Soul (Spiritual)                                   │
│                                                             │
│  "How is emotional weight affecting                         │
│   your outlook on life today?"                              │
│                                                             │
│  [0]─────────────────────────────────[10]                   │
│   Not at all                    Significantly               │
│                                                             │
│  Soul companion visual reacts to slider position            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: Summary & Encouragement                            │
│                                                             │
│  Composite Score: 4.3 / 10                                  │
│                                                             │
│  [Mind: 3]  [Body: 6]  [Soul: 4]                           │
│                                                             │
│  "Your body needs some extra love today.                    │
│   I'll prioritize gentle recovery routines for you."        │
│                                                             │
│  [Optional: Add notes]                                      │
│                                                             │
│  [ Start My Day ]                                           │
└─────────────────────────────────────────────────────────────┘
```

### Question Phrasing Options

**Option A: Impact-Focused (Current Proposal)**
- Body: "How is physical discomfort affecting your daily activities today?"
- Mind: "How is mental strain affecting your enjoyment of life today?"
- Soul: "How is emotional weight affecting your outlook on life today?"

**Option B: Simpler/Direct**
- Body: "How is your body feeling today?"
- Mind: "How is your mind feeling today?"
- Soul: "How is your spirit feeling today?"
- Scale: 0 = "Struggling" → 10 = "Thriving" (inverted - higher is better)

**Option C: Interference-Focused (Clinical)**
- Body: "How much is physical pain interfering with your activities?"
- Mind: "How much are stress/anxiety interfering with your focus?"
- Soul: "How much is emotional heaviness interfering with your peace?"

**Recommendation:** Option A provides the right balance of specificity and accessibility. The "affecting X" framing helps users think about functional impact, not just sensation.

---

## Scoring Methodology

### Individual Scores
- Each category (Mind, Body, Soul): 0-10 scale
- 0 = No impact / Thriving
- 10 = Severe impact / Struggling

### Composite Score Calculation

**Simple Average (MVP - Injury Prevention users):**
```typescript
compositeScore = (mindScore + bodyScore + soulScore) / 3
```

**Journey-Aware Weighted Average (Recovery users):**
```typescript
// See "Journey Focus Integration" section above for full implementation
// Recovery areas get 1.5x weight in the calculation
compositeScore = calculateWeightedScore(
  mindScore, bodyScore, soulScore,
  profile.journey_focus,
  profile.recovery_areas
)
```

**Example Scenarios:**

| Journey | Recovery Areas | Weights | Composite Formula |
|---------|----------------|---------|-------------------|
| Injury Prevention | N/A | 1:1:1 | (M + B + S) / 3 |
| Recovery | ["Lower Back"] | 1:1.5:1 | (M×1 + B×1.5 + S×1) / 3.5 |
| Recovery | ["Mind"] | 1.5:1:1 | (M×1.5 + B×1 + S×1) / 3.5 |
| Recovery | ["Knee", "Mind"] | 1.5:1.5:1 | (M×1.5 + B×1.5 + S×1) / 4 |
| Recovery | ["Mind", "Soul"] | 1.5:1:1.5 | (M×1.5 + B×1 + S×1.5) / 4 |

### Score Interpretation

| Composite | Label | Color | Recommendation Priority |
|-----------|-------|-------|------------------------|
| 0-2 | Thriving | Green | Maintain with any routines |
| 3-4 | Good | Light Green | Standard recommendations |
| 5-6 | Managing | Yellow | Gentle routines, shorter duration |
| 7-8 | Struggling | Orange | Recovery-focused, low intensity |
| 9-10 | Needs Support | Red | Minimal, restorative only |

---

## Recommendation Engine Integration

### Current Recommendation Logic
Location: `lib/utils/dashboard.ts` → `getRecommendations()`

Currently recommends based on:
- Journey focus (Injury Prevention / Recovery)
- Completion history
- Popularity

### Enhanced Logic

```typescript
interface RecommendationContext {
  userId: string
  journeyFocus: 'Injury Prevention' | 'Recovery'
  recoveryAreas: string[]  // NEW: From profile
  todayCheckIn: {
    mindScore: number
    bodyScore: number
    soulScore: number
    compositeScore: number
  } | null
}

function getEnhancedRecommendations(context: RecommendationContext) {
  const { todayCheckIn, recoveryAreas, journeyFocus } = context

  // If no check-in today, use standard recommendations
  if (!todayCheckIn) return getStandardRecommendations(context)

  // Determine priority categories (factors in both scores AND recovery areas)
  const priorityCategories = getRecommendationPriority(todayCheckIn, recoveryAreas)

  // Adjust difficulty based on composite score
  const maxDifficulty = getMaxDifficulty(todayCheckIn.compositeScore)

  // For physical recovery, filter by body_parts if available
  const bodyPartFilters = recoveryAreas.filter(a => !['Mind', 'Soul'].includes(a))

  // Build query with pain-aware + recovery-aware filters
  let query = supabase
    .from('routines')
    .select('*')
    .contains('journey_focus', [journeyFocus])
    .in('difficulty', getAllowedDifficulties(maxDifficulty))

  // If recovering from specific body parts, prioritize routines targeting those areas
  if (bodyPartFilters.length > 0) {
    query = query.overlaps('body_parts', bodyPartFilters)
  }

  return query.order('completion_count', { ascending: false })
}

// See "Journey Focus Integration" section for full implementation
function getRecommendationPriority(
  checkIn: WellnessCheckIn,
  recoveryAreas: string[]
): RoutineCategory[] {
  // Returns categories sorted by:
  // 1. Recovery focus areas first (if Recovery journey)
  // 2. Higher scores (more need) second
}

function getMaxDifficulty(compositeScore: number): string {
  if (compositeScore <= 3) return 'Advanced'    // Feeling good, any difficulty
  if (compositeScore <= 6) return 'Intermediate' // Managing, moderate effort
  return 'Beginner'                              // Struggling, gentle only
}
```

### Companion-Specific Recommendations

When user taps a companion (Mind/Body/Soul), recommendations should:

1. **Factor in today's check-in score for that category**
2. **Adjust messaging based on score**

```typescript
// Example: User taps Body companion with bodyScore = 7

const bodyRecommendations = {
  title: "Your body needs some gentle care today",
  subtitle: "Here are some restorative routines",
  routines: getRoutinesByCategory('Body', {
    maxDifficulty: 'Beginner',
    prioritizeTags: ['recovery', 'stretching', 'gentle'],
    avoidTags: ['high-intensity', 'strength'],
  })
}
```

---

## First-Login Detection

### Implementation

Location: `app/_layout.tsx`

```typescript
const [showWellnessCheckIn, setShowWellnessCheckIn] = useState(false)

useEffect(() => {
  async function checkDailyWellness() {
    // Guard conditions
    if (!user || loading || !profile) return
    if (!profile.onboarding_completed) return

    // Only trigger in main app (tabs)
    const inTabsGroup = segments[0] === '(tabs)'
    if (!inTabsGroup) return

    // Check if already completed today
    const hasCheckedIn = await hasCheckedInToday(user.id)
    if (!hasCheckedIn) {
      // Small delay for smoother UX after navigation
      setTimeout(() => setShowWellnessCheckIn(true), 500)
    }
  }

  checkDailyWellness()
}, [user, profile, loading, segments])
```

### Edge Cases

| Scenario | Behavior |
|----------|----------|
| User dismisses modal without completing | Don't show again until next day |
| User force-closes app mid-check-in | Show modal again on next open |
| User completes check-in | Store in DB, don't show again today |
| Multiple app opens same day | Check DB, skip if already completed |
| Timezone change during day | Use device local date consistently |

### Skip/Dismiss Option

- Include "Skip for today" option (stores partial/null check-in)
- Track skip rate for analytics
- Consider: After 3 consecutive skips, reduce modal frequency?

---

## Database Considerations

### Existing Schema (No Changes Needed)

```sql
pain_checkins (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  mind_score integer CHECK (0-10),
  body_score integer CHECK (0-10),
  soul_score integer CHECK (0-10),
  pain_level integer,  -- Composite score
  notes text,
  check_in_date date NOT NULL,
  UNIQUE(user_id, check_in_date)
)
```

### Update pain_level Calculation

Currently `pain_level` stores the old single-slider value. Update to store composite:

```typescript
// In submitPainCheckIn()
const compositeScore = Math.round((mindScore + bodyScore + soulScore) / 3)

await supabase.from('pain_checkins').upsert({
  user_id: userId,
  mind_score: mindScore,
  body_score: bodyScore,
  soul_score: soulScore,
  pain_level: compositeScore,  // Now derived from components
  notes,
  check_in_date: getTodayDate(),
})
```

---

## UI/UX Design Details

### Visual Elements

1. **Progress Indicator**
   - 4 dots at top (one per step)
   - Current step highlighted in gold
   - Completed steps filled

2. **Companion Reactions**
   - Show relevant companion avatar on each step
   - Companion expression changes based on slider position
   - Low scores (0-3): Happy/peaceful expression
   - Mid scores (4-6): Neutral/concerned expression
   - High scores (7-10): Worried/supportive expression

3. **Slider Design**
   - Large touch target (minimum 44pt)
   - Color gradient track: Green (0) → Yellow (5) → Red (10)
   - Numeric value displayed above thumb
   - Haptic feedback on value changes

4. **Summary Screen**
   - Three category cards with scores
   - Highlight highest-need category with glow
   - Personalized message based on scores
   - Optional notes field (collapsed by default)

### Animations

- Smooth step transitions (slide left/right)
- Companion fade in on each step
- Score cards animate in on summary screen
- Subtle pulse on "Start My Day" button

### Accessibility

- VoiceOver labels for all interactive elements
- High contrast mode support
- Minimum touch targets (44x44pt)
- Screen reader announces score changes

---

## Implementation Phases

### Phase 1: Core Modal (MVP) ✅ COMPLETE
- [x] Create new `WellnessCheckInModal` component
- [x] 4-step flow with sliders for each category (Mind → Body → Soul → Notes)
- [x] Summary screen with composite score (simple average)
- [x] Connect to existing `submitPainCheckIn()` function
- [x] Enable first-login detection in `_layout.tsx`
- [x] Manual re-check-in trigger from dashboard with confirmation modal
- [x] "Updating..." animation on Pain Progress after check-in

### Phase 2: Visual Polish - PARTIAL
- [ ] Add companion avatars to each step (waiting on avatar assets)
- [ ] Implement slider color gradients (Green → Yellow → Red)
- [ ] Add step transition animations
- [x] Create personalized encouragement messages
- [x] Casual, user-focused labels ("Not at all", "A bit, but I'm great", "It takes its toll", "Significantly", "It's ruining my life")

### Phase 3: Recommendation Integration ✅ COMPLETE
- [x] Update recommendations to factor in today's check-in scores
- [x] Modify companion tap behavior to use category scores
- [x] Add difficulty filtering based on composite score (high pain = Beginner only)
- [x] Update recommendation card messaging based on wellness state
- [x] Filter Body recommendations by user's recovery body parts (e.g., Wrist → wrist routines)

### Phase 4: Journey Focus Integration - PARTIAL
- [x] Add `recovery_areas` to Profile type (already in DB)
- [x] Create recovery area selection in onboarding (`finding-soteria.tsx`)
- [x] Filter Body recommendations by recovery body parts
- [x] Personalize recommendation messaging based on recovery areas
- [ ] Implement weighted scoring for Recovery users (1.5x weight - OPTIONAL)
- [ ] Personalize check-in questions based on recovery areas (OPTIONAL)

### Phase 5: Analytics & Refinement - NOT STARTED (OPTIONAL)
- [ ] Track completion rates and skip rates
- [ ] A/B test question phrasing
- [ ] Gather user feedback on recommendation quality
- [ ] Refine scoring weights based on outcomes

---

## Optional Future Enhancements

These features are not critical for the core experience but could enhance it later:

| Feature | Description | Priority |
|---------|-------------|----------|
| **Weighted Scoring** | Recovery areas get 1.5x weight in composite score calculation | Low |
| **Personalized Questions** | "How is your Wrist affecting..." based on user's recovery areas | Low |
| **Skip Option** | Allow users to skip daily check-in with "Skip for today" button | Low |
| **Companion Avatars** | Add actual animated avatar assets to each step (pending asset creation) | Medium |
| **Slider Gradients** | Green → Yellow → Red gradient on slider track | Low |
| **Step Transitions** | Smooth slide animations between check-in steps | Low |
| **Analytics Dashboard** | Track completion rates, skip rates, average scores | Low |
| **Push Notifications** | Remind users to check in if they haven't by a certain time | Low |

---

## Open Questions

1. **Skip Behavior**: Should skipping count as a "completed" check-in for the day, or should we prompt again later?

2. **Historical Data**: How do we handle users with existing single-score check-ins when displaying trends?

3. **Notification**: Should we send a push notification if user hasn't opened app by a certain time?

4. **Editing**: Can users edit their check-in later in the day, or is it locked after submission?

5. **Companion Names**: Should the modal use custom companion names (e.g., "How is [Aria] feeling?") or generic category names?

6. **Recovery Area Options**: ~~Should Mind/Soul be explicit recovery area options alongside body parts, or inferred from other data?~~
   - **RESOLVED:** Mind and Soul are explicit options alongside body parts. Users select from 3 categories: Mind, Body (with body parts picker), Soul.

7. **Recovery Area Updates**: ~~Can users change their recovery areas after onboarding? (Profile settings?)~~
   - **RESOLVED:** Yes. Users can edit recovery areas via the JourneyFocusModal (accessed from dashboard profile picture tap).

8. **Multiple Recovery Areas**: If user has both physical and mental recovery areas, how do we balance recommendations?
   - Each selected area gets 1.5x weighting. Multiple areas compound (e.g., Mind + Body = both weighted 1.5x).

---

## File Changes Summary

### Phase 1-3 (Core Wellness Check-In)

| File | Change Type | Description |
|------|-------------|-------------|
| `components/WellnessCheckInModal.tsx` | Create | New 4-step modal component |
| `components/PainCheckInModal.tsx` | Deprecate | Keep for reference, mark deprecated |
| `app/_layout.tsx` | Modify | Uncomment and update first-login detection |
| `lib/utils/pain-checkin.ts` | Modify | Update composite score calculation |
| `lib/utils/dashboard.ts` | Modify | Add pain-aware recommendation logic |
| `lib/utils/recommendations.ts` | Create | New file for recommendation engine |
| `constants/wellness-messages.ts` | Create | Encouragement messages by score |

### Phase 4 (Journey Focus Integration)

| File | Change Type | Description |
|------|-------------|-------------|
| `types/index.ts` | Modify | Add `recovery_areas` to Profile type |
| `lib/contexts/OnboardingContext.tsx` | Modify | Add `recoveryAreas` to onboarding data |
| `app/onboarding/recovery-areas.tsx` | Create | Recovery area selection screen |
| `app/onboarding/_layout.tsx` | Modify | Add recovery screen to navigation flow |
| `app/onboarding/the-pact.tsx` | Modify | Save recovery areas to profile |
| `lib/utils/recommendations.ts` | Modify | Add recovery-area-aware filtering |
| `lib/utils/pain-checkin.ts` | Modify | Add weighted scoring for Recovery users |

---

## Success Metrics

- **Completion Rate**: >80% of daily check-ins completed (not skipped)
- **Time to Complete**: <45 seconds average
- **Recommendation Relevance**: User engagement with recommended routines increases
- **User Satisfaction**: Qualitative feedback on check-in experience

---

*Document created: 2024-01-24*
*Last updated: 2026-02-03*
*Status: Core Implementation Complete*

## Implementation Summary

The core wellness check-in system is fully functional:

1. **Daily Check-In Flow**: Users are prompted on first login each day to rate Mind/Body/Soul impact (0-10 scale)
2. **User-Focused Questions**:
   - Mind: "How is mental strain affecting your enjoyment of life?"
   - Body: "How is physical discomfort affecting your daily activities?"
   - Soul: "How much is feeling lost or disconnected affecting your sense of purpose?"
3. **Casual Labels**: Dynamic feedback as user slides ("Not at all" → "It's ruining my life")
4. **Smart Recommendations**: Tapping a companion shows routines filtered by:
   - Difficulty appropriate to wellness score (high pain = beginner only)
   - User's specific recovery body parts (e.g., Wrist → wrist-targeted routines)
   - Personalized messaging ("Your Wrist needs gentle attention")
5. **Manual Re-Check-In**: Users can update their check-in from dashboard Pain Progress section
6. **Visual Feedback**: "Updating..." badge with pulse animation while refreshing data

### Key Files Modified
- `components/WellnessCheckInModal.tsx` - Main 4-step check-in modal
- `app/_layout.tsx` - First-login detection and modal trigger
- `app/(tabs)/index.tsx` - Dashboard with manual trigger and updating animation
- `lib/utils/dashboard.ts` - Wellness-aware recommendation functions
- `lib/utils/pain-checkin.ts` - Score labels and check-in utilities
- `app/onboarding/finding-soteria.tsx` - Recovery area selection during onboarding
