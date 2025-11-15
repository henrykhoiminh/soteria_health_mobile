-- ============================================================================
-- CLEAR TODAY'S PROGRESS - Quick Reset Script
-- ============================================================================
-- Run this to reset just today's progress without affecting your overall stats
-- ============================================================================

-- Step 1: Find your user ID
-- Run this query first and copy your user_id:
SELECT id, email FROM auth.users;

-- Step 2: Delete today's and yesterday's daily progress entries
-- Replace the UUID below with your actual user_id from Step 1

DELETE FROM daily_progress
WHERE user_id = 'YOUR_USER_ID_HERE'  -- Replace with your actual UUID
AND date >= CURRENT_DATE - INTERVAL '2 days';

-- Step 3: Verify it was deleted
SELECT * FROM daily_progress
WHERE user_id = 'YOUR_USER_ID_HERE'  -- Replace with your actual UUID
ORDER BY date DESC
LIMIT 10;

-- ============================================================================
-- What happens after running this:
-- ============================================================================
-- 1. Your avatars will reset to Dormant/Sleepy state
-- 2. Pain check-in prompt will appear again
-- 3. You can complete routines and test the new timezone system
-- 4. Your overall stats (streaks, totals) remain unchanged
-- ============================================================================
