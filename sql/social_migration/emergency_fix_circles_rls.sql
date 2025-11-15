-- =====================================================
-- EMERGENCY FIX: Remove ALL Circle RLS Policies
-- =====================================================
-- This will completely reset the RLS policies on circles
-- to fix the infinite recursion issue
-- =====================================================

-- Drop ALL existing policies on circles table
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'circles' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.circles';
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- Create a simple, safe policy that does NOT reference circle_invitations
CREATE POLICY "circles_select_policy"
  ON public.circles
  FOR SELECT
  USING (
    -- User is a member of the circle
    EXISTS (
      SELECT 1 FROM public.circle_members
      WHERE circle_members.circle_id = circles.id
      AND circle_members.user_id = auth.uid()
    )
    OR
    -- Circle is public
    circles.is_private = false
  );

-- Recreate other necessary policies (INSERT, UPDATE, DELETE)
CREATE POLICY "circles_insert_policy"
  ON public.circles
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "circles_update_policy"
  ON public.circles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.circle_members
      WHERE circle_members.circle_id = circles.id
      AND circle_members.user_id = auth.uid()
      AND circle_members.role = 'admin'
    )
  );

CREATE POLICY "circles_delete_policy"
  ON public.circles
  FOR DELETE
  USING (created_by = auth.uid());

-- Verify policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'circles'
ORDER BY policyname;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Successfully reset ALL circle RLS policies';
  RAISE NOTICE 'Circle invitations will now use the SECURITY DEFINER function';
  RAISE NOTICE '========================================';
END $$;
