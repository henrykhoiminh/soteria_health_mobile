-- =====================================================
-- REVERT TO STABLE STATE
-- =====================================================
-- This reverts all changes made while trying to fix
-- the circle name display issue. Gets us back to working
-- state (even if circle names show as "Unknown Circle")
-- =====================================================

-- ============================================
-- STEP 1: Drop the function we created
-- ============================================

DROP FUNCTION IF EXISTS public.get_pending_circle_invitations_with_details(UUID);

-- ============================================
-- STEP 2: Clean up ALL circle-related policies
-- ============================================

-- Drop ALL existing policies on these tables
DO $$
DECLARE
    r RECORD;
    tables_to_clean TEXT[] := ARRAY['circles', 'circle_members', 'circle_invitations', 'circle_routines'];
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY tables_to_clean
    LOOP
        RAISE NOTICE 'Cleaning policies on: %', table_name;
        FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = table_name AND schemaname = 'public')
        LOOP
            EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.' || table_name;
            RAISE NOTICE '  ✓ Dropped: %', r.policyname;
        END LOOP;
    END LOOP;
END $$;

-- ============================================
-- STEP 3: Recreate SIMPLE, STABLE RLS policies
-- ============================================

-- CIRCLES policies (simple and safe)
CREATE POLICY "circles_select"
  ON public.circles
  FOR SELECT
  USING (
    id IN (
      SELECT circle_id FROM public.circle_members
      WHERE user_id = auth.uid()
    )
    OR is_private = false
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

-- CIRCLE_MEMBERS policies
CREATE POLICY "circle_members_select"
  ON public.circle_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR circle_id IN (
      SELECT circle_id FROM public.circle_members cm
      WHERE cm.user_id = auth.uid()
    )
  );

CREATE POLICY "circle_members_insert"
  ON public.circle_members
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR circle_id IN (
      SELECT circle_id FROM public.circle_members cm
      WHERE cm.user_id = auth.uid() AND cm.role = 'admin'
    )
  );

CREATE POLICY "circle_members_delete"
  ON public.circle_members
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR circle_id IN (
      SELECT circle_id FROM public.circle_members cm
      WHERE cm.user_id = auth.uid() AND cm.role = 'admin'
    )
  );

-- CIRCLE_INVITATIONS policies
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

-- CIRCLE_ROUTINES policies (NO circular references!)
CREATE POLICY "circle_routines_select"
  ON public.circle_routines
  FOR SELECT
  USING (
    circle_id IN (
      SELECT circle_id FROM public.circle_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "circle_routines_insert"
  ON public.circle_routines
  FOR INSERT
  WITH CHECK (
    auth.uid() = shared_by
    AND circle_id IN (
      SELECT circle_id FROM public.circle_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "circle_routines_delete"
  ON public.circle_routines
  FOR DELETE
  USING (
    auth.uid() = shared_by
    OR circle_id IN (
      SELECT circle_id FROM public.circle_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ REVERTED TO STABLE STATE!';
  RAISE NOTICE '✓ All problematic policies removed';
  RAISE NOTICE '✓ Simple, safe policies restored';
  RAISE NOTICE '✓ Function removed';
  RAISE NOTICE '';
  RAISE NOTICE 'NOTE: Circle names in invitations will show';
  RAISE NOTICE 'as "Unknown Circle" - this is expected';
  RAISE NOTICE 'and will be fixed later with a different approach';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'NOW: Update your app code and restart';
END $$;
