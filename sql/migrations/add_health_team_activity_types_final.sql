-- ============================================================================
-- ADD HEALTH TEAM ACTIVITY TYPES TO FRIEND_ACTIVITY CONSTRAINT (FINAL)
-- ============================================================================
-- This migration updates the activity_type check constraint to include
-- all existing activity types PLUS the new health team types
-- ============================================================================

-- Drop the existing constraint
ALTER TABLE public.friend_activity
DROP CONSTRAINT IF EXISTS friend_activity_activity_type_check;

-- Add the constraint with ALL activity types
ALTER TABLE public.friend_activity
ADD CONSTRAINT friend_activity_activity_type_check
CHECK (activity_type IN (
  -- Existing activity types (found in your database)
  'completed_routine',
  'completed_circle_routine',
  'created_routine',
  'added_routine_to_circle',
  'joined_circle',
  'invited_to_circle',
  -- Additional existing types that might be used
  'left_circle',
  'shared_routine',
  'removed_from_circle',
  'member_joined',
  'joined_soteria',
  'streak_milestone',
  -- NEW: Health Team activity types
  'joined_health_team',
  'created_official_routine',
  'updated_official_routine'
));

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify the constraint was updated
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'friend_activity_activity_type_check';

-- Verify all existing data passes the constraint
SELECT COUNT(*) as total_rows
FROM public.friend_activity;

-- This should return 0 rows (meaning all data is valid)
SELECT DISTINCT activity_type
FROM public.friend_activity
WHERE activity_type NOT IN (
  'completed_routine',
  'completed_circle_routine',
  'created_routine',
  'added_routine_to_circle',
  'joined_circle',
  'invited_to_circle',
  'left_circle',
  'shared_routine',
  'removed_from_circle',
  'member_joined',
  'joined_soteria',
  'streak_milestone',
  'joined_health_team',
  'created_official_routine',
  'updated_official_routine'
);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Summary:
-- ✓ Dropped old constraint
-- ✓ Added new constraint with all existing types + health team types
-- ✓ Verified constraint is valid for all existing data
--
-- You can now accept Health Team invitations successfully!
-- ============================================================================
