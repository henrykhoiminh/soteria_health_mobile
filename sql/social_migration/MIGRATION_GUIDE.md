# Social Features Migration Guide

## Problem
You encountered an infinite recursion error because the original migration had circular dependencies in RLS policies.

## Solution - Two Options

### Option 1: Clean Reset (Recommended)

If you want to start completely fresh:

1. **Run reset script** (`reset_social_features.sql`):
   - Open Supabase SQL Editor
   - Copy/paste entire contents of `reset_social_features.sql`
   - Click "Run"
   - This drops all social feature tables and policies

2. **Run corrected migration** (`database_migration_social_features_v2.sql`):
   - Copy/paste entire contents of `database_migration_social_features_v2.sql`
   - Click "Run"
   - This creates everything fresh with fixed RLS policies

### Option 2: Quick Fix Only

If you just want to fix the recursion error without resetting:

1. **Run fix script** (`fix_circle_members_rls.sql`):
   - Copy/paste entire contents of `fix_circle_members_rls.sql`
   - Click "Run"
   - This fixes the policies without dropping tables/data

## What Was Fixed

The original migration had this problem:
```sql
-- BAD - Creates infinite recursion
CREATE POLICY "Users can view circle members"
  ON circle_members
  USING (
    EXISTS (
      SELECT 1 FROM circle_members  -- ❌ Checking circle_members from circle_members!
      WHERE ...
    )
  );
```

The V2 migration fixes it with a helper function:
```sql
-- GOOD - Uses helper function to avoid recursion
CREATE FUNCTION is_circle_member_direct(circle_id, user_id)
  SECURITY DEFINER  -- Bypasses RLS

CREATE POLICY "Users can view circle members"
  ON circle_members
  USING (
    is_circle_member_direct(circle_id, auth.uid())  -- ✅ No recursion
  );
```

## Files Overview

- **reset_social_features.sql** - Drops everything (clean slate)
- **database_migration_social_features_v2.sql** - Corrected migration with fixed RLS
- **fix_circle_members_rls.sql** - Just fixes the policies (keeps existing data)
- **database_migration_social_features.sql** - Original (has bugs, don't use)

## After Migration

Test these features:
- ✅ Create a circle
- ✅ Search for users
- ✅ Send friend requests
- ✅ View friend activity
- ✅ Share routines to circles

## Need Help?

If you still see errors, check:
1. All policies were dropped before recreating
2. Helper functions were created successfully
3. RLS is enabled on all tables
4. You're running as an authenticated user in the app
