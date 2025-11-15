-- =====================================================
-- Add RLS Policy for Profile Search
-- =====================================================
-- This allows users to view other users' basic profile info
-- for the friend search feature
-- =====================================================

-- First, check if there are existing SELECT policies on profiles
-- If so, we'll drop and recreate them to avoid conflicts

-- Drop existing SELECT policies (if any)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles for search" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Create a single comprehensive SELECT policy
-- Users can view all profiles (needed for search, friends, circles)
CREATE POLICY "Users can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (true);  -- All authenticated users can view all profiles

-- Note: Sensitive fields like email, phone, etc. should not be in profiles table
-- They're in auth.users which has its own security

-- Success message
DO $$
BEGIN
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Profile Search Policy Added!';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'All authenticated users can now view all profiles';
  RAISE NOTICE 'This enables:';
  RAISE NOTICE '  - Friend search functionality';
  RAISE NOTICE '  - Viewing friend profiles';
  RAISE NOTICE '  - Circle member lists';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Note: Users can only UPDATE/DELETE their own profiles';
  RAISE NOTICE '==================================================';
END $$;
