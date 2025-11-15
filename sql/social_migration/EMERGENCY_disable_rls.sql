-- =====================================================
-- EMERGENCY: DISABLE RLS TEMPORARILY
-- =====================================================
-- This completely disables RLS on social tables to
-- eliminate infinite recursion and get you working again
-- =====================================================

-- ============================================
-- STEP 1: Drop ALL policies (force)
-- ============================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename IN ('circles', 'circle_members', 'circle_invitations', 'circle_routines')
    )
    LOOP
        BEGIN
            EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.' || r.tablename;
            RAISE NOTICE 'Dropped: %.%', r.tablename, r.policyname;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not drop: %.% - %', r.tablename, r.policyname, SQLERRM;
        END;
    END LOOP;
END $$;

-- ============================================
-- STEP 2: Temporarily DISABLE RLS
-- ============================================

ALTER TABLE public.circles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_routines DISABLE ROW LEVEL SECURITY;

RAISE NOTICE '========================================';
RAISE NOTICE '⚠️  RLS DISABLED on social tables';
RAISE NOTICE '⚠️  This is TEMPORARY for debugging';
RAISE NOTICE '========================================';
RAISE NOTICE 'Your app should work now (no errors)';
RAISE NOTICE 'After confirming it works, run the';
RAISE NOTICE 'next script to re-enable RLS properly';
RAISE NOTICE '========================================';
