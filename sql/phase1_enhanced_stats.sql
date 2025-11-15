-- =====================================================
-- PHASE 1: Enhanced Stats & Per-Category Streaks
-- =====================================================
-- Purpose: Add per-category tracking for Mind/Body/Soul
--          to support avatar light system and harmony scoring
--
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add per-category streak columns
ALTER TABLE user_stats
ADD COLUMN IF NOT EXISTS mind_current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS body_current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS soul_current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS mind_longest_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS body_longest_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS soul_longest_streak INTEGER DEFAULT 0;

-- Add unique routine tracking per category
ALTER TABLE user_stats
ADD COLUMN IF NOT EXISTS unique_mind_routines INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS unique_body_routines INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS unique_soul_routines INTEGER DEFAULT 0;

-- Add last activity date per category (for avatar light levels in Phase 2)
ALTER TABLE user_stats
ADD COLUMN IF NOT EXISTS last_mind_activity DATE,
ADD COLUMN IF NOT EXISTS last_body_activity DATE,
ADD COLUMN IF NOT EXISTS last_soul_activity DATE;

-- Add harmony score (0-100: measures balance across Mind/Body/Soul)
ALTER TABLE user_stats
ADD COLUMN IF NOT EXISTS harmony_score INTEGER DEFAULT 0;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check that all columns were added successfully
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_stats'
ORDER BY ordinal_position;

-- View a sample user_stats row to see new columns
SELECT * FROM user_stats LIMIT 1;

-- =====================================================
-- MIGRATION NOTES
-- =====================================================

-- Per-Category Streaks:
--   - mind_current_streak: Current consecutive days with Mind routine
--   - body_current_streak: Current consecutive days with Body routine
--   - soul_current_streak: Current consecutive days with Soul routine
--   - mind/body/soul_longest_streak: Historical longest streaks per category

-- Unique Routine Tracking:
--   - unique_mind/body/soul_routines: Count of unique routine IDs completed per category
--   - Used for milestone achievements (e.g., "Completed 10 unique Mind routines")

-- Last Activity Dates:
--   - last_mind/body/soul_activity: Most recent date user completed routine in that category
--   - Will be used in Phase 2 for avatar "light" level calculation
--   - Helps determine avatar state: Dormant → Awakening → Glowing → Radiant

-- Harmony Score:
--   - 0-100 score measuring balance across Mind/Body/Soul
--   - Based on last 7 days of activity
--   - Rewards users who engage with all three categories consistently
--   - Formula (to be implemented in app logic):
--     * +30 points: All three categories active in last 7 days
--     * +20 points: Smallest category streak is healthy (≥3 days)
--     * +50 points: Distribution score (closer to 33/33/33 split = higher)

-- =====================================================
-- ROLLBACK (if needed)
-- =====================================================

-- CAUTION: Only run this if you need to undo the migration
-- This will permanently delete the new columns and their data

/*
ALTER TABLE user_stats
DROP COLUMN IF EXISTS mind_current_streak,
DROP COLUMN IF EXISTS body_current_streak,
DROP COLUMN IF EXISTS soul_current_streak,
DROP COLUMN IF EXISTS mind_longest_streak,
DROP COLUMN IF EXISTS body_longest_streak,
DROP COLUMN IF EXISTS soul_longest_streak,
DROP COLUMN IF EXISTS unique_mind_routines,
DROP COLUMN IF EXISTS unique_body_routines,
DROP COLUMN IF EXISTS unique_soul_routines,
DROP COLUMN IF EXISTS last_mind_activity,
DROP COLUMN IF EXISTS last_body_activity,
DROP COLUMN IF EXISTS last_soul_activity,
DROP COLUMN IF EXISTS harmony_score;
*/
