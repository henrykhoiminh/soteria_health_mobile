-- =====================================================
-- Fix Circle RLS to Allow Viewing Invited Circles
-- =====================================================
-- This migration updates the circles RLS policy to allow
-- users to view circles they've been invited to
-- =====================================================

-- Drop existing SELECT policy if it exists
DROP POLICY IF EXISTS "Users can view circles they are members of" ON public.circles;
DROP POLICY IF EXISTS "Users can view their circles" ON public.circles;

-- Create new SELECT policy that allows:
-- 1. Members to view their circles
-- 2. Users to view circles they've been invited to (for invitation cards)
-- 3. Everyone to view public circles
CREATE POLICY "Users can view circles they have access to"
  ON public.circles
  FOR SELECT
  USING (
    -- User is a member of the circle
    EXISTS (
      SELECT 1 FROM public.circle_members
      WHERE circle_id = circles.id
      AND user_id = auth.uid()
    )
    OR
    -- User has a pending invitation to the circle
    EXISTS (
      SELECT 1 FROM public.circle_invitations
      WHERE circle_id = circles.id
      AND invitee_id = auth.uid()
      AND status = 'pending'
    )
    OR
    -- Circle is public
    is_private = false
  );

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Successfully updated circles RLS policy';
  RAISE NOTICE 'Users can now view circles they are invited to';
END $$;
