-- =====================================================
-- Add New Circle Activity Types
-- =====================================================
-- This migration adds support for tracking when users:
-- 1. Leave a circle
-- 2. Invite friends to a circle
-- =====================================================

-- Note: The activity types are stored as text in the database,
-- so no schema changes are needed. This file documents the new types:
--
-- New Activity Types:
-- - 'left_circle': When a user voluntarily leaves a circle
-- - 'invited_to_circle': When a user invites another user to a circle
-- - 'removed_from_circle': When an admin removes a user from a circle
--
-- The TypeScript types have already been updated in the codebase.
-- This SQL file exists for documentation purposes.

-- Verify that the friend_activity table exists and has the correct structure
DO $$
BEGIN
  -- Check if friend_activity table exists
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'friend_activity') THEN
    RAISE EXCEPTION 'friend_activity table does not exist. Run the social features migration first.';
  END IF;

  RAISE NOTICE 'friend_activity table exists. New activity types can be used.';
END $$;

-- Example queries for the new activity types:

-- Get all "left circle" activities
-- SELECT * FROM friend_activity WHERE activity_type = 'left_circle';

-- Get all "invited to circle" activities
-- SELECT * FROM friend_activity WHERE activity_type = 'invited_to_circle';

-- Get all "removed from circle" activities
-- SELECT * FROM friend_activity WHERE activity_type = 'removed_from_circle';

-- Find all instances where a specific user was removed from circles
-- SELECT * FROM friend_activity
-- WHERE activity_type = 'removed_from_circle'
-- AND activity_data->>'removed_user_id' IS NULL; -- This user was removed

-- Find all instances where a specific user removed others
-- SELECT * FROM friend_activity
-- WHERE activity_type = 'removed_from_circle'
-- AND activity_data->>'removed_user_id' IS NOT NULL; -- This user did the removing

-- Count activities by type
-- SELECT activity_type, COUNT(*) as count
-- FROM friend_activity
-- GROUP BY activity_type
-- ORDER BY count DESC;
