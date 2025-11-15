# Milestone System - Setup and Testing Guide

## Overview

The Milestone System is a comprehensive automated achievement tracking system that celebrates user progress and milestones in your Soteria Health app. This system includes:

- **8 Milestone Categories**: Streaks, Completions, Balance, Specialization, Pain Tracking, Journey, Social, and Consistency
- **46 Total Milestones**: Ranging from common to legendary rarity
- **Automated Detection**: Database triggers automatically check for milestone achievements
- **Celebration Modals**: Beautiful animated celebrations when milestones are achieved
- **Progress Tracking**: Real-time progress visualization on the Profile page
- **Social Sharing**: Optional sharing of achievements to activity feed

---

## Installation Steps

### 1. Run SQL Migration

**IMPORTANT**: You must run the SQL migration in your Supabase project to create all necessary tables, functions, and triggers.

1. Open Supabase SQL Editor for your project
2. Copy the entire contents of `sql/milestones.sql`
3. Paste and execute the SQL script
4. Verify successful execution (you should see no errors)

**What this creates:**
- `milestone_definitions` table - All possible milestone types
- `user_milestones` table - User-achieved milestones
- `milestone_progress` table - Real-time progress tracking
- Database functions for milestone checking and awarding
- Automated triggers on `routine_completions` and `user_stats` tables
- Row Level Security policies
- 46 pre-seeded milestone definitions

### 2. Verify Database Setup

Run these queries in Supabase SQL Editor to verify setup:

```sql
-- Check milestone definitions were created
SELECT count(*) FROM milestone_definitions;
-- Should return: 46

-- Check triggers were created
SELECT tgname FROM pg_trigger WHERE tgname LIKE '%milestone%';
-- Should show: check_milestones_after_routine, check_milestones_after_stats

-- Test milestone check function (replace with your user_id)
SELECT * FROM check_and_award_milestones('YOUR_USER_ID_HERE');
```

### 3. Install Required Dependencies

The milestone system uses `expo-linear-gradient` for visual effects. Ensure it's installed:

```bash
npx expo install expo-linear-gradient
```

---

## How It Works

### Automatic Milestone Detection

The system automatically checks for milestone achievements in two scenarios:

1. **After Routine Completion**: When a user completes a routine, the `check_milestones_after_routine` trigger fires
2. **After Stats Update**: When user stats change (streaks, totals), the `check_milestones_after_stats` trigger fires

### Celebration Flow

1. User completes an action (e.g., finishes a routine)
2. Database trigger runs `check_and_award_milestones()`
3. Function checks all milestone requirements
4. Newly achieved milestones are inserted into `user_milestones` with `shown_celebration = FALSE`
5. On next app navigation, `getUncelebratedMilestones()` retrieves them
6. Celebration modal displays with animations
7. User can share to activity feed (optional)
8. Milestone marked as `shown_celebration = TRUE`

### Profile Page Display

- Milestones section shows on Profile tab
- Summary stats: Achieved, In Progress, Completion %
- By default shows top 3 achieved milestones
- "View All" expands to show all milestones with progress bars
- Each card shows:
  - Milestone name, icon, and rarity
  - Progress bar (for unachieved)
  - Achievement date (for achieved)

---

## Testing the System

### Test Scenario 1: First Routine Completion

**Expected Milestones:**
- `routine_1` - "Getting Started" (Complete first routine)
- `balance_[category]_first` - Category-specific first completion
- `journey_started` - "Journey Begins" (if journey just started)
- `consistency_3_days` - If 3 days in a row

**Steps:**
1. Have a fresh user account or use journey reset
2. Complete your first routine
3. Navigate between tabs to trigger milestone check
4. Celebration modal should appear
5. Check Profile page to see milestone displayed

### Test Scenario 2: Streak Milestones

**Expected Milestones:**
- `streak_1` - "First Step" (1 day streak)
- `streak_7` - "Week Warrior" (7 day streak)
- `streak_30` - "Monthly Master" (30 day streak)

**Steps:**
1. Complete routines to build a streak
2. Check `user_stats` table: `SELECT current_streak FROM user_stats WHERE user_id = 'YOUR_ID';`
3. When streak hits thresholds (1, 7, 30), milestone should trigger
4. Celebration appears on next navigation

### Test Scenario 3: Completion Count Milestones

**Expected Milestones:**
- `routine_10` - "Committed" (10 routines)
- `routine_50` - "Dedicated" (50 routines)
- `routine_100` - "Veteran" (100 routines)

**Steps:**
1. Check total routines: `SELECT total_routines FROM user_stats WHERE user_id = 'YOUR_ID';`
2. Complete routines until hitting thresholds
3. Verification query:
```sql
SELECT m.name, um.achieved_at
FROM user_milestones um
JOIN milestone_definitions m ON um.milestone_id = m.id
WHERE um.user_id = 'YOUR_ID'
AND m.category = 'completion'
ORDER BY um.achieved_at DESC;
```

### Test Scenario 4: Balance Milestone

**Expected Milestone:**
- `balance_all_categories` - "Balanced Beginner" (1 of each category)

**Steps:**
1. Complete at least 1 Mind routine
2. Complete at least 1 Body routine
3. Complete at least 1 Soul routine
4. Milestone should trigger after 3rd category completion

### Test Scenario 5: Manual Trigger (For Testing)

Force milestone check manually:

```sql
-- Manually trigger milestone check for a user
SELECT * FROM check_and_award_milestones('YOUR_USER_ID');

-- View all uncelebrated milestones
SELECT * FROM get_uncelebrated_milestones('YOUR_USER_ID');

-- Mark a milestone as celebrated (for testing)
SELECT mark_milestone_celebrated('YOUR_USER_ID', 'routine_1');
```

---

## Troubleshooting

### Milestones Not Triggering

1. **Check if triggers exist:**
```sql
SELECT * FROM pg_trigger WHERE tgname LIKE '%milestone%';
```

2. **Manually run milestone check:**
```sql
SELECT * FROM check_and_award_milestones('YOUR_USER_ID');
```

3. **Check for errors in function:**
```sql
-- Look for function definition
SELECT prosrc FROM pg_proc WHERE proname = 'check_and_award_milestones';
```

4. **Verify stats are updating:**
```sql
SELECT * FROM user_stats WHERE user_id = 'YOUR_USER_ID';
```

### Celebration Modal Not Showing

1. **Check uncelebrated milestones exist:**
```sql
SELECT * FROM user_milestones
WHERE user_id = 'YOUR_USER_ID'
AND shown_celebration = FALSE;
```

2. **Verify RLS policies allow reading:**
```sql
SELECT * FROM milestone_definitions LIMIT 1;
-- Should return data without errors
```

3. **Check app logs for JavaScript errors**

### Progress Not Updating on Profile

1. **Check milestone_progress table:**
```sql
SELECT * FROM milestone_progress WHERE user_id = 'YOUR_USER_ID';
```

2. **Manually update progress:**
```sql
SELECT * FROM check_and_award_milestones('YOUR_USER_ID');
```

3. **Verify Profile page is calling `getUserMilestones()`**

---

## Advanced Configuration

### Adding New Milestones

To add custom milestones, insert into `milestone_definitions`:

```sql
INSERT INTO milestone_definitions (
  id, category, name, description,
  icon_name, icon_color, threshold, threshold_type, rarity, order_index
) VALUES (
  'custom_milestone_id',
  'completion',
  'Super Achiever',
  'Complete 1000 routines',
  'star',
  '#FFD700',
  1000,
  'count',
  'legendary',
  10
);
```

### Modifying Milestone Logic

The main detection logic is in the `check_and_award_milestones` function in `sql/milestones.sql`.

To modify:
1. Edit the CASE statement for the relevant category
2. Update the SQL function:
```sql
CREATE OR REPLACE FUNCTION check_and_award_milestones(target_user_id UUID)
RETURNS TABLE(...) AS $$
-- Your modified logic here
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Customizing Celebration Animations

Edit `components/MilestoneCelebrationModal.tsx`:
- Adjust particle count (line 21)
- Modify animation duration (lines 34-49)
- Change colors/styles (styles object at bottom)

---

## Database Schema Reference

### milestone_definitions
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Unique milestone ID |
| category | TEXT | Category (streak, completion, etc.) |
| name | TEXT | Display name |
| description | TEXT | Description shown to user |
| icon_name | TEXT | Ionicons icon name |
| icon_color | TEXT | Hex color for icon |
| threshold | INTEGER | Value needed to achieve |
| threshold_type | TEXT | Type of threshold (count, days, etc.) |
| rarity | TEXT | common, rare, epic, legendary |
| order_index | INTEGER | Sort order within category |

### user_milestones
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to auth.users |
| milestone_id | TEXT | Foreign key to milestone_definitions |
| achieved_at | TIMESTAMPTZ | When achieved |
| progress_value | INTEGER | Value when achieved |
| shown_celebration | BOOLEAN | Has user seen modal? |
| shared_to_activity | BOOLEAN | Shared to feed? |

### milestone_progress
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to auth.users |
| milestone_id | TEXT | Foreign key to milestone_definitions |
| current_value | INTEGER | Current progress value |
| last_updated | TIMESTAMPTZ | Last progress update |

---

## API Reference

### Client-Side Functions (`lib/utils/milestones.ts`)

```typescript
// Get all milestones with progress
getUserMilestones(userId: string): Promise<MilestoneSummary[]>

// Get uncelebrated milestones
getUncelebratedMilestones(userId: string): Promise<UncelebratedMilestone[]>

// Mark milestone as celebrated
markMilestoneCelebrated(userId: string, milestoneId: string): Promise<boolean>

// Manually trigger check
checkMilestones(userId: string): Promise<void>

// Share milestone to activity feed
shareMilestoneToActivity(userId: string, milestoneId: string, name: string): Promise<void>

// Utility functions
getMilestoneStats(milestones: MilestoneSummary[]): MilestoneStats
getAchievedMilestones(milestones: MilestoneSummary[]): MilestoneSummary[]
getInProgressMilestones(milestones: MilestoneSummary[]): MilestoneSummary[]
getRarityColor(rarity: MilestoneRarity): string
getCategoryLabel(category: MilestoneCategory): string
```

### Database Functions

```sql
-- Main milestone detection and awarding
check_and_award_milestones(target_user_id UUID)
RETURNS TABLE(newly_awarded_milestone_id TEXT, milestone_name TEXT)

-- Get milestone summary with progress
get_user_milestones_summary(target_user_id UUID)
RETURNS TABLE(milestone_id TEXT, category TEXT, name TEXT, ...)

-- Get uncelebrated milestones
get_uncelebrated_milestones(target_user_id UUID)
RETURNS TABLE(milestone_id TEXT, name TEXT, ...)

-- Mark milestone as celebrated
mark_milestone_celebrated(target_user_id UUID, target_milestone_id TEXT)
RETURNS BOOLEAN
```

---

## Performance Considerations

- Database triggers run automatically but are optimized with early returns
- Only checks relevant milestones based on changed stats
- Uses indexed queries for fast lookups
- Progress tracking updates incrementally
- Celebration modals are queued and shown sequentially

---

## Future Enhancements

Potential additions to consider:

1. **Milestone Notifications**: Push notifications when milestone achieved
2. **Leaderboards**: Compare milestone counts with friends
3. **Badges**: Visual badge collection on profile
4. **Rare Achievement Highlights**: Special effects for legendary milestones
5. **Milestone Challenges**: Time-limited special milestones
6. **Retroactive Awards**: Award milestones for past achievements
7. **Milestone Rewards**: Unlock features/content with milestones

---

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review Supabase logs for errors
3. Check browser/app console for JavaScript errors
4. Verify database schema matches `sql/milestones.sql`

---

**System Version**: 1.0.0
**Last Updated**: 2025-01-14
**Compatibility**: Soteria Health Mobile v1.0+
