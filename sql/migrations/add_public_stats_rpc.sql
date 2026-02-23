-- =====================================================
-- Public Stats & Activity RPC Functions
-- Allows reading another user's XP/level data and
-- recent activity for profile modals (e.g., in Circles)
-- =====================================================

-- RPC: Get a user's public XP stats (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_public_stats(p_user_id UUID)
RETURNS TABLE (
  total_xp INTEGER,
  mind_xp INTEGER,
  body_xp INTEGER,
  soul_xp INTEGER
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    COALESCE(us.total_xp, 0)::INTEGER,
    COALESCE(us.mind_xp, 0)::INTEGER,
    COALESCE(us.body_xp, 0)::INTEGER,
    COALESCE(us.soul_xp, 0)::INTEGER
  FROM public.user_stats us
  WHERE us.user_id = p_user_id;
$$;

-- RPC: Get a user's recent activity (bypasses RLS)
-- Returns last N activity items with joined profile/routine/circle data
CREATE OR REPLACE FUNCTION public.get_user_recent_activity(p_user_id UUID, p_limit INTEGER DEFAULT 3)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  activity_type TEXT,
  related_routine_id UUID,
  related_circle_id UUID,
  activity_data JSONB,
  created_at TIMESTAMPTZ,
  user_first_name TEXT,
  user_last_name TEXT,
  user_username TEXT,
  user_profile_picture_url TEXT,
  routine_name TEXT,
  circle_name TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    fa.id,
    fa.user_id,
    fa.activity_type,
    fa.related_routine_id,
    fa.related_circle_id,
    fa.activity_data,
    fa.created_at,
    p.first_name,
    p.last_name,
    p.username,
    p.profile_picture_url,
    r.name AS routine_name,
    c.name AS circle_name
  FROM public.friend_activity fa
  JOIN public.profiles p ON p.id = fa.user_id
  LEFT JOIN public.routines r ON r.id = fa.related_routine_id
  LEFT JOIN public.circles c ON c.id = fa.related_circle_id
  WHERE fa.user_id = p_user_id
  ORDER BY fa.created_at DESC
  LIMIT p_limit;
$$;
