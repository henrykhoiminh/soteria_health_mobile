-- =====================================================
-- Soteria Health - Username System Migration
-- =====================================================
-- This migration adds a unique username system to profiles
-- Usernames are used for easier friend finding and mentions
-- =====================================================

-- =====================================================
-- 1. ADD USERNAME COLUMN TO PROFILES
-- =====================================================

-- Add username column (initially nullable to allow gradual migration)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username TEXT;

-- Add constraints for username
ALTER TABLE public.profiles
ADD CONSTRAINT username_format CHECK (
  username IS NULL OR (
    -- Must be 3-20 characters
    char_length(username) >= 3 AND char_length(username) <= 20
    -- Must start with letter
    AND username ~ '^[a-zA-Z]'
    -- Only lowercase letters, numbers, underscores, periods
    AND username ~ '^[a-z0-9_.]+$'
  )
);

-- Create unique index for username (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_unique
ON public.profiles (LOWER(username));

-- Create regular index for fast username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username
ON public.profiles (username);

-- Add comment
COMMENT ON COLUMN public.profiles.username IS 'Unique username for user identification and friend search (3-20 chars, lowercase alphanumeric, _, .)';

-- =====================================================
-- 2. CREATE USERNAME VALIDATION FUNCTION
-- =====================================================

-- Function to check if username is available
CREATE OR REPLACE FUNCTION public.is_username_available(p_username TEXT, p_exclude_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if username already exists (case-insensitive)
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE LOWER(username) = LOWER(p_username)
    AND (p_exclude_user_id IS NULL OR id != p_exclude_user_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_username_available(TEXT, UUID) TO authenticated;

-- Function to validate username format
CREATE OR REPLACE FUNCTION public.is_valid_username(p_username TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    -- Length check
    char_length(p_username) >= 3 AND char_length(p_username) <= 20
    -- Must start with letter
    AND p_username ~ '^[a-zA-Z]'
    -- Only lowercase letters, numbers, underscores, periods
    AND p_username ~ '^[a-z0-9_.]+$'
    -- Cannot end with period or underscore
    AND p_username !~ '[_.]$'
    -- Cannot have consecutive periods or underscores
    AND p_username !~ '\.\.'
    AND p_username !~ '__'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_valid_username(TEXT) TO authenticated;

-- =====================================================
-- 3. CREATE TRIGGER TO NORMALIZE USERNAME
-- =====================================================

-- Function to normalize username (force lowercase)
CREATE OR REPLACE FUNCTION public.normalize_username()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.username IS NOT NULL THEN
    -- Convert to lowercase
    NEW.username := LOWER(TRIM(NEW.username));

    -- Validate format
    IF NOT public.is_valid_username(NEW.username) THEN
      RAISE EXCEPTION 'Invalid username format. Must be 3-20 characters, start with a letter, and contain only lowercase letters, numbers, underscores, or periods.';
    END IF;

    -- Check availability (excluding current user)
    IF NOT public.is_username_available(NEW.username, NEW.id) THEN
      RAISE EXCEPTION 'Username "%" is already taken', NEW.username;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_normalize_username ON public.profiles;
CREATE TRIGGER trigger_normalize_username
  BEFORE INSERT OR UPDATE OF username ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_username();

-- =====================================================
-- 4. UPDATE RLS POLICIES (if needed)
-- =====================================================

-- The existing "Users can view all profiles" policy should already cover username
-- No changes needed to RLS policies

-- =====================================================
-- 5. CREATE HELPER FUNCTION FOR USERNAME SUGGESTIONS
-- =====================================================

-- Function to generate username suggestions based on full name
CREATE OR REPLACE FUNCTION public.suggest_usernames(p_full_name TEXT, p_limit INTEGER DEFAULT 5)
RETURNS TABLE(suggestion TEXT) AS $$
DECLARE
  base_username TEXT;
  counter INTEGER := 1;
  current_suggestion TEXT;
BEGIN
  -- Extract first word from full name and clean it
  base_username := LOWER(REGEXP_REPLACE(SPLIT_PART(p_full_name, ' ', 1), '[^a-zA-Z0-9]', '', 'g'));

  -- Ensure it's at least 3 characters
  IF char_length(base_username) < 3 THEN
    base_username := 'user' || base_username;
  END IF;

  -- Truncate if too long
  IF char_length(base_username) > 15 THEN
    base_username := SUBSTRING(base_username, 1, 15);
  END IF;

  -- Return suggestions
  LOOP
    EXIT WHEN counter > p_limit;

    IF counter = 1 THEN
      current_suggestion := base_username;
    ELSE
      current_suggestion := base_username || counter::TEXT;
    END IF;

    -- Only return if available and valid
    IF public.is_valid_username(current_suggestion) AND public.is_username_available(current_suggestion) THEN
      suggestion := current_suggestion;
      RETURN NEXT;
    END IF;

    counter := counter + 1;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.suggest_usernames(TEXT, INTEGER) TO authenticated;

-- =====================================================
-- 6. UPDATE SEARCH FUNCTIONALITY
-- =====================================================

-- We'll handle username search in the application code,
-- but we can add a function to help with combined search

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

-- =====================================================
-- 7. CREATE USERNAME CHANGE LOG (OPTIONAL)
-- =====================================================

-- Track username changes for security/moderation
CREATE TABLE IF NOT EXISTS public.username_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  old_username TEXT,
  new_username TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_username_history_user_id
ON public.username_history(user_id, changed_at DESC);

-- Enable RLS
ALTER TABLE public.username_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own history
CREATE POLICY "Users can view their own username history"
  ON public.username_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Function to log username changes
CREATE OR REPLACE FUNCTION public.log_username_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if username actually changed
  IF OLD.username IS DISTINCT FROM NEW.username THEN
    INSERT INTO public.username_history (user_id, old_username, new_username)
    VALUES (NEW.id, OLD.username, NEW.username);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for logging
DROP TRIGGER IF EXISTS trigger_log_username_change ON public.profiles;
CREATE TRIGGER trigger_log_username_change
  AFTER UPDATE OF username ON public.profiles
  FOR EACH ROW
  WHEN (OLD.username IS DISTINCT FROM NEW.username)
  EXECUTE FUNCTION public.log_username_change();

-- Grant permissions
GRANT SELECT ON public.username_history TO authenticated;

-- =====================================================
-- 8. RESERVED USERNAMES (OPTIONAL)
-- =====================================================

-- Create table for reserved/blocked usernames
CREATE TABLE IF NOT EXISTS public.reserved_usernames (
  username TEXT PRIMARY KEY,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add some common reserved words
INSERT INTO public.reserved_usernames (username, reason) VALUES
  ('admin', 'System reserved'),
  ('root', 'System reserved'),
  ('system', 'System reserved'),
  ('support', 'System reserved'),
  ('help', 'System reserved'),
  ('soteria', 'Brand reserved'),
  ('soteriahealth', 'Brand reserved'),
  ('official', 'System reserved'),
  ('moderator', 'System reserved'),
  ('null', 'System reserved'),
  ('undefined', 'System reserved')
ON CONFLICT (username) DO NOTHING;

-- Update validation function to check reserved usernames
CREATE OR REPLACE FUNCTION public.is_username_available(p_username TEXT, p_exclude_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if reserved
  IF EXISTS (SELECT 1 FROM public.reserved_usernames WHERE LOWER(username) = LOWER(p_username)) THEN
    RETURN false;
  END IF;

  -- Check if already taken
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE LOWER(username) = LOWER(p_username)
    AND (p_exclude_user_id IS NULL OR id != p_exclude_user_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Username System Migration Complete!';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Added username column to profiles table';
  RAISE NOTICE 'Created unique index for case-insensitive usernames';
  RAISE NOTICE 'Added validation functions:';
  RAISE NOTICE '  - is_username_available(username, exclude_user_id)';
  RAISE NOTICE '  - is_valid_username(username)';
  RAISE NOTICE '  - suggest_usernames(full_name, limit)';
  RAISE NOTICE '  - search_profiles(search_term, exclude_id, limit)';
  RAISE NOTICE 'Created username_history table for change tracking';
  RAISE NOTICE 'Added reserved_usernames table';
  RAISE NOTICE 'Created triggers for normalization and logging';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Username Requirements:';
  RAISE NOTICE '  - 3-20 characters';
  RAISE NOTICE '  - Must start with a letter';
  RAISE NOTICE '  - Only lowercase letters, numbers, _, .';
  RAISE NOTICE '  - Cannot end with _ or .';
  RAISE NOTICE '  - No consecutive __ or ..';
  RAISE NOTICE '  - Must be unique (case-insensitive)';
  RAISE NOTICE '==================================================';
END $$;
