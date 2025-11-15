-- ============================================================================
-- RESET DAILY PROGRESS FOR TESTING
-- ============================================================================
-- This is a one-time script to clear your daily progress so you can test
-- the new timezone system immediately
-- ============================================================================

-- Replace 'YOUR_USER_ID' with your actual user ID
-- You can find your user ID by running: SELECT id FROM auth.users WHERE email = 'your_email@example.com';

-- Clear today's progress (both UTC and local dates)
DELETE FROM daily_progress
WHERE user_id = 'YOUR_USER_ID'
AND date >= CURRENT_DATE - INTERVAL '1 day';

-- Alternatively, to just reset completions for today without deleting:
-- UPDATE daily_progress
-- SET
--   mind_complete = FALSE,
--   body_complete = FALSE,
--   soul_complete = FALSE
-- WHERE user_id = 'YOUR_USER_ID'
-- AND date >= CURRENT_DATE - INTERVAL '1 day';

-- ============================================================================
-- Verify your progress was cleared
-- ============================================================================
SELECT * FROM daily_progress
WHERE user_id = 'YOUR_USER_ID'
ORDER BY date DESC
LIMIT 5;

-- ============================================================================
-- IMPORTANT: After running this script
-- ============================================================================
-- 1. Refresh your app (close and reopen)
-- 2. Your avatars should return to Dormant or Sleepy state
-- 3. Complete a routine to test the new timezone system
-- 4. Check that daily progress updates correctly with local date
-- ============================================================================
