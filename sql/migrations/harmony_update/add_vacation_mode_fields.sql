-- Migration: Add Vacation Mode Fields
-- Description: Adds fields to user_stats for vacation mode tracking
-- Created: 2025-12-06

-- Add vacation mode tracking fields
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS vacation_days_banked INT DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS vacation_mode_active BOOLEAN DEFAULT FALSE;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS vacation_mode_start TIMESTAMPTZ;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS vacation_mode_end TIMESTAMPTZ;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS last_vacation_ended_at TIMESTAMPTZ;

-- Track when vacation was requested (for 24-hour activation delay)
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS vacation_requested_at TIMESTAMPTZ;

-- Add constraint for vacation days (max 14)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_stats_vacation_days_check'
  ) THEN
    ALTER TABLE user_stats ADD CONSTRAINT user_stats_vacation_days_check
      CHECK (vacation_days_banked >= 0 AND vacation_days_banked <= 14);
  END IF;
END $$;

-- Function to check if user can activate vacation mode
CREATE OR REPLACE FUNCTION can_activate_vacation(p_user_id UUID)
RETURNS TABLE (
  can_activate BOOLEAN,
  reason TEXT
) AS $$
DECLARE
  v_is_in_harmony BOOLEAN;
  v_days_banked INT;
  v_last_vacation TIMESTAMPTZ;
  v_vacation_active BOOLEAN;
BEGIN
  -- Get user stats
  SELECT
    COALESCE(is_in_harmony, FALSE),
    COALESCE(vacation_days_banked, 0),
    last_vacation_ended_at,
    COALESCE(vacation_mode_active, FALSE)
  INTO v_is_in_harmony, v_days_banked, v_last_vacation, v_vacation_active
  FROM user_stats
  WHERE user_id = p_user_id;

  -- Check if already in vacation mode
  IF v_vacation_active THEN
    RETURN QUERY SELECT FALSE, 'Already in vacation mode'::TEXT;
    RETURN;
  END IF;

  -- Requirement 1: Must be in Harmony
  IF NOT v_is_in_harmony THEN
    RETURN QUERY SELECT FALSE, 'Must be in Harmony to activate vacation mode'::TEXT;
    RETURN;
  END IF;

  -- Requirement 2: Must have at least 1 vacation day banked
  IF v_days_banked < 1 THEN
    RETURN QUERY SELECT FALSE, 'No vacation days available'::TEXT;
    RETURN;
  END IF;

  -- Requirement 3: 30-day cooldown between vacation uses
  IF v_last_vacation IS NOT NULL AND v_last_vacation > NOW() - INTERVAL '30 days' THEN
    RETURN QUERY SELECT FALSE, 'Must wait 30 days between vacation uses'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, 'Can activate vacation mode'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to request vacation mode (starts 24-hour countdown)
CREATE OR REPLACE FUNCTION request_vacation_mode(
  p_user_id UUID,
  p_days INT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  activates_at TIMESTAMPTZ
) AS $$
DECLARE
  v_can_activate BOOLEAN;
  v_reason TEXT;
  v_days_banked INT;
  v_activation_time TIMESTAMPTZ;
BEGIN
  -- Check if user can activate
  SELECT * INTO v_can_activate, v_reason FROM can_activate_vacation(p_user_id);

  IF NOT v_can_activate THEN
    RETURN QUERY SELECT FALSE, v_reason, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  -- Get available days
  SELECT vacation_days_banked INTO v_days_banked
  FROM user_stats
  WHERE user_id = p_user_id;

  -- Validate requested days
  IF p_days < 1 OR p_days > v_days_banked OR p_days > 14 THEN
    RETURN QUERY SELECT FALSE, 'Invalid number of vacation days requested'::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  -- Calculate activation time (24 hours from now)
  v_activation_time := NOW() + INTERVAL '24 hours';

  -- Set vacation request
  UPDATE user_stats
  SET
    vacation_requested_at = NOW(),
    vacation_mode_start = v_activation_time,
    vacation_mode_end = v_activation_time + (p_days || ' days')::INTERVAL,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT TRUE, 'Vacation mode will activate in 24 hours'::TEXT, v_activation_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to activate vacation mode (called by scheduler or on app open)
CREATE OR REPLACE FUNCTION check_and_activate_vacation(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_requested_at TIMESTAMPTZ;
  v_start_time TIMESTAMPTZ;
  v_days_used INT;
BEGIN
  -- Get vacation request info
  SELECT vacation_requested_at, vacation_mode_start
  INTO v_requested_at, v_start_time
  FROM user_stats
  WHERE user_id = p_user_id;

  -- Check if there's a pending request that should now be activated
  IF v_requested_at IS NOT NULL
     AND v_start_time IS NOT NULL
     AND v_start_time <= NOW()
     AND NOT (SELECT COALESCE(vacation_mode_active, FALSE) FROM user_stats WHERE user_id = p_user_id)
  THEN
    -- Calculate days to deduct
    SELECT EXTRACT(DAY FROM (vacation_mode_end - vacation_mode_start))::INT
    INTO v_days_used
    FROM user_stats
    WHERE user_id = p_user_id;

    -- Activate vacation mode
    UPDATE user_stats
    SET
      vacation_mode_active = TRUE,
      vacation_days_banked = vacation_days_banked - v_days_used,
      vacation_requested_at = NULL,
      updated_at = NOW()
    WHERE user_id = p_user_id;

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deactivate vacation mode
CREATE OR REPLACE FUNCTION deactivate_vacation_mode(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE user_stats
  SET
    vacation_mode_active = FALSE,
    last_vacation_ended_at = NOW(),
    vacation_mode_start = NULL,
    vacation_mode_end = NULL,
    vacation_requested_at = NULL,
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and auto-deactivate expired vacation
CREATE OR REPLACE FUNCTION check_vacation_expiry(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_vacation_active BOOLEAN;
  v_vacation_end TIMESTAMPTZ;
BEGIN
  SELECT vacation_mode_active, vacation_mode_end
  INTO v_vacation_active, v_vacation_end
  FROM user_stats
  WHERE user_id = p_user_id;

  IF v_vacation_active AND v_vacation_end IS NOT NULL AND v_vacation_end <= NOW() THEN
    PERFORM deactivate_vacation_mode(p_user_id);
    RETURN TRUE; -- Vacation was deactivated
  END IF;

  RETURN FALSE; -- No change
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to award vacation day on streak milestone
CREATE OR REPLACE FUNCTION award_vacation_day(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE user_stats
  SET
    vacation_days_banked = LEAST(vacation_days_banked + 1, 14), -- Cap at 14
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check streak and award vacation day if milestone reached
CREATE OR REPLACE FUNCTION check_streak_vacation_reward(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_streak INT;
BEGIN
  -- Get current streak
  SELECT current_streak INTO v_current_streak
  FROM user_stats
  WHERE user_id = p_user_id;

  -- Award vacation day every 7-day streak milestone
  IF v_current_streak IS NOT NULL AND v_current_streak > 0 AND v_current_streak % 7 = 0 THEN
    PERFORM award_vacation_day(p_user_id);
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cancel pending vacation request
CREATE OR REPLACE FUNCTION cancel_vacation_request(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_request BOOLEAN;
BEGIN
  -- Check if there's a pending request
  SELECT vacation_requested_at IS NOT NULL AND NOT COALESCE(vacation_mode_active, FALSE)
  INTO v_has_request
  FROM user_stats
  WHERE user_id = p_user_id;

  IF v_has_request THEN
    UPDATE user_stats
    SET
      vacation_requested_at = NULL,
      vacation_mode_start = NULL,
      vacation_mode_end = NULL,
      updated_at = NOW()
    WHERE user_id = p_user_id;
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON COLUMN user_stats.vacation_days_banked IS 'Number of vacation days available (max 14). Earned 1 per 7-day streak.';
COMMENT ON COLUMN user_stats.vacation_mode_active IS 'TRUE when vacation mode is currently active (96hr decay instead of 48hr)';
COMMENT ON COLUMN user_stats.vacation_mode_start IS 'When vacation mode started (after 24hr activation delay)';
COMMENT ON COLUMN user_stats.vacation_mode_end IS 'When vacation mode will automatically end';
COMMENT ON COLUMN user_stats.last_vacation_ended_at IS 'When last vacation ended (for 30-day cooldown)';
COMMENT ON COLUMN user_stats.vacation_requested_at IS 'When vacation was requested (for 24-hour activation delay)';
