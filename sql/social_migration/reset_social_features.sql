-- =====================================================
-- RESET Social Features (Clean Slate)
-- =====================================================
-- Run this FIRST to clean up any existing social features
-- Then run the main migration fresh
-- =====================================================

-- Drop all policies first (in reverse order of dependencies)
DROP POLICY IF EXISTS "Users can delete their own activity" ON public.friend_activity;
DROP POLICY IF EXISTS "Users can create their own activity" ON public.friend_activity;
DROP POLICY IF EXISTS "Users can view their own activity" ON public.friend_activity;

DROP POLICY IF EXISTS "Users can delete routines they shared" ON public.circle_routines;
DROP POLICY IF EXISTS "Circle members can share routines" ON public.circle_routines;
DROP POLICY IF EXISTS "Users can view circle routines" ON public.circle_routines;

DROP POLICY IF EXISTS "Users can leave circles, admins can remove members" ON public.circle_members;
DROP POLICY IF EXISTS "Circle admins can update members" ON public.circle_members;
DROP POLICY IF EXISTS "Circle creators can update members" ON public.circle_members;
DROP POLICY IF EXISTS "Circle admins can add members" ON public.circle_members;
DROP POLICY IF EXISTS "Users can view circle members" ON public.circle_members;

DROP POLICY IF EXISTS "Circle creators can delete circles" ON public.circles;
DROP POLICY IF EXISTS "Circle admins can update circles" ON public.circles;
DROP POLICY IF EXISTS "Circle creators can update circles" ON public.circles;
DROP POLICY IF EXISTS "Users can create circles" ON public.circles;
DROP POLICY IF EXISTS "Users can view public circles and their circles" ON public.circles;

DROP POLICY IF EXISTS "Users can delete their friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can update their friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can send friend requests" ON public.friendships;
DROP POLICY IF EXISTS "Users can view their friendships" ON public.friendships;

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_add_circle_creator ON public.circles;

-- Drop functions
DROP FUNCTION IF EXISTS public.add_circle_creator_as_admin();
DROP FUNCTION IF EXISTS public.get_circle_member_count(UUID);
DROP FUNCTION IF EXISTS public.get_friend_count(UUID);
DROP FUNCTION IF EXISTS public.are_friends(UUID, UUID);
DROP FUNCTION IF EXISTS public.is_circle_member_direct(UUID, UUID);

-- Drop tables (in reverse order of dependencies)
DROP TABLE IF EXISTS public.friend_activity CASCADE;
DROP TABLE IF EXISTS public.circle_routines CASCADE;
DROP TABLE IF EXISTS public.circle_members CASCADE;
DROP TABLE IF EXISTS public.circles CASCADE;
DROP TABLE IF EXISTS public.friendships CASCADE;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Social Features Reset Complete!';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'All tables, policies, and functions have been dropped';
  RAISE NOTICE 'You can now run the corrected migration script';
  RAISE NOTICE '==================================================';
END $$;
