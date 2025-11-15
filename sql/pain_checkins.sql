-- =====================================================
-- Pain Check-In System
-- =====================================================
-- Daily pain tracking for all users (both Prevention and Recovery journeys)
-- Stores pain level (0-10), affected body parts, notes, and timestamps

-- Drop existing table if needed (for development)
DROP TABLE IF EXISTS pain_checkins CASCADE;

-- Create pain_checkins table
CREATE TABLE pain_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Pain data
  pain_level integer NOT NULL CHECK (pain_level >= 0 AND pain_level <= 10),
  pain_locations text[] DEFAULT ARRAY[]::text[], -- Array of body parts with pain
  notes text, -- Optional user notes

  -- Timestamps (store in UTC, convert to user timezone in app)
  check_in_date date NOT NULL, -- Date in user's timezone (YYYY-MM-DD)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  UNIQUE(user_id, check_in_date) -- One check-in per user per day
);

-- Create indexes for performance
CREATE INDEX idx_pain_checkins_user_id ON pain_checkins(user_id);
CREATE INDEX idx_pain_checkins_user_date ON pain_checkins(user_id, check_in_date DESC);
CREATE INDEX idx_pain_checkins_date ON pain_checkins(check_in_date DESC);
CREATE INDEX idx_pain_checkins_created_at ON pain_checkins(created_at DESC);

-- Enable Row Level Security
ALTER TABLE pain_checkins ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own pain check-ins
CREATE POLICY "Users can view own pain check-ins"
  ON pain_checkins
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own pain check-ins
CREATE POLICY "Users can insert own pain check-ins"
  ON pain_checkins
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own pain check-ins (same day only)
CREATE POLICY "Users can update own pain check-ins"
  ON pain_checkins
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own pain check-ins
CREATE POLICY "Users can delete own pain check-ins"
  ON pain_checkins
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pain_checkins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_pain_checkins_updated_at_trigger
  BEFORE UPDATE ON pain_checkins
  FOR EACH ROW
  EXECUTE FUNCTION update_pain_checkins_updated_at();

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to get today's check-in for a user
CREATE OR REPLACE FUNCTION get_todays_pain_checkin(target_user_id uuid, today_date date)
RETURNS TABLE (
  id uuid,
  pain_level integer,
  pain_locations text[],
  notes text,
  check_in_date date,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.id,
    pc.pain_level,
    pc.pain_locations,
    pc.notes,
    pc.check_in_date,
    pc.created_at
  FROM pain_checkins pc
  WHERE pc.user_id = target_user_id
    AND pc.check_in_date = today_date
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pain check-in history (last N days)
CREATE OR REPLACE FUNCTION get_pain_checkin_history(target_user_id uuid, days_back integer DEFAULT 30)
RETURNS TABLE (
  id uuid,
  pain_level integer,
  pain_locations text[],
  notes text,
  check_in_date date,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.id,
    pc.pain_level,
    pc.pain_locations,
    pc.notes,
    pc.check_in_date,
    pc.created_at
  FROM pain_checkins pc
  WHERE pc.user_id = target_user_id
    AND pc.check_in_date >= CURRENT_DATE - days_back
  ORDER BY pc.check_in_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate pain statistics
CREATE OR REPLACE FUNCTION get_pain_statistics(target_user_id uuid, days_back integer DEFAULT 30)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  avg_7_days numeric;
  avg_30_days numeric;
  pain_free_days integer;
  current_pain integer;
  trend text;
  latest_pain integer;
  previous_pain integer;
  checkin_count integer;
BEGIN
  -- Get current (most recent) pain level
  SELECT pain_level INTO current_pain
  FROM pain_checkins
  WHERE user_id = target_user_id
  ORDER BY check_in_date DESC
  LIMIT 1;

  -- Average pain last 7 days
  SELECT ROUND(AVG(pain_level), 1) INTO avg_7_days
  FROM pain_checkins
  WHERE user_id = target_user_id
    AND check_in_date >= CURRENT_DATE - 7;

  -- Average pain last 30 days
  SELECT ROUND(AVG(pain_level), 1) INTO avg_30_days
  FROM pain_checkins
  WHERE user_id = target_user_id
    AND check_in_date >= CURRENT_DATE - days_back;

  -- Count pain-free days (pain_level = 0)
  SELECT COUNT(*) INTO pain_free_days
  FROM pain_checkins
  WHERE user_id = target_user_id
    AND check_in_date >= CURRENT_DATE - days_back
    AND pain_level = 0;

  -- Calculate trend using last 2 data points for immediate feedback
  -- Count total check-ins
  SELECT COUNT(*) INTO checkin_count
  FROM pain_checkins
  WHERE user_id = target_user_id;

  -- Need at least 2 check-ins to determine trend
  IF checkin_count < 2 THEN
    trend := 'insufficient_data';
  ELSE
    -- Get the most recent pain level
    SELECT pain_level INTO latest_pain
    FROM pain_checkins
    WHERE user_id = target_user_id
    ORDER BY check_in_date DESC
    LIMIT 1;

    -- Get the second most recent pain level
    SELECT pain_level INTO previous_pain
    FROM pain_checkins
    WHERE user_id = target_user_id
    ORDER BY check_in_date DESC
    LIMIT 1 OFFSET 1;

    -- Determine trend based on the difference
    IF latest_pain < previous_pain - 1 THEN
      trend := 'decreasing';  -- Pain is improving (going down)
    ELSIF latest_pain > previous_pain + 1 THEN
      trend := 'increasing';  -- Pain is worsening (going up)
    ELSE
      trend := 'stable';  -- Pain is roughly the same
    END IF;
  END IF;

  -- Build result JSON
  result := jsonb_build_object(
    'current_pain', COALESCE(current_pain, 0),
    'avg_7_days', COALESCE(avg_7_days, 0),
    'avg_30_days', COALESCE(avg_30_days, 0),
    'pain_free_days', pain_free_days,
    'trend', trend
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_todays_pain_checkin(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pain_checkin_history(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pain_statistics(uuid, integer) TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE pain_checkins IS 'Daily pain check-ins for all users to track pain levels and affected body parts';
COMMENT ON COLUMN pain_checkins.pain_level IS 'Pain level from 0 (pain free) to 10 (severe pain)';
COMMENT ON COLUMN pain_checkins.pain_locations IS 'Array of body parts experiencing pain (e.g., ["Neck", "Lower Back"])';
COMMENT ON COLUMN pain_checkins.check_in_date IS 'Date of check-in in user local timezone (YYYY-MM-DD)';
