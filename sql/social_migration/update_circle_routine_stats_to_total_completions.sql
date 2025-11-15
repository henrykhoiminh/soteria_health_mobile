-- =====================================================
-- UPDATE: Circle Routine Stats to Total Completions
-- =====================================================
-- Changes from unique user counts to total completion counts
-- Popular badge: total completions > (member_count * 5)
-- =====================================================

-- =====================================================
-- STEP 1: Update stats function to count total completions
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_circle_routine_stats(
  p_circle_id UUID,
  p_routine_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_total_completions INTEGER;
  v_member_count INTEGER;
  v_is_popular BOOLEAN;
BEGIN
  -- Count TOTAL completions (not unique users)
  SELECT COUNT(*) INTO v_total_completions
  FROM public.circle_routine_completions
  WHERE circle_id = p_circle_id
  AND routine_id = p_routine_id;

  -- Count total members in circle
  SELECT COUNT(*) INTO v_member_count
  FROM public.circle_members
  WHERE circle_id = p_circle_id;

  -- Mark as popular if total completions > (member_count * 5)
  -- Example: 10 members → popular after 51+ completions
  v_is_popular := v_total_completions > (v_member_count * 3);

  -- Update the circle_routines record
  -- completion_count now stores TOTAL completions (not unique users)
  UPDATE public.circle_routines
  SET
    completion_count = v_total_completions,
    is_popular = v_is_popular
  WHERE circle_id = p_circle_id
  AND routine_id = p_routine_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

RAISE NOTICE '✓ Updated stats function to use total completions instead of unique users';

-- =====================================================
-- STEP 2: Update the stats view
-- =====================================================

DROP VIEW IF EXISTS public.circle_routine_stats;

CREATE VIEW public.circle_routine_stats AS
SELECT
  cr.id AS circle_routine_id,
  cr.circle_id,
  cr.routine_id,
  cr.shared_by,
  cr.shared_at,
  cr.completion_count,
  cr.is_popular,
  c.name AS circle_name,
  r.name AS routine_name,
  r.description AS routine_description,
  r.category,
  r.duration_minutes,
  r.difficulty,
  (SELECT COUNT(*) FROM public.circle_members WHERE circle_id = cr.circle_id) AS total_members
FROM public.circle_routines cr
JOIN public.circles c ON c.id = cr.circle_id
JOIN public.routines r ON r.id = cr.routine_id;

RAISE NOTICE '✓ Updated stats view to reflect total completions';

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

  RAISE NOTICE '✓ All stats refreshed with new logic';
END $$;

-- =====================================================
-- STEP 4: Update comments for clarity
-- =====================================================

COMMENT ON COLUMN public.circle_routines.completion_count IS
'Total number of completions for this routine in this circle (all members, all times)';

COMMENT ON COLUMN public.circle_routines.is_popular IS
'Popular if total completions > (member_count × 3). Rewards frequently completed routines.';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓✓✓ STATS UPDATE COMPLETE! ✓✓✓';
  RAISE NOTICE '';
  RAISE NOTICE 'What changed:';
  RAISE NOTICE '  ✓ completion_count = total completions (not unique users)';
  RAISE NOTICE '  ✓ Popular = total completions > (members × 5)';
  RAISE NOTICE '  ✓ Rewards routines done frequently';
  RAISE NOTICE '  ✓ All existing stats refreshed';
  RAISE NOTICE '';
  RAISE NOTICE 'Example:';
  RAISE NOTICE '  Circle with 10 members:';
  RAISE NOTICE '  → Popular after 51+ total completions';
  RAISE NOTICE '  → Could be 6 members doing it 9 times each';
  RAISE NOTICE '  → Or any combination totaling 51+';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
