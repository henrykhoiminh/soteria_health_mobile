-- =====================================================
-- Fix Circle Invitation Unique Constraint
-- =====================================================
-- This migration fixes the unique constraint to allow
-- invitation history while preventing duplicate pending
-- invitations
-- =====================================================

-- Drop the old constraint that includes status
ALTER TABLE public.circle_invitations
DROP CONSTRAINT IF EXISTS unique_circle_invitation;

-- Create a partial unique index that only applies to pending invitations
-- This allows multiple declined/accepted invitations over time while
-- preventing multiple pending invitations
CREATE UNIQUE INDEX IF NOT EXISTS unique_pending_circle_invitation
ON public.circle_invitations (circle_id, invitee_id)
WHERE status = 'pending';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Successfully updated circle invitation constraints';
  RAISE NOTICE 'Users can now have invitation history while preventing duplicate pending invites';
END $$;
 