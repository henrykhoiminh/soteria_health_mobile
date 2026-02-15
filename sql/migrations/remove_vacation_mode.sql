-- Migration: Remove Vacation Mode
-- Description: Drops all vacation-related columns, constraints, and functions from user_stats.
--              Also updates check_harmony_requirements to remove vacation decay logic.
-- Created: 2026-02-15

-- 1. Drop vacation-related functions
DROP FUNCTION IF EXISTS can_activate_vacation(UUID);
DROP FUNCTION IF EXISTS request_vacation_mode(UUID, INT);
DROP FUNCTION IF EXISTS check_and_activate_vacation(UUID);
DROP FUNCTION IF EXISTS deactivate_vacation_mode(UUID);
DROP FUNCTION IF EXISTS check_vacation_expiry(UUID);
DROP FUNCTION IF EXISTS award_vacation_day(UUID);
DROP FUNCTION IF EXISTS check_streak_vacation_reward(UUID);
DROP FUNCTION IF EXISTS cancel_vacation_request(UUID);

-- 2. Drop vacation constraint
ALTER TABLE user_stats DROP CONSTRAINT IF EXISTS user_stats_vacation_days_check;

-- 3. Drop vacation columns
ALTER TABLE user_stats DROP COLUMN IF EXISTS vacation_days_banked;
ALTER TABLE user_stats DROP COLUMN IF EXISTS vacation_mode_active;
ALTER TABLE user_stats DROP COLUMN IF EXISTS vacation_mode_start;
ALTER TABLE user_stats DROP COLUMN IF EXISTS vacation_mode_end;
ALTER TABLE user_stats DROP COLUMN IF EXISTS last_vacation_ended_at;
ALTER TABLE user_stats DROP COLUMN IF EXISTS vacation_requested_at;

-- 4. Update check_harmony_requirements to remove vacation decay logic
CREATE OR REPLACE FUNCTION check_harmony_requirements(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_mind_7d INT;
  v_body_7d INT;
  v_soul_7d INT;
  v_total INT;
  v_mind_last TIMESTAMPTZ;
  v_body_last TIMESTAMPTZ;
  v_soul_last TIMESTAMPTZ;
  v_decay_hours INT := 48;
BEGIN
  -- Get current stats
  SELECT
    mind_routines_7d, body_routines_7d, soul_routines_7d,
    mind_last_routine_at, body_last_routine_at, soul_last_routine_at
  INTO
    v_mind_7d, v_body_7d, v_soul_7d,
    v_mind_last, v_body_last, v_soul_last
  FROM user_stats
  WHERE user_id = p_user_id;

  -- If no stats found, not in harmony
  IF v_mind_7d IS NULL THEN
    RETURN FALSE;
  END IF;

  v_total := v_mind_7d + v_body_7d + v_soul_7d;

  -- Requirement 1: Minimum activity (7 routines in 7 days)
  IF v_total < 7 THEN
    RETURN FALSE;
  END IF;

  -- Requirement 2: Balance (all within 1 of each other)
  IF NOT check_balance(v_mind_7d, v_body_7d, v_soul_7d) THEN
    RETURN FALSE;
  END IF;

  -- Requirement 3: No dormant avatars (each category active within 48 hours)
  IF v_mind_last IS NULL OR v_mind_last < NOW() - (v_decay_hours || ' hours')::INTERVAL THEN
    RETURN FALSE;
  END IF;
  IF v_body_last IS NULL OR v_body_last < NOW() - (v_decay_hours || ' hours')::INTERVAL THEN
    RETURN FALSE;
  END IF;
  IF v_soul_last IS NULL OR v_soul_last < NOW() - (v_decay_hours || ' hours')::INTERVAL THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
