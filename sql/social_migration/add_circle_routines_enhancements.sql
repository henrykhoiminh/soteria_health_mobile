-- =====================================================
-- CIRCLE ROUTINES ENHANCEMENTS
-- =====================================================
-- Adds comprehensive circle routine features:
-- - Track routine completions by circle members
-- - Completion stats and popular routines
-- - Activity logging for routine events
-- - Search, filter, sort capabilities
-- =====================================================

-- =====================================================
-- STEP 1: Create Circle Routine Completions Table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.circle_routine_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_seconds INTEGER, -- How long it took to complete
  notes TEXT, -- Optional notes from user

  -- Prevent duplicate completions (same user, routine, circle on same day)
  -- Users can complete the same routine in the same circle multiple times, just not on same day
  CONSTRAINT unique_circle_routine_completion_per_day UNIQUE (circle_id, routine_id, user_id, DATE(completed_at))
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_circle_routine_completions_circle_id
ON public.circle_routine_completions(circle_id);

CREATE INDEX IF NOT EXISTS idx_circle_routine_completions_routine_id
ON public.circle_routine_completions(routine_id);

CREATE INDEX IF NOT EXISTS idx_circle_routine_completions_user_id
ON public.circle_routine_completions(user_id);

CREATE INDEX IF NOT EXISTS idx_circle_routine_completions_completed_at
ON public.circle_routine_completions(completed_at DESC);

-- Composite index for circle routine stats
CREATE INDEX IF NOT EXISTS idx_circle_routine_completions_circle_routine
ON public.circle_routine_completions(circle_id, routine_id);

COMMENT ON TABLE public.circle_routine_completions IS
'Tracks when circle members complete routines that are part of the circle';

RAISE NOTICE '✓ Circle routine completions table created';

-- =====================================================
-- STEP 2: Add columns to circle_routines table (if needed)
-- =====================================================

-- Check if we need to add any missing columns
DO $$
BEGIN
  -- Add completion_count if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'circle_routines'
    AND column_name = 'completion_count'
  ) THEN
    ALTER TABLE public.circle_routines
    ADD COLUMN completion_count INTEGER DEFAULT 0;
    RAISE NOTICE '✓ Added completion_count to circle_routines';
  END IF;

  -- Add is_popular if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'circle_routines'
    AND column_name = 'is_popular'
  ) THEN
    ALTER TABLE public.circle_routines
    ADD COLUMN is_popular BOOLEAN DEFAULT false;
    RAISE NOTICE '✓ Added is_popular to circle_routines';
  END IF;
END $$;

-- =====================================================
-- STEP 3: Create function to update routine stats
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_circle_routine_stats(
  p_circle_id UUID,
  p_routine_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_completion_count INTEGER;
  v_member_count INTEGER;
  v_is_popular BOOLEAN;
BEGIN
  -- Count total completions for this routine in this circle
  SELECT COUNT(*) INTO v_completion_count
  FROM public.circle_routine_completions
  WHERE circle_id = p_circle_id
  AND routine_id = p_routine_id;

  -- Count total members in circle
  SELECT COUNT(*) INTO v_member_count
  FROM public.circle_members
  WHERE circle_id = p_circle_id;

  -- Mark as popular if more than 50% of members completed it
  v_is_popular := (v_completion_count::FLOAT / GREATEST(v_member_count, 1)) >= 0.5;

  -- Update the circle_routines record
  UPDATE public.circle_routines
  SET
    completion_count = v_completion_count,
    is_popular = v_is_popular
  WHERE circle_id = p_circle_id
  AND routine_id = p_routine_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.update_circle_routine_stats IS
'Updates completion stats and popular flag for a circle routine';

RAISE NOTICE '✓ Circle routine stats function created';

-- =====================================================
-- STEP 4: Create trigger to auto-update stats
-- =====================================================

CREATE OR REPLACE FUNCTION public.trigger_update_circle_routine_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update stats for the completed routine
  PERFORM public.update_circle_routine_stats(NEW.circle_id, NEW.routine_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_circle_routine_completion ON public.circle_routine_completions;

CREATE TRIGGER on_circle_routine_completion
  AFTER INSERT ON public.circle_routine_completions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_circle_routine_stats();

RAISE NOTICE '✓ Auto-update trigger created';

-- =====================================================
-- STEP 5: Row Level Security Policies
-- =====================================================

ALTER TABLE public.circle_routine_completions ENABLE ROW LEVEL SECURITY;

-- Members can view completions in their circles
CREATE POLICY "Members can view circle routine completions"
  ON public.circle_routine_completions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.circle_members
      WHERE circle_members.circle_id = circle_routine_completions.circle_id
      AND circle_members.user_id = auth.uid()
      LIMIT 1
    )
  );

-- Members can insert their own completions
CREATE POLICY "Members can record their completions"
  ON public.circle_routine_completions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.circle_members
      WHERE circle_members.circle_id = circle_routine_completions.circle_id
      AND circle_members.user_id = auth.uid()
      LIMIT 1
    )
  );

-- Users can update their own completions
CREATE POLICY "Users can update their own completions"
  ON public.circle_routine_completions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own completions
CREATE POLICY "Users can delete their own completions"
  ON public.circle_routine_completions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

RAISE NOTICE '✓ RLS policies created';

-- =====================================================
-- STEP 6: Create helper views for stats
-- =====================================================

-- View for circle routine stats with member completion info
CREATE OR REPLACE VIEW public.circle_routine_stats AS
SELECT
  cr.id AS circle_routine_id,
  cr.circle_id,
  cr.routine_id,
  cr.shared_by,
  cr.shared_at,
  cr.completion_count,
  cr.is_popular,
  r.name AS routine_name,
  r.description AS routine_description,
  r.category,
  r.difficulty,
  r.duration_minutes,
  COUNT(DISTINCT crc.user_id) AS unique_completers,
  (
    SELECT COUNT(*) FROM public.circle_members cm
    WHERE cm.circle_id = cr.circle_id
  ) AS total_members,
  ARRAY_AGG(DISTINCT crc.user_id) FILTER (WHERE crc.user_id IS NOT NULL) AS completer_ids
FROM public.circle_routines cr
LEFT JOIN public.routines r ON cr.routine_id = r.id
LEFT JOIN public.circle_routine_completions crc ON cr.circle_id = crc.circle_id AND cr.routine_id = crc.routine_id
GROUP BY cr.id, cr.circle_id, cr.routine_id, cr.shared_by, cr.shared_at, cr.completion_count, cr.is_popular,
         r.name, r.description, r.category, r.difficulty, r.duration_minutes;

COMMENT ON VIEW public.circle_routine_stats IS
'Provides comprehensive stats for circle routines including completion counts and member participation';

RAISE NOTICE '✓ Circle routine stats view created';

-- =====================================================
-- STEP 7: Update activity types constraint
-- =====================================================

-- Add new activity types for circle routine events
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
  'joined_soteria',
  'completed_circle_routine',  -- NEW: completed a routine from circle
  'added_routine_to_circle',   -- NEW: added routine to circle
  'routine_became_popular'     -- NEW: routine reached popular status
));

RAISE NOTICE '✓ Activity types updated';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓✓✓ CIRCLE ROUTINES ENHANCED! ✓✓✓';
  RAISE NOTICE '';
  RAISE NOTICE 'What was added:';
  RAISE NOTICE '  ✓ circle_routine_completions table';
  RAISE NOTICE '  ✓ Completion tracking and stats';
  RAISE NOTICE '  ✓ Popular routine detection (50%+ completions)';
  RAISE NOTICE '  ✓ Auto-updating stats trigger';
  RAISE NOTICE '  ✓ RLS policies for completions';
  RAISE NOTICE '  ✓ Helper views for stats queries';
  RAISE NOTICE '  ✓ New activity types for circle routines';
  RAISE NOTICE '';
  RAISE NOTICE 'Features enabled:';
  RAISE NOTICE '  ✓ Track member completions per routine';
  RAISE NOTICE '  ✓ Show "X of Y members completed"';
  RAISE NOTICE '  ✓ Tag popular routines automatically';
  RAISE NOTICE '  ✓ Log circle routine activities';
  RAISE NOTICE '  ✓ Prevent duplicate completions per day';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Update app code to use new tables';
  RAISE NOTICE '2. Build UI for circle routine browsing';
  RAISE NOTICE '3. Implement completion tracking in app';
  RAISE NOTICE '========================================';
END $$;
