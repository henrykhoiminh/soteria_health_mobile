-- =====================================================
-- Fix Friend Activity RLS for Circle Activity Logging
-- =====================================================
-- This migration fixes the RLS policy to allow recording
-- activities on behalf of other users (e.g., when inviting
-- or removing members from circles)
--
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- First, update the CHECK constraint to include new activity types
ALTER TABLE public.friend_activity
DROP CONSTRAINT IF EXISTS friend_activity_activity_type_check;

ALTER TABLE public.friend_activity
ADD CONSTRAINT friend_activity_activity_type_check
CHECK (activity_type IN (
  'completed_routine',
  'created_routine',
  'streak_milestone',
  'joined_circle',
  'left_circle',
  'invited_to_circle',
  'removed_from_circle',
  'shared_routine'
));

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can create their own activity" ON public.friend_activity;
DROP POLICY IF EXISTS "Users can create own activities" ON public.friend_activity;

-- Create a database function to record activities with elevated privileges
CREATE OR REPLACE FUNCTION public.record_friend_activity(
  p_user_id UUID,
  p_activity_type TEXT,
  p_related_routine_id UUID DEFAULT NULL,
  p_related_circle_id UUID DEFAULT NULL,
  p_activity_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  -- Insert the activity record
  INSERT INTO public.friend_activity (
    user_id,
    activity_type,
    related_routine_id,
    related_circle_id,
    activity_data
  ) VALUES (
    p_user_id,
    p_activity_type,
    p_related_routine_id,
    p_related_circle_id,
    p_activity_data
  )
  RETURNING id INTO v_activity_id;

  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.record_friend_activity TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.record_friend_activity IS 'Records activity with elevated privileges to bypass RLS for system-generated activities';

-- Recreate the INSERT policy to only allow users to insert their own activities directly
-- (The function above will be used for activities on behalf of others)
CREATE POLICY "Users can create own activities"
  ON public.friend_activity
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Successfully created record_friend_activity function with SECURITY DEFINER';
  RAISE NOTICE 'Use this function to record activities on behalf of other users';
END $$;
