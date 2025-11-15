-- =====================================================
-- Soteria Health - Social Features Migration V2
-- =====================================================
-- This migration adds friends system, community circles,
-- and activity feed functionality.
--
-- CORRECTED VERSION with fixed RLS policies
-- Run reset_social_features.sql first if needed
-- =====================================================

-- =====================================================
-- 1. FRIENDSHIPS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,

  -- Prevent self-friending
  CONSTRAINT no_self_friend CHECK (user_id != friend_id),

  -- Prevent duplicate friendships (both directions)
  CONSTRAINT unique_friendship UNIQUE (user_id, friend_id)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON public.friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON public.friendships(status);
CREATE INDEX IF NOT EXISTS idx_friendships_user_status ON public.friendships(user_id, status);

-- Add comment
COMMENT ON TABLE public.friendships IS 'Stores friendship relationships between users';

-- =====================================================
-- 2. CIRCLES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_private BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Validate name length
  CONSTRAINT circle_name_length CHECK (char_length(name) >= 3 AND char_length(name) <= 100)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_circles_created_by ON public.circles(created_by);
CREATE INDEX IF NOT EXISTS idx_circles_is_private ON public.circles(is_private);
CREATE INDEX IF NOT EXISTS idx_circles_created_at ON public.circles(created_at DESC);

-- Add comment
COMMENT ON TABLE public.circles IS 'Community circles where users can share routines and activities';

-- =====================================================
-- 3. CIRCLE_MEMBERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.circle_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate memberships
  CONSTRAINT unique_circle_membership UNIQUE (circle_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_circle_members_circle_id ON public.circle_members(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_members_user_id ON public.circle_members(user_id);
CREATE INDEX IF NOT EXISTS idx_circle_members_role ON public.circle_members(circle_id, role);

-- Add comment
COMMENT ON TABLE public.circle_members IS 'Tracks user memberships in circles';

-- =====================================================
-- 4. CIRCLE_ROUTINES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.circle_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate routine shares in same circle
  CONSTRAINT unique_circle_routine UNIQUE (circle_id, routine_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_circle_routines_circle_id ON public.circle_routines(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_routines_routine_id ON public.circle_routines(routine_id);
CREATE INDEX IF NOT EXISTS idx_circle_routines_shared_by ON public.circle_routines(shared_by);
CREATE INDEX IF NOT EXISTS idx_circle_routines_shared_at ON public.circle_routines(circle_id, shared_at DESC);

-- Add comment
COMMENT ON TABLE public.circle_routines IS 'Tracks routines shared within circles';

-- =====================================================
-- 5. FRIEND_ACTIVITY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.friend_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('completed_routine', 'created_routine', 'streak_milestone', 'joined_circle', 'shared_routine')),
  related_routine_id UUID REFERENCES public.routines(id) ON DELETE SET NULL,
  related_circle_id UUID REFERENCES public.circles(id) ON DELETE SET NULL,
  activity_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient feed queries
CREATE INDEX IF NOT EXISTS idx_friend_activity_user_id ON public.friend_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_friend_activity_created_at ON public.friend_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_friend_activity_user_created ON public.friend_activity(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_friend_activity_type ON public.friend_activity(activity_type);

-- Add comment
COMMENT ON TABLE public.friend_activity IS 'Activity feed for displaying friend activities';

-- =====================================================
-- HELPER FUNCTIONS (PREVENT RLS RECURSION)
-- =====================================================

-- Function to check circle membership without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_circle_member_direct(p_circle_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.circle_members
    WHERE circle_id = p_circle_id
    AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if two users are friends
CREATE OR REPLACE FUNCTION public.are_friends(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
    AND (
      (user_id = user1_id AND friend_id = user2_id)
      OR (user_id = user2_id AND friend_id = user1_id)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get friend count
CREATE OR REPLACE FUNCTION public.get_friend_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER FROM public.friendships
    WHERE status = 'accepted'
    AND (user_id = p_user_id OR friend_id = p_user_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get circle member count
CREATE OR REPLACE FUNCTION public.get_circle_member_count(p_circle_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER FROM public.circle_members
    WHERE circle_id = p_circle_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically add circle creator as admin member
CREATE OR REPLACE FUNCTION public.add_circle_creator_as_admin()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.circle_members (circle_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_activity ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- FRIENDSHIPS RLS POLICIES
-- =====================================================

-- Users can view their own friendships (both directions)
CREATE POLICY "Users can view their friendships"
  ON public.friendships
  FOR SELECT
  USING (
    auth.uid() = user_id OR auth.uid() = friend_id
  );

-- Users can create friend requests
CREATE POLICY "Users can send friend requests"
  ON public.friendships
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND status = 'pending'
  );

-- Users can update friendships they're part of (accept/block)
CREATE POLICY "Users can update their friendships"
  ON public.friendships
  FOR UPDATE
  USING (
    auth.uid() = user_id OR auth.uid() = friend_id
  )
  WITH CHECK (
    auth.uid() = user_id OR auth.uid() = friend_id
  );

-- Users can delete their own friendships
CREATE POLICY "Users can delete their friendships"
  ON public.friendships
  FOR DELETE
  USING (
    auth.uid() = user_id OR auth.uid() = friend_id
  );

-- =====================================================
-- CIRCLES RLS POLICIES (FIXED - NO RECURSION)
-- =====================================================

-- Users can view public circles and circles they're members of
CREATE POLICY "Users can view public circles and their circles"
  ON public.circles
  FOR SELECT
  USING (
    is_private = false
    OR created_by = auth.uid()
    OR public.is_circle_member_direct(circles.id, auth.uid())
  );

-- Users can create circles
CREATE POLICY "Users can create circles"
  ON public.circles
  FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
  );

-- Circle creators can update circles
CREATE POLICY "Circle creators can update circles"
  ON public.circles
  FOR UPDATE
  USING (
    auth.uid() = created_by
  );

-- Circle creators can delete circles
CREATE POLICY "Circle creators can delete circles"
  ON public.circles
  FOR DELETE
  USING (
    auth.uid() = created_by
  );

-- =====================================================
-- CIRCLE_MEMBERS RLS POLICIES (FIXED - NO RECURSION)
-- =====================================================

-- Users can view circle members (using helper to avoid recursion)
CREATE POLICY "Users can view circle members"
  ON public.circle_members
  FOR SELECT
  USING (
    -- User can see members if circle is public
    EXISTS (
      SELECT 1 FROM public.circles
      WHERE circles.id = circle_members.circle_id
      AND circles.is_private = false
    )
    OR
    -- User can see members if they created the circle
    EXISTS (
      SELECT 1 FROM public.circles
      WHERE circles.id = circle_members.circle_id
      AND circles.created_by = auth.uid()
    )
    OR
    -- User can see members if they are a member (using helper to avoid recursion)
    public.is_circle_member_direct(circle_members.circle_id, auth.uid())
  );

-- Circle creators can add members, users can join public circles
CREATE POLICY "Circle admins can add members"
  ON public.circle_members
  FOR INSERT
  WITH CHECK (
    -- Circle creator can add members
    EXISTS (
      SELECT 1 FROM public.circles
      WHERE circles.id = circle_members.circle_id
      AND circles.created_by = auth.uid()
    )
    OR
    -- Users can join public circles themselves
    (
      circle_members.user_id = auth.uid()
      AND role = 'member'
      AND EXISTS (
        SELECT 1 FROM public.circles
        WHERE circles.id = circle_members.circle_id
        AND circles.is_private = false
      )
    )
  );

-- Circle creators can update member roles
CREATE POLICY "Circle creators can update members"
  ON public.circle_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.circles
      WHERE circles.id = circle_members.circle_id
      AND circles.created_by = auth.uid()
    )
  );

-- Users can leave circles, creators can remove members
CREATE POLICY "Users can leave circles, creators can remove members"
  ON public.circle_members
  FOR DELETE
  USING (
    circle_members.user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.circles
      WHERE circles.id = circle_members.circle_id
      AND circles.created_by = auth.uid()
    )
  );

-- =====================================================
-- CIRCLE_ROUTINES RLS POLICIES (FIXED - NO RECURSION)
-- =====================================================

-- Users can view routines in circles they're members of
CREATE POLICY "Users can view circle routines"
  ON public.circle_routines
  FOR SELECT
  USING (
    public.is_circle_member_direct(circle_routines.circle_id, auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.circles
      WHERE circles.id = circle_routines.circle_id
      AND circles.created_by = auth.uid()
    )
  );

-- Circle members can share routines
CREATE POLICY "Circle members can share routines"
  ON public.circle_routines
  FOR INSERT
  WITH CHECK (
    auth.uid() = shared_by
    AND public.is_circle_member_direct(circle_routines.circle_id, auth.uid())
  );

-- Users can delete routines they shared, creators can delete any
CREATE POLICY "Users can delete routines they shared"
  ON public.circle_routines
  FOR DELETE
  USING (
    auth.uid() = shared_by
    OR
    EXISTS (
      SELECT 1 FROM public.circles
      WHERE circles.id = circle_routines.circle_id
      AND circles.created_by = auth.uid()
    )
  );

-- =====================================================
-- FRIEND_ACTIVITY RLS POLICIES
-- =====================================================

-- Users can view their own activity and friends' activity
CREATE POLICY "Users can view their own activity"
  ON public.friend_activity
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.are_friends(auth.uid(), friend_activity.user_id)
  );

-- Users can create their own activity
CREATE POLICY "Users can create their own activity"
  ON public.friend_activity
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
  );

-- Users can delete their own activity
CREATE POLICY "Users can delete their own activity"
  ON public.friend_activity
  FOR DELETE
  USING (
    auth.uid() = user_id
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to add circle creator as admin
DROP TRIGGER IF EXISTS trigger_add_circle_creator ON public.circles;
CREATE TRIGGER trigger_add_circle_creator
  AFTER INSERT ON public.circles
  FOR EACH ROW
  EXECUTE FUNCTION public.add_circle_creator_as_admin();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.circles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.circle_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.circle_routines TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friend_activity TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.is_circle_member_direct(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.are_friends(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friend_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_circle_member_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_circle_creator_as_admin() TO authenticated;

-- Grant usage on sequences (if any are created)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Social Features Migration V2 Complete!';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Created tables: friendships, circles, circle_members, circle_routines, friend_activity';
  RAISE NOTICE 'Created helper functions to prevent RLS recursion';
  RAISE NOTICE 'Configured secure RLS policies';
  RAISE NOTICE 'All indexes created for performance';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'You can now use the social features!';
  RAISE NOTICE '==================================================';
END $$;
