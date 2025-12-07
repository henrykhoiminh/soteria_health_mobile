-- Migration: Allow health_team members to update custom routines (for conversion to official)
-- Created: 2025-11-22
-- Purpose: Enable health_team members to convert community custom routines to official routines

-- Drop existing update policies if they exist
DROP POLICY IF EXISTS "routines_update_policy" ON routines;
DROP POLICY IF EXISTS "health_team_can_update_official_routines" ON routines;
DROP POLICY IF EXISTS "health_team_can_update_any_routine" ON routines;

-- Create new comprehensive update policy
-- This allows:
-- 1. Health team/admin to update ANY routine (official or custom)
-- 2. Regular users to update ONLY their own community routines
CREATE POLICY "health_team_can_update_any_routine"
ON routines FOR UPDATE
USING (
  -- Health team can update any routine
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('health_team', 'admin')
  )
  OR
  -- Regular users can only update their own community routines
  (author_type = 'community' AND created_by = auth.uid())
)
WITH CHECK (
  -- Health team can update to any state
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('health_team', 'admin')
  )
  OR
  -- Regular users can only update their own community routines
  (author_type = 'community' AND created_by = auth.uid())
);

-- Add helpful comment
COMMENT ON POLICY "health_team_can_update_any_routine" ON routines IS
'Allows health_team/admin to update any routine (for converting custom to official). Regular users can only update their own community routines.';
