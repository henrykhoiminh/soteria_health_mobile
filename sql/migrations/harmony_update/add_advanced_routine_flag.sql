-- Migration: Add Advanced Routine Flag
-- Description: Adds is_advanced flag to routines table for harmony-gated content
-- Created: 2025-12-06

-- Add is_advanced flag to routines table
ALTER TABLE routines ADD COLUMN IF NOT EXISTS is_advanced BOOLEAN DEFAULT FALSE;

-- Create index for efficient filtering of advanced routines
CREATE INDEX IF NOT EXISTS idx_routines_is_advanced
ON routines(is_advanced) WHERE is_advanced = TRUE;

-- RLS policy: Anyone can view advanced routines (but app will gate access)
-- Note: The gating happens in the app, not at the database level
-- This allows us to show locked advanced routines in the browse view

-- Function to check if user can access advanced routine
CREATE OR REPLACE FUNCTION can_access_advanced_routine(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_in_harmony BOOLEAN;
BEGIN
  SELECT COALESCE(is_in_harmony, FALSE)
  INTO v_is_in_harmony
  FROM user_stats
  WHERE user_id = p_user_id;

  RETURN COALESCE(v_is_in_harmony, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view for browsing routines with harmony lock status
CREATE OR REPLACE VIEW routines_with_lock_status AS
SELECT
  r.*,
  CASE
    WHEN r.is_advanced AND NOT COALESCE(
      (SELECT is_in_harmony FROM user_stats WHERE user_id = auth.uid()),
      FALSE
    ) THEN TRUE
    ELSE FALSE
  END AS is_locked
FROM routines r;

-- Grant access to the view
GRANT SELECT ON routines_with_lock_status TO authenticated;

-- Comment for documentation
COMMENT ON COLUMN routines.is_advanced IS 'TRUE for advanced routines that require Harmony status to access';
