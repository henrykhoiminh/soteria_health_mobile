-- ============================================================================
-- UPDATE search_profiles FUNCTION TO INCLUDE ROLE
-- ============================================================================
-- This migration adds the 'role' field to the search_profiles function
-- so that the Health Team invite UI can filter out existing health_team members
-- ============================================================================

-- Drop the existing function first (required when changing return type)
DROP FUNCTION IF EXISTS public.search_profiles(TEXT, UUID, INTEGER);

-- Create the updated function with role field
CREATE OR REPLACE FUNCTION public.search_profiles(
  p_search_term TEXT,
  p_exclude_user_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
  id UUID,
  full_name TEXT,
  username TEXT,
  profile_picture_url TEXT,
  journey_focus TEXT,
  fitness_level TEXT,
  role TEXT,
  match_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.username,
    p.profile_picture_url,
    p.journey_focus::TEXT,
    p.fitness_level::TEXT,
    p.role::TEXT,
    -- Calculate match score (higher is better)
    CASE
      WHEN LOWER(p.username) = LOWER(p_search_term) THEN 100
      WHEN LOWER(p.username) LIKE LOWER(p_search_term) || '%' THEN 90
      WHEN LOWER(p.full_name) = LOWER(p_search_term) THEN 80
      WHEN LOWER(p.full_name) LIKE LOWER(p_search_term) || '%' THEN 70
      WHEN LOWER(p.username) LIKE '%' || LOWER(p_search_term) || '%' THEN 60
      WHEN LOWER(p.full_name) LIKE '%' || LOWER(p_search_term) || '%' THEN 50
      ELSE 0
    END AS match_score
  FROM public.profiles p
  WHERE p.id != p_exclude_user_id
  AND (
    LOWER(p.username) LIKE '%' || LOWER(p_search_term) || '%'
    OR LOWER(p.full_name) LIKE '%' || LOWER(p_search_term) || '%'
  )
  ORDER BY match_score DESC, p.full_name ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.search_profiles(TEXT, UUID, INTEGER) TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test the function
SELECT * FROM search_profiles('test', '00000000-0000-0000-0000-000000000000'::UUID, 5);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
