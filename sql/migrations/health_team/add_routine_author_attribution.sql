-- ============================================================================
-- ROUTINE AUTHOR ATTRIBUTION SYSTEM
-- ============================================================================
-- Adds author attribution to distinguish official Soteria routines from
-- community-created custom routines
-- ============================================================================

-- ============================================================================
-- STEP 1: Add Author Attribution Columns
-- ============================================================================

-- Add author_type column to distinguish between official and community routines
ALTER TABLE routines
ADD COLUMN IF NOT EXISTS author_type TEXT DEFAULT 'community'
  CHECK (author_type IN ('official', 'community'));

-- Add official_author column for official routine creator names
ALTER TABLE routines
ADD COLUMN IF NOT EXISTS official_author TEXT DEFAULT NULL;

-- Add index for filtering by author type
CREATE INDEX IF NOT EXISTS idx_routines_author_type ON routines(author_type);

-- Add composite index for filtering public routines by author type
CREATE INDEX IF NOT EXISTS idx_routines_public_author ON routines(is_public, author_type)
  WHERE is_public = true;

-- ============================================================================
-- STEP 2: Set Default Values and Migrate Existing Data
-- ============================================================================

-- Mark all existing non-custom routines as official Soteria routines
UPDATE routines
SET
  author_type = 'official',
  official_author = 'Soteria Health Team'
WHERE is_custom = false;

-- Ensure all custom routines are marked as community routines
UPDATE routines
SET
  author_type = 'community',
  official_author = NULL
WHERE is_custom = true;

-- ============================================================================
-- STEP 3: Update RLS Policies
-- ============================================================================

-- Drop existing policies that need to be updated
DROP POLICY IF EXISTS "routines_select_policy" ON routines;
DROP POLICY IF EXISTS "routines_insert_policy" ON routines;
DROP POLICY IF EXISTS "routines_update_policy" ON routines;
DROP POLICY IF EXISTS "routines_delete_policy" ON routines;

-- SELECT policy: Users can see official routines and their own custom routines
CREATE POLICY "routines_select_policy" ON routines
  FOR SELECT TO authenticated
  USING (
    author_type = 'official'  -- All official routines are visible
    OR
    (author_type = 'community' AND is_public = true)  -- Public community routines
    OR
    (author_type = 'community' AND created_by = auth.uid())  -- User's own routines
  );

-- INSERT policy: Only authenticated users can create community routines
CREATE POLICY "routines_insert_policy" ON routines
  FOR INSERT TO authenticated
  WITH CHECK (
    author_type = 'community'
    AND created_by = auth.uid()
    AND is_custom = true
  );

-- UPDATE policy: Users can only update their own community routines
CREATE POLICY "routines_update_policy" ON routines
  FOR UPDATE TO authenticated
  USING (
    author_type = 'community'
    AND created_by = auth.uid()
  )
  WITH CHECK (
    author_type = 'community'
    AND created_by = auth.uid()
  );

-- DELETE policy: Users can only delete their own community routines
CREATE POLICY "routines_delete_policy" ON routines
  FOR DELETE TO authenticated
  USING (
    author_type = 'community'
    AND created_by = auth.uid()
  );

-- ============================================================================
-- STEP 4: Create Helper Function for Creating Official Routines
-- ============================================================================

-- Function to create official routines (for seeding/admin use)
-- This bypasses RLS and can only be called via SQL or admin functions
CREATE OR REPLACE FUNCTION create_official_routine(
  p_name TEXT,
  p_description TEXT,
  p_category TEXT,
  p_difficulty TEXT,
  p_duration_minutes INTEGER,
  p_exercises JSONB,
  p_image_url TEXT DEFAULT NULL,
  p_journey_focus TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_official_author TEXT DEFAULT 'Soteria Health Team'
)
RETURNS UUID AS $$
DECLARE
  v_routine_id UUID;
BEGIN
  INSERT INTO routines (
    name,
    description,
    category,
    difficulty,
    duration_minutes,
    exercises,
    image_url,
    journey_focus,
    tags,
    is_custom,
    author_type,
    official_author,
    is_public,
    created_by
  ) VALUES (
    p_name,
    p_description,
    p_category,
    p_difficulty,
    p_duration_minutes,
    p_exercises,
    p_image_url,
    p_journey_focus,
    p_tags,
    false,  -- Official routines are not custom
    'official',
    p_official_author,
    true,  -- Official routines are always public
    NULL  -- No user creator for official routines
  )
  RETURNING id INTO v_routine_id;

  RETURN v_routine_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role only (not to authenticated users)
GRANT EXECUTE ON FUNCTION create_official_routine TO service_role;

-- ============================================================================
-- STEP 5: Add Comments for Documentation
-- ============================================================================

COMMENT ON COLUMN routines.author_type IS 'Type of routine author: official (Soteria team) or community (user-created)';
COMMENT ON COLUMN routines.official_author IS 'Name of official author for official routines (e.g., "Soteria Health Team", "Dr. Smith")';
COMMENT ON FUNCTION create_official_routine IS 'Creates an official Soteria routine. Should only be called by service role for seeding content.';

-- ============================================================================
-- STEP 6: Verification Queries
-- ============================================================================

-- Check official routines
SELECT COUNT(*) as official_count FROM routines WHERE author_type = 'official';

-- Check community routines
SELECT COUNT(*) as community_count FROM routines WHERE author_type = 'community';

-- Verify indexes were created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'routines'
AND indexname LIKE '%author%';

-- Sample official routines
SELECT id, name, author_type, official_author, is_custom
FROM routines
WHERE author_type = 'official'
LIMIT 5;

-- Sample community routines
SELECT id, name, author_type, created_by, is_custom
FROM routines
WHERE author_type = 'community'
LIMIT 5;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next Steps:
-- 1. Update TypeScript types to include author_type and official_author
-- 2. Create author badge components
-- 3. Update RoutineCard components to display badges
-- 4. Add filter options in Discover tab
-- 5. Update routine detail pages
-- ============================================================================
