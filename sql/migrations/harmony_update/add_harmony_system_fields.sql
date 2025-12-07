-- Migration: Add Harmony System Fields
-- Description: Adds fields to user_stats for harmony tracking, 7-day rolling counts,
--              decay timestamps, and user type identification
-- Created: 2025-12-06

-- Add 7-day rolling counts for balance calculation
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS mind_routines_7d INT DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS body_routines_7d INT DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS soul_routines_7d INT DEFAULT 0;

-- Add harmony status tracking
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS is_in_harmony BOOLEAN DEFAULT FALSE;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS harmony_achieved_at TIMESTAMPTZ;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS harmony_lost_at TIMESTAMPTZ;

-- Add user type identification (mind, body, soul, or balanced)
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'balanced';

-- Add per-category last routine timestamps for decay calculation
-- Note: These are more precise than last_*_activity which stores DATE
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS mind_last_routine_at TIMESTAMPTZ;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS body_last_routine_at TIMESTAMPTZ;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS soul_last_routine_at TIMESTAMPTZ;

-- Add constraint for user_type values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_stats_user_type_check'
  ) THEN
    ALTER TABLE user_stats ADD CONSTRAINT user_stats_user_type_check
      CHECK (user_type IN ('mind', 'body', 'soul', 'balanced'));
  END IF;
END $$;

-- Create function to calculate 7-day rolling counts
-- This is called after each routine completion
CREATE OR REPLACE FUNCTION calculate_7day_rolling_counts(p_user_id UUID)
RETURNS TABLE (
  mind_count INT,
  body_count INT,
  soul_count INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN category = 'Mind' THEN 1 ELSE 0 END), 0)::INT AS mind_count,
    COALESCE(SUM(CASE WHEN category = 'Body' THEN 1 ELSE 0 END), 0)::INT AS body_count,
    COALESCE(SUM(CASE WHEN category = 'Soul' THEN 1 ELSE 0 END), 0)::INT AS soul_count
  FROM routine_completions
  WHERE user_id = p_user_id
    AND completed_at >= NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is in balance
-- Returns TRUE if all categories are within 1 routine of each other
CREATE OR REPLACE FUNCTION check_balance(
  p_mind INT,
  p_body INT,
  p_soul INT
) RETURNS BOOLEAN AS $$
DECLARE
  v_max INT;
  v_min INT;
BEGIN
  v_max := GREATEST(p_mind, p_body, p_soul);
  v_min := LEAST(p_mind, p_body, p_soul);

  RETURN (v_max - v_min) <= 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to determine user type
-- Returns 'mind', 'body', 'soul', or 'balanced'
CREATE OR REPLACE FUNCTION get_user_type(
  p_mind INT,
  p_body INT,
  p_soul INT
) RETURNS TEXT AS $$
DECLARE
  v_max INT;
  v_second_max INT;
BEGIN
  v_max := GREATEST(p_mind, p_body, p_soul);

  -- Find second highest
  v_second_max := GREATEST(
    CASE WHEN p_mind = v_max THEN 0 ELSE p_mind END,
    CASE WHEN p_body = v_max THEN 0 ELSE p_body END,
    CASE WHEN p_soul = v_max THEN 0 ELSE p_soul END
  );

  -- If two values are equal to max, consider the third
  IF (p_mind = v_max AND p_body = v_max) OR
     (p_mind = v_max AND p_soul = v_max) OR
     (p_body = v_max AND p_soul = v_max) THEN
    -- At least two are tied for max, not a clear type
    RETURN 'balanced';
  END IF;

  -- Must be 2+ ahead to be a type
  IF v_max - v_second_max >= 2 THEN
    IF p_mind = v_max THEN RETURN 'mind'; END IF;
    IF p_body = v_max THEN RETURN 'body'; END IF;
    IF p_soul = v_max THEN RETURN 'soul'; END IF;
  END IF;

  RETURN 'balanced';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to check harmony requirements
-- Returns TRUE if user meets all harmony requirements
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
  v_vacation_active BOOLEAN;
BEGIN
  -- Get current stats
  SELECT
    mind_routines_7d, body_routines_7d, soul_routines_7d,
    mind_last_routine_at, body_last_routine_at, soul_last_routine_at,
    COALESCE(vacation_mode_active, FALSE)
  INTO
    v_mind_7d, v_body_7d, v_soul_7d,
    v_mind_last, v_body_last, v_soul_last,
    v_vacation_active
  FROM user_stats
  WHERE user_id = p_user_id;

  -- If no stats found, not in harmony
  IF v_mind_7d IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Adjust decay threshold for vacation mode
  IF v_vacation_active THEN
    v_decay_hours := 96;
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

  -- Requirement 3: No dormant avatars (each category active within decay threshold)
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

-- Create function to update harmony status after routine completion
CREATE OR REPLACE FUNCTION update_harmony_status(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_counts RECORD;
  v_was_in_harmony BOOLEAN;
  v_is_in_harmony BOOLEAN;
  v_user_type TEXT;
BEGIN
  -- Get previous harmony status
  SELECT is_in_harmony INTO v_was_in_harmony
  FROM user_stats
  WHERE user_id = p_user_id;

  v_was_in_harmony := COALESCE(v_was_in_harmony, FALSE);

  -- Calculate new 7-day rolling counts
  SELECT * INTO v_counts FROM calculate_7day_rolling_counts(p_user_id);

  -- Check if user is now in harmony
  v_is_in_harmony := check_harmony_requirements(p_user_id);

  -- Determine user type
  v_user_type := get_user_type(v_counts.mind_count, v_counts.body_count, v_counts.soul_count);

  -- Update user_stats
  UPDATE user_stats
  SET
    mind_routines_7d = v_counts.mind_count,
    body_routines_7d = v_counts.body_count,
    soul_routines_7d = v_counts.soul_count,
    is_in_harmony = v_is_in_harmony,
    user_type = v_user_type,
    harmony_achieved_at = CASE
      WHEN v_is_in_harmony AND NOT v_was_in_harmony THEN NOW()
      ELSE harmony_achieved_at
    END,
    harmony_lost_at = CASE
      WHEN NOT v_is_in_harmony AND v_was_in_harmony THEN NOW()
      ELSE harmony_lost_at
    END,
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update category timestamp on routine completion
CREATE OR REPLACE FUNCTION update_category_last_routine()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the appropriate category timestamp
  IF NEW.category = 'Mind' THEN
    UPDATE user_stats SET mind_last_routine_at = NEW.completed_at WHERE user_id = NEW.user_id;
  ELSIF NEW.category = 'Body' THEN
    UPDATE user_stats SET body_last_routine_at = NEW.completed_at WHERE user_id = NEW.user_id;
  ELSIF NEW.category = 'Soul' THEN
    UPDATE user_stats SET soul_last_routine_at = NEW.completed_at WHERE user_id = NEW.user_id;
  END IF;

  -- Update harmony status
  PERFORM update_harmony_status(NEW.user_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_update_category_last_routine ON routine_completions;

-- Create trigger on routine_completions
CREATE TRIGGER trg_update_category_last_routine
AFTER INSERT ON routine_completions
FOR EACH ROW
EXECUTE FUNCTION update_category_last_routine();

-- Add index for efficient 7-day queries
CREATE INDEX IF NOT EXISTS idx_routine_completions_user_date
ON routine_completions(user_id, completed_at DESC);

-- Comment for documentation
COMMENT ON COLUMN user_stats.is_in_harmony IS 'TRUE when user meets all harmony requirements: balance, no dormant avatars, 7+ routines/week';
COMMENT ON COLUMN user_stats.user_type IS 'User wellness type based on 7-day activity: mind, body, soul, or balanced';
COMMENT ON COLUMN user_stats.mind_routines_7d IS 'Count of Mind routines completed in last 7 days (rolling)';
COMMENT ON COLUMN user_stats.body_routines_7d IS 'Count of Body routines completed in last 7 days (rolling)';
COMMENT ON COLUMN user_stats.soul_routines_7d IS 'Count of Soul routines completed in last 7 days (rolling)';
