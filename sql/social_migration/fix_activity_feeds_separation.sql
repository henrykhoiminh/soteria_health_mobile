-- =====================================================
-- FIX ACTIVITY FEEDS: Global vs Circle Separation
-- =====================================================
-- This migration adds proper indexing and ensures
-- activity feeds correctly separate global activities
-- from circle-specific activities
-- =====================================================

-- =====================================================
-- STEP 1: Add missing indexes for efficient queries
-- =====================================================

-- Index on related_circle_id for filtering circle activities
CREATE INDEX IF NOT EXISTS idx_friend_activity_circle_id
ON public.friend_activity(related_circle_id);

-- Composite index for circle activity queries (circle_id + created_at)
CREATE INDEX IF NOT EXISTS idx_friend_activity_circle_created
ON public.friend_activity(related_circle_id, created_at DESC)
WHERE related_circle_id IS NOT NULL;

-- Index for global activities (where circle_id IS NULL)
CREATE INDEX IF NOT EXISTS idx_friend_activity_global_created
ON public.friend_activity(created_at DESC)
WHERE related_circle_id IS NULL;

RAISE NOTICE '✓ Activity indexes created for efficient querying';

-- =====================================================
-- STEP 2: Add new activity types to support circle activities
-- =====================================================

-- Update the activity_type check constraint to include all activity types
-- Note: This will drop and recreate the constraint with expanded types
ALTER TABLE public.friend_activity
DROP CONSTRAINT IF EXISTS friend_activity_activity_type_check;

ALTER TABLE public.friend_activity
ADD CONSTRAINT friend_activity_activity_type_check
CHECK (activity_type IN (
  'completed_routine',
  'created_routine',
  'streak_milestone',
  'joined_circle',
  'left_circle',
  'shared_routine',
  'invited_to_circle',
  'removed_from_circle',
  'member_joined',
  'joined_soteria'
));

RAISE NOTICE '✓ Activity types updated';

-- =====================================================
-- STEP 3: Verification
-- =====================================================

-- Verify indexes were created
DO $$
DECLARE
  circle_id_idx_count INT;
  circle_created_idx_count INT;
  global_created_idx_count INT;
BEGIN
  SELECT COUNT(*) INTO circle_id_idx_count
  FROM pg_indexes
  WHERE tablename = 'friend_activity'
  AND indexname = 'idx_friend_activity_circle_id';

  SELECT COUNT(*) INTO circle_created_idx_count
  FROM pg_indexes
  WHERE tablename = 'friend_activity'
  AND indexname = 'idx_friend_activity_circle_created';

  SELECT COUNT(*) INTO global_created_idx_count
  FROM pg_indexes
  WHERE tablename = 'friend_activity'
  AND indexname = 'idx_friend_activity_global_created';

  IF circle_id_idx_count = 0 OR circle_created_idx_count = 0 OR global_created_idx_count = 0 THEN
    RAISE EXCEPTION 'Index creation failed';
  ELSE
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓✓✓ ACTIVITY FEED FIX COMPLETE! ✓✓✓';
    RAISE NOTICE '';
    RAISE NOTICE 'What was fixed:';
    RAISE NOTICE '  ✓ Added circle_id index for efficient filtering';
    RAISE NOTICE '  ✓ Added composite index (circle_id, created_at)';
    RAISE NOTICE '  ✓ Added partial index for global activities';
    RAISE NOTICE '  ✓ Updated activity types constraint';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Update application code to use new query logic';
    RAISE NOTICE '2. Test global activity feed (Social tab)';
    RAISE NOTICE '3. Test circle activity feeds';
    RAISE NOTICE '========================================';
  END IF;
END $$;
