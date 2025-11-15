-- ============================================================================
-- TIMEZONE SUPPORT MIGRATION
-- ============================================================================
-- This migration adds timezone-aware daily progress tracking
-- so users around the world see daily resets at midnight local time
-- ============================================================================

-- ============================================================================
-- FUNCTION: update_daily_progress_for_date
-- ============================================================================
-- Updates daily_progress for a specific local date
-- Called from client with user's local date string (YYYY-MM-DD)

CREATE OR REPLACE FUNCTION update_daily_progress_for_date(
  p_user_id UUID,
  p_local_date DATE,
  p_category TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Insert or update daily_progress for the given local date
  INSERT INTO daily_progress (
    user_id,
    date,
    mind_complete,
    body_complete,
    soul_complete
  )
  VALUES (
    p_user_id,
    p_local_date,
    CASE WHEN p_category = 'Mind' THEN TRUE ELSE FALSE END,
    CASE WHEN p_category = 'Body' THEN TRUE ELSE FALSE END,
    CASE WHEN p_category = 'Soul' THEN TRUE ELSE FALSE END
  )
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    mind_complete = CASE
      WHEN p_category = 'Mind' THEN TRUE
      ELSE daily_progress.mind_complete
    END,
    body_complete = CASE
      WHEN p_category = 'Body' THEN TRUE
      ELSE daily_progress.body_complete
    END,
    soul_complete = CASE
      WHEN p_category = 'Soul' THEN TRUE
      ELSE daily_progress.soul_complete
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_daily_progress_for_date(UUID, DATE, TEXT) TO authenticated;

-- ============================================================================
-- UPDATE MILESTONE CHECK FUNCTION
-- ============================================================================
-- Update the milestone check function to work with any date (not just CURRENT_DATE)

-- First, drop existing trigger to avoid conflicts during function update
DROP TRIGGER IF EXISTS check_milestones_after_routine ON routine_completions;
DROP TRIGGER IF EXISTS check_milestones_after_stats ON user_stats;

-- Update the function to be timezone-agnostic
-- The function will use data from daily_progress which now stores local dates
-- No changes needed to the function itself since it queries existing data
-- Just recreate the triggers

CREATE OR REPLACE FUNCTION trigger_check_milestones_after_routine()
RETURNS TRIGGER AS $$
BEGIN
  -- Call milestone check function
  PERFORM check_and_award_milestones(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_milestones_after_routine
  AFTER INSERT ON routine_completions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_milestones_after_routine();

CREATE OR REPLACE FUNCTION trigger_check_milestones_after_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Call milestone check function
  PERFORM check_and_award_milestones(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_milestones_after_stats
  AFTER UPDATE ON user_stats
  FOR EACH ROW
  WHEN (
    -- Only trigger if streak or routine counts changed
    OLD.current_streak IS DISTINCT FROM NEW.current_streak OR
    OLD.total_routines IS DISTINCT FROM NEW.total_routines OR
    OLD.unique_mind_routines IS DISTINCT FROM NEW.unique_mind_routines OR
    OLD.unique_body_routines IS DISTINCT FROM NEW.unique_body_routines OR
    OLD.unique_soul_routines IS DISTINCT FROM NEW.unique_soul_routines
  )
  EXECUTE FUNCTION trigger_check_milestones_after_stats();

-- ============================================================================
-- ADD COMMENT
-- ============================================================================

COMMENT ON FUNCTION update_daily_progress_for_date IS 'Updates daily progress for a specific local date provided by the client. This ensures daily progress resets at midnight in the user''s timezone, not UTC.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
--
-- How it works:
-- 1. Client calculates local date (YYYY-MM-DD) in user's timezone
-- 2. Client calls update_daily_progress_for_date() with local date
-- 3. Daily progress is stored with that local date
-- 4. All streak calculations use these local dates
-- 5. Users see daily resets at midnight local time
--
-- ============================================================================
