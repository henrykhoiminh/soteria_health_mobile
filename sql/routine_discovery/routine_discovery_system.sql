-- =====================================================
-- SOTERIA HEALTH - ROUTINE DISCOVERY SYSTEM
-- Database Schema, Indexes, Triggers, and RLS Policies
-- =====================================================

-- =====================================================
-- 1. CREATE ROUTINE_SAVES TABLE
-- Tracks which users have saved/bookmarked routines
-- =====================================================

CREATE TABLE IF NOT EXISTS routine_saves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  routine_id UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure a user can only save a routine once
  UNIQUE(user_id, routine_id)
);

-- Add comment
COMMENT ON TABLE routine_saves IS 'Tracks user-saved/bookmarked routines for personal collection and community signals';

-- =====================================================
-- 2. ADD is_public COLUMN TO ROUTINES (if not exists)
-- Ensures custom routines can be marked as public
-- =====================================================

-- Check if column exists, add if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'routines' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE routines ADD COLUMN is_public BOOLEAN DEFAULT false;
    COMMENT ON COLUMN routines.is_public IS 'Whether custom routine is publicly discoverable (global routines are always public)';
  END IF;
END $$;

-- Set all non-custom routines to public by default
UPDATE routines SET is_public = true WHERE is_custom = false OR is_custom IS NULL;

-- =====================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- Critical for fast queries on discover feed
-- =====================================================

-- Index for finding user's saved routines
CREATE INDEX IF NOT EXISTS idx_routine_saves_user_id
  ON routine_saves(user_id);

-- Index for counting saves per routine
CREATE INDEX IF NOT EXISTS idx_routine_saves_routine_id
  ON routine_saves(routine_id);

-- Index for trending calculation (saves in last 7 days)
CREATE INDEX IF NOT EXISTS idx_routine_saves_created_at
  ON routine_saves(created_at DESC);

-- Composite index for trending routines query
CREATE INDEX IF NOT EXISTS idx_routine_saves_routine_created
  ON routine_saves(routine_id, created_at DESC);

-- Index for discover feed queries (public routines)
CREATE INDEX IF NOT EXISTS idx_routines_public_custom
  ON routines(is_public, is_custom) WHERE is_public = true;

-- Index for filtering by category
CREATE INDEX IF NOT EXISTS idx_routines_category
  ON routines(category);

-- Index for sorting by completion count
CREATE INDEX IF NOT EXISTS idx_routines_completion_count
  ON routines(completion_count DESC);

-- Index for filtering new routines (created in last 7 days)
CREATE INDEX IF NOT EXISTS idx_routines_created_at
  ON routines(created_at DESC);

-- Index for filtering by difficulty
CREATE INDEX IF NOT EXISTS idx_routines_difficulty
  ON routines(difficulty);

-- Index for filtering by duration
CREATE INDEX IF NOT EXISTS idx_routines_duration
  ON routines(duration_minutes);

-- Composite index for common discover queries
CREATE INDEX IF NOT EXISTS idx_routines_discover
  ON routines(is_public, completion_count DESC, created_at DESC)
  WHERE is_public = true;

-- =====================================================
-- 4. CREATE FUNCTION TO UPDATE SAVE COUNT
-- Automatically maintains save_count column on routines
-- =====================================================

-- Add save_count column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'routines' AND column_name = 'save_count'
  ) THEN
    ALTER TABLE routines ADD COLUMN save_count INTEGER DEFAULT 0;
    COMMENT ON COLUMN routines.save_count IS 'Cached count of users who saved this routine';
  END IF;
END $$;

-- Create function to update save count
CREATE OR REPLACE FUNCTION update_routine_save_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment save count
    UPDATE routines
    SET save_count = save_count + 1
    WHERE id = NEW.routine_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement save count
    UPDATE routines
    SET save_count = GREATEST(save_count - 1, 0)
    WHERE id = OLD.routine_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. CREATE TRIGGER FOR SAVE COUNT
-- Automatically updates save_count when saves change
-- =====================================================

DROP TRIGGER IF EXISTS trigger_update_save_count ON routine_saves;

CREATE TRIGGER trigger_update_save_count
  AFTER INSERT OR DELETE ON routine_saves
  FOR EACH ROW
  EXECUTE FUNCTION update_routine_save_count();

-- =====================================================
-- 6. INITIALIZE SAVE COUNTS
-- Backfill save_count for existing data
-- =====================================================

UPDATE routines
SET save_count = (
  SELECT COUNT(*)
  FROM routine_saves
  WHERE routine_saves.routine_id = routines.id
);

-- =====================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- Secure access to routine_saves table
-- =====================================================

-- Enable RLS on routine_saves
ALTER TABLE routine_saves ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own saves
CREATE POLICY "Users can view own saves"
  ON routine_saves
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own saves
CREATE POLICY "Users can insert own saves"
  ON routine_saves
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own saves
CREATE POLICY "Users can delete own saves"
  ON routine_saves
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: All authenticated users can view public routines
DROP POLICY IF EXISTS "Public routines are viewable" ON routines;
CREATE POLICY "Public routines are viewable"
  ON routines
  FOR SELECT
  USING (
    is_public = true
    OR created_by = auth.uid()
    OR is_custom = false
    OR is_custom IS NULL
  );

-- =====================================================
-- 8. CREATE VIEW FOR DISCOVER FEED
-- Optimized view with all metrics and badges
-- =====================================================

CREATE OR REPLACE VIEW routine_discover_feed AS
SELECT
  r.*,

  -- Trending badge: >20 saves in last 7 days (save_count already in r.*)
  (
    SELECT COUNT(*)
    FROM routine_saves rs
    WHERE rs.routine_id = r.id
    AND rs.created_at > NOW() - INTERVAL '7 days'
  ) AS recent_saves,

  -- Calculate badges
  CASE
    WHEN r.completion_count > 100 THEN 'popular'
    ELSE NULL
  END AS badge_popular,

  CASE
    WHEN (
      SELECT COUNT(*)
      FROM routine_saves rs
      WHERE rs.routine_id = r.id
      AND rs.created_at > NOW() - INTERVAL '7 days'
    ) > 20 THEN 'trending'
    ELSE NULL
  END AS badge_trending,

  CASE
    WHEN r.created_at > NOW() - INTERVAL '7 days' THEN 'new'
    ELSE NULL
  END AS badge_new,

  CASE
    WHEN r.is_custom = false OR r.is_custom IS NULL THEN 'official'
    ELSE NULL
  END AS badge_official,

  -- Creator profile info (for community routines)
  p.full_name AS creator_name,
  p.username AS creator_username,
  p.profile_picture_url AS creator_avatar

FROM routines r
LEFT JOIN profiles p ON r.created_by = p.id
WHERE r.is_public = true;

-- Add comment
COMMENT ON VIEW routine_discover_feed IS 'Optimized view for routine discovery with metrics and badges';

-- =====================================================
-- 9. CREATE FUNCTION TO GET USER'S SAVED STATUS
-- Helper function to check if user saved a routine
-- =====================================================

CREATE OR REPLACE FUNCTION user_saved_routine(
  p_user_id UUID,
  p_routine_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM routine_saves
    WHERE user_id = p_user_id
    AND routine_id = p_routine_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. GRANT PERMISSIONS
-- Ensure authenticated users can access necessary data
-- =====================================================

GRANT SELECT, INSERT, DELETE ON routine_saves TO authenticated;
GRANT SELECT ON routine_discover_feed TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- =====================================================
-- 11. CREATE INDEXES ON VIEW-RELATED QUERIES
-- Additional indexes for view performance
-- =====================================================

-- Index for creator profile joins (created_by references profiles.id)
CREATE INDEX IF NOT EXISTS idx_routines_created_by
  ON routines(created_by) WHERE is_custom = true;

-- =====================================================
-- 12. ADD JOURNEY FOCUS ARRAY SUPPORT (if needed)
-- Ensure journey_focus is indexed for filtering
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_routines_journey_focus
  ON routines USING GIN(journey_focus) WHERE journey_focus IS NOT NULL;

-- =====================================================
-- VERIFICATION QUERIES
-- Run these to verify the setup
-- =====================================================

-- Verify routine_saves table
-- SELECT * FROM routine_saves LIMIT 5;

-- Verify save counts are correct
-- SELECT id, name, completion_count, save_count FROM routines ORDER BY save_count DESC LIMIT 10;

-- Verify discover feed view
-- SELECT id, name, completion_count, save_count, recent_saves, badge_popular, badge_trending, badge_new, badge_official FROM routine_discover_feed LIMIT 10;

-- Check indexes
-- SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('routines', 'routine_saves') ORDER BY tablename, indexname;

-- =====================================================
-- NOTES
-- =====================================================

-- 1. All global/pre-built routines (is_custom=false) are always public
-- 2. Custom routines can be toggled public/private via is_public column
-- 3. Completion count is primary metric (quality signal)
-- 4. Save count is secondary metric (discovery/bookmark intent)
-- 5. Trending is calculated from saves in last 7 days (>20 saves)
-- 6. Popular badge requires >100 completions
-- 7. New badge for routines <7 days old
-- 8. Official badge for pre-built routines (is_custom=false)
-- 9. RLS policies ensure users can only save/unsave their own bookmarks
-- 10. Triggers maintain save_count automatically for performance

-- =====================================================
-- END OF ROUTINE DISCOVERY SYSTEM SCHEMA
-- =====================================================
