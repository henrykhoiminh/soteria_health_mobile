# Companion State Rules

This document defines the light states for companion avatars (Mind, Body, Soul) and the logic that determines each state.

## State Overview

Each companion has a **light state** that reflects the user's engagement with that category. States are ordered from least active to most active:

| State | Visual | Description |
|-------|--------|-------------|
| **Dormant** | 0.3 opacity, dim | User has been inactive in this category for 48+ hours |
| **Sleepy** | 0.5 opacity, subdued | Start of new day, has recent activity but nothing completed today |
| **Awakening** | 0.7 opacity, building | User is currently executing a routine in this category |
| **Glowing** | 0.9 opacity, pulsing | At least one routine completed today in this category |
| **Radiant** | 1.0 opacity, fast pulse | All three categories have at least one routine complete today (Harmony) |

---

## State Priority (Highest to Lowest)

When determining a companion's state, the system checks conditions in this order:

### 1. Radiant (Highest Priority)
**Condition:** All three categories (Mind, Body, Soul) have completed at least one routine today.

```
if (mind_complete AND body_complete AND soul_complete) → Radiant
```

- Represents **Daily Harmony** achievement
- All three companions show Radiant simultaneously
- Fastest pulsing animation, full brightness

### 2. Glowing
**Condition:** This specific category has at least one routine completed today.

```
if (category_complete_today) → Glowing
```

- Category is "lit up" for the day
- Stays Glowing even if user executes another routine in this category
- Pulsing animation at moderate speed

### 3. Awakening
**Condition:** User is actively executing a routine in this category right now.

```
if (currently_executing_routine_in_category) → Awakening
```

- **Transition state** - only shown during active routine execution
- Set by the UI, not by `getAllAvatarStates()` function
- Once routine completes, state advances to Glowing

### 4. Dormant
**Condition:** No activity in this category for 48+ hours.

```
if (hours_since_last_activity >= 48) → Dormant
```

- Represents decay from inactivity
- Companion appears very dim, needs attention
- Encourages user to re-engage with this category

### 5. Sleepy (Default)
**Condition:** None of the above conditions are met.

```
else → Sleepy
```

- Default state at the start of a new day
- User has been active within 48 hours but hasn't done anything today yet
- Companion is resting, waiting to be awakened

---

## State Flow Examples

### Example 1: Fresh Day
User completed routines yesterday in all categories, wakes up today:
- **Mind:** Sleepy (nothing today, active yesterday)
- **Body:** Sleepy (nothing today, active yesterday)
- **Soul:** Sleepy (nothing today, active yesterday)

### Example 2: Mid-Day Progress
User completed Mind routine, currently doing Body routine:
- **Mind:** Glowing (completed today)
- **Body:** Awakening (currently executing)
- **Soul:** Sleepy (nothing today yet)

### Example 3: Harmony Achieved
User completed at least one routine in each category:
- **Mind:** Radiant
- **Body:** Radiant
- **Soul:** Radiant

### Example 4: Returning After Break
User hasn't used the app for 3 days:
- **Mind:** Dormant (72+ hours inactive)
- **Body:** Dormant (72+ hours inactive)
- **Soul:** Dormant (72+ hours inactive)

### Example 5: Partial Activity
User only does Mind routines, neglects Body and Soul for 3 days:
- **Mind:** Glowing (completed today)
- **Body:** Dormant (72+ hours inactive)
- **Soul:** Dormant (72+ hours inactive)

---

## Implementation Details

### Where States Are Determined

| Location | States Set | Purpose |
|----------|------------|---------|
| `lib/utils/stats.ts` → `getAllAvatarStates()` | Radiant, Glowing, Dormant, Sleepy | Dashboard display, general state |
| `lib/utils/stats.ts` → `getAvatarLightState()` | All states | Utility function with explicit params |
| UI Components (e.g., execution screen) | Awakening | Real-time during routine execution |

### Key Functions

```typescript
// Get all avatar states for dashboard
getAllAvatarStates(userId: string): Promise<AvatarState[]>

// Determine single avatar state with explicit parameters
getAvatarLightState(
  categoryCompleted: boolean,
  allCategoriesCompleted: boolean,
  isExecutingThisCategory?: boolean,
  isDormant?: boolean
): AvatarLightState
```

### Database Fields Used

| Table | Field | Purpose |
|-------|-------|---------|
| `daily_progress` | `mind_complete`, `body_complete`, `soul_complete` | Today's completion status |
| `user_stats` | `mind_last_routine_at`, `body_last_routine_at`, `soul_last_routine_at` | Last activity timestamps for decay |

---

## Visual Representation

### CompanionAvatar Component

The `CompanionAvatar` component (`components/CompanionAvatar.tsx`) handles visual display:

```typescript
// Opacity by state
Dormant   → 0.3
Sleepy    → 0.5
Awakening → 0.7
Glowing   → 0.9
Radiant   → 1.0

// Animations
Glowing   → Pulsing (1.5s cycle)
Radiant   → Faster pulsing (1.0s cycle)
```

### Rive Integration

For Rive animations, the state machine input is:
- **State Machine:** `CompanionState`
- **Input:** `lightLevel` (Number 0-4)

```typescript
const LIGHT_STATE_LEVELS = {
  Dormant: 0,
  Sleepy: 1,
  Awakening: 2,
  Glowing: 3,
  Radiant: 4,
}
```

---

## Related Documentation

- [CHARACTER-DESIGN-GUIDE.md](./CHARACTER-DESIGN-GUIDE.md) - Character personality and visual design
- [RIVE-INTEGRATION-GUIDE.md](./RIVE-INTEGRATION-GUIDE.md) - Rive animation setup and integration
