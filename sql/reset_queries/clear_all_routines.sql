-- ============================================================================
-- CLEAR ALL ROUTINES - Simple Database Reset
-- ============================================================================
-- Description: Remove all routines and related data to start fresh
-- Use this to rebuild routines from the app UI
-- ============================================================================

-- Step 1: Show what will be deleted
SELECT
  'BEFORE DELETE - Current counts' as info,
  (SELECT COUNT(*) FROM routines) as total_routines,
  (SELECT COUNT(*) FROM routine_completions) as total_completions,
  (SELECT COUNT(*) FROM saved_routines) as total_saved;

-- Step 2: Delete related data first (to avoid foreign key conflicts)

-- Delete all routine completions
DELETE FROM routine_completions;

-- Delete all saved routines
DELETE FROM saved_routines;

-- Delete circle routines if table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'circle_routines') THEN
    DELETE FROM circle_routines;
  END IF;
END $$;

-- Step 3: Delete all routines
DELETE FROM routines;

-- Step 4: Verify deletion
SELECT
  'AFTER DELETE - Verification' as info,
  (SELECT COUNT(*) FROM routines) as total_routines,
  (SELECT COUNT(*) FROM routine_completions) as total_completions,
  (SELECT COUNT(*) FROM saved_routines) as total_saved;

-- Step 5: Reset sequences (optional - for clean IDs)
-- Uncomment if you want routine IDs to start from 1 again
-- ALTER SEQUENCE routines_id_seq RESTART WITH 1;

-- Step 6: Vacuum to reclaim space (optional - run separately if needed)
-- Note: VACUUM cannot run in a transaction block in Supabase SQL Editor
-- Run these commands separately if you want to reclaim disk space:
-- VACUUM ANALYZE routines;
-- VACUUM ANALYZE routine_completions;
-- VACUUM ANALYZE routine_saves;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT
  '✓ All routines cleared successfully!' as status,
  'Database is ready for fresh routines from app UI' as next_step;

-- ============================================================================
-- NOTES
-- ============================================================================
-- • All routines have been deleted
-- • All completions have been deleted
-- • All saved routine references have been deleted
-- • You can now create routines fresh from the app UI
-- • This will help identify any missing features in the routine builder
-- ============================================================================
