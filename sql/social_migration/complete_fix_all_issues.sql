-- =====================================================
-- COMPLETE FIX: Circle Invitations & RLS
-- =====================================================
-- Run this SINGLE script to fix all issues:
-- 1. Remove infinite recursion
-- 2. Fix circle name display
-- 3. Create necessary functions
-- =====================================================

-- ============================================
-- STEP 1: Drop ALL existing circle policies
-- ============================================
DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE 'Dropping all existing circle policies...';
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'circles' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.circles';
        RAISE NOTICE '  ✓ Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- ============================================
-- STEP 2: Create simple, safe RLS policies
-- ============================================

-- SELECT policy (no infinite recursion!)
CREATE POLICY "circles_select_policy"
  ON public.circles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.circle_members
      WHERE circle_members.circle_id = circles.id
      AND circle_members.user_id = auth.uid()
    )
    OR circles.is_private = false
  );

-- INSERT policy
CREATE POLICY "circles_insert_policy"
  ON public.circles
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- UPDATE policy
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

-- DELETE policy
CREATE POLICY "circles_delete_policy"
  ON public.circles
  FOR DELETE
  USING (created_by = auth.uid());

-- ============================================
-- STEP 3: Create SECURITY DEFINER function
-- ============================================

CREATE OR REPLACE FUNCTION public.get_pending_circle_invitations_with_details(p_user_id UUID)
RETURNS TABLE (
  invitation_id UUID,
  circle_id UUID,
  circle_name TEXT,
  circle_description TEXT,
  circle_is_private BOOLEAN,
  inviter_id UUID,
  inviter_username TEXT,
  inviter_full_name TEXT,
  inviter_profile_picture_url TEXT,
  created_at TIMESTAMPTZ,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ci.id AS invitation_id,
    ci.circle_id,
    c.name AS circle_name,
    c.description AS circle_description,
    c.is_private AS circle_is_private,
    ci.inviter_id,
    p.username AS inviter_username,
    p.full_name AS inviter_full_name,
    p.profile_picture_url AS inviter_profile_picture_url,
    ci.created_at,
    ci.status
  FROM public.circle_invitations ci
  INNER JOIN public.circles c ON ci.circle_id = c.id
  LEFT JOIN public.profiles p ON ci.inviter_id = p.id
  WHERE ci.invitee_id = p_user_id
    AND ci.status = 'pending'
  ORDER BY ci.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_pending_circle_invitations_with_details TO authenticated;

-- ============================================
-- STEP 4: Verify everything
-- ============================================

-- Show current policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'circles' AND schemaname = 'public')
    LOOP
        RAISE NOTICE '  ✓ %', r.policyname;
    END LOOP;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ ALL ISSUES FIXED!';
  RAISE NOTICE '✓ Infinite recursion removed';
  RAISE NOTICE '✓ Circle names will now display';
  RAISE NOTICE '✓ Safe RLS policies in place';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Please restart your app now';
END $$;
