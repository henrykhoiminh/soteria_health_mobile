-- =====================================================
-- CLEANUP: Drop all custom functions we created
-- =====================================================
-- This removes any functions that might be causing issues
-- =====================================================

-- Drop the invitation details function
DROP FUNCTION IF EXISTS public.get_pending_circle_invitations_with_details(UUID);

-- Drop the is_circle_member_direct function if it exists and is causing issues
DROP FUNCTION IF EXISTS public.is_circle_member_direct(UUID, UUID);

-- List all remaining custom functions for reference
SELECT
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname LIKE '%circle%'
ORDER BY function_name;

RAISE NOTICE 'Custom circle functions cleaned up';
