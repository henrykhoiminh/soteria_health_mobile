-- =====================================================
-- Fix Circle Invitations - Remove Infinite Recursion
-- =====================================================
-- This migration removes the problematic RLS policy and
-- creates a SECURITY DEFINER function to fetch invitations
-- with circle data
-- =====================================================

-- First, revert the problematic RLS policy
DROP POLICY IF EXISTS "Users can view circles they have access to" ON public.circles;

-- Restore the original simple policy
CREATE POLICY "Users can view circles they are members of"
  ON public.circles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.circle_members
      WHERE circle_id = circles.id
      AND user_id = auth.uid()
    )
    OR is_private = false
  );

-- Create a SECURITY DEFINER function to get pending invitations with circle data
-- This function bypasses RLS to get the circle information
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_pending_circle_invitations_with_details TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_pending_circle_invitations_with_details IS 'Gets pending circle invitations with full circle details, bypassing RLS';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Successfully fixed infinite recursion issue';
  RAISE NOTICE 'Created get_pending_circle_invitations_with_details function';
END $$;
