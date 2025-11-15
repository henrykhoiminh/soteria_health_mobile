-- Database Migration: Journey Focus Enhancements
-- Description: Add journey tracking fields and recovery-specific features

-- ============================================================================
-- 1. Add new columns to profiles table
-- ============================================================================

-- Add journey_started_at to track when the user began their journey
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS journey_started_at timestamptz;

-- Add recovery_areas as an array for multi-select body parts
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS recovery_areas text[];

-- Add recovery_goals as an array for predefined recovery goals
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS recovery_goals text[];

-- Drop old single-value columns if they exist (migration from old schema)
ALTER TABLE profiles
DROP COLUMN IF EXISTS recovery_area;

ALTER TABLE profiles
DROP COLUMN IF EXISTS recovery_notes;

-- Add comments to document the new fields
COMMENT ON COLUMN profiles.recovery_areas IS 'Array of body parts user is recovering from (e.g., [''Lower Back'', ''Knee''])';
COMMENT ON COLUMN profiles.recovery_goals IS 'Array of predefined recovery goals selected by user';

-- ============================================================================
-- 2. Create journey_goals table for tracking user-defined journey goals
-- ============================================================================

CREATE TABLE IF NOT EXISTS journey_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  journey_focus text NOT NULL CHECK (journey_focus IN ('Injury Prevention', 'Recovery')),
  target_description text NOT NULL,
  target_date date,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT valid_journey_focus CHECK (journey_focus IN ('Injury Prevention', 'Recovery'))
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_journey_goals_user_id ON journey_goals(user_id);

-- Create index on is_active for filtering active goals
CREATE INDEX IF NOT EXISTS idx_journey_goals_is_active ON journey_goals(is_active);

-- Add comment to document the table
COMMENT ON TABLE journey_goals IS 'User-defined goals for their wellness journey, supporting both Injury Prevention and Recovery tracks';

-- ============================================================================
-- 3. Ensure routines table has journey_focus column as text array
-- ============================================================================

-- The journey_focus column should already exist based on the types definition
-- This statement will only add it if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'routines' AND column_name = 'journey_focus'
  ) THEN
    ALTER TABLE routines ADD COLUMN journey_focus text[];
  END IF;
END $$;

-- Add comment to document the journey_focus field
COMMENT ON COLUMN routines.journey_focus IS 'Array of journey focuses this routine supports: Injury Prevention and/or Recovery';

-- ============================================================================
-- 4. Update existing routines with appropriate journey_focus tags
-- ============================================================================

-- This section provides example SQL to tag existing routines
-- Adjust the WHERE conditions based on your actual routine data

-- Example: Tag all Mind routines for both journeys (mental wellness helps everyone)
UPDATE routines
SET journey_focus = ARRAY['Injury Prevention', 'Recovery']
WHERE category = 'Mind'
  AND (journey_focus IS NULL OR journey_focus = '{}');

-- Example: Tag Body routines based on difficulty
-- Beginner/Intermediate Body routines for Recovery
UPDATE routines
SET journey_focus = ARRAY['Recovery']
WHERE category = 'Body'
  AND difficulty IN ('Beginner', 'Intermediate')
  AND (journey_focus IS NULL OR journey_focus = '{}');

-- Advanced Body routines for Injury Prevention
UPDATE routines
SET journey_focus = ARRAY['Injury Prevention']
WHERE category = 'Body'
  AND difficulty = 'Advanced'
  AND (journey_focus IS NULL OR journey_focus = '{}');

-- Soul routines for both journeys
UPDATE routines
SET journey_focus = ARRAY['Injury Prevention', 'Recovery']
WHERE category = 'Soul'
  AND (journey_focus IS NULL OR journey_focus = '{}');

-- ============================================================================
-- 5. Set journey_started_at for existing users based on created_at
-- ============================================================================

-- Initialize journey_started_at for existing users who have completed onboarding
UPDATE profiles
SET journey_started_at = created_at
WHERE journey_focus IS NOT NULL
  AND journey_started_at IS NULL;

-- ============================================================================
-- 6. Add RLS (Row Level Security) policies for journey_goals table
-- ============================================================================

-- Enable RLS on journey_goals table
ALTER TABLE journey_goals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to make migration idempotent)
DROP POLICY IF EXISTS "Users can view own journey goals" ON journey_goals;
DROP POLICY IF EXISTS "Users can insert own journey goals" ON journey_goals;
DROP POLICY IF EXISTS "Users can update own journey goals" ON journey_goals;
DROP POLICY IF EXISTS "Users can delete own journey goals" ON journey_goals;

-- Policy: Users can view their own journey goals
CREATE POLICY "Users can view own journey goals"
  ON journey_goals FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own journey goals
CREATE POLICY "Users can insert own journey goals"
  ON journey_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own journey goals
CREATE POLICY "Users can update own journey goals"
  ON journey_goals FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own journey goals
CREATE POLICY "Users can delete own journey goals"
  ON journey_goals FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

-- Verification queries (run these after migration to verify success):
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'profiles' AND column_name IN ('journey_started_at', 'recovery_areas', 'recovery_goals');
-- SELECT * FROM journey_goals LIMIT 5;
-- SELECT name, category, journey_focus FROM routines WHERE journey_focus IS NOT NULL LIMIT 10;
