-- ============================================================================
-- ADD DELETE POLICY FOR HEALTH TEAM MEMBERS
-- ============================================================================
-- Allows health_team and admin users to delete official routines
-- ============================================================================

-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "health_team_can_delete_official_routines" ON public.routines;

-- Create policy allowing health_team/admin to delete official routines
CREATE POLICY "health_team_can_delete_official_routines"
ON public.routines
FOR DELETE
TO authenticated
USING (
  -- Allow health_team or admin users to delete official routines
  (
    author_type = 'official'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('health_team', 'admin')
    )
  )
  OR
  -- Allow users to delete their own custom routines
  (
    is_custom = true
    AND created_by = auth.uid()
  )
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- List all delete policies on routines table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'routines'
AND cmd = 'DELETE';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
