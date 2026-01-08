-- ============================================================================
-- ALLOW ALL USERS TO CREATE EXERCISES
-- ============================================================================
-- Description: Updates RLS policy to allow all authenticated users to create
-- their own (non-official) exercises. Health team can still create official ones.
-- ============================================================================

-- Drop the existing insert policy
DROP POLICY IF EXISTS "health_team_can_create_exercises" ON exercises;

-- Create new policy: All authenticated users can create exercises
-- - Regular users can only create non-official exercises (is_official must be false)
-- - Health team/admin can create both official and non-official exercises
CREATE POLICY "authenticated_users_can_create_exercises"
ON exercises FOR INSERT
TO authenticated
WITH CHECK (
  -- The exercise must have created_by set to the current user
  created_by = auth.uid()
  AND (
    -- Option 1: Non-official exercise (anyone can create)
    is_official = false
    OR
    -- Option 2: Official exercise (only health_team/admin)
    (is_official = true AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('health_team', 'admin')
    ))
  )
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check the new policy exists
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'exercises' AND cmd = 'INSERT';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT
  '✓ Exercise insert policy updated!' as status,
  'All users can now create their own exercises' as result;

-- ============================================================================
-- NOTES
-- ============================================================================
-- • All authenticated users can now INSERT exercises
-- • Regular users must set is_official = false
-- • created_by must match the current user's auth.uid()
-- • Health team can still create official exercises (is_official = true)
-- ============================================================================
