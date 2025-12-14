-- =====================================================
-- Narrative Onboarding Profile Fields
-- =====================================================
-- This migration adds fields required for the narrative onboarding flow:
-- - Avatar names (mind_name, body_name, soul_name)
-- - Onboarding completion tracking
-- - Username requirement enforcement

-- Step 1: Add avatar name columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS mind_name VARCHAR(12) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS body_name VARCHAR(12) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS soul_name VARCHAR(12) DEFAULT NULL;

-- Step 2: Add onboarding completion tracking
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ DEFAULT NULL;

-- Step 3: Add comments explaining the new fields
COMMENT ON COLUMN profiles.mind_name IS 'User-chosen name for their Mind avatar companion (max 12 characters)';
COMMENT ON COLUMN profiles.body_name IS 'User-chosen name for their Body avatar companion (max 12 characters)';
COMMENT ON COLUMN profiles.soul_name IS 'User-chosen name for their Soul avatar companion (max 12 characters)';
COMMENT ON COLUMN profiles.onboarding_completed IS 'Whether user has completed the narrative onboarding flow';
COMMENT ON COLUMN profiles.onboarding_completed_at IS 'Timestamp when user completed onboarding';

-- Step 4: Update existing users to mark onboarding as complete
-- (Users who already have journey_focus set have been through old onboarding)
UPDATE profiles
SET
  onboarding_completed = TRUE,
  onboarding_completed_at = COALESCE(journey_started_at, created_at)
WHERE journey_focus IS NOT NULL
  AND onboarding_completed IS NOT TRUE;

-- Step 5: Set default avatar names for existing users (they can change later)
UPDATE profiles
SET
  mind_name = 'Mind',
  body_name = 'Body',
  soul_name = 'Soul'
WHERE journey_focus IS NOT NULL
  AND mind_name IS NULL;

-- Step 6: Create index for onboarding status queries
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed
ON profiles(onboarding_completed)
WHERE onboarding_completed = FALSE;

-- =====================================================
-- Update Hard Reset Function
-- =====================================================
-- Update the hard reset function to clear avatar names and onboarding status

CREATE OR REPLACE FUNCTION hard_reset_user_data(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  progress_count integer;
  completions_count integer;
  saves_count integer;
  activity_count integer;
  pain_count integer;
  milestones_count integer;
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

  -- 6. Delete all user milestones
  DELETE FROM user_milestones WHERE user_id = target_user_id;
  GET DIAGNOSTICS milestones_count = ROW_COUNT;

  -- 7. Delete milestone progress
  DELETE FROM milestone_progress WHERE user_id = target_user_id;

  -- 8. Reset user stats to zero
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
    -- Reset harmony status
    is_in_harmony = FALSE,
    harmony_achieved_at = NULL,
    harmony_lost_at = NULL,
    mind_routines_7d = 0,
    body_routines_7d = 0,
    soul_routines_7d = 0,
    mind_last_routine_at = NULL,
    body_last_routine_at = NULL,
    soul_last_routine_at = NULL,
    updated_at = now()
  WHERE user_id = target_user_id;

  -- 9. Reset profile for re-onboarding
  -- Keep: first_name, last_name, username, email, profile_picture_url, role
  -- Clear: journey data, avatar names, onboarding status
  UPDATE profiles
  SET
    journey_focus = NULL,
    journey_started_at = NULL,
    recovery_areas = ARRAY[]::text[],
    recovery_goals = ARRAY[]::text[],
    fitness_level = NULL,
    injuries = ARRAY[]::text[],
    age = NULL,
    -- Clear avatar names for re-naming during reset onboarding
    mind_name = NULL,
    body_name = NULL,
    soul_name = NULL,
    -- Mark onboarding as incomplete to trigger reset flow
    onboarding_completed = FALSE,
    onboarding_completed_at = NULL,
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
      'pain_checkins', pain_count,
      'milestones', milestones_count
    )
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION hard_reset_user_data(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION hard_reset_user_data IS 'Completely resets all journey data for a user and marks them for re-onboarding. Keeps identity info (name, username, email).';
