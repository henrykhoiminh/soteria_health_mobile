# Health Team System - Complete SQL Reference

## Table of Contents
1. [Migration Commands](#migration-commands)
2. [User Management](#user-management)
3. [Invitation Management](#invitation-management)
4. [Routine Management](#routine-management)
5. [Statistics & Analytics](#statistics--analytics)
6. [Troubleshooting](#troubleshooting)
7. [Activity Logging](#activity-logging)

---

## Migration Commands

### Run Initial Migration

```sql
-- Execute the complete health team migration
-- This creates tables, RLS policies, indexes, and helper functions
\i sql/migrations/add_health_team_invitations_and_permissions.sql
```

### Verify Migration Success

```sql
-- 1. Check health_team_invitations table
SELECT table_name, column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'health_team_invitations'
ORDER BY ordinal_position;

-- 2. Verify all RLS policies
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN ('health_team_invitations', 'routines')
ORDER BY tablename, policyname;

-- 3. Verify helper functions created
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name LIKE '%health_team%'
AND routine_schema = 'public'
ORDER BY routine_name;

-- 4. Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'health_team_invitations'
ORDER BY indexname;
```

---

## User Management

### View All Users

```sql
-- View all users with roles
SELECT
  p.id,
  p.full_name,
  p.username,
  p.role,
  u.email,
  p.created_at
FROM profiles p
JOIN auth.users u ON p.id = u.id
ORDER BY
  CASE
    WHEN p.role = 'admin' THEN 1
    WHEN p.role = 'health_team' THEN 2
    ELSE 3
  END,
  p.full_name;
```

### View Only Health Team Members

```sql
-- View all health_team and admin users
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
```

### Count Users by Role

```sql
SELECT
  role,
  COUNT(*) as user_count
FROM profiles
GROUP BY role
ORDER BY user_count DESC;
```

### Find Specific Users

```sql
-- By email
SELECT p.id, p.full_name, p.username, p.role, u.email
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'user@example.com';

-- By username
SELECT id, full_name, username, role
FROM profiles
WHERE username = 'johndoe';

-- By full name (partial match)
SELECT p.id, p.full_name, p.username, p.role, u.email
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.full_name ILIKE '%john%'
ORDER BY p.full_name;
```

### Promote Users to Health Team

```sql
-- By user ID
UPDATE profiles
SET role = 'health_team'
WHERE id = '00000000-0000-0000-0000-000000000000'; -- Replace with actual UUID

-- By email
UPDATE profiles
SET role = 'health_team'
WHERE id = (
  SELECT id FROM auth.users
  WHERE email = 'healthteam@soteriahealth.com'
);

-- By username
UPDATE profiles
SET role = 'health_team'
WHERE username = 'drjanesmith';

-- Bulk promote by emails
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
```

### Demote Health Team Members

```sql
-- Demote to regular user by ID
UPDATE profiles
SET role = 'user'
WHERE id = '00000000-0000-0000-0000-000000000000'; -- Replace with actual UUID

-- Demote by username
UPDATE profiles
SET role = 'user'
WHERE username = 'formerteammember';
```

### Promote to Admin

```sql
-- By ID
UPDATE profiles
SET role = 'admin'
WHERE id = '00000000-0000-0000-0000-000000000000'; -- Replace with actual UUID

-- By email
UPDATE profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM auth.users
  WHERE email = 'admin@soteriahealth.com'
);
```

---

## Invitation Management

### View All Invitations

```sql
-- View all invitations with details
SELECT
  hti.id,
  hti.status,
  hti.created_at,
  hti.responded_at,
  inviter.full_name as inviter_name,
  inviter.username as inviter_username,
  invitee.full_name as invitee_name,
  invitee.username as invitee_username
FROM health_team_invitations hti
JOIN profiles inviter ON hti.inviter_id = inviter.id
JOIN profiles invitee ON hti.invitee_id = invitee.id
ORDER BY hti.created_at DESC;
```

### View Pending Invitations

```sql
-- All pending invitations
SELECT
  hti.id,
  inviter.full_name as inviter_name,
  inviter.username as inviter_username,
  invitee.full_name as invitee_name,
  invitee.username as invitee_username,
  hti.created_at
FROM health_team_invitations hti
JOIN profiles inviter ON hti.inviter_id = inviter.id
JOIN profiles invitee ON hti.invitee_id = invitee.id
WHERE hti.status = 'pending'
ORDER BY hti.created_at DESC;
```

### View Invitations by User

```sql
-- Invitations sent by specific user
SELECT
  hti.id,
  hti.status,
  invitee.full_name as invitee_name,
  invitee.username as invitee_username,
  hti.created_at,
  hti.responded_at
FROM health_team_invitations hti
JOIN profiles invitee ON hti.invitee_id = invitee.id
WHERE hti.inviter_id = 'user-uuid-here' -- Replace with actual UUID
ORDER BY hti.created_at DESC;

-- Invitations received by specific user
SELECT
  hti.id,
  hti.status,
  inviter.full_name as inviter_name,
  inviter.username as inviter_username,
  hti.created_at,
  hti.responded_at
FROM health_team_invitations hti
JOIN profiles inviter ON hti.inviter_id = inviter.id
WHERE hti.invitee_id = 'user-uuid-here' -- Replace with actual UUID
ORDER BY hti.created_at DESC;
```

### Manually Accept/Decline Invitation

```sql
-- Accept invitation (admin operation)
UPDATE health_team_invitations
SET status = 'accepted', responded_at = NOW()
WHERE id = 'invitation-uuid-here';

-- Also promote the user
UPDATE profiles
SET role = 'health_team'
WHERE id = (
  SELECT invitee_id FROM health_team_invitations
  WHERE id = 'invitation-uuid-here'
);

-- Decline invitation (admin operation)
UPDATE health_team_invitations
SET status = 'declined', responded_at = NOW()
WHERE id = 'invitation-uuid-here';
```

### Delete Invitations

```sql
-- Delete specific invitation
DELETE FROM health_team_invitations
WHERE id = 'invitation-uuid-here';

-- Delete all declined invitations
DELETE FROM health_team_invitations
WHERE status = 'declined';

-- Delete old accepted invitations (cleanup)
DELETE FROM health_team_invitations
WHERE status = 'accepted'
AND responded_at < NOW() - INTERVAL '30 days';
```

---

## Routine Management

### View All Official Routines

```sql
-- View all official routines with creator info
SELECT
  r.id,
  r.name,
  r.official_author,
  r.category,
  r.difficulty,
  r.duration_minutes,
  r.completion_count,
  r.save_count,
  r.is_public,
  p.full_name as creator_name,
  p.username as creator_username,
  p.role as creator_role,
  r.created_at
FROM routines r
LEFT JOIN profiles p ON r.created_by = p.id
WHERE r.author_type = 'official'
ORDER BY r.created_at DESC;
```

### View Official Routines by Health Team Member

```sql
-- By username
SELECT
  r.id,
  r.name,
  r.official_author,
  r.category,
  r.completion_count,
  r.save_count,
  r.created_at
FROM routines r
JOIN profiles p ON r.created_by = p.id
WHERE r.author_type = 'official'
  AND p.username = 'drjanesmith' -- Replace with username
ORDER BY r.created_at DESC;

-- By user ID
SELECT
  r.id,
  r.name,
  r.official_author,
  r.category,
  r.completion_count,
  r.save_count,
  r.created_at
FROM routines r
WHERE r.author_type = 'official'
  AND r.created_by = 'user-uuid-here' -- Replace with UUID
ORDER BY r.created_at DESC;
```

### Most Popular Official Routines

```sql
-- By completions
SELECT
  r.id,
  r.name,
  r.official_author,
  r.category,
  r.completion_count,
  r.save_count,
  r.created_at
FROM routines r
WHERE r.author_type = 'official'
ORDER BY r.completion_count DESC
LIMIT 20;

-- By saves
SELECT
  r.id,
  r.name,
  r.official_author,
  r.category,
  r.completion_count,
  r.save_count,
  r.created_at
FROM routines r
WHERE r.author_type = 'official'
ORDER BY r.save_count DESC
LIMIT 20;
```

### Recently Created Official Routines

```sql
-- Last 30 days
SELECT
  r.id,
  r.name,
  r.official_author,
  r.category,
  p.full_name as creator,
  p.username as creator_username,
  r.created_at
FROM routines r
LEFT JOIN profiles p ON r.created_by = p.id
WHERE r.author_type = 'official'
  AND r.created_at > NOW() - INTERVAL '30 days'
ORDER BY r.created_at DESC;
```

### Update Official Routine Metadata

```sql
-- Update official author name
UPDATE routines
SET official_author = 'Dr. Jane Smith'
WHERE id = 'routine-uuid-here'; -- Replace with actual UUID

-- Bulk update official author for all routines by creator
UPDATE routines r
SET official_author = p.full_name
FROM profiles p
WHERE r.created_by = p.id
  AND r.author_type = 'official'
  AND p.id = 'user-uuid-here'; -- Replace with actual UUID
```

---

## Statistics & Analytics

### Health Team Productivity Report

```sql
-- Per health team member
SELECT
  p.full_name,
  p.username,
  COUNT(r.id) as routines_created,
  SUM(r.completion_count) as total_completions,
  ROUND(AVG(r.completion_count), 2) as avg_completions,
  SUM(r.save_count) as total_saves
FROM profiles p
LEFT JOIN routines r ON p.id = r.created_by AND r.author_type = 'official'
WHERE p.role IN ('health_team', 'admin')
GROUP BY p.id, p.full_name, p.username
ORDER BY routines_created DESC;
```

### Overall Routine Statistics

```sql
-- By author type
SELECT
  author_type,
  COUNT(*) as total_routines,
  SUM(completion_count) as total_completions,
  ROUND(AVG(completion_count), 2) as avg_completions_per_routine,
  SUM(save_count) as total_saves,
  COUNT(CASE WHEN is_public = true THEN 1 END) as public_routines
FROM routines
GROUP BY author_type;
```

### Routine Performance by Category

```sql
-- Official vs Community by category
SELECT
  category,
  author_type,
  COUNT(*) as routine_count,
  SUM(completion_count) as total_completions,
  ROUND(AVG(completion_count), 2) as avg_completions,
  SUM(save_count) as total_saves
FROM routines
GROUP BY category, author_type
ORDER BY category, author_type;
```

### Get Health Team Stats for User

```sql
-- Using helper function
SELECT * FROM get_health_team_stats('user-uuid-here');

-- Manual query
SELECT
  COUNT(r.id) as official_routines_created,
  COALESCE(SUM(r.completion_count), 0) as total_official_completions,
  COALESCE(SUM(r.save_count), 0) as official_routines_saved
FROM routines r
WHERE r.created_by = 'user-uuid-here' -- Replace with UUID
  AND r.author_type = 'official';
```

---

## Activity Logging

### View All Health Team Activities

```sql
-- All health_team related activities
SELECT
  fa.id,
  fa.activity_type,
  p.full_name,
  p.username,
  fa.activity_data,
  fa.created_at
FROM friend_activities fa
JOIN profiles p ON fa.user_id = p.id
WHERE fa.activity_type IN (
  'joined_health_team',
  'created_official_routine',
  'updated_official_routine'
)
ORDER BY fa.created_at DESC;
```

### View Users Who Joined Health Team

```sql
-- Via invitations
SELECT
  fa.created_at as joined_at,
  p.full_name,
  p.username,
  fa.activity_data->>'invited_by' as invited_by_id
FROM friend_activities fa
JOIN profiles p ON fa.user_id = p.id
WHERE fa.activity_type = 'joined_health_team'
ORDER BY fa.created_at DESC;
```

### View Official Routine Creation/Updates

```sql
-- Created
SELECT
  fa.created_at,
  p.full_name,
  p.username,
  fa.activity_data->>'routine_id' as routine_id,
  fa.activity_data->>'routine_name' as routine_name
FROM friend_activities fa
JOIN profiles p ON fa.user_id = p.id
WHERE fa.activity_type = 'created_official_routine'
ORDER BY fa.created_at DESC;

-- Updated
SELECT
  fa.created_at,
  p.full_name,
  p.username,
  fa.activity_data->>'routine_id' as routine_id,
  fa.activity_data->>'routine_name' as routine_name
FROM friend_activities fa
JOIN profiles p ON fa.user_id = p.id
WHERE fa.activity_type = 'updated_official_routine'
ORDER BY fa.created_at DESC;
```

---

## Troubleshooting

### Check User Permissions

```sql
-- Verify user role and health_team status
SELECT
  p.id,
  p.full_name,
  p.username,
  p.role,
  is_health_team_member(p.id) as is_health_team_check
FROM profiles p
WHERE p.id = 'user-uuid-here'; -- Replace with actual UUID
```

### Find Users with Invalid Roles

```sql
-- Find profiles with invalid role values
SELECT id, full_name, username, role
FROM profiles
WHERE role NOT IN ('user', 'health_team', 'admin')
  OR role IS NULL;
```

### Find Official Routines with Issues

```sql
-- Official routines not created by health_team
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

-- Orphaned official routines (no creator)
SELECT
  r.id,
  r.name,
  r.official_author,
  r.created_by,
  r.created_at
FROM routines r
WHERE r.author_type = 'official'
  AND r.created_by IS NULL;
```

### Check RLS Policies

```sql
-- View all policies on health_team tables
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
WHERE tablename IN ('health_team_invitations', 'routines', 'profiles')
ORDER BY tablename, policyname;
```

### Test Helper Functions

```sql
-- Test is_health_team_member for known users
SELECT
  p.id,
  p.full_name,
  p.role,
  is_health_team_member(p.id) as should_be_true
FROM profiles p
WHERE p.role IN ('health_team', 'admin')
LIMIT 5;

-- Test get_my_pending_health_team_invitations
-- Run as authenticated user via app
SELECT * FROM get_my_pending_health_team_invitations();

-- Test get_health_team_stats
SELECT * FROM get_health_team_stats('user-uuid-here');
```

---

## Cleanup and Maintenance

### Clean Up Old Invitations

```sql
-- Delete accepted invitations older than 30 days
DELETE FROM health_team_invitations
WHERE status = 'accepted'
  AND responded_at < NOW() - INTERVAL '30 days';

-- Delete declined invitations older than 7 days
DELETE FROM health_team_invitations
WHERE status = 'declined'
  AND responded_at < NOW() - INTERVAL '7 days';
```

### Reset Test Data

```sql
-- Reset test user to regular user
UPDATE profiles
SET role = 'user'
WHERE username = 'testuser';

-- Delete test invitations
DELETE FROM health_team_invitations
WHERE inviter_id = (SELECT id FROM profiles WHERE username = 'testuser')
  OR invitee_id = (SELECT id FROM profiles WHERE username = 'testuser');
```

### Database Backup Queries

```sql
-- Export health_team members (for backup)
COPY (
  SELECT p.id, p.full_name, p.username, p.role, u.email
  FROM profiles p
  JOIN auth.users u ON p.id = u.id
  WHERE p.role IN ('health_team', 'admin')
) TO '/path/to/health_team_backup.csv' WITH CSV HEADER;

-- Export official routines
COPY (
  SELECT r.*, p.username as creator_username
  FROM routines r
  LEFT JOIN profiles p ON r.created_by = p.id
  WHERE r.author_type = 'official'
) TO '/path/to/official_routines_backup.csv' WITH CSV HEADER;
```

---

## Quick Commands Cheatsheet

```sql
-- Promote user to health_team
UPDATE profiles SET role = 'health_team' WHERE username = 'USERNAME';

-- View all health_team members
SELECT full_name, username, role FROM profiles WHERE role IN ('health_team', 'admin');

-- View pending invitations
SELECT * FROM health_team_invitations WHERE status = 'pending';

-- Get user stats
SELECT * FROM get_health_team_stats('USER_UUID');

-- View official routines
SELECT name, official_author, completion_count FROM routines WHERE author_type = 'official' ORDER BY created_at DESC LIMIT 10;

-- Delete invitation
DELETE FROM health_team_invitations WHERE id = 'INVITATION_UUID';
```

---

## Important Notes

1. **Always use UUIDs**: Replace placeholder UUIDs with actual user IDs
2. **Test first**: Run queries on staging/dev database before production
3. **Backup**: Always backup before bulk operations
4. **RLS**: Changes take effect immediately, users may need to refresh
5. **Auditing**: All role changes should be logged for security

---

For complete implementation details, see `HEALTH_TEAM_IMPLEMENTATION_GUIDE.md`
