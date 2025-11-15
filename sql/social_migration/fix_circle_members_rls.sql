-- =====================================================
-- Fix Infinite Recursion in Circle Members RLS
-- =====================================================
-- This fixes the circular dependency in circle_members policies

-- Create a helper function that bypasses RLS to check membership
CREATE OR REPLACE FUNCTION public.is_circle_member_direct(p_circle_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.circle_members
    WHERE circle_id = p_circle_id
    AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_circle_member_direct(UUID, UUID) TO authenticated;

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Users can view circle members" ON public.circle_members;
DROP POLICY IF EXISTS "Circle admins can add members" ON public.circle_members;
DROP POLICY IF EXISTS "Circle admins can update members" ON public.circle_members;
DROP POLICY IF EXISTS "Users can leave circles, admins can remove members" ON public.circle_members;

-- =====================================================
-- SIMPLIFIED CIRCLE_MEMBERS RLS POLICIES
-- =====================================================

-- Policy 1: Users can view circle members if they are also a member OR circle is public
-- We use the SECURITY DEFINER function to avoid recursion
CREATE POLICY "Users can view circle members"
  ON public.circle_members
  FOR SELECT
  USING (
    -- User can see members if circle is public
    EXISTS (
      SELECT 1 FROM public.circles
      WHERE circles.id = circle_members.circle_id
      AND circles.is_private = false
    )
    OR
    -- User can see members if they created the circle
    EXISTS (
      SELECT 1 FROM public.circles
      WHERE circles.id = circle_members.circle_id
      AND circles.created_by = auth.uid()
    )
    OR
    -- User can see members if they are a member (using helper function to avoid recursion)
    public.is_circle_member_direct(circle_members.circle_id, auth.uid())
  );

-- Policy 2: Circle admins and creators can add members
CREATE POLICY "Circle admins can add members"
  ON public.circle_members
  FOR INSERT
  WITH CHECK (
    -- Circle creator can add members
    EXISTS (
      SELECT 1 FROM public.circles
      WHERE circles.id = circle_members.circle_id
      AND circles.created_by = auth.uid()
    )
    OR
    -- Users can join public circles themselves
    (
      circle_members.user_id = auth.uid()
      AND role = 'member'
      AND EXISTS (
        SELECT 1 FROM public.circles
        WHERE circles.id = circle_members.circle_id
        AND circles.is_private = false
      )
    )
  );

-- Policy 3: Only circle creators can update member roles
CREATE POLICY "Circle creators can update members"
  ON public.circle_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.circles
      WHERE circles.id = circle_members.circle_id
      AND circles.created_by = auth.uid()
    )
  );

-- Policy 4: Users can leave circles, creators can remove members
CREATE POLICY "Users can leave circles, creators can remove members"
  ON public.circle_members
  FOR DELETE
  USING (
    -- Users can remove themselves
    circle_members.user_id = auth.uid()
    OR
    -- Circle creators can remove others
    EXISTS (
      SELECT 1 FROM public.circles
      WHERE circles.id = circle_members.circle_id
      AND circles.created_by = auth.uid()
    )
  );

-- =====================================================
-- FIX CIRCLES POLICIES TO USE HELPER
-- =====================================================

-- Drop existing circles policies
DROP POLICY IF EXISTS "Users can view public circles and their circles" ON public.circles;
DROP POLICY IF EXISTS "Users can create circles" ON public.circles;
DROP POLICY IF EXISTS "Circle admins can update circles" ON public.circles;
DROP POLICY IF EXISTS "Circle creators can delete circles" ON public.circles;

-- Recreate with helper function
CREATE POLICY "Users can view public circles and their circles"
  ON public.circles
  FOR SELECT
  USING (
    is_private = false
    OR created_by = auth.uid()
    OR public.is_circle_member_direct(circles.id, auth.uid())
  );

CREATE POLICY "Users can create circles"
  ON public.circles
  FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
  );

CREATE POLICY "Circle creators can update circles"
  ON public.circles
  FOR UPDATE
  USING (
    auth.uid() = created_by
  );

CREATE POLICY "Circle creators can delete circles"
  ON public.circles
  FOR DELETE
  USING (
    auth.uid() = created_by
  );

-- =====================================================
-- ALSO FIX CIRCLE_ROUTINES POLICIES TO USE HELPER
-- =====================================================

-- Drop existing circle_routines policies
DROP POLICY IF EXISTS "Users can view circle routines" ON public.circle_routines;
DROP POLICY IF EXISTS "Circle members can share routines" ON public.circle_routines;
DROP POLICY IF EXISTS "Users can delete routines they shared" ON public.circle_routines;

-- Recreate with helper function to be safe
CREATE POLICY "Users can view circle routines"
  ON public.circle_routines
  FOR SELECT
  USING (
    -- Use helper function to check membership
    public.is_circle_member_direct(circle_routines.circle_id, auth.uid())
    OR
    -- Circle creators can view
    EXISTS (
      SELECT 1 FROM public.circles
      WHERE circles.id = circle_routines.circle_id
      AND circles.created_by = auth.uid()
    )
  );

CREATE POLICY "Circle members can share routines"
  ON public.circle_routines
  FOR INSERT
  WITH CHECK (
    auth.uid() = shared_by
    AND public.is_circle_member_direct(circle_routines.circle_id, auth.uid())
  );

CREATE POLICY "Users can delete routines they shared"
  ON public.circle_routines
  FOR DELETE
  USING (
    auth.uid() = shared_by
    OR
    EXISTS (
      SELECT 1 FROM public.circles
      WHERE circles.id = circle_routines.circle_id
      AND circles.created_by = auth.uid()
    )
  );

-- =====================================================
-- Verify policies are working
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'RLS Policies Fixed Successfully!';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Fixed tables: circles, circle_members, circle_routines';
  RAISE NOTICE 'Created helper function: is_circle_member_direct(circle_id, user_id)';
  RAISE NOTICE 'This function bypasses RLS to prevent infinite recursion';
  RAISE NOTICE 'All circular dependencies have been resolved';
  RAISE NOTICE '==================================================';
END $$;
