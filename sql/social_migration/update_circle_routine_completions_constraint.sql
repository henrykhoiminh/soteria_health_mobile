-- =====================================================
-- UPDATE: Circle Routine Completions Constraint
-- =====================================================
-- Removes daily completion limit
-- Users can now complete same routine multiple times per day
-- Stats will show unique members who completed, not total completions
-- =====================================================

-- =====================================================
-- STEP 1: Drop the daily uniqueness constraint
-- =====================================================

ALTER TABLE public.circle_routine_completions
DROP CONSTRAINT IF EXISTS unique_circle_routine_completion_per_day;

RAISE NOTICE '✓ Removed daily completion limit - users can now complete routines multiple times per day';

-- =====================================================
-- STEP 2: Update stats function to count unique users
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_circle_routine_stats(
  p_circle_id UUID,
  p_routine_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_unique_completers INTEGER;
  v_total_completions INTEGER;
  v_member_count INTEGER;
  v_is_popular BOOLEAN;
BEGIN
  -- Count UNIQUE users who have completed this routine in this circle
  SELECT COUNT(DISTINCT user_id) INTO v_unique_completers
  FROM public.circle_routine_completions
  WHERE circle_id = p_circle_id
  AND routine_id = p_routine_id;

  -- Count TOTAL completions (for reference, if needed later)
  SELECT COUNT(*) INTO v_total_completions
  FROM public.circle_routine_completions
  WHERE circle_id = p_circle_id
  AND routine_id = p_routine_id;

  -- Count total members in circle
  SELECT COUNT(*) INTO v_member_count
  FROM public.circle_members
  WHERE circle_id = p_circle_id;

  -- Mark as popular if more than 50% of members have completed it at least once
  v_is_popular := (v_unique_completers::FLOAT / GREATEST(v_member_count, 1)) >= 0.5;

  -- Update the circle_routines record
  -- completion_count stores UNIQUE members who completed (not total completions)
  UPDATE public.circle_routines
  SET
    completion_count = v_unique_completers,
    is_popular = v_is_popular
  WHERE circle_id = p_circle_id
  AND routine_id = p_routine_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

RAISE NOTICE '✓ Updated stats function to count unique members instead of total completions';

-- =====================================================
-- STEP 3: Refresh all existing stats
-- =====================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE 'Refreshing stats for all circle routines...';

  FOR r IN (
    SELECT DISTINCT circle_id, routine_id
    FROM public.circle_routines
  )
  LOOP
    PERFORM public.update_circle_routine_stats(r.circle_id, r.routine_id);
  END LOOP;

  RAISE NOTICE '✓ All stats refreshed';
END $$;

-- =====================================================
-- STEP 4: Update comments for clarity
-- =====================================================

COMMENT ON COLUMN public.circle_routines.completion_count IS
'Number of UNIQUE members who have completed this routine at least once (not total completions)';

COMMENT ON TABLE public.circle_routine_completions IS
'Tracks when circle members complete routines. Users can complete same routine multiple times. Stats show unique members who completed.';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓✓✓ CONSTRAINT UPDATE COMPLETE! ✓✓✓';
  RAISE NOTICE '';
  RAISE NOTICE 'What changed:';
  RAISE NOTICE '  ✓ Removed daily completion limit';
  RAISE NOTICE '  ✓ Users can complete routines unlimited times';
  RAISE NOTICE '  ✓ Stats count UNIQUE members (not total completions)';
  RAISE NOTICE '  ✓ Popular = 50%+ unique members completed';
  RAISE NOTICE '  ✓ All existing stats refreshed';
  RAISE NOTICE '';
  RAISE NOTICE 'Display format:';
  RAISE NOTICE '  "5 of 12 members completed" ← unique members';
  RAISE NOTICE '  Not "completed 47 times" ← total completions';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
