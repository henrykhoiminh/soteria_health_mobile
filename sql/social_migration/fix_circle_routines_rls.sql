-- =====================================================
-- Fix Circle Routines RLS - Remove Infinite Recursion
-- =====================================================
-- The circle_routines policies were causing infinite
-- recursion by querying circles, which queries back
-- =====================================================

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view circle routines" ON public.circle_routines;
DROP POLICY IF EXISTS "Users can delete routines they shared" ON public.circle_routines;
DROP POLICY IF EXISTS "Circle members can share routines" ON public.circle_routines;

-- Recreate SELECT policy WITHOUT referencing circles
CREATE POLICY "circle_routines_select"
  ON public.circle_routines
  FOR SELECT
  USING (
    -- User is a member of the circle (check circle_members directly)
    circle_id IN (
      SELECT circle_id FROM public.circle_members
      WHERE user_id = auth.uid()
    )
  );

-- Recreate INSERT policy using the function (which should be safe)
CREATE POLICY "circle_routines_insert"
  ON public.circle_routines
  FOR INSERT
  WITH CHECK (
    auth.uid() = shared_by
    AND circle_id IN (
      SELECT circle_id FROM public.circle_members
      WHERE user_id = auth.uid()
    )
  );

-- Recreate DELETE policy WITHOUT referencing circles
CREATE POLICY "circle_routines_delete"
  ON public.circle_routines
  FOR DELETE
  USING (
    auth.uid() = shared_by
    OR
    -- User is admin of the circle
    circle_id IN (
      SELECT circle_id FROM public.circle_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Success message
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ Fixed circle_routines policies!';
  RAISE NOTICE '✓ Removed circular references to circles';
  RAISE NOTICE '✓ Infinite recursion eliminated';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESTART YOUR APP NOW!';
END $$;
