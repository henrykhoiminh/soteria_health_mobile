# Soteria Health: Avatar & Engagement System Specification

## Overview

Soteria Health's core mechanic centers on users "taking care of" three avatars representing Mind, Body, and Soul. The goal is to guide users toward completing one routine per category daily, achieving balance and ultimately reaching a "Harmony" state that unlocks advanced content.

This document defines the rules, states, calculations, and mechanics for implementation.

---

## 1. Avatar States

Each category (Mind, Body, Soul) has its own avatar with five possible states:

| State | Description | Visual Intent |
|-------|-------------|---------------|
| Dormant | No activity in 48+ hours | Dull, sleeping, needs help |
| Sleepy | Some recent activity but not thriving | Drowsy, low energy |
| Awakening | Building momentum | Starting to perk up |
| Glowing | Completed routine today | Vibrant, happy, active |
| Radiant | All three avatars Glowing in same day | Peak state, celebratory |

### State Transition Rules

**Dormant → Sleepy**
- Trigger: User completes a routine in that category
- The avatar begins waking up

**Sleepy → Awakening**
- Trigger: Continued activity (2+ routines in category within 48 hours)

**Awakening → Glowing**
- Trigger: Routine completed in that category today

**Glowing → Radiant**
- Trigger: All three avatars reach Glowing state on the same calendar day
- All three avatars simultaneously enter Radiant state

**Decay (Regression)**
- Any state → Dormant: 48 hours of no activity in that category
- Decay is per-category (Mind can be Glowing while Body goes Dormant)

### State Priority

States are evaluated in this order:
1. Check if Dormant (48hr inactivity)
2. Check if Radiant (all three Glowing today)
3. Check if Glowing (routine completed today)
4. Check if Awakening (2+ routines in 48hr)
5. Default to Sleepy

---

## 2. Streaks

### Definition
A streak represents consecutive days of app engagement.

### Rules
- **Increment:** Any single routine completion extends the streak
- **Break:** No routine completed in any category for a calendar day
- **Reset:** Streak returns to 0 when broken

### Rationale
Low barrier to maintain streak keeps users engaged even on busy days. Balance mechanics (below) guide users toward completing all three categories without punishing them for only doing one.

---

## 3. Balance & Type System

### Rolling Window
Balance is calculated over a **7-day rolling window**.

### Category Ratio Calculation

```
mind_count = routines completed in Mind category (last 7 days)
body_count = routines completed in Body category (last 7 days)
soul_count = routines completed in Soul category (last 7 days)
total = mind_count + body_count + soul_count

mind_ratio = mind_count / total (as percentage)
body_ratio = body_count / total (as percentage)
soul_ratio = soul_count / total (as percentage)
```

### Balance Thresholds

**Balanced:**
- All three categories within 1 routine of each other
- Examples:
  - 7/6/7 ✓ Balanced
  - 7/7/7 ✓ Balanced
  - 5/5/6 ✓ Balanced
  - 7/5/7 ✗ Not balanced (Body is 2 behind)

**Type Identification:**
- If one category is 2+ routines ahead of the others, user is that "type"
- Examples:
  - 7/5/5 → "Mind Type"
  - 4/7/4 → "Body Type"
  - 3/3/6 → "Soul Type"
  - 5/5/6 → No type (balanced)

### Type Display
- Surface type identification in weekly/monthly analytics
- Messaging: "This week you've been a Mind type. Your Body and Soul could use some attention."
- Celebrate balanced users: "You're in perfect balance this week!"

---

## 4. Harmony

### Definition
Harmony is the aspirational state where a user is consistently balanced and all avatars are thriving.

### Requirements to Achieve Harmony
1. **Balance:** All categories within 1 routine of each other (7-day window)
2. **No Dormant Avatars:** All three avatars are Sleepy or above
3. **Minimum Activity:** At least 7 total routines completed in the 7-day window

### Requirements to Maintain Harmony
- Continue meeting all three requirements above
- Checked daily

### Losing Harmony
- **Trigger:** Any requirement fails (imbalance, dormant avatar, or low activity)
- **Effect:** Immediate loss of Harmony status
- **Consequence:** Advanced routines become locked

### New User Calibration
- New users start without Harmony
- First 7 days are "calibration period"
- Harmony can be achieved on day 8 at earliest
- Messaging during calibration: "Complete routines in all three categories to achieve Harmony"

---

## 5. Advanced Routines

### Gating Rules
- Advanced routines are **locked by default**
- Unlocked when user achieves Harmony
- **Immediately re-locked** when Harmony is lost

### Display When Locked
- Show advanced routines in Discover with lock icon
- Tooltip/message: "Achieve Harmony to unlock this routine"
- Creates aspirational goal for users

### Categories
- Advanced routines exist in all three categories (Mind, Body, Soul)
- Can be tagged with `is_advanced: true` in database

---

## 6. Decay Mechanics

### Standard Decay
- **Threshold:** 48 hours since last routine in a category
- **Result:** Avatar enters Dormant state
- **Scope:** Per-category (each avatar decays independently)

### Slow Decay (Vacation Mode)
- **Threshold:** 96 hours since last routine in a category
- **Used during:** Active vacation mode only

### Decay Check
- Run decay check on app open
- Run decay check before displaying avatar states
- Store `last_routine_at` timestamp per category per user

---

## 7. Warning System

### Decay Warning (24-Hour Alert)

**Trigger:** 24 hours since last routine in a specific category

**Condition:** Avatar is not already Dormant

**Message Examples:**
- Mind: "Your Mind avatar is getting tired... a quick meditation could help!"
- Body: "Your Body avatar needs some movement soon."
- Soul: "Your Soul avatar misses you. Time for some connection?"

**Delivery:**
- In-app alert on home screen
- Push notification (if enabled)
- Avatar visual cue (slightly dimmed, sleepy expression)

### Balance Warning

**Trigger:** One category is 2+ routines ahead in the 7-day window

**Condition:** User is currently in Harmony (warning about potential loss)

**Message Example:**
- "You're leaning heavily into Mind this week. Balance your Body and Soul to maintain Harmony."

**Delivery:**
- In-app alert
- Weekly summary notification

### Harmony Loss Warning

**Trigger:** User is about to lose Harmony (any requirement about to fail)

**Scenarios:**
1. Avatar approaching 48hr decay → "Your [Category] avatar will go Dormant in X hours. Complete a routine to maintain Harmony!"
2. Balance tipping → "One more Mind routine without Body or Soul will break your balance."

**Delivery:**
- In-app alert (prominent)
- Push notification (high priority)

---

## 8. Vacation Mode

### Purpose
Allow users to take breaks without severe punishment while still encouraging engagement.

### Earning Vacation Days

| Milestone | Reward |
|-----------|--------|
| 7-day streak | +1 vacation day |
| 14-day streak | +1 vacation day |
| 21-day streak | +1 vacation day |
| (continues every 7 days) | +1 vacation day |

**Maximum Bank:** 14 days

**Expiration:** Vacation days do not expire

### Activation Requirements
1. User must currently be in Harmony
2. User must have at least 1 vacation day banked
3. 24-hour delay before vacation mode activates (prevents panic toggles)

### During Vacation Mode
- **Decay:** Slow decay (96 hours instead of 48 hours)
- **Streak:** Paused (does not break, does not grow)
- **Harmony:** Maintained (requirements paused)
- **Duration:** User-selected, 1-14 days (limited by banked days)

### Deactivation
- Automatic at end of selected duration
- Manual deactivation available anytime
- **On return:** "Welcome back" flow, avatar states resume normal evaluation

### Cooldown
- 30 days must pass between vacation mode uses
- Prevents frequent abuse

### Anti-Abuse Summary

| Protection | Rule |
|------------|------|
| Earning requirement | Must build streaks to earn days |
| Activation gate | Must be in Harmony to activate |
| Activation delay | 24-hour delay before activation |
| Cooldown | 30 days between uses |
| Duration cap | Maximum 14 days per use |

---

## 9. Cross-Category Influence (Future Exploration)

### Current Model
- Mind routine → Mind avatar only
- Body routine → Body avatar only  
- Soul routine → Soul avatar only

### Proposed Model (To Explore)
Recognize that categories influence each other in reality:
- Meditation (Mind) reduces physical tension (Body)
- Exercise (Body) improves mood (Soul) and clarity (Mind)
- Connection (Soul) reduces stress (Mind) and improves health (Body)

### Potential Implementation

**Primary + Secondary Model:**
```
mind_routine_completed:
  mind_avatar: +100% progress
  body_avatar: +25% progress
  soul_avatar: +25% progress
```

**Considerations:**
- May make balance too easy to achieve
- Could dilute the incentive to do all three categories
- Needs user testing to validate

**Recommendation:** Implement current model first, gather data, then test cross-influence with a user cohort.

---

## 10. Data Model Recommendations

### User Stats Table (or fields on user profile)

```sql
-- Rolling stats (updated on each routine completion)
mind_routines_7d        INT DEFAULT 0
body_routines_7d        INT DEFAULT 0
soul_routines_7d        INT DEFAULT 0

-- Timestamps for decay calculation
mind_last_routine_at    TIMESTAMP
body_last_routine_at    TIMESTAMP
soul_last_routine_at    TIMESTAMP

-- Streak tracking
current_streak          INT DEFAULT 0
longest_streak          INT DEFAULT 0
last_streak_date        DATE

-- Harmony
is_in_harmony           BOOLEAN DEFAULT FALSE
harmony_achieved_at     TIMESTAMP

-- Vacation mode
vacation_days_banked    INT DEFAULT 0
vacation_mode_active    BOOLEAN DEFAULT FALSE
vacation_mode_start     TIMESTAMP
vacation_mode_end       TIMESTAMP
last_vacation_ended_at  TIMESTAMP  -- for cooldown calculation
```

### Routine Completion Log

```sql
-- Each routine completion is logged
user_id                 UUID
routine_id              UUID
category                ENUM('mind', 'body', 'soul')
completed_at            TIMESTAMP
```

### Avatar State Calculation

Avatar states should be **calculated, not stored** (derived from activity data):

```javascript
function getAvatarState(category, user) {
  const now = Date.now();
  const lastRoutine = user[`${category}_last_routine_at`];
  const hoursSinceRoutine = (now - lastRoutine) / (1000 * 60 * 60);
  
  const decayThreshold = user.vacation_mode_active ? 96 : 48;
  
  // Check Dormant
  if (hoursSinceRoutine >= decayThreshold) {
    return 'dormant';
  }
  
  // Check if routine completed today
  const completedToday = wasRoutineCompletedToday(user, category);
  
  // Check if all three completed today (Radiant)
  if (completedToday && allThreeCompletedToday(user)) {
    return 'radiant';
  }
  
  // Glowing if completed today
  if (completedToday) {
    return 'glowing';
  }
  
  // Awakening if 2+ routines in 48 hours
  const routinesIn48h = getRoutineCountLast48Hours(user, category);
  if (routinesIn48h >= 2) {
    return 'awakening';
  }
  
  // Default to Sleepy
  return 'sleepy';
}
```

### Harmony Check

```javascript
function checkHarmony(user) {
  const { mind_routines_7d, body_routines_7d, soul_routines_7d } = user;
  const total = mind_routines_7d + body_routines_7d + soul_routines_7d;
  
  // Minimum activity check
  if (total < 7) {
    return false;
  }
  
  // Balance check (all within 1 of each other)
  const max = Math.max(mind_routines_7d, body_routines_7d, soul_routines_7d);
  const min = Math.min(mind_routines_7d, body_routines_7d, soul_routines_7d);
  if (max - min > 1) {
    return false;
  }
  
  // No dormant avatars
  const states = ['mind', 'body', 'soul'].map(cat => getAvatarState(cat, user));
  if (states.includes('dormant')) {
    return false;
  }
  
  return true;
}
```

### Type Calculation

```javascript
function getUserType(user) {
  const { mind_routines_7d, body_routines_7d, soul_routines_7d } = user;
  
  const categories = [
    { name: 'mind', count: mind_routines_7d },
    { name: 'body', count: body_routines_7d },
    { name: 'soul', count: soul_routines_7d },
  ];
  
  categories.sort((a, b) => b.count - a.count);
  
  const highest = categories[0];
  const secondHighest = categories[1];
  
  // Must be 2+ ahead to be a "type"
  if (highest.count - secondHighest.count >= 2) {
    return highest.name; // 'mind', 'body', or 'soul'
  }
  
  return 'balanced';
}
```

---

## 11. Notification Schedule

| Notification | Trigger | Priority | Channel |
|--------------|---------|----------|---------|
| Decay warning (24hr) | 24hr since category routine | Medium | Push + In-app |
| Decay imminent (44hr) | 44hr since category routine | High | Push + In-app |
| Balance warning | 2+ gap in category counts | Medium | In-app |
| Harmony loss imminent | Any harmony requirement about to fail | High | Push + In-app |
| Harmony lost | User loses harmony | High | Push + In-app |
| Harmony achieved | User achieves harmony | High | Push + In-app (celebration) |
| Streak milestone | 7, 14, 21, 30... day streaks | Medium | Push + In-app |
| Vacation day earned | 7-day streak completed | Low | In-app |
| Vacation ending soon | 24hr before vacation ends | Medium | Push |
| Welcome back | Vacation mode ends | Medium | In-app |

---

## 12. UI/UX Recommendations

### Home Screen
- Display all three avatars with current states
- Visual differentiation between states (color, expression, animation)
- Dormant avatars should look sad/sleeping, other avatars could have speech bubbles ("Help them!")
- Harmony indicator (badge, aura, or visual treatment when in Harmony)

### Progress/Analytics Screen
- 7-day category breakdown (bar chart or pie chart)
- Type identification with friendly messaging
- Streak counter with vacation days banked
- Harmony status with requirements checklist

### Routine Selection
- Guide users toward neglected categories
- "Suggested for you" section prioritizing low-count categories
- Lock icon on advanced routines with "Achieve Harmony to unlock"

### Warnings
- Non-intrusive but visible alerts
- Actionable: tap warning → goes to relevant routine category
- Dismissable but reappears if condition persists

---

## 13. Implementation Phases

### Phase 1: Core State System
- [ ] Implement avatar state calculation (Dormant → Radiant)
- [ ] Add decay tracking (last_routine_at per category)
- [ ] Update states on routine completion
- [ ] Display states on home screen (placeholder visuals)

### Phase 2: Balance & Harmony
- [ ] Implement 7-day rolling count per category
- [ ] Add balance check logic
- [ ] Add Harmony calculation
- [ ] Gate advanced routines behind Harmony
- [ ] Add Harmony status to UI

### Phase 3: Streaks & Vacation
- [ ] Implement streak tracking
- [ ] Add vacation day earning (1 per 7-day streak)
- [ ] Build vacation mode activation flow
- [ ] Implement slow decay during vacation
- [ ] Add cooldown enforcement

### Phase 4: Warnings & Notifications
- [ ] Add 24hr decay warning
- [ ] Add balance warning
- [ ] Add Harmony loss warning
- [ ] Implement push notification triggers
- [ ] Add in-app alert components

### Phase 5: Analytics & Type System
- [ ] Build type calculation
- [ ] Add weekly/monthly trend analytics
- [ ] Create progress visualization UI
- [ ] Add milestone celebrations

### Phase 6: Visual Polish
- [ ] Integrate final avatar designs
- [ ] Add state transition animations
- [ ] Add celebration animations (Radiant, Harmony achieved)
- [ ] Avatar "help" interactions for Dormant states

---

## 14. Open Questions

1. **Cross-category influence:** Test with users before implementing?
2. **Streak freeze:** Should vacation mode freeze streak or just pause it?
3. **Partial routines:** What if user starts but doesn't complete a routine?
4. **Multiple routines per day:** Does doing 3 Mind routines in one day help or count as 1?
5. **Time zones:** How do we handle "today" for users in different time zones?
6. **Avatar names:** Do users name their avatars, or are they always "Mind/Body/Soul"?

---

## Summary

This system creates a balanced engagement loop:

1. **Low friction:** Any routine maintains streak
2. **Gentle guidance:** Warnings and type identification nudge toward balance
3. **Aspirational goal:** Harmony unlocks advanced content
4. **Forgiveness:** Vacation mode allows breaks without total reset
5. **Emotional connection:** Avatar states create investment in maintaining all three

The key differentiator is the holistic approach — users aren't just tracking workouts or meditations, they're nurturing three interconnected aspects of themselves toward Harmony.

---

## 15. Implementation Plan (Developer Reference)

**Created:** 2025-12-02
**Status:** Planning Complete - Ready for Development

This section provides a detailed, phased implementation plan based on codebase analysis. Each phase builds incrementally without breaking existing functionality.

---

### Current Codebase State (Pre-Implementation)

**What Already Exists:**
- ✅ Avatar state system (5 states with animations) - `lib/utils/stats.ts`
- ✅ Streak tracking (category + harmony streaks) - `lib/utils/stats.ts`
- ✅ Daily progress tracking - `daily_progress` table
- ✅ Routine completion logging - `routine_completions` table
- ✅ Milestone system (46 milestones, auto-award) - `install_milestone_system.sql`
- ✅ Per-category routine counts in `user_stats`
- ✅ Timezone support
- ✅ Avatar animations (pulse, glow) - `components/Avatar.tsx`

**What's Partially Implemented:**
- ⚠️ Balance tracking (data exists, calculation missing)
- ⚠️ Milestone display (UI shows, no celebration modal)

**What's NOT Implemented:**
- ❌ Harmony status field & calculation
- ❌ 7-day rolling window counts
- ❌ Advanced routine gating (`is_advanced` flag)
- ❌ Vacation mode (full system)
- ❌ Decay warnings (24-hour alerts)
- ❌ Balance warnings
- ❌ Type identification (Mind/Body/Soul types)
- ❌ Harmony loss/achievement notifications

---

### Phase 1: Database Schema Updates
**Goal:** Add necessary fields without affecting existing logic
**Risk Level:** Low (additive changes only)
**Estimated Effort:** Small

#### 1.1 Create `sql/migrations/add_harmony_system_fields.sql`
```sql
-- Add harmony and decay tracking to user_stats table
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS mind_routines_7d INT DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS body_routines_7d INT DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS soul_routines_7d INT DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS is_in_harmony BOOLEAN DEFAULT FALSE;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS harmony_achieved_at TIMESTAMPTZ;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS harmony_lost_at TIMESTAMPTZ;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'balanced';
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS mind_last_routine_at TIMESTAMPTZ;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS body_last_routine_at TIMESTAMPTZ;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS soul_last_routine_at TIMESTAMPTZ;
```

#### 1.2 Create `sql/migrations/add_vacation_mode_fields.sql`
```sql
-- Add vacation mode tracking
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS vacation_days_banked INT DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS vacation_mode_active BOOLEAN DEFAULT FALSE;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS vacation_mode_start TIMESTAMPTZ;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS vacation_mode_end TIMESTAMPTZ;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS last_vacation_ended_at TIMESTAMPTZ;
```

#### 1.3 Create `sql/migrations/add_advanced_routine_flag.sql`
```sql
-- Add advanced routine flag
ALTER TABLE routines ADD COLUMN IF NOT EXISTS is_advanced BOOLEAN DEFAULT FALSE;
```

#### Files to Create:
- `sql/migrations/add_harmony_system_fields.sql`
- `sql/migrations/add_vacation_mode_fields.sql`
- `sql/migrations/add_advanced_routine_flag.sql`

---

### Phase 2: Core Harmony Calculation Functions
**Goal:** Implement harmony logic in TypeScript utilities
**Risk Level:** Medium (modifying stats.ts requires careful testing)
**Estimated Effort:** Medium

#### 2.1 Update `types/index.ts`
Add new fields to `UserStats` interface:
```typescript
// Add to UserStats interface
mind_routines_7d: number;
body_routines_7d: number;
soul_routines_7d: number;
is_in_harmony: boolean;
harmony_achieved_at: string | null;
harmony_lost_at: string | null;
user_type: 'mind' | 'body' | 'soul' | 'balanced';
mind_last_routine_at: string | null;
body_last_routine_at: string | null;
soul_last_routine_at: string | null;
vacation_days_banked: number;
vacation_mode_active: boolean;
vacation_mode_start: string | null;
vacation_mode_end: string | null;
last_vacation_ended_at: string | null;
```

#### 2.2 Create `lib/utils/harmony.ts`
New utility file with functions:
- `calculate7DayRollingCounts(userId)` - Query routine_completions for last 7 days
- `checkBalance(mind, body, soul)` - Returns true if all within 1 of each other
- `getUserType(mind, body, soul)` - Returns 'mind', 'body', 'soul', or 'balanced'
- `checkHarmonyRequirements(userId)` - Full harmony check
- `updateHarmonyStatus(userId)` - Updates is_in_harmony in database

#### 2.3 Update `lib/utils/stats.ts`
- Modify `getAvatarState()` to use proper decay thresholds (48hr/96hr)
- Add vacation mode awareness to decay calculation
- Update `updateEnhancedStats()` to call harmony check after completion

#### Files to Create:
- `lib/utils/harmony.ts`

#### Files to Modify:
- `types/index.ts`
- `lib/utils/stats.ts`

---

### Phase 3: Streak System Refinement
**Goal:** Align streak logic with spec (any routine extends streak)
**Risk Level:** Medium (streak changes need thorough testing)
**Estimated Effort:** Medium

#### 3.1 Update `lib/utils/stats.ts`
- Modify streak logic: any routine extends streak (not just harmony)
- Ensure streak breaks only on full calendar day with no activity
- Add vacation day earning logic (1 day per 7-day streak milestone)

#### 3.2 Create `sql/migrations/add_7day_rolling_function.sql`
Database function to calculate 7-day rolling counts efficiently.

#### Files to Create:
- `sql/migrations/add_7day_rolling_function.sql`

#### Files to Modify:
- `lib/utils/stats.ts`

---

### Phase 4: Avatar State Enhancement
**Goal:** Update avatar display with proper state transitions
**Risk Level:** Low-Medium (UI changes are visible but non-breaking)
**Estimated Effort:** Medium

#### 4.1 Update `lib/utils/stats.ts` - `getAllAvatarStates()`
- Implement full 5-state logic per spec
- Add decay timestamp checks (48hr threshold)
- Add "Radiant" detection (all 3 glowing same day)
- Add "Awakening" detection (2+ routines in 48hr)

#### 4.2 Update `components/Avatar.tsx`
- Add visual differentiation for all 5 states
- Add "help" visual cue for Dormant state
- Add speech bubble option for Dormant ("Help me!")

#### 4.3 Update `app/(tabs)/index.tsx`
- Add Harmony badge/indicator when in harmony
- Update avatar click behavior based on state

#### Files to Modify:
- `lib/utils/stats.ts`
- `components/Avatar.tsx`
- `app/(tabs)/index.tsx`

---

### Phase 5: Advanced Routine Gating
**Goal:** Lock advanced routines behind Harmony
**Risk Level:** Medium (affects user access to content)
**Estimated Effort:** Medium

#### 5.1 Update `app/(tabs)/routines.tsx`
- Add harmony status check on load
- Display lock icon on advanced routines
- Add "Achieve Harmony to unlock" tooltip/modal

#### 5.2 Update `app/routines/[id].tsx`
- Check harmony before allowing "Start Routine"
- Show lock modal if trying to access advanced without harmony

#### 5.3 Update `app/routines/[id]/execute.tsx`
- Add harmony gate check before execution starts
- Redirect to info screen if not in harmony

#### 5.4 Create `components/HarmonyLockModal.tsx`
- Modal explaining harmony requirements
- Shows current progress toward harmony
- CTA to complete routines in needed categories

#### Files to Create:
- `components/HarmonyLockModal.tsx`

#### Files to Modify:
- `app/(tabs)/routines.tsx`
- `app/routines/[id].tsx`
- `app/routines/[id]/execute.tsx`

---

### Phase 6: Warning System
**Goal:** Implement decay and balance warnings
**Risk Level:** Low (additive UI feature)
**Estimated Effort:** Medium

#### 6.1 Create `lib/utils/warnings.ts`
- `checkDecayWarnings(userId)` - Returns warnings for 24hr+ inactive categories
- `checkBalanceWarnings(userId)` - Returns warning if 2+ gap exists
- `checkHarmonyLossRisk(userId)` - Returns true if harmony about to be lost

#### 6.2 Create `components/WarningBanner.tsx`
- Dismissable in-app alert component
- Tap to navigate to relevant category
- Different styles for decay vs balance warnings

#### 6.3 Update `app/(tabs)/index.tsx`
- Check for warnings on dashboard load
- Display WarningBanner when applicable

#### Files to Create:
- `lib/utils/warnings.ts`
- `components/WarningBanner.tsx`

#### Files to Modify:
- `app/(tabs)/index.tsx`

---

### Phase 7: Vacation Mode
**Goal:** Full vacation mode implementation
**Risk Level:** Medium (new feature with complex state)
**Estimated Effort:** Large

#### 7.1 Create `lib/utils/vacation.ts`
- `canActivateVacation(userId)` - Check requirements
- `activateVacation(userId, days)` - Set vacation mode with 24hr delay
- `deactivateVacation(userId)` - End vacation mode
- `checkVacationStatus(userId)` - Check if vacation active/expired
- `earnVacationDay(userId)` - Award day on 7-day streak milestone

#### 7.2 Create `app/settings/vacation.tsx`
- Vacation mode settings screen
- Show days banked, activation flow, cooldown display

#### 7.3 Update `app/(tabs)/profile.tsx`
- Add vacation mode status indicator
- Link to vacation settings

#### 7.4 Update decay logic in `stats.ts`
- Use 96hr threshold when vacation_mode_active = true

#### Files to Create:
- `lib/utils/vacation.ts`
- `app/settings/vacation.tsx`

#### Files to Modify:
- `app/(tabs)/profile.tsx`
- `lib/utils/stats.ts`

---

### Phase 8: Analytics & Type System
**Goal:** Weekly/monthly analytics with type identification
**Risk Level:** Low (new feature, no breaking changes)
**Estimated Effort:** Medium

#### 8.1 Create `components/BalanceChart.tsx`
- Visual pie/bar chart for Mind/Body/Soul ratio
- Color coding based on balance status

#### 8.2 Update `lib/utils/harmony.ts`
- Add `getWeeklyAnalytics(userId)` function
- Add `getMonthlyTrends(userId)` function

#### 8.3 Update analytics display
- 7-day category breakdown chart
- Type identification display with messaging
- Balance visualization

#### Files to Create:
- `components/BalanceChart.tsx`

#### Files to Modify:
- `lib/utils/harmony.ts`
- `app/(tabs)/profile.tsx` (or create new analytics screen)

---

### Phase 9: Notifications (Push & In-App)
**Goal:** Integrate with notification system
**Risk Level:** Medium (requires push notification infrastructure)
**Estimated Effort:** Large

#### Notification Triggers to Implement:
| Notification | Trigger | Priority |
|--------------|---------|----------|
| Decay warning (24hr) | 24hr since category routine | Medium |
| Decay imminent (44hr) | 44hr since category routine | High |
| Balance warning | 2+ gap in category counts | Medium |
| Harmony loss imminent | Any requirement about to fail | High |
| Harmony lost | User loses harmony | High |
| Harmony achieved | User achieves harmony | High |
| Streak milestone | 7, 14, 21, 30... day streaks | Medium |
| Vacation day earned | 7-day streak completed | Low |
| Vacation ending soon | 24hr before vacation ends | Medium |

---

### Phase 10: Visual Polish & Celebrations
**Goal:** Animations and celebration UI
**Risk Level:** Low (cosmetic improvements)
**Estimated Effort:** Medium

#### 10.1 Create `components/HarmonyAchievedModal.tsx`
- Celebration animation when harmony first achieved
- Shows what was unlocked

#### 10.2 Create `components/RadiantCelebration.tsx`
- Special animation when all 3 avatars go Radiant

#### 10.3 Update `components/Avatar.tsx`
- State transition animations
- Enhanced glow effects for Radiant
- Sad/sleeping animation for Dormant

#### Files to Create:
- `components/HarmonyAchievedModal.tsx`
- `components/RadiantCelebration.tsx`

#### Files to Modify:
- `components/Avatar.tsx`

---

### Implementation Order Summary

| Order | Phase | Description | Effort | Dependencies |
|-------|-------|-------------|--------|--------------|
| 1 | Phase 1 | Database Schema Updates | Small | None |
| 2 | Phase 2 | Core Harmony Calculation | Medium | Phase 1 |
| 3 | Phase 4 | Avatar State Enhancement | Medium | Phase 2 |
| 4 | Phase 3 | Streak System Refinement | Medium | Phase 1 |
| 5 | Phase 5 | Advanced Routine Gating | Medium | Phase 2 |
| 6 | Phase 6 | Warning System | Medium | Phase 2, 4 |
| 7 | Phase 8 | Analytics & Type System | Medium | Phase 2 |
| 8 | Phase 7 | Vacation Mode | Large | Phase 2, 3 |
| 9 | Phase 9 | Notifications | Large | Phase 6 |
| 10 | Phase 10 | Visual Polish | Medium | All above |

---

### Files Summary

#### New Files to Create:
```
sql/migrations/
├── add_harmony_system_fields.sql
├── add_vacation_mode_fields.sql
├── add_advanced_routine_flag.sql
└── add_7day_rolling_function.sql

lib/utils/
├── harmony.ts
├── warnings.ts
└── vacation.ts

components/
├── HarmonyLockModal.tsx
├── WarningBanner.tsx
├── BalanceChart.tsx
├── HarmonyAchievedModal.tsx
└── RadiantCelebration.tsx

app/settings/
└── vacation.tsx
```

#### Existing Files to Modify:
```
types/index.ts
lib/utils/stats.ts
lib/utils/dashboard.ts
components/Avatar.tsx
app/(tabs)/index.tsx
app/(tabs)/routines.tsx
app/(tabs)/profile.tsx
app/routines/[id].tsx
app/routines/[id]/execute.tsx
```

---

### Testing Checklist Per Phase

#### Phase 1 (Database):
- [ ] Run migrations on dev database
- [ ] Verify columns added with correct defaults
- [ ] Test that existing queries still work

#### Phase 2 (Harmony Calc):
- [ ] Test 7-day rolling count accuracy
- [ ] Test balance check with edge cases (0/0/0, 7/7/7, 7/5/7)
- [ ] Test harmony status updates correctly
- [ ] Test type identification

#### Phase 3 (Streaks):
- [ ] Verify any routine extends streak
- [ ] Test streak breaks after 24hr with no activity
- [ ] Test vacation day earning at 7-day milestones

#### Phase 4 (Avatars):
- [ ] All 5 states display correctly
- [ ] Decay at 48hr works
- [ ] Radiant triggers when all 3 complete
- [ ] Awakening shows for 2+ routines in 48hr

#### Phase 5 (Gating):
- [ ] Advanced routines show lock when not in harmony
- [ ] Lock modal appears on tap
- [ ] Routines unlock when harmony achieved
- [ ] Routines re-lock when harmony lost

#### Phase 6 (Warnings):
- [ ] 24hr decay warning appears
- [ ] Balance warning appears at 2+ gap
- [ ] Warnings dismissable but reappear
- [ ] Tap warning navigates to category

#### Phase 7 (Vacation):
- [ ] Can only activate when in harmony
- [ ] 24hr activation delay works
- [ ] 96hr slow decay during vacation
- [ ] Streak pauses during vacation
- [ ] 30-day cooldown enforced

---

### Notes for Development

1. **Run each phase through full testing before moving to next**
2. **Database migrations should be reversible** - include rollback scripts
3. **Keep avatar state calculation efficient** - it runs on every dashboard load
4. **Use existing patterns** from `lib/utils/stats.ts` for consistency
5. **Test with edge cases**: new users (day 1-7), users with no activity, users with heavy single-category usage