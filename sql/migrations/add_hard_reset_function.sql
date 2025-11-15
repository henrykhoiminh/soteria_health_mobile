-- =====================================================
-- Hard Reset Function
-- =====================================================
-- This function bypasses RLS to completely reset a user's journey data
-- Must be run with SECURITY DEFINER to have elevated privileges

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS hard_reset_user_data(uuid);

-- Create the hard reset function
CREATE OR REPLACE FUNCTION hard_reset_user_data(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges to bypass RLS
SET search_path = public
AS $$
DECLARE
  progress_count integer;
  completions_count integer;
  saves_count integer;
  activity_count integer;
  pain_count integer;
BEGIN
  -- 1. Delete all daily progress records
  DELETE FROM daily_progress WHERE user_id = target_user_id;
  GET DIAGNOSTICS progress_count = ROW_COUNT;

  -- 2. Delete all routine completions
  DELETE FROM routine_completions WHERE user_id = target_user_id;
  GET DIAGNOSTICS completions_count = ROW_COUNT;

  -- 3. Delete all routine saves
  DELETE FROM routine_saves WHERE user_id = target_user_id;
  GET DIAGNOSTICS saves_count = ROW_COUNT;

  -- 4. Delete all friend activity
  DELETE FROM friend_activity WHERE user_id = target_user_id;
  GET DIAGNOSTICS activity_count = ROW_COUNT;

  -- 5. Delete all pain check-ins
  DELETE FROM pain_checkins WHERE user_id = target_user_id;
  GET DIAGNOSTICS pain_count = ROW_COUNT;

  -- 6. Reset user stats to zero
  UPDATE user_stats
  SET
    current_streak = 0,
    longest_streak = 0,
    health_score = 0,
    total_routines = 0,
    mind_routines = 0,
    body_routines = 0,
    soul_routines = 0,
    last_activity_date = NULL,
    mind_current_streak = 0,
    body_current_streak = 0,
    soul_current_streak = 0,
    mind_longest_streak = 0,
    body_longest_streak = 0,
    soul_longest_streak = 0,
    unique_mind_routines = 0,
    unique_body_routines = 0,
    unique_soul_routines = 0,
    last_mind_activity = NULL,
    last_body_activity = NULL,
    last_soul_activity = NULL,
    harmony_score = 0,
    updated_at = now()
  WHERE user_id = target_user_id;

  -- 7. Reset profile journey data
  UPDATE profiles
  SET
    journey_focus = NULL,
    journey_started_at = NULL,
    recovery_areas = ARRAY[]::text[],
    recovery_goals = ARRAY[]::text[],
    fitness_level = NULL,
    injuries = ARRAY[]::text[],
    age = NULL,
    updated_at = now()
  WHERE id = target_user_id;

  -- Return summary of what was deleted
  RETURN jsonb_build_object(
    'success', true,
    'deleted', jsonb_build_object(
      'daily_progress', progress_count,
      'routine_completions', completions_count,
      'routine_saves', saves_count,
      'friend_activity', activity_count,
      'pain_checkins', pain_count
    )
  );
END;
$$;

-- Grant execute permission to authenticated users (they can only reset their own data)
GRANT EXECUTE ON FUNCTION hard_reset_user_data(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION hard_reset_user_data IS 'Completely resets all journey data for a user, bypassing RLS policies. Used for Journey Reset feature.';
