-- Migration: Update pain trend calculation to work with 2+ data points
-- This allows users to see trend indicators immediately after their second check-in
-- Instead of requiring 14 days of data

-- Drop and recreate the function with updated logic
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
