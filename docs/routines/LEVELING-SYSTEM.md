# Soteria Leveling System

## Overview

The leveling system tracks user progression through two dimensions:
1. **Soteria Level** - Overall XP/level visible to other users (caps at 100+)
2. **Category Levels** - RPG-style multi-class: Mind Lv.X / Body Lv.Y / Soul Lv.Z

Both are driven by routine completions. Every time you complete a routine, you earn XP toward your overall Soteria level AND the matching category level. Designed for **years** of engagement - reaching the highest titles requires long-term dedication.

---

## XP Formula

```
XP per completion = 10 (base) + duration_minutes
```

| Routine Duration | XP Earned |
|-----------------|-----------|
| 5 min           | 15 XP     |
| 10 min          | 20 XP     |
| 15 min          | 25 XP     |
| 30 min          | 40 XP     |
| 45 min          | 55 XP     |
| 60 min          | 70 XP     |

- If `duration_minutes` is unknown/null, defaults to 10 (so minimum 20 XP).
- The same XP amount is added to **both** your Soteria total AND the category (Mind/Body/Soul).

---

## Level Curve

```
XP needed for level N = 10 * N + 40
```

Each level costs 10 more XP than the previous one. Level 1 needs 50 XP (~2 routines), level 99 needs 1,030 XP (~41 routines). Gentle linear growth keeps high levels aspirational without feeling impossible.

| Level | XP to Next | Cumulative XP | ~Routines (15-min avg) | ~Timeline          |
|-------|-----------|---------------|------------------------|--------------------|
| 1     | 50        | 0             | 0                      | Day 1              |
| 5     | 90        | 260           | 10                     | ~3 days            |
| 10    | 140       | 810           | 32                     | ~2 weeks           |
| 20    | 240       | 2,660         | 106                    | ~5 weeks           |
| 30    | 340       | 5,510         | 220                    | ~2.5 months        |
| 50    | 540       | 14,210        | 568                    | ~6 months          |
| 70    | 740       | 26,910        | 1,076                  | ~1 year            |
| 100   | 1,040     | 53,460        | 2,138                  | ~2 years           |

*Timelines assume ~3 routines/day (one Mind, one Body, one Soul) at 15 min average = 75 XP/day.*

**Pacing:**
- **Levels 1-9 (Seeker):** First 2 weeks - hook period, fast progression
- **Levels 10-19 (Apprentice):** First 1-2 months - building the habit
- **Levels 20-29 (Practitioner):** 1-3 months - committed users
- **Levels 30-49 (Guardian):** 3-6 months - dedicated users
- **Levels 50-69 (Sage):** 6-12 months - veteran users
- **Levels 70-99 (Luminary):** 1-2 years - truly devoted
- **Level 100+ (Guardian Spirit):** ~2 years - legendary status

---

## Titles

### Soteria (Overall) Titles

| Level Range | Title           | Description                          |
|-------------|-----------------|--------------------------------------|
| 1-9         | Seeker          | Beginning the wellness journey       |
| 10-19       | Apprentice      | Building consistent habits           |
| 20-29       | Practitioner    | Committed to the path                |
| 30-49       | Guardian        | Protector of their own well-being    |
| 50-69       | Sage            | Deep wisdom through years of practice|
| 70-99       | Luminary        | A guiding light for others           |
| 100+        | Guardian Spirit | Transcended - one with Soteria       |

### Mind Titles

| Level Range | Title       |
|-------------|------------|
| 1-9         | Novice      |
| 10-19       | Thinker     |
| 20-29       | Scholar     |
| 30-49       | Seer        |
| 50-69       | Mystic      |
| 70-99       | Oracle      |
| 100+        | Enlightened |

### Body Titles

| Level Range | Title    |
|-------------|----------|
| 1-9         | Novice   |
| 10-19       | Mover    |
| 20-29       | Warrior  |
| 30-49       | Champion |
| 50-69       | Titan    |
| 70-99       | Colossus |
| 100+        | Immortal |

### Soul Titles

| Level Range | Title         |
|-------------|--------------|
| 1-9         | Novice        |
| 10-19       | Dreamer       |
| 20-29       | Healer        |
| 30-49       | Shepherd      |
| 50-69       | Sage          |
| 70-99       | Illuminated   |
| 100+        | Transcendent  |

---

## Where Levels Appear

### Dashboard (Home Tab)
- **Header stats row**: Trophy icon + "Lv.X" replaces the old "total routines" stat
- **Tooltip on tap**: Shows "Soteria Level X - Title. Y/Z XP to next level."
- **"Your Levels" card**: Below the avatars section, shows Mind/Body/Soul with level number, title, and XP progress bar

### Profile Tab
- **"Level & XP" section**: Between profile info and milestones
  - Soteria Level card: Icon, level number, title, full XP progress bar with "X / Y XP"
  - Three category cards in a row: Each shows icon, level, title, progress bar, XP counts

### Social Tab
- **Search results**: "Lv.X" badge appears next to journey focus on user cards (only for users with XP > 0)

### Routine Completion Flow
- After completing a routine, if a level-up occurred:
  - **Streak Screen** (if streak changed) > **Level-Up Celebration** > **Completion Screen**
  - Or: **Level-Up Celebration** > **Completion Screen** (if no streak change)
- Multiple level-ups show sequentially (e.g., both Soteria and category level-up)
- Level-up celebration: Animated card with category-colored particles, bouncing level number, new title

### Activity Feed
- Level-ups are recorded as activities visible to friends (appears as a streak_milestone activity with level-up metadata)

---

## Database Changes

### `user_stats` table - New columns
- `total_xp` (INTEGER, default 0)
- `mind_xp` (INTEGER, default 0)
- `body_xp` (INTEGER, default 0)
- `soul_xp` (INTEGER, default 0)

### `routine_completions` table - New column
- `duration_minutes` (INTEGER, nullable) - Denormalized from routine for accurate XP calculation

### `search_profiles` RPC
- Now LEFT JOINs `user_stats` to return `total_xp` in search results

### Backfill
- Existing completions are backfilled: XP calculated from each routine's `duration_minutes` (or default 10 if null)

### Hard Reset
- `hard_reset_user_data` needs manual update to reset XP columns to 0 (noted in migration)

---

## Open Questions

1. **Level-up celebration** - Should it always show, or only for "significant" levels (10, 20, 30, 50, 70, 100)?
2. **Leaderboards** - Should there be any ranking/leaderboard within circles or friends?
3. **XP bonuses** - Should there be bonus XP for streaks, harmony, or first-time completions?
4. **Social visibility** - Should friends see your full level breakdown or just Soteria level?
