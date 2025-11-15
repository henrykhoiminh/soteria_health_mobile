-- =====================================================
-- DIAGNOSTIC: Check ALL RLS Policies
-- =====================================================
-- This will show us every RLS policy that exists
-- and might be causing the infinite recursion
-- =====================================================

-- Show ALL policies in the database
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Specifically check circles policies
SELECT
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'circles'
AND schemaname = 'public';

-- Check circle_members policies
SELECT
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'circle_members'
AND schemaname = 'public';

-- Check circle_invitations policies
SELECT
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'circle_invitations'
AND schemaname = 'public';

-- Check friend_activity policies (might be joining to circles)
SELECT
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'friend_activity'
AND schemaname = 'public';
