-- =====================================================
-- Routine of the Day Feature
-- Adds columns to circles table for daily routine challenge
-- =====================================================

-- Add routine_of_the_day columns to circles table
ALTER TABLE public.circles
ADD COLUMN IF NOT EXISTS routine_of_the_day_id UUID REFERENCES public.routines(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS routine_of_the_day_set_at TIMESTAMPTZ;

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_circles_routine_of_the_day
ON public.circles (routine_of_the_day_id)
WHERE routine_of_the_day_id IS NOT NULL;

-- =====================================================
-- Bonus XP tracking for Routine of the Day
-- Prevents double-awarding when all members complete
-- =====================================================

CREATE TABLE IF NOT EXISTS public.circle_rotd_bonus_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  bonus_date DATE NOT NULL DEFAULT CURRENT_DATE,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  bonus_xp INTEGER NOT NULL,
  CONSTRAINT unique_circle_rotd_bonus_per_day UNIQUE (circle_id, bonus_date)
);

ALTER TABLE public.circle_rotd_bonus_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "circle_rotd_bonus_log_select" ON public.circle_rotd_bonus_log
  FOR SELECT USING (true);

CREATE POLICY "circle_rotd_bonus_log_insert" ON public.circle_rotd_bonus_log
  FOR INSERT WITH CHECK (true);

-- Verification
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'circles'
AND column_name LIKE 'routine_of_the_day%'
ORDER BY ordinal_position;
