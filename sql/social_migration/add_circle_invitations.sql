-- =====================================================
-- Add Circle Invitations System
-- =====================================================
-- This migration adds a proper invitation system for private circles
-- Users must accept invitations before joining
-- =====================================================

-- Create circle_invitations table
CREATE TABLE IF NOT EXISTS public.circle_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,

  -- Prevent duplicate invitations
  CONSTRAINT unique_circle_invitation UNIQUE (circle_id, invitee_id, status)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_circle_invitations_invitee ON public.circle_invitations(invitee_id, status);
CREATE INDEX IF NOT EXISTS idx_circle_invitations_circle ON public.circle_invitations(circle_id, status);
CREATE INDEX IF NOT EXISTS idx_circle_invitations_created ON public.circle_invitations(created_at DESC);

-- Add comment
COMMENT ON TABLE public.circle_invitations IS 'Pending circle invitations that users can accept or decline';

-- Enable RLS
ALTER TABLE public.circle_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view invitations they sent or received
CREATE POLICY "Users can view their circle invitations"
  ON public.circle_invitations
  FOR SELECT
  USING (
    auth.uid() = inviter_id
    OR auth.uid() = invitee_id
  );

-- Users can create invitations if they're a circle admin
CREATE POLICY "Circle admins can send invitations"
  ON public.circle_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.circle_members
      WHERE circle_id = circle_invitations.circle_id
      AND user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Users can update their own received invitations (to accept/decline)
CREATE POLICY "Users can respond to their invitations"
  ON public.circle_invitations
  FOR UPDATE
  USING (auth.uid() = invitee_id)
  WITH CHECK (auth.uid() = invitee_id);

-- Users can delete invitations they sent
CREATE POLICY "Users can delete invitations they sent"
  ON public.circle_invitations
  FOR DELETE
  USING (auth.uid() = inviter_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.circle_invitations TO authenticated;

-- Function to accept circle invitation
CREATE OR REPLACE FUNCTION public.accept_circle_invitation(p_invitation_id UUID)
RETURNS UUID AS $$
DECLARE
  v_invitation RECORD;
  v_member_id UUID;
BEGIN
  -- Get invitation details
  SELECT * INTO v_invitation
  FROM public.circle_invitations
  WHERE id = p_invitation_id
  AND invitee_id = auth.uid()
  AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or already responded to';
  END IF;

  -- Add user to circle
  INSERT INTO public.circle_members (circle_id, user_id, role)
  VALUES (v_invitation.circle_id, v_invitation.invitee_id, 'member')
  ON CONFLICT (circle_id, user_id) DO NOTHING
  RETURNING id INTO v_member_id;

  -- Update invitation status
  UPDATE public.circle_invitations
  SET status = 'accepted', responded_at = NOW()
  WHERE id = p_invitation_id;

  RETURN v_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.accept_circle_invitation TO authenticated;

-- Function to decline circle invitation
CREATE OR REPLACE FUNCTION public.decline_circle_invitation(p_invitation_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.circle_invitations
  SET status = 'declined', responded_at = NOW()
  WHERE id = p_invitation_id
  AND invitee_id = auth.uid()
  AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or already responded to';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.decline_circle_invitation TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Successfully created circle_invitations table and functions';
  RAISE NOTICE 'Users can now send, accept, and decline circle invitations';
END $$;
