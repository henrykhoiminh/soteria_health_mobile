-- ============================================================================
-- ADD LEAVE HEALTH TEAM FUNCTIONALITY
-- ============================================================================
-- Allows health_team members to demote themselves back to regular users
-- Also allows admins to demote health_team members
-- ============================================================================

-- Function to leave health team (demote to regular user)
CREATE OR REPLACE FUNCTION leave_health_team(
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_user_id UUID;
  v_target_user_id UUID;
  v_current_role TEXT;
  v_target_role TEXT;
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();

  -- If no user_id provided, user is leaving themselves
  v_target_user_id := COALESCE(p_user_id, v_current_user_id);

  -- Get current user's role
  SELECT role INTO v_current_role
  FROM profiles
  WHERE id = v_current_user_id;

  -- Get target user's role
  SELECT role INTO v_target_role
  FROM profiles
  WHERE id = v_target_user_id;

  -- Validation: Can't demote yourself if you're the only admin
  IF v_target_role = 'admin' AND v_target_user_id = v_current_user_id THEN
    IF (SELECT COUNT(*) FROM profiles WHERE role = 'admin') <= 1 THEN
      RAISE EXCEPTION 'Cannot leave health team: You are the only admin';
    END IF;
  END IF;

  -- Authorization check
  IF v_target_user_id != v_current_user_id AND v_current_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can demote other users';
  END IF;

  -- Can only demote health_team or admin users
  IF v_target_role NOT IN ('health_team', 'admin') THEN
    RAISE EXCEPTION 'User is not a health team member';
  END IF;

  -- Demote to regular user
  UPDATE profiles
  SET role = 'user'
  WHERE id = v_target_user_id;

  -- Log activity
  INSERT INTO friend_activity (user_id, activity_type, activity_data)
  VALUES (
    v_target_user_id,
    'left_health_team',
    jsonb_build_object(
      'demoted_by', v_current_user_id,
      'previous_role', v_target_role
    )
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION leave_health_team TO authenticated;

-- ============================================================================
-- Update activity type constraint to include left_health_team
-- ============================================================================

ALTER TABLE public.friend_activity
DROP CONSTRAINT IF EXISTS friend_activity_activity_type_check;

ALTER TABLE public.friend_activity
ADD CONSTRAINT friend_activity_activity_type_check
CHECK (activity_type IN (
  -- Existing activity types
  'completed_routine',
  'completed_circle_routine',
  'created_routine',
  'added_routine_to_circle',
  'joined_circle',
  'invited_to_circle',
  'left_circle',
  'shared_routine',
  'removed_from_circle',
  'member_joined',
  'joined_soteria',
  'streak_milestone',
  -- Health Team activity types
  'joined_health_team',
  'created_official_routine',
  'updated_official_routine',
  'left_health_team'
));

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test the function exists
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'leave_health_team'
AND routine_schema = 'public';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
