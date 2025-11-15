-- =====================================================
-- SOTERIA HEALTH - REMOVE GOALS MECHANIC
-- SQL Script to remove goals-related columns and data
-- =====================================================

-- =====================================================
-- 1. BACKUP DATA (Optional - run before removal)
-- Create a backup table in case you need to restore
-- =====================================================

-- Uncomment to create backup:
-- CREATE TABLE profiles_backup_goals AS
-- SELECT id, user_id, goals FROM profiles WHERE goals IS NOT NULL;

-- =====================================================
-- 2. REMOVE GOALS COLUMN FROM PROFILES TABLE
-- =====================================================

-- Drop the goals column from profiles table
ALTER TABLE profiles DROP COLUMN IF EXISTS goals;

-- =====================================================
-- 3. VERIFY REMOVAL
-- =====================================================

-- Check that goals column no longer exists
-- Run this to verify:
-- SELECT column_name
-- FROM information_schema.columns
-- WHERE table_name = 'profiles' AND column_name = 'goals';

-- This should return no rows if successful

-- =====================================================
-- 4. UPDATE ANY VIEWS THAT REFERENCE GOALS (if any)
-- =====================================================

-- If you have any database views that select goals, they need to be recreated
-- Example (adjust as needed):
-- DROP VIEW IF EXISTS user_profiles_view;
-- CREATE OR REPLACE VIEW user_profiles_view AS
-- SELECT
--   id,
--   user_id,
--   full_name,
--   username,
--   age,
--   fitness_level,
--   journey_focus,
--   journey_started_at,
--   recovery_areas,
--   recovery_goals,
--   injuries,
--   -- goals removed
--   profile_picture_url,
--   created_at,
--   updated_at
-- FROM profiles;

-- =====================================================
-- 5. CLEAN UP ANY TRIGGERS OR FUNCTIONS (if any)
-- =====================================================

-- Check for any triggers or functions that reference goals
-- SELECT trigger_name, event_manipulation, event_object_table
-- FROM information_schema.triggers
-- WHERE trigger_name ILIKE '%goal%';

-- SELECT routine_name
-- FROM information_schema.routines
-- WHERE routine_definition ILIKE '%goals%';

-- Drop any found triggers/functions and recreate without goals reference

-- =====================================================
-- NOTES
-- =====================================================

-- 1. This script removes the goals column from the profiles table
-- 2. Users will no longer have goals stored in the database
-- 3. The journey_focus field remains and captures the primary goal
-- 4. Run this script in Supabase SQL Editor
-- 5. Make sure to update your application code before/after running this

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify column is removed
SELECT COUNT(*) as goals_column_exists
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'goals';
-- Should return 0

-- Verify profiles table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- =====================================================
-- END OF GOALS REMOVAL SCRIPT
-- =====================================================
