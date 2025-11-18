-- ============================================================================
-- HEALTH TEAM INVITATIONS AND ENHANCED PERMISSIONS
-- ============================================================================
-- Adds:
-- 1. Health Team invitation system
-- 2. Enhanced permissions for health_team to edit ANY official routine
-- 3. Activity logging for health_team events
-- 4. Helper functions for invitations and stats
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Health Team Invitations Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS health_team_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  responded_at TIMESTAMPTZ,
  UNIQUE(invitee_id, inviter_id) -- Prevent duplicate invitations
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_health_team_invitations_invitee ON health_team_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_health_team_invitations_inviter ON health_team_invitations(inviter_id);
CREATE INDEX IF NOT EXISTS idx_health_team_invitations_status ON health_team_invitations(status);

-- Add comments
COMMENT ON TABLE health_team_invitations IS 'Stores invitations from health_team members to invite others to join the team';
COMMENT ON COLUMN health_team_invitations.status IS 'Invitation status: pending, accepted, or declined';

-- ============================================================================
-- STEP 2: RLS Policies for Health Team Invitations
-- ============================================================================

-- Enable RLS
ALTER TABLE health_team_invitations ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can see invitations they sent or received
CREATE POLICY "health_team_invitations_select_policy" ON health_team_invitations
  FOR SELECT TO authenticated
  USING (
    inviter_id = auth.uid()
    OR
    invitee_id = auth.uid()
  );

-- INSERT: Only health_team members can create invitations
CREATE POLICY "health_team_invitations_insert_policy" ON health_team_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Must be health_team or admin
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('health_team', 'admin')
    )
    AND
    -- inviter_id must match current user
    inviter_id = auth.uid()
    AND
    -- Cannot invite yourself
    invitee_id != auth.uid()
    AND
    -- Cannot invite someone who is already health_team
    NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE id = invitee_id
      AND role IN ('health_team', 'admin')
    )
  );

-- UPDATE: Only the invitee can update (to accept/decline)
CREATE POLICY "health_team_invitations_update_policy" ON health_team_invitations
  FOR UPDATE TO authenticated
  USING (invitee_id = auth.uid())
  WITH CHECK (
    invitee_id = auth.uid()
    AND
    -- Can only change from pending to accepted/declined
    status IN ('accepted', 'declined')
  );

-- DELETE: Inviter can delete pending invitations, admins can delete any
CREATE POLICY "health_team_invitations_delete_policy" ON health_team_invitations
  FOR DELETE TO authenticated
  USING (
    (inviter_id = auth.uid() AND status = 'pending')
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================================================
-- STEP 3: Update Routines RLS Policies for Enhanced Editing
-- ============================================================================

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "routines_update_policy" ON routines;

-- NEW UPDATE policy: Health team can update ANY official routine
CREATE POLICY "routines_update_policy" ON routines
  FOR UPDATE TO authenticated
  USING (
    -- Health Team/Admin can update ANY official routine (not just their own)
    (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('health_team', 'admin')
      )
      AND author_type = 'official'
    )
    OR
    -- Regular users can update their own community routines
    (
      author_type = 'community'
      AND created_by = auth.uid()
    )
  )
  WITH CHECK (
    -- Health Team/Admin can update ANY official routine
    (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('health_team', 'admin')
      )
      AND author_type = 'official'
      -- NOTE: created_by can remain different - health_team can edit others' routines
    )
    OR
    -- Regular users can update their own community routines
    (
      author_type = 'community'
      AND created_by = auth.uid()
    )
  );

-- ============================================================================
-- STEP 4: Enhanced Activity Logging
-- ============================================================================

-- Add new activity types for health_team events
-- The friend_activities table already exists, we just need to use new activity types:
-- 'joined_health_team' - When user joins health team
-- 'created_official_routine' - When health_team creates official routine
-- 'updated_official_routine' - When health_team edits official routine

-- Add comment to document new activity types
COMMENT ON TABLE friend_activities IS 'Logs user activities including routine completions, creations, milestones, social events, and health team events (joined_health_team, created_official_routine, updated_official_routine)';

-- ============================================================================
-- STEP 5: Helper Functions
-- ============================================================================

-- Function to send health_team invitation
CREATE OR REPLACE FUNCTION send_health_team_invitation(
  p_invitee_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_invitation_id UUID;
  v_inviter_id UUID;
BEGIN
  -- Get current user
  v_inviter_id := auth.uid();

  -- Verify inviter is health_team member
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = v_inviter_id
    AND role IN ('health_team', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only Health Team members can send invitations';
  END IF;

  -- Verify invitee is not already health_team
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_invitee_id
    AND role IN ('health_team', 'admin')
  ) THEN
    RAISE EXCEPTION 'User is already a Health Team member';
  END IF;

  -- Check for existing pending invitation
  IF EXISTS (
    SELECT 1 FROM health_team_invitations
    WHERE invitee_id = p_invitee_id
    AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'User already has a pending invitation';
  END IF;

  -- Create invitation
  INSERT INTO health_team_invitations (inviter_id, invitee_id, status)
  VALUES (v_inviter_id, p_invitee_id, 'pending')
  RETURNING id INTO v_invitation_id;

  RETURN v_invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION send_health_team_invitation TO authenticated;

-- Function to accept health_team invitation
CREATE OR REPLACE FUNCTION accept_health_team_invitation(
  p_invitation_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_inviter_id UUID;
  v_status TEXT;
BEGIN
  v_user_id := auth.uid();

  -- Get invitation details
  SELECT status, inviter_id INTO v_status, v_inviter_id
  FROM health_team_invitations
  WHERE id = p_invitation_id
  AND invitee_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'Invitation has already been responded to';
  END IF;

  -- Update invitation status
  UPDATE health_team_invitations
  SET status = 'accepted', responded_at = NOW()
  WHERE id = p_invitation_id;

  -- Promote user to health_team
  UPDATE profiles
  SET role = 'health_team'
  WHERE id = v_user_id;

  -- Log activity
  INSERT INTO friend_activities (user_id, activity_type, activity_data)
  VALUES (
    v_user_id,
    'joined_health_team',
    jsonb_build_object(
      'invited_by', v_inviter_id,
      'invitation_id', p_invitation_id
    )
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION accept_health_team_invitation TO authenticated;

-- Function to decline health_team invitation
CREATE OR REPLACE FUNCTION decline_health_team_invitation(
  p_invitation_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_status TEXT;
BEGIN
  v_user_id := auth.uid();

  -- Get invitation status
  SELECT status INTO v_status
  FROM health_team_invitations
  WHERE id = p_invitation_id
  AND invitee_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'Invitation has already been responded to';
  END IF;

  -- Update invitation status
  UPDATE health_team_invitations
  SET status = 'declined', responded_at = NOW()
  WHERE id = p_invitation_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION decline_health_team_invitation TO authenticated;

-- Function to get health_team stats for a user
CREATE OR REPLACE FUNCTION get_health_team_stats(
  p_user_id UUID
)
RETURNS TABLE (
  official_routines_created INTEGER,
  total_official_completions INTEGER,
  official_routines_saved INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Count of official routines created by this user
    (
      SELECT COUNT(*)::INTEGER
      FROM routines
      WHERE created_by = p_user_id
      AND author_type = 'official'
    ) as official_routines_created,

    -- Total completions of their official routines
    (
      SELECT COALESCE(SUM(r.completion_count), 0)::INTEGER
      FROM routines r
      WHERE r.created_by = p_user_id
      AND r.author_type = 'official'
    ) as total_official_completions,

    -- Total saves of their official routines
    (
      SELECT COALESCE(SUM(r.save_count), 0)::INTEGER
      FROM routines r
      WHERE r.created_by = p_user_id
      AND r.author_type = 'official'
    ) as official_routines_saved;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_health_team_stats TO authenticated;

-- Function to get pending health_team invitations for current user
CREATE OR REPLACE FUNCTION get_my_pending_health_team_invitations()
RETURNS TABLE (
  id UUID,
  inviter_id UUID,
  inviter_name TEXT,
  inviter_username TEXT,
  inviter_avatar TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    hti.id,
    hti.inviter_id,
    p.full_name as inviter_name,
    p.username as inviter_username,
    p.profile_picture_url as inviter_avatar,
    hti.created_at
  FROM health_team_invitations hti
  JOIN profiles p ON hti.inviter_id = p.id
  WHERE hti.invitee_id = auth.uid()
  AND hti.status = 'pending'
  ORDER BY hti.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_my_pending_health_team_invitations TO authenticated;

-- ============================================================================
-- STEP 6: Verification Queries
-- ============================================================================

-- Verify health_team_invitations table was created
SELECT
  table_name,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'health_team_invitations'
ORDER BY ordinal_position;

-- Verify RLS policies
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('health_team_invitations', 'routines')
ORDER BY tablename, policyname;

-- Verify functions were created
SELECT
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_name LIKE '%health_team%'
AND routine_schema = 'public'
ORDER BY routine_name;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Summary of Changes:
-- 1. ✅ Created health_team_invitations table with RLS
-- 2. ✅ Updated routines UPDATE policy (health_team can edit ANY official routine)
-- 3. ✅ Added helper functions for invitations
-- 4. ✅ Added get_health_team_stats() for profile stats
-- 5. ✅ Added get_my_pending_health_team_invitations() for UI
--
-- Next Steps:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Update TypeScript types to include HealthTeamInvitation interface
-- 3. Create UI components for invitations
-- 4. Add Health Team stats to Profile page
-- 5. Enable editing of official routines for health_team users
-- ============================================================================
