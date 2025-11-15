-- ============================================================================
-- HEALTH TEAM ROLE SYSTEM
-- ============================================================================
-- Adds role-based permissions allowing designated Soteria team members to
-- create and publish official routines directly to the Discover feed
-- ============================================================================

-- ============================================================================
-- STEP 1: Add Role Column to Profiles Table
-- ============================================================================

-- Add role column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'
  CHECK (role IN ('user', 'health_team', 'admin'));

-- Add index for filtering by role
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Add comment for documentation
COMMENT ON COLUMN profiles.role IS 'User role: user (default), health_team (Soteria wellness creators), admin (full permissions)';

-- ============================================================================
-- STEP 2: Assign Health Team Role to Specific Users
-- ============================================================================

-- IMPORTANT: Replace these email addresses with the actual Health Team members
-- You can also use user IDs instead of emails if preferred

-- Method 1: Assign by email (RECOMMENDED - Replace with actual emails)
-- UPDATE profiles SET role = 'health_team' WHERE email = 'healthteam1@soteriahealth.com';
-- UPDATE profiles SET role = 'health_team' WHERE email = 'healthteam2@soteriahealth.com';

-- Method 2: Assign by user ID (Replace with actual UUIDs)
-- UPDATE profiles SET role = 'health_team' WHERE id = 'uuid-goes-here';
-- UPDATE profiles SET role = 'health_team' WHERE id = 'another-uuid-goes-here';

-- To find user IDs or emails, you can query:
-- SELECT id, email, full_name, username FROM auth.users;
-- or
-- SELECT id, full_name, username FROM profiles;

-- ============================================================================
-- STEP 3: Update Routines RLS Policies for Health Team
-- ============================================================================

-- Drop existing routine policies
DROP POLICY IF EXISTS "routines_select_policy" ON routines;
DROP POLICY IF EXISTS "routines_insert_policy" ON routines;
DROP POLICY IF EXISTS "routines_update_policy" ON routines;
DROP POLICY IF EXISTS "routines_delete_policy" ON routines;

-- SELECT policy: Users can see official routines, public community routines, and their own routines
CREATE POLICY "routines_select_policy" ON routines
  FOR SELECT TO authenticated
  USING (
    author_type = 'official'  -- All official routines are visible
    OR
    (author_type = 'community' AND is_public = true)  -- Public community routines
    OR
    (author_type = 'community' AND created_by = auth.uid())  -- User's own routines
  );

-- INSERT policy: Health team can create official routines, regular users create community routines
CREATE POLICY "routines_insert_policy" ON routines
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Health Team members can create official routines
    (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('health_team', 'admin')
      )
      AND author_type = 'official'
      AND is_custom = false
    )
    OR
    -- Regular users can create community routines
    (
      author_type = 'community'
      AND created_by = auth.uid()
      AND is_custom = true
    )
  );

-- UPDATE policy: Health team can update official routines, users can update their own community routines
CREATE POLICY "routines_update_policy" ON routines
  FOR UPDATE TO authenticated
  USING (
    -- Health Team can update official routines they created
    (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('health_team', 'admin')
      )
      AND author_type = 'official'
      AND created_by = auth.uid()
    )
    OR
    -- Regular users can update their own community routines
    (
      author_type = 'community'
      AND created_by = auth.uid()
    )
  )
  WITH CHECK (
    -- Maintain same constraints on update
    (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('health_team', 'admin')
      )
      AND author_type = 'official'
      AND created_by = auth.uid()
    )
    OR
    (
      author_type = 'community'
      AND created_by = auth.uid()
    )
  );

-- DELETE policy: Health team can delete official routines, users can delete their own community routines
CREATE POLICY "routines_delete_policy" ON routines
  FOR DELETE TO authenticated
  USING (
    -- Health Team can delete official routines they created
    (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('health_team', 'admin')
      )
      AND author_type = 'official'
      AND created_by = auth.uid()
    )
    OR
    -- Regular users can delete their own community routines
    (
      author_type = 'community'
      AND created_by = auth.uid()
    )
  );

-- ============================================================================
-- STEP 4: Create Helper Functions
-- ============================================================================

-- Function to check if a user is a Health Team member
CREATE OR REPLACE FUNCTION is_health_team_member(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
    AND role IN ('health_team', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION is_health_team_member TO authenticated;

-- Function to create official routine (for Health Team use via app)
CREATE OR REPLACE FUNCTION create_official_routine_by_health_team(
  p_name TEXT,
  p_description TEXT,
  p_category TEXT,
  p_difficulty TEXT,
  p_duration_minutes INTEGER,
  p_exercises JSONB,
  p_journey_focus TEXT[],
  p_image_url TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_body_parts TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_official_author TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_routine_id UUID;
  v_user_id UUID;
  v_user_name TEXT;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();

  -- Verify user is health team member
  IF NOT is_health_team_member(v_user_id) THEN
    RAISE EXCEPTION 'Only Health Team members can create official routines';
  END IF;

  -- Get user's full name for author attribution
  SELECT full_name INTO v_user_name
  FROM profiles
  WHERE id = v_user_id;

  -- Use provided official_author or fall back to user's name or default
  IF p_official_author IS NULL OR p_official_author = '' THEN
    IF v_user_name IS NOT NULL AND v_user_name != '' THEN
      p_official_author := v_user_name;
    ELSE
      p_official_author := 'Soteria Health Team';
    END IF;
  END IF;

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
    body_parts,
    is_custom,
    author_type,
    official_author,
    is_public,
    created_by,
    completion_count,
    benefits
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
    p_body_parts,
    false,  -- Official routines are not custom
    'official',
    p_official_author,
    true,  -- Official routines are always public
    v_user_id,  -- Track which Health Team member created it
    0,
    ARRAY[]::TEXT[]
  )
  RETURNING id INTO v_routine_id;

  RETURN v_routine_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (function will check permissions internally)
GRANT EXECUTE ON FUNCTION create_official_routine_by_health_team TO authenticated;

-- ============================================================================
-- STEP 5: Helper SQL for Managing Health Team Members
-- ============================================================================

-- Query to view all Health Team members
-- SELECT id, full_name, username, role, created_at
-- FROM profiles
-- WHERE role IN ('health_team', 'admin')
-- ORDER BY role, full_name;

-- Promote a user to Health Team (by user ID)
-- UPDATE profiles SET role = 'health_team' WHERE id = 'user-uuid-here';

-- Promote a user to Health Team (by username)
-- UPDATE profiles SET role = 'health_team' WHERE username = 'username-here';

-- Demote a Health Team member back to regular user
-- UPDATE profiles SET role = 'user' WHERE id = 'user-uuid-here';

-- Promote a user to Admin
-- UPDATE profiles SET role = 'admin' WHERE id = 'user-uuid-here';

-- View all official routines created by Health Team
-- SELECT
--   r.id,
--   r.name,
--   r.official_author,
--   r.category,
--   r.completion_count,
--   p.full_name as creator_name,
--   p.role as creator_role
-- FROM routines r
-- LEFT JOIN profiles p ON r.created_by = p.id
-- WHERE r.author_type = 'official'
-- ORDER BY r.created_at DESC;

-- ============================================================================
-- STEP 6: Verification Queries
-- ============================================================================

-- Check that role column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'role';

-- Check Health Team members
SELECT id, full_name, username, role
FROM profiles
WHERE role IN ('health_team', 'admin');

-- Verify indexes were created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'profiles'
AND indexname LIKE '%role%';

-- Test the helper function
SELECT is_health_team_member(id) as is_health_team, full_name, role
FROM profiles
LIMIT 5;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next Steps:
-- 1. Manually assign Health Team role to specific users (see STEP 2)
-- 2. Update TypeScript types to include role field
-- 3. Modify routine creation logic to support Health Team workflows
-- 4. Add UI indicators for Health Team members in Routine Builder
-- 5. Add Health Team badge to profile displays
-- 6. Update Discover feed to show "Soteria Official" badges
-- ============================================================================
