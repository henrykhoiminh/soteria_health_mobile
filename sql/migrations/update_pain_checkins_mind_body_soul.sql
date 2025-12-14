-- =====================================================
-- Update Pain Check-Ins to Mind/Body/Soul System
-- =====================================================
-- This migration updates the pain check-in system to use
-- Mind, Body, Soul ratings instead of body part locations.
-- The overall pain_level becomes a derived/calculated value.

-- Step 1: Add new columns for Mind, Body, Soul scores
ALTER TABLE pain_checkins
ADD COLUMN IF NOT EXISTS mind_score INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS body_score INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS soul_score INTEGER DEFAULT NULL;

-- Step 2: Add check constraints for score ranges (0-10)
ALTER TABLE pain_checkins
ADD CONSTRAINT mind_score_range CHECK (mind_score IS NULL OR (mind_score >= 0 AND mind_score <= 10)),
ADD CONSTRAINT body_score_range CHECK (body_score IS NULL OR (body_score >= 0 AND body_score <= 10)),
ADD CONSTRAINT soul_score_range CHECK (soul_score IS NULL OR (soul_score >= 0 AND soul_score <= 10));

-- Step 3: Update existing records to have default scores based on pain_level
-- This preserves historical data by distributing the overall pain level
UPDATE pain_checkins
SET
  mind_score = pain_level,
  body_score = pain_level,
  soul_score = pain_level
WHERE mind_score IS NULL AND body_score IS NULL AND soul_score IS NULL;

-- Step 4: Make the new columns required for future inserts
-- (We keep pain_level as the derived overall score)
-- Note: We don't make them NOT NULL yet to allow gradual migration

-- Step 5: Add comment explaining the new structure
COMMENT ON COLUMN pain_checkins.mind_score IS 'Mind wellness score (0=thriving, 10=struggling). Higher = worse state.';
COMMENT ON COLUMN pain_checkins.body_score IS 'Body wellness score (0=thriving, 10=struggling). Higher = worse state.';
COMMENT ON COLUMN pain_checkins.soul_score IS 'Soul wellness score (0=thriving, 10=struggling). Higher = worse state.';
COMMENT ON COLUMN pain_checkins.pain_level IS 'Overall wellness score, derived from average of mind/body/soul scores.';
COMMENT ON COLUMN pain_checkins.pain_locations IS 'DEPRECATED: Previously stored body part locations. Now unused.';

-- Step 6: Create or replace the statistics function to use new columns
CREATE OR REPLACE FUNCTION get_pain_statistics(
  target_user_id uuid,
  days_back integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  current_record record;
  avg_7 numeric;
  avg_30 numeric;
  pain_free integer;
  trend_val text;
  recent_avg numeric;
  older_avg numeric;
  -- New: per-category averages
  mind_avg_7 numeric;
  body_avg_7 numeric;
  soul_avg_7 numeric;
BEGIN
  -- Get the most recent check-in
  SELECT * INTO current_record
  FROM pain_checkins
  WHERE user_id = target_user_id
  ORDER BY check_in_date DESC
  LIMIT 1;

  -- Calculate 7-day average (overall)
  SELECT COALESCE(AVG(pain_level), 0) INTO avg_7
  FROM pain_checkins
  WHERE user_id = target_user_id
  AND check_in_date >= CURRENT_DATE - INTERVAL '7 days';

  -- Calculate 30-day average (overall)
  SELECT COALESCE(AVG(pain_level), 0) INTO avg_30
  FROM pain_checkins
  WHERE user_id = target_user_id
  AND check_in_date >= CURRENT_DATE - INTERVAL '30 days';

  -- Calculate per-category 7-day averages
  SELECT
    COALESCE(AVG(mind_score), 0),
    COALESCE(AVG(body_score), 0),
    COALESCE(AVG(soul_score), 0)
  INTO mind_avg_7, body_avg_7, soul_avg_7
  FROM pain_checkins
  WHERE user_id = target_user_id
  AND check_in_date >= CURRENT_DATE - INTERVAL '7 days';

  -- Count pain-free days (pain_level = 0) in the period
  SELECT COUNT(*) INTO pain_free
  FROM pain_checkins
  WHERE user_id = target_user_id
  AND check_in_date >= CURRENT_DATE - INTERVAL '30 days'
  AND pain_level = 0;

  -- Calculate trend by comparing recent vs older averages
  SELECT COALESCE(AVG(pain_level), 0) INTO recent_avg
  FROM pain_checkins
  WHERE user_id = target_user_id
  AND check_in_date >= CURRENT_DATE - INTERVAL '3 days';

  SELECT COALESCE(AVG(pain_level), 0) INTO older_avg
  FROM pain_checkins
  WHERE user_id = target_user_id
  AND check_in_date >= CURRENT_DATE - INTERVAL '7 days'
  AND check_in_date < CURRENT_DATE - INTERVAL '3 days';

  -- Determine trend
  IF (SELECT COUNT(*) FROM pain_checkins WHERE user_id = target_user_id AND check_in_date >= CURRENT_DATE - INTERVAL '7 days') < 3 THEN
    trend_val := 'insufficient_data';
  ELSIF recent_avg < older_avg - 0.5 THEN
    trend_val := 'decreasing';
  ELSIF recent_avg > older_avg + 0.5 THEN
    trend_val := 'increasing';
  ELSE
    trend_val := 'stable';
  END IF;

  -- Build result
  result := jsonb_build_object(
    'current_pain', COALESCE(current_record.pain_level, 0),
    'current_mind', COALESCE(current_record.mind_score, 0),
    'current_body', COALESCE(current_record.body_score, 0),
    'current_soul', COALESCE(current_record.soul_score, 0),
    'avg_7_days', ROUND(avg_7::numeric, 1),
    'avg_30_days', ROUND(avg_30::numeric, 1),
    'mind_avg_7_days', ROUND(mind_avg_7::numeric, 1),
    'body_avg_7_days', ROUND(body_avg_7::numeric, 1),
    'soul_avg_7_days', ROUND(soul_avg_7::numeric, 1),
    'pain_free_days', pain_free,
    'trend', trend_val
  );

  RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_pain_statistics(uuid, integer) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_pain_statistics IS 'Returns pain/wellness statistics including per-category (Mind/Body/Soul) averages.';
