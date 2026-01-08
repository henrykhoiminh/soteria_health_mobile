-- ============================================================================
-- MAKE COMMUNITY ROUTINES PUBLIC
-- ============================================================================
-- Description: Updates existing community routines to be public so they
-- appear in the Discover page. New routines are now created public by default.
-- ============================================================================

-- Update all custom (community) routines to be public
UPDATE routines
SET is_public = true
WHERE is_custom = true
  AND (is_public IS NULL OR is_public = false);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check how many routines were affected
SELECT
  'Routines updated' as status,
  COUNT(*) as total_community_routines,
  SUM(CASE WHEN is_public = true THEN 1 ELSE 0 END) as public_routines
FROM routines
WHERE is_custom = true;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT
  '✓ Community routines are now public!' as status,
  'They will appear in the Discover page' as result;
