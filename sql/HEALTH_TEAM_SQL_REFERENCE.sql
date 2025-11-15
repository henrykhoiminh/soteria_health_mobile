-- ============================================================================
-- HEALTH TEAM ROLE SYSTEM - SQL REFERENCE GUIDE
-- ============================================================================
-- Quick reference for common Health Team management operations
-- ============================================================================

-- ============================================================================
-- 1. VIEW USERS AND ROLES
-- ============================================================================

-- View all Health Team members and admins
SELECT
  p.id,
  p.full_name,
  p.username,
  p.role,
  u.email,
  p.created_at
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.role IN ('health_team', 'admin')
ORDER BY p.role, p.full_name;

-- View all users with their roles
SELECT
  p.id,
  p.full_name,
  p.username,
  p.role,
  u.email
FROM profiles p
JOIN auth.users u ON p.id = u.id
ORDER BY
  CASE
    WHEN p.role = 'admin' THEN 1
    WHEN p.role = 'health_team' THEN 2
    ELSE 3
  END,
  p.full_name;

-- Count users by role
SELECT role, COUNT(*) as user_count
FROM profiles
GROUP BY role
ORDER BY user_count DESC;

-- ============================================================================
-- 2. FIND USERS (Before Promoting)
-- ============================================================================

-- Find user by email
SELECT
  p.id,
  p.full_name,
  p.username,
  p.role,
  u.email
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'user@example.com';

-- Find user by username
SELECT id, full_name, username, role
FROM profiles
WHERE username = 'johndoe';

-- Find user by full name (partial match)
SELECT
  p.id,
  p.full_name,
  p.username,
  p.role,
  u.email
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.full_name ILIKE '%john%'
ORDER BY p.full_name;

-- ============================================================================
-- 3. PROMOTE USERS TO HEALTH TEAM
-- ============================================================================

-- Promote by user ID
UPDATE profiles
SET role = 'health_team'
WHERE id = '00000000-0000-0000-0000-000000000000'; -- Replace with actual UUID

-- Promote by email
UPDATE profiles
SET role = 'health_team'
WHERE id = (
  SELECT id FROM auth.users
  WHERE email = 'healthteam@soteriahealth.com'
);

-- Promote by username
UPDATE profiles
SET role = 'health_team'
WHERE username = 'drjanesmith';

-- Promote multiple users at once (by email)
UPDATE profiles
SET role = 'health_team'
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email IN (
    'healthteam1@soteriahealth.com',
    'healthteam2@soteriahealth.com',
    'healthteam3@soteriahealth.com'
  )
);

-- ============================================================================
-- 4. DEMOTE USERS (Remove Health Team Role)
-- ============================================================================

-- Demote to regular user by ID
UPDATE profiles
SET role = 'user'
WHERE id = '00000000-0000-0000-0000-000000000000'; -- Replace with actual UUID

-- Demote to regular user by username
UPDATE profiles
SET role = 'user'
WHERE username = 'formerteammember';

-- ============================================================================
-- 5. PROMOTE TO ADMIN
-- ============================================================================

-- Promote to admin by ID
UPDATE profiles
SET role = 'admin'
WHERE id = '00000000-0000-0000-0000-000000000000'; -- Replace with actual UUID

-- Promote to admin by email
UPDATE profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM auth.users
  WHERE email = 'admin@soteriahealth.com'
);

-- ============================================================================
-- 6. VIEW OFFICIAL ROUTINES
-- ============================================================================

-- View all official routines with creator info
SELECT
  r.id,
  r.name,
  r.official_author,
  r.category,
  r.difficulty,
  r.duration_minutes,
  r.completion_count,
  r.is_public,
  p.full_name as creator_name,
  p.username as creator_username,
  p.role as creator_role,
  r.created_at
FROM routines r
LEFT JOIN profiles p ON r.created_by = p.id
WHERE r.author_type = 'official'
ORDER BY r.created_at DESC;

-- View official routines by specific Health Team member
SELECT
  r.id,
  r.name,
  r.official_author,
  r.category,
  r.completion_count,
  r.created_at
FROM routines r
JOIN profiles p ON r.created_by = p.id
WHERE r.author_type = 'official'
  AND p.username = 'drjanesmith' -- Replace with username
ORDER BY r.created_at DESC;

-- Count official routines by creator
SELECT
  p.full_name,
  p.username,
  COUNT(r.id) as routine_count
FROM profiles p
LEFT JOIN routines r ON p.id = r.created_by AND r.author_type = 'official'
WHERE p.role IN ('health_team', 'admin')
GROUP BY p.id, p.full_name, p.username
ORDER BY routine_count DESC;

-- Most popular official routines
SELECT
  r.id,
  r.name,
  r.official_author,
  r.category,
  r.completion_count,
  r.created_at
FROM routines r
WHERE r.author_type = 'official'
ORDER BY r.completion_count DESC
LIMIT 20;

-- Recently created official routines
SELECT
  r.id,
  r.name,
  r.official_author,
  r.category,
  p.full_name as creator,
  r.created_at
FROM routines r
LEFT JOIN profiles p ON r.created_by = p.id
WHERE r.author_type = 'official'
  AND r.created_at > NOW() - INTERVAL '30 days'
ORDER BY r.created_at DESC;

-- ============================================================================
-- 7. VIEW COMMUNITY ROUTINES
-- ============================================================================

-- View public community routines
SELECT
  r.id,
  r.name,
  r.category,
  r.completion_count,
  p.full_name as creator_name,
  p.username as creator_username,
  r.created_at
FROM routines r
JOIN profiles p ON r.created_by = p.id
WHERE r.author_type = 'community'
  AND r.is_public = true
ORDER BY r.created_at DESC
LIMIT 50;

-- Most popular community routines
SELECT
  r.id,
  r.name,
  r.category,
  r.completion_count,
  p.username as creator,
  r.created_at
FROM routines r
JOIN profiles p ON r.created_by = p.id
WHERE r.author_type = 'community'
  AND r.is_public = true
ORDER BY r.completion_count DESC
LIMIT 20;

-- ============================================================================
-- 8. STATISTICS AND ANALYTICS
-- ============================================================================

-- Overall routine statistics by type
SELECT
  author_type,
  COUNT(*) as total_routines,
  SUM(completion_count) as total_completions,
  ROUND(AVG(completion_count), 2) as avg_completions_per_routine,
  COUNT(CASE WHEN is_public = true THEN 1 END) as public_routines
FROM routines
GROUP BY author_type;

-- Health Team productivity report
SELECT
  p.full_name,
  p.username,
  COUNT(r.id) as routines_created,
  SUM(r.completion_count) as total_completions,
  ROUND(AVG(r.completion_count), 2) as avg_completions
FROM profiles p
LEFT JOIN routines r ON p.id = r.created_by AND r.author_type = 'official'
WHERE p.role = 'health_team'
GROUP BY p.id, p.full_name, p.username
ORDER BY routines_created DESC;

-- Routine performance by category (official vs community)
SELECT
  category,
  author_type,
  COUNT(*) as routine_count,
  SUM(completion_count) as total_completions,
  ROUND(AVG(completion_count), 2) as avg_completions
FROM routines
GROUP BY category, author_type
ORDER BY category, author_type;

-- ============================================================================
-- 9. TESTING AND VERIFICATION
-- ============================================================================

-- Test is_health_team_member function for all users with non-default roles
SELECT
  p.id,
  p.full_name,
  p.role,
  is_health_team_member(p.id) as is_health_team_check
FROM profiles p
WHERE p.role != 'user'
ORDER BY p.role;

-- Verify RLS policies exist and are enabled
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'routines'
ORDER BY policyname;

-- Check if role column exists and has correct constraints
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name = 'role';

-- Verify role check constraint
SELECT
  constraint_name,
  constraint_type,
  check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'profiles'
  AND cc.check_clause LIKE '%role%';

-- ============================================================================
-- 10. TROUBLESHOOTING QUERIES
-- ============================================================================

-- Find users who might have incorrect role values
SELECT id, full_name, username, role
FROM profiles
WHERE role NOT IN ('user', 'health_team', 'admin')
  OR role IS NULL;

-- Find official routines not created by Health Team members
SELECT
  r.id,
  r.name,
  r.author_type,
  p.role as creator_role,
  p.full_name as creator_name
FROM routines r
LEFT JOIN profiles p ON r.created_by = p.id
WHERE r.author_type = 'official'
  AND (p.role NOT IN ('health_team', 'admin') OR p.role IS NULL);

-- Find community routines created by Health Team members
SELECT
  r.id,
  r.name,
  r.author_type,
  p.role as creator_role,
  p.full_name as creator_name
FROM routines r
JOIN profiles p ON r.created_by = p.id
WHERE r.author_type = 'community'
  AND p.role IN ('health_team', 'admin');

-- Check for orphaned official routines (no creator)
SELECT
  r.id,
  r.name,
  r.official_author,
  r.created_by,
  r.created_at
FROM routines r
WHERE r.author_type = 'official'
  AND r.created_by IS NULL;

-- ============================================================================
-- 11. CLEANUP AND MAINTENANCE
-- ============================================================================

-- Reset test user to regular user role
UPDATE profiles
SET role = 'user'
WHERE username = 'testuser';

-- Delete test official routines (BE CAREFUL!)
-- DELETE FROM routines
-- WHERE author_type = 'official'
--   AND name LIKE '%TEST%';

-- Update official author name for a specific routine
UPDATE routines
SET official_author = 'Dr. Jane Smith'
WHERE id = '00000000-0000-0000-0000-000000000000'; -- Replace with actual UUID

-- Bulk update official author for all routines by a specific creator
UPDATE routines r
SET official_author = p.full_name
FROM profiles p
WHERE r.created_by = p.id
  AND r.author_type = 'official'
  AND p.id = '00000000-0000-0000-0000-000000000000'; -- Replace with actual UUID

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Always replace placeholder UUIDs with actual user IDs
-- 2. Test queries on staging/development database first
-- 3. Be cautious with DELETE operations (commented out by default)
-- 4. Role changes take effect immediately for new operations
-- 5. Users may need to refresh app to see role-based UI changes
-- ============================================================================
