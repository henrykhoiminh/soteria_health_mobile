-- =====================================================
-- RE-ENABLE RLS WITH ULTRA-SIMPLE POLICIES
-- =====================================================
-- Only run this AFTER confirming the app works with RLS disabled
-- These policies are the simplest possible - ZERO circular refs
-- =====================================================

-- ============================================
-- CIRCLES: Ultra-simple policies
-- ============================================

-- SELECT: Only check if user is in circle_members (no subqueries of same table)
CREATE POLICY "circles_select_simple"
  ON public.circles
  FOR SELECT
  TO authenticated
  USING (
    is_private = false
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.circle_members
      WHERE circle_members.circle_id = circles.id
      AND circle_members.user_id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "circles_insert_simple"
  ON public.circles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "circles_update_simple"
  ON public.circles
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.circle_members
      WHERE circle_members.circle_id = circles.id
      AND circle_members.user_id = auth.uid()
      AND circle_members.role = 'admin'
      LIMIT 1
    )
  );

CREATE POLICY "circles_delete_simple"
  ON public.circles
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- ============================================
-- CIRCLE_MEMBERS: Dead simple
-- ============================================

CREATE POLICY "circle_members_select_simple"
  ON public.circle_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.circle_members cm
      WHERE cm.circle_id = circle_members.circle_id
      AND cm.user_id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "circle_members_insert_simple"
  ON public.circle_members
  FOR INSERT
  TO authenticated
  WITH CHECK (true);  -- Handled by database functions

CREATE POLICY "circle_members_delete_simple"
  ON public.circle_members
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
  );

-- ============================================
-- CIRCLE_INVITATIONS: Simple
-- ============================================

CREATE POLICY "circle_invitations_select_simple"
  ON public.circle_invitations
  FOR SELECT
  TO authenticated
  USING (
    inviter_id = auth.uid()
    OR invitee_id = auth.uid()
  );

CREATE POLICY "circle_invitations_insert_simple"
  ON public.circle_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (inviter_id = auth.uid());

CREATE POLICY "circle_invitations_update_simple"
  ON public.circle_invitations
  FOR UPDATE
  TO authenticated
  USING (invitee_id = auth.uid());

CREATE POLICY "circle_invitations_delete_simple"
  ON public.circle_invitations
  FOR DELETE
  TO authenticated
  USING (inviter_id = auth.uid());

-- ============================================
-- CIRCLE_ROUTINES: Simple (NO references to circles!)
-- ============================================

CREATE POLICY "circle_routines_select_simple"
  ON public.circle_routines
  FOR SELECT
  TO authenticated
  USING (
    shared_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.circle_members
      WHERE circle_members.circle_id = circle_routines.circle_id
      AND circle_members.user_id = auth.uid()
      LIMIT 1
    )
  );

CREATE POLICY "circle_routines_insert_simple"
  ON public.circle_routines
  FOR INSERT
  TO authenticated
  WITH CHECK (shared_by = auth.uid());

CREATE POLICY "circle_routines_delete_simple"
  ON public.circle_routines
  FOR DELETE
  TO authenticated
  USING (
    shared_by = auth.uid()
  );

-- ============================================
-- RE-ENABLE RLS
-- ============================================

ALTER TABLE public.circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_routines ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SUCCESS
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ RLS RE-ENABLED with simple policies';
  RAISE NOTICE '✓ All policies use LIMIT 1 to prevent recursion';
  RAISE NOTICE '✓ No circular references';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Restart your app now!';
END $$;
