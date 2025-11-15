# Health Team Role System - Setup Guide

## Overview

The Health Team role system allows designated Soteria team members to create and publish official routines directly to the Discover feed with special permissions. This system implements role-based access control with three user roles:

- **user** (default): Regular app users who create community routines
- **health_team**: Soteria wellness creators who can create official routines
- **admin**: Full administrative permissions (future use)

## Features Implemented

### 1. Database Changes
- Added `role` column to `profiles` table with values: `user`, `health_team`, `admin`
- Updated RLS policies to allow Health Team members to create official routines
- Created helper functions for role checking and official routine creation
- Added indexes for efficient role filtering

### 2. Health Team Permissions
- ✅ Create unlimited official routines (bypass user limits)
- ✅ Routines automatically marked as `author_type: 'official'`
- ✅ Routines always published to Discover (`is_public: true`)
- ✅ Official author attribution (defaults to user's full name or "Soteria Health Team")
- ✅ Can update and delete their own official routines

### 3. UI Components
- **Routine Builder**: Health Team banner with toggle to switch between official/community routine creation
- **Profile Screen**: "Soteria Health Team" badge displayed on Health Team member profiles
- **Discover Feed**: Official routines show "@soteriahealthteam" with Soteria logo badge

## Installation Steps

### Step 1: Run Database Migration

Execute the SQL migration to add the role system and update RLS policies:

```bash
# Open your Supabase SQL Editor or connect via psql
psql -h your-db-host -U postgres -d your-database

# Run the migration file
\i sql/migrations/add_health_team_role_system.sql
```

Or paste the contents of `sql/migrations/add_health_team_role_system.sql` into the Supabase SQL Editor.

### Step 2: Assign Health Team Role to Users

Find the user IDs or emails of the team members you want to promote:

```sql
-- View all users
SELECT id, email FROM auth.users;

-- Or view profiles
SELECT id, full_name, username, email FROM profiles
JOIN auth.users ON profiles.id = auth.users.id;
```

Assign the Health Team role using one of these methods:

#### Method 1: By User ID
```sql
UPDATE profiles SET role = 'health_team' WHERE id = 'user-uuid-here';
UPDATE profiles SET role = 'health_team' WHERE id = 'another-user-uuid-here';
```

#### Method 2: By Email
First, get the user ID from the email:
```sql
SELECT id FROM auth.users WHERE email = 'healthteam@soteriahealth.com';
```

Then update the profile:
```sql
UPDATE profiles SET role = 'health_team'
WHERE id = (SELECT id FROM auth.users WHERE email = 'healthteam@soteriahealth.com');
```

#### Method 3: By Username
```sql
UPDATE profiles SET role = 'health_team' WHERE username = 'username-here';
```

### Step 3: Verify Setup

```sql
-- Check Health Team members
SELECT
  p.id,
  p.full_name,
  p.username,
  p.role,
  u.email
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.role IN ('health_team', 'admin');

-- Test the helper function
SELECT is_health_team_member(id) as is_health_team, full_name, role
FROM profiles
WHERE role = 'health_team';
```

## Usage

### For Health Team Members

1. **Open Routine Builder**: Navigate to the Builder tab
2. **Health Team Banner**: You'll see a green banner at the top that says "Soteria Health Team"
3. **Toggle Routine Type**:
   - Use the toggle switch to choose between:
     - "Creating official Soteria routine" (recommended for official content)
     - "Creating community routine" (for personal/test routines)
4. **Build Your Routine**: Follow the normal routine builder steps
5. **Publish**: When you publish an official routine:
   - It's automatically set as `author_type: 'official'`
   - It's always `is_public: true` (visible in Discover)
   - Your name or "Soteria Health Team" is set as the official author
   - It bypasses any routine creation limits

### Profile Badge

Health Team members automatically display a "Soteria Health Team" badge on their profile:
- Badge appears below the user's name
- Shows a green shield icon with "Soteria Health Team" text
- Visible to all users viewing the profile

### Official Routine Display

Official routines created by Health Team members show:
- **In Discover Feed**: "@soteriahealthteam" badge with Soteria logo
- **Routine Details**: Official author attribution (e.g., "by Dr. Jane Smith" or "by Soteria Health Team")
- **Official Badge**: Visual distinction from community routines

## Managing Health Team Members

### Promote a User to Health Team
```sql
UPDATE profiles SET role = 'health_team' WHERE id = 'user-uuid-here';
```

### Demote a Health Team Member
```sql
UPDATE profiles SET role = 'user' WHERE id = 'user-uuid-here';
```

### Promote to Admin
```sql
UPDATE profiles SET role = 'admin' WHERE id = 'user-uuid-here';
```

### View All Official Routines
```sql
SELECT
  r.id,
  r.name,
  r.official_author,
  r.category,
  r.completion_count,
  p.full_name as creator_name,
  p.role as creator_role,
  r.created_at
FROM routines r
LEFT JOIN profiles p ON r.created_by = p.id
WHERE r.author_type = 'official'
ORDER BY r.created_at DESC;
```

## Technical Details

### Database Schema Changes

#### profiles table
- Added column: `role TEXT DEFAULT 'user' CHECK (role IN ('user', 'health_team', 'admin'))`
- Added index: `idx_profiles_role` on `role` column

#### routines table
Existing columns used:
- `author_type`: 'official' | 'community'
- `official_author`: Name of official author (e.g., "Soteria Health Team", "Dr. Jane Smith")
- `is_public`: Always true for official routines
- `created_by`: References the Health Team member who created it

### RLS Policies

Updated policies on `routines` table:

#### INSERT Policy
- Health Team/Admin can create official routines (`author_type = 'official'`, `is_custom = false`)
- Regular users can create community routines (`author_type = 'community'`, `is_custom = true`)

#### UPDATE Policy
- Health Team/Admin can update their own official routines
- Regular users can update their own community routines

#### DELETE Policy
- Health Team/Admin can delete their own official routines
- Regular users can delete their own community routines

#### SELECT Policy
- All authenticated users can view:
  - Official routines
  - Public community routines
  - Their own routines (public or private)

### Helper Functions

#### `is_health_team_member(user_id UUID)`
- Returns boolean indicating if user has `health_team` or `admin` role
- Used in RLS policies and application logic
- Granted to authenticated users

#### `create_official_routine_by_health_team(...)`
- Creates official routines (for future use if needed)
- Validates user is Health Team member
- Automatically sets official author
- Returns routine ID
- Security DEFINER function (bypasses RLS)

## TypeScript Types

### Updated Types

```typescript
// User role type
export type UserRole = 'user' | 'health_team' | 'admin'

// Profile interface (updated)
export interface Profile {
  id: string
  full_name: string | null
  username: string | null
  // ... other fields
  role: UserRole // Added field
  created_at: string
  updated_at: string
}

// Existing routine author types
export type RoutineAuthorType = 'official' | 'community'
```

## Files Modified

### SQL
- `sql/migrations/add_health_team_role_system.sql` - Complete migration script

### TypeScript Types
- `types/index.ts` - Added UserRole type and role field to Profile interface

### Utilities
- `lib/utils/routine-builder.ts` - Added isHealthTeamMember() function and updated publishCustomRoutine()

### Components
- `components/UserRoleBadge.tsx` - NEW: Badge component for user roles
- `components/RoutineAuthorBadge.tsx` - EXISTING: Already handles official routines

### Screens
- `app/(tabs)/builder.tsx` - Added Health Team banner and toggle
- `app/(tabs)/profile.tsx` - Added Health Team badge display
- `app/(tabs)/routines.tsx` - EXISTING: Already uses RoutineAuthorBadge

## Security Considerations

1. **Role Assignment**: Only database administrators can assign roles via SQL
2. **RLS Protection**: All policies check user role via `EXISTS` subquery on profiles table
3. **Official Routine Protection**: Only Health Team members can create/modify official routines
4. **Attribution**: Official author is automatically set from user's profile
5. **No Client-Side Bypass**: Role checks are enforced at database level via RLS

## Future Enhancements

### Potential Features
- Admin dashboard for managing Health Team members (via web interface)
- Analytics dashboard for official routine performance
- Versioning system for official routines
- Review/approval workflow before publishing official routines
- Custom author name input for Health Team members
- Routine categories or collections for official content

### Admin Role Capabilities (Future)
- Full user management
- Delete any content
- View analytics and reports
- Manage Health Team member assignments
- Access to admin-only features

## Troubleshooting

### User can't create official routines
1. Check role assignment: `SELECT role FROM profiles WHERE id = 'user-uuid'`
2. Verify RLS policies are active: `SELECT * FROM pg_policies WHERE tablename = 'routines'`
3. Test helper function: `SELECT is_health_team_member('user-uuid')`

### Official routines not showing in Discover
1. Verify `is_public = true`: `SELECT id, name, is_public, author_type FROM routines WHERE author_type = 'official'`
2. Check Discover feed filters (ensure not filtered out)

### Badge not showing on profile
1. Verify role field in profile: `SELECT id, full_name, role FROM profiles WHERE id = 'user-uuid'`
2. Refresh app data
3. Check UserRoleBadge component is imported in profile.tsx

## Support

For issues or questions:
1. Check database migration was run successfully
2. Verify RLS policies with verification queries in migration file
3. Review console logs for error messages
4. Check Supabase logs for RLS policy violations

---

## Quick Start Checklist

- [ ] Run database migration (`sql/migrations/add_health_team_role_system.sql`)
- [ ] Verify migration success (check verification queries)
- [ ] Assign Health Team role to designated users
- [ ] Test Health Team member can see banner in Routine Builder
- [ ] Test creating an official routine
- [ ] Verify official routine shows in Discover with correct badge
- [ ] Verify Health Team badge shows on profile

**Implementation Complete!** 🎉
