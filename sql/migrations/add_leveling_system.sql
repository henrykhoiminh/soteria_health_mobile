-- =====================================================
-- Leveling System Migration
-- Adds XP tracking columns and updates related functions
-- =====================================================

-- Phase 1: Add XP columns to user_stats
ALTER TABLE user_stats
  ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mind_xp INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS body_xp INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS soul_xp INTEGER DEFAULT 0;

-- Phase 2: Add duration_minutes to routine_completions (denormalized for accurate XP calc)
ALTER TABLE routine_completions
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- Phase 3: Backfill XP from existing routine_completions
-- XP formula: 10 (base) + duration_minutes (default 10 if null) = minimum 20 XP per completion
WITH completion_xp AS (
  SELECT
    rc.user_id,
    rc.category,
    SUM(10 + COALESCE(r.duration_minutes, 10)) AS xp_earned
  FROM routine_completions rc
  LEFT JOIN routines r ON r.id = rc.routine_id
  GROUP BY rc.user_id, rc.category
),
user_totals AS (
  SELECT
    user_id,
    SUM(xp_earned) AS total_xp,
    COALESCE(SUM(CASE WHEN category = 'Mind' THEN xp_earned END), 0) AS mind_xp,
    COALESCE(SUM(CASE WHEN category = 'Body' THEN xp_earned END), 0) AS body_xp,
    COALESCE(SUM(CASE WHEN category = 'Soul' THEN xp_earned END), 0) AS soul_xp
  FROM completion_xp
  GROUP BY user_id
)
UPDATE user_stats us
SET
  total_xp = ut.total_xp,
  mind_xp = ut.mind_xp,
  body_xp = ut.body_xp,
  soul_xp = ut.soul_xp
FROM user_totals ut
WHERE us.user_id = ut.user_id;

-- Phase 4: Backfill duration_minutes on existing routine_completions
UPDATE routine_completions rc
SET duration_minutes = r.duration_minutes
FROM routines r
WHERE rc.routine_id = r.id
  AND rc.duration_minutes IS NULL;

-- Phase 5: Index for leaderboard-style queries
CREATE INDEX IF NOT EXISTS idx_user_stats_total_xp ON user_stats(total_xp DESC);

-- Phase 6: Update search_profiles RPC to return total_xp
-- Must drop first because adding a new OUT parameter changes the return type
DROP FUNCTION IF EXISTS search_profiles(TEXT, UUID, INTEGER);
CREATE OR REPLACE FUNCTION search_profiles(
  p_search_term TEXT,
  p_exclude_user_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  username TEXT,
  profile_picture_url TEXT,
  journey_focus TEXT,
  role TEXT,
  match_score INTEGER,
  total_xp INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.first_name,
    p.last_name,
    p.full_name,
    p.username,
    p.profile_picture_url,
    p.journey_focus,
    p.role,
    -- Match scoring: exact username match > starts-with > contains
    CASE
      WHEN LOWER(p.username) = LOWER(p_search_term) THEN 100
      WHEN LOWER(p.username) LIKE LOWER(p_search_term) || '%' THEN 80
      WHEN LOWER(p.full_name) = LOWER(p_search_term) THEN 70
      WHEN LOWER(p.full_name) LIKE LOWER(p_search_term) || '%' THEN 60
      WHEN LOWER(p.username) LIKE '%' || LOWER(p_search_term) || '%' THEN 40
      WHEN LOWER(p.full_name) LIKE '%' || LOWER(p_search_term) || '%' THEN 30
      WHEN LOWER(p.first_name) LIKE '%' || LOWER(p_search_term) || '%' THEN 20
      WHEN LOWER(p.last_name) LIKE '%' || LOWER(p_search_term) || '%' THEN 10
      ELSE 0
    END AS match_score,
    COALESCE(us.total_xp, 0)::INTEGER AS total_xp
  FROM profiles p
  LEFT JOIN user_stats us ON us.user_id = p.id
  WHERE p.id != p_exclude_user_id
    AND (
      p.username ILIKE '%' || p_search_term || '%'
      OR p.full_name ILIKE '%' || p_search_term || '%'
      OR p.first_name ILIKE '%' || p_search_term || '%'
      OR p.last_name ILIKE '%' || p_search_term || '%'
    )
  ORDER BY match_score DESC, p.username ASC
  LIMIT p_limit;
END;
$$;

-- Phase 7: Update hard_reset_user_data to reset XP columns
-- This function already exists; we add XP reset to it.
-- NOTE: Run this AFTER verifying the existing function signature.
-- The function should reset total_xp, mind_xp, body_xp, soul_xp to 0.
-- Add this to the existing UPDATE user_stats SET ... block:
--   total_xp = 0, mind_xp = 0, body_xp = 0, soul_xp = 0
-- Since the exact function body varies, here's a safe approach using DO block:
DO $$
DECLARE
  func_body TEXT;
BEGIN
  -- Get existing function body
  SELECT pg_get_functiondef(oid) INTO func_body
  FROM pg_proc
  WHERE proname = 'hard_reset_user_data';

  -- Only update if function exists and doesn't already have total_xp
  IF func_body IS NOT NULL AND func_body NOT LIKE '%total_xp%' THEN
    RAISE NOTICE 'hard_reset_user_data needs manual update to reset XP columns. Add: total_xp = 0, mind_xp = 0, body_xp = 0, soul_xp = 0 to the user_stats UPDATE.';
  END IF;
END;
$$;

-- Phase 8: Backfill routines.completion_count from actual completion records
-- This fixes routines where completion_count was never incremented
UPDATE routines r
SET completion_count = sub.actual_count
FROM (
  SELECT routine_id, COUNT(*)::INTEGER AS actual_count
  FROM routine_completions
  GROUP BY routine_id
) sub
WHERE r.id = sub.routine_id
  AND r.completion_count != sub.actual_count;
