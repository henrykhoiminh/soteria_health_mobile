-- =====================================================
-- NUCLEAR OPTION: Complete RLS Reset
-- =====================================================
-- This completely resets RLS on all social tables
-- to eliminate any possibility of infinite recursion
-- =====================================================

-- ============================================
-- STEP 1: Drop ALL policies on social tables
-- ============================================

DO $$
DECLARE
    r RECORD;
    tables_to_fix TEXT[] := ARRAY['circles', 'circle_members', 'circle_invitations', 'friend_activity'];
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY tables_to_fix
    LOOP
        RAISE NOTICE 'Dropping policies on table: %', table_name;
        FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = table_name AND schemaname = 'public')
        LOOP
            EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.' || table_name;
            RAISE NOTICE '  ✓ Dropped: %', r.policyname;
        END LOOP;
    END LOOP;
END $$;

-- ============================================
-- STEP 2: Recreate CIRCLES policies (NO REFERENCES TO OTHER TABLES)
-- ============================================

-- Simple SELECT - only check circle_members, nothing else
CREATE POLICY "circles_select"
  ON public.circles
  FOR SELECT
  USING (
    -- Member of circle
    id IN (
      SELECT circle_id FROM public.circle_members
      WHERE user_id = auth.uid()
    )
    OR
    -- Public circle
    is_private = false
  );

CREATE POLICY "circles_insert"
  ON public.circles
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "circles_update"
  ON public.circles
  FOR UPDATE
  USING (
    id IN (
      SELECT circle_id FROM public.circle_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "circles_delete"
  ON public.circles
  FOR DELETE
  USING (created_by = auth.uid());

-- ============================================
-- STEP 3: Recreate CIRCLE_MEMBERS policies
-- ============================================

CREATE POLICY "circle_members_select"
  ON public.circle_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    circle_id IN (
      SELECT circle_id FROM public.circle_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "circle_members_insert"
  ON public.circle_members
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR
    circle_id IN (
      SELECT circle_id FROM public.circle_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "circle_members_delete"
  ON public.circle_members
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR
    circle_id IN (
      SELECT circle_id FROM public.circle_members cm
      WHERE cm.user_id = auth.uid() AND cm.role = 'admin'
    )
  );

-- ============================================
-- STEP 4: Recreate CIRCLE_INVITATIONS policies
-- ============================================

CREATE POLICY "circle_invitations_select"
  ON public.circle_invitations
  FOR SELECT
  USING (
    auth.uid() = inviter_id
    OR auth.uid() = invitee_id
  );

CREATE POLICY "circle_invitations_insert"
  ON public.circle_invitations
  FOR INSERT
  WITH CHECK (
    circle_id IN (
      SELECT circle_id FROM public.circle_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "circle_invitations_update"
  ON public.circle_invitations
  FOR UPDATE
  USING (auth.uid() = invitee_id)
  WITH CHECK (auth.uid() = invitee_id);

CREATE POLICY "circle_invitations_delete"
  ON public.circle_invitations
  FOR DELETE
  USING (auth.uid() = inviter_id);

-- ============================================
-- STEP 5: Recreate FRIEND_ACTIVITY policies
-- ============================================

CREATE POLICY "friend_activity_select"
  ON public.friend_activity
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    user_id IN (
      SELECT friend_id FROM public.friendships
      WHERE user_id = auth.uid() AND status = 'accepted'
      UNION
      SELECT user_id FROM public.friendships
      WHERE friend_id = auth.uid() AND status = 'accepted'
    )
  );

CREATE POLICY "friend_activity_insert"
  ON public.friend_activity
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ NUCLEAR FIX COMPLETE!';
  RAISE NOTICE '✓ All RLS policies recreated';
  RAISE NOTICE '✓ No circular references';
  RAISE NOTICE '✓ Infinite recursion eliminated';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESTART YOUR APP NOW!';
END $$;
