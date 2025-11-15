-- =====================================================
-- Test Query for Circle Invitations
-- =====================================================
-- Run this in Supabase SQL Editor to verify the data
-- structure and foreign key relationships
-- =====================================================

-- Step 1: Check the circle_invitations table structure
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'circle_invitations'
ORDER BY ordinal_position;

-- Step 2: Check foreign key constraints
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'circle_invitations'
  AND tc.constraint_type = 'FOREIGN KEY';

-- Step 3: Sample query to see actual data
SELECT
  ci.id,
  ci.circle_id,
  ci.invitee_id,
  ci.status,
  c.name AS circle_name,
  c.is_private,
  p.username AS inviter_username,
  p.full_name AS inviter_name
FROM circle_invitations ci
LEFT JOIN circles c ON ci.circle_id = c.id
LEFT JOIN profiles p ON ci.inviter_id = p.id
WHERE ci.status = 'pending'
LIMIT 5;

-- Step 4: Check if there are any NULL circle_ids
SELECT
  id,
  circle_id,
  invitee_id,
  status,
  created_at
FROM circle_invitations
WHERE circle_id IS NULL;
