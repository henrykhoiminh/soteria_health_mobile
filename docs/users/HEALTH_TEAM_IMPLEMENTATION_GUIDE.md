# Health Team System - Complete Implementation Guide

## Overview

This guide covers the comprehensive Health Team role functionality including invitations, permissions, UI indicators, and special routine editing capabilities.

## Features Implemented

### 1. Visual Indicators
- ✅ **Dashboard**: Crown emoji (👑) in greeting for health_team/admin users
  - Regular users: "Hello, John!"
  - Health Team: "Welcome back, John 👑"
- ✅ **Profile Badge**: Green "Soteria Health Team" badge with shield icon
- ✅ **Health Team Stats**: Displays official routines created, total completions, and total saves

### 2. Invitation System
- ✅ **Database Table**: `health_team_invitations` with full RLS policies
- ✅ **Invitation UI**: Beautiful invitation card on Profile page
- ✅ **Accept/Decline**: Users can accept (join team) or decline invitations
- ✅ **Activity Logging**: Logs when users join health_team
- ✅ **Prevention**: Cannot invite existing health_team members or yourself

### 3. Routine Builder Enhancements
- ✅ **Health Team Banner**: Shows toggle between official/community routine creation
- ✅ **Publish as Official Toggle**:
  - When ON: "👑 Creating Official Routine" with clear messaging
  - When OFF: "Creating community routine"
- ✅ **Visual Feedback**: Banner updates dynamically based on toggle state
- ✅ **Automatic Settings**: Official routines auto-set to public, author_type='official'

### 4. Edit Official Routines
- ✅ **Permission**: Health Team users can edit ANY official routine (not just their own)
- ✅ **Edit Button**: Green edit icon appears on official routine detail pages for health_team
- ✅ **Title Indicator**: Shows "👑 Edit Official Routine" when editing official content
- ✅ **RLS Policies**: Database enforces health_team can UPDATE any official routine

### 5. Health Team Stats
- ✅ **Official Routines Created**: Count of official routines by user
- ✅ **Total Completions**: Sum of all completions across user's official routines
- ✅ **Total Saves**: Sum of saves for user's official routines
- ✅ **Display**: Beautiful green-themed stat cards on Profile page

## Installation Steps

### Step 1: Run Database Migration

```bash
# Navigate to your project directory
cd /path/to/soteria-health-mobile

# Open Supabase SQL Editor or connect via psql
psql -h your-db-host -U postgres -d your-database
```

Execute the migration file:

```sql
-- Run the comprehensive migration
\i sql/migrations/add_health_team_invitations_and_permissions.sql
```

Or paste the contents into Supabase SQL Editor and execute.

### Step 2: Verify Migration

```sql
-- Check health_team_invitations table exists
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'health_team_invitations'
ORDER BY ordinal_position;

-- Verify RLS policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('health_team_invitations', 'routines')
ORDER BY tablename, policyname;

-- Verify helper functions
SELECT routine_name
FROM information_schema.routines
WHERE routine_name LIKE '%health_team%'
AND routine_schema = 'public';
```

### Step 3: Assign Health Team Role

Find users to promote:

```sql
-- View all users
SELECT p.id, p.full_name, p.username, p.role, u.email
FROM profiles p
JOIN auth.users u ON p.id = u.id
ORDER BY p.full_name;
```

Promote to health_team:

```sql
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

-- By ID
UPDATE profiles
SET role = 'health_team'
WHERE id = '00000000-0000-0000-0000-000000000000'; -- Replace with actual UUID
```

### Step 4: Test the System

1. **Login as health_team user**
2. **Check Dashboard**: Should see "Welcome back, [Name] 👑"
3. **Check Profile**: Should see green "Soteria Health Team" badge
4. **Check Builder**: Should see toggle between Official/Community routine creation
5. **Create Official Routine**: Toggle to "Official", create routine
6. **View Official Routine**: Should see green edit icon
7. **Edit Official Routine**: Click edit, should see "👑 Edit Official Routine"

## Database Schema

### health_team_invitations Table

```sql
CREATE TABLE health_team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  responded_at TIMESTAMPTZ,
  UNIQUE(invitee_id, inviter_id)
);
```

**Indexes:**
- `idx_health_team_invitations_invitee` on `invitee_id`
- `idx_health_team_invitations_inviter` on `inviter_id`
- `idx_health_team_invitations_status` on `status`

### RLS Policies

#### health_team_invitations

- **SELECT**: Users can see invitations they sent or received
- **INSERT**: Only health_team members can create invitations
  - Cannot invite yourself
  - Cannot invite existing health_team members
  - inviter_id must match current user
- **UPDATE**: Only invitee can update (accept/decline)
  - Can only change from pending to accepted/declined
- **DELETE**: Inviter can delete pending invitations, admins can delete any

#### routines (Updated)

- **UPDATE**: Changed to allow health_team to edit ANY official routine
  - Health Team/Admin can update ANY official routine (not just own)
  - Regular users can update their own community routines
  - created_by can remain different when health_team edits

## Helper Functions

### `send_health_team_invitation(p_invitee_id UUID) → UUID`

Sends a health_team invitation.

**Returns**: Invitation ID

**Errors**:
- Only Health Team members can send invitations
- User is already a Health Team member
- User already has a pending invitation

### `accept_health_team_invitation(p_invitation_id UUID) → BOOLEAN`

Accepts invitation and promotes user to health_team.

**Side Effects**:
- Updates invitation status to 'accepted'
- Promotes user to 'health_team' role
- Logs activity: 'joined_health_team'

### `decline_health_team_invitation(p_invitation_id UUID) → BOOLEAN`

Declines invitation.

**Side Effects**:
- Updates invitation status to 'declined'

### `get_health_team_stats(p_user_id UUID) → TABLE`

Returns health_team statistics.

**Returns**:
- `official_routines_created`: INTEGER
- `total_official_completions`: INTEGER
- `official_routines_saved`: INTEGER

### `get_my_pending_health_team_invitations() → TABLE`

Returns pending invitations for current user with inviter details.

**Returns**:
- `id`: UUID
- `inviter_id`: UUID
- `inviter_name`: TEXT
- `inviter_username`: TEXT
- `inviter_avatar`: TEXT
- `created_at`: TIMESTAMPTZ

## TypeScript Types

```typescript
// types/index.ts

export type HealthTeamInvitationStatus = 'pending' | 'accepted' | 'declined'

export interface HealthTeamInvitation {
  id: string
  inviter_id: string
  invitee_id: string
  status: HealthTeamInvitationStatus
  created_at: string
  responded_at: string | null
  inviter_name?: string
  inviter_username?: string
  inviter_avatar?: string
}

export interface HealthTeamStats {
  official_routines_created: number
  total_official_completions: number
  official_routines_saved: number
}
```

## Utility Functions

```typescript
// lib/utils/health-team.ts

// Send invitation
await sendHealthTeamInvitation(inviteeId: string): Promise<string>

// Accept invitation
await acceptHealthTeamInvitation(invitationId: string): Promise<boolean>

// Decline invitation
await declineHealthTeamInvitation(invitationId: string): Promise<boolean>

// Get pending invitations
await getMyPendingHealthTeamInvitations(): Promise<HealthTeamInvitation[]>

// Get stats
await getHealthTeamStats(userId: string): Promise<HealthTeamStats>

// Check for pending invitation
await hasPendingInvitation(inviteeId: string): Promise<boolean>

// Cancel invitation
await cancelHealthTeamInvitation(invitationId: string): Promise<void>
```

## UI Components

### HealthTeamInvitationCard

**Location**: `components/HealthTeamInvitationCard.tsx`

**Props**:
```typescript
interface HealthTeamInvitationCardProps {
  invitation: HealthTeamInvitation
  onAccept?: () => void
  onDecline?: () => void
}
```

**Features**:
- Beautiful green-themed card design
- Shows inviter info with avatar
- Lists benefits of Health Team membership
- Accept/Decline buttons with loading states
- Confirmation dialogs for both actions

## File Changes Summary

### SQL Files
- ✅ `sql/migrations/add_health_team_invitations_and_permissions.sql` - New migration

### Types
- ✅ `types/index.ts` - Added HealthTeamInvitation and HealthTeamStats interfaces

### Utilities
- ✅ `lib/utils/health-team.ts` - New file with all health_team functions
- ✅ `lib/utils/routine-builder.ts` - Already has isHealthTeamMember()

### Components
- ✅ `components/HealthTeamInvitationCard.tsx` - New invitation card component
- ✅ `components/UserRoleBadge.tsx` - Existing, already handles health_team badge

### Screens
- ✅ `app/(tabs)/index.tsx` - Added crown emoji to greeting
- ✅ `app/(tabs)/profile.tsx` - Added Health Team stats and invitation display
- ✅ `app/(tabs)/builder.tsx` - Enhanced banner with better toggle UI
- ✅ `app/routines/[id].tsx` - Added edit button for official routines (health_team only)

## Usage Workflows

### Creating Official Routine (Health Team Member)

1. Navigate to Builder tab
2. See "Soteria Health Team" banner
3. Toggle switch to "Official" mode
4. Banner changes to "👑 Creating Official Routine"
5. Build routine normally
6. Publish - routine is automatically official and public

### Editing Official Routine (Health Team Member)

1. View any official routine
2. See green edit icon (pencil)
3. Click edit icon
4. See "👑 Edit Official Routine" title
5. Make changes
6. Save - routine is updated

### Inviting User to Health Team

**Note**: This feature requires implementing a user search/profile view system which was not included in this implementation. The backend is ready, but the UI for browsing users and sending invitations needs to be added.

**Backend is ready for**:
```typescript
// When viewing another user's profile
const handleInviteToHealthTeam = async (userId: string) => {
  try {
    const invitationId = await sendHealthTeamInvitation(userId);
    Alert.alert('Success', 'Invitation sent!');
  } catch (error) {
    Alert.alert('Error', error.message);
  }
};
```

### Accepting Invitation (Invitee)

1. Open Profile tab
2. See green invitation card
3. Review benefits
4. Click "Accept"
5. Confirm in dialog
6. Profile reloads, now shows Health Team badge
7. Dashboard shows crown emoji

## Security Considerations

1. **Role Assignment**: Only via SQL - no app-based promotion except through invitations
2. **RLS Protection**: All policies check role at database level
3. **Invitation Validation**:
   - Cannot invite yourself
   - Cannot invite existing health_team members
   - Only health_team can send invitations
4. **Edit Permissions**: Database enforces health_team can only edit official routines
5. **Activity Logging**: All health_team joins are logged for auditing

## Admin Capabilities

Admins have all health_team permissions plus:
- Can delete any invitation
- Can manually promote/demote users via SQL
- Can view all health_team members

```sql
-- View all health team members
SELECT p.id, p.full_name, p.username, p.role, u.email
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.role IN ('health_team', 'admin')
ORDER BY p.role, p.full_name;

-- Demote health_team member
UPDATE profiles
SET role = 'user'
WHERE id = 'user-uuid-here';
```

## Troubleshooting

### User can't create official routines
1. Check role: `SELECT role FROM profiles WHERE id = 'user-uuid'`
2. Verify isHealthTeamMember() returns true
3. Check app state: Is banner showing?

### Edit button not showing on official routines
1. Verify user is health_team
2. Check routine is author_type='official'
3. Verify isHealthTeamMember() is working
4. Check component loaded health team status

### Invitation not showing
1. Check invitation exists and status='pending'
2. Verify RLS policies allow SELECT
3. Check getMyPendingHealthTeamInvitations() call
4. Refresh profile data

### Stats not showing
1. Verify user is health_team or admin
2. Check get_health_team_stats() function exists
3. Verify official routines have correct author_type
4. Check RLS allows viewing stats

## Future Enhancements

Potential additions:
- ✨ User search and profile viewing system
- ✨ "Invite to Health Team" button on user profiles
- ✨ Notification system for invitations
- ✨ Health Team leaderboard (most popular routines)
- ✨ Routine review/approval workflow
- ✨ Health Team dashboard with analytics
- ✨ Batch invitation system
- ✨ Custom official author field (instead of defaulting to full_name)

## SQL Quick Reference

### Common Operations

```sql
-- Promote user to health_team
UPDATE profiles SET role = 'health_team' WHERE username = 'drsmith';

-- View pending invitations
SELECT * FROM health_team_invitations WHERE status = 'pending';

-- View all official routines
SELECT id, name, official_author, completion_count
FROM routines
WHERE author_type = 'official'
ORDER BY created_at DESC;

-- View health_team stats for user
SELECT * FROM get_health_team_stats('user-uuid-here');

-- View all health_team activities
SELECT * FROM friend_activities
WHERE activity_type IN ('joined_health_team', 'created_official_routine', 'updated_official_routine')
ORDER BY created_at DESC;
```

---

## Implementation Complete! 🎉

All features are implemented and ready to use. Run the migration, promote your first health_team member, and start creating official routines!

For support or questions, refer to the SQL files and comments in the code.
