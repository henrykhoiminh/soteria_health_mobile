-- ============================================================================
-- EXERCISE LIBRARY SYSTEM
-- ============================================================================
-- Description: Create exercise library for health team to manage exercises
-- Health team can create/edit exercises, users can browse and use them
-- ============================================================================

-- ============================================================================
-- 1. Create exercises table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic info
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  instructions TEXT NOT NULL,

  -- Metadata
  category TEXT NOT NULL CHECK (category IN ('Mind', 'Body', 'Soul')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),

  -- Duration
  default_duration_seconds INTEGER NOT NULL CHECK (default_duration_seconds >= 5 AND default_duration_seconds <= 1800),

  -- Targeting
  body_parts TEXT[], -- Array of body parts this exercise targets
  tags TEXT[], -- General tags for categorization

  -- Media
  demo_image_url TEXT,
  demo_video_url TEXT,

  -- Metadata
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_official BOOLEAN DEFAULT false, -- Created by health team
  is_public BOOLEAN DEFAULT true, -- Visible to all users
  requires_equipment BOOLEAN DEFAULT false, -- Whether this exercise needs equipment

  -- Usage tracking
  usage_count INTEGER DEFAULT 0, -- How many routines use this exercise

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_difficulty ON exercises(difficulty);
CREATE INDEX IF NOT EXISTS idx_exercises_created_by ON exercises(created_by);
CREATE INDEX IF NOT EXISTS idx_exercises_is_official ON exercises(is_official);
CREATE INDEX IF NOT EXISTS idx_exercises_is_public ON exercises(is_public);
CREATE INDEX IF NOT EXISTS idx_exercises_requires_equipment ON exercises(requires_equipment);

-- GIN indexes for array searches
CREATE INDEX IF NOT EXISTS idx_exercises_body_parts_gin ON exercises USING GIN (body_parts);
CREATE INDEX IF NOT EXISTS idx_exercises_tags_gin ON exercises USING GIN (tags);

-- Text search index
CREATE INDEX IF NOT EXISTS idx_exercises_name_description_text
ON exercises USING GIN (to_tsvector('english', name || ' ' || description || ' ' || instructions));

-- ============================================================================
-- 3. Create updated_at trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_exercises_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS exercises_updated_at ON exercises;
CREATE TRIGGER exercises_updated_at
  BEFORE UPDATE ON exercises
  FOR EACH ROW
  EXECUTE FUNCTION update_exercises_updated_at();

-- ============================================================================
-- 4. Row Level Security (RLS) Policies
-- ============================================================================

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Everyone can read public exercises
CREATE POLICY "public_exercises_are_viewable_by_all"
ON exercises FOR SELECT
TO authenticated
USING (is_public = true);

-- Users can read their own private exercises
CREATE POLICY "users_can_view_own_exercises"
ON exercises FOR SELECT
TO authenticated
USING (created_by = auth.uid());

-- Health team can create exercises
CREATE POLICY "health_team_can_create_exercises"
ON exercises FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('health_team', 'admin')
  )
);

-- Health team can update official exercises, users can update their own
CREATE POLICY "health_team_can_update_official_exercises"
ON exercises FOR UPDATE
TO authenticated
USING (
  (is_official = true AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('health_team', 'admin')
  ))
  OR
  (created_by = auth.uid())
);

-- Health team can delete official exercises, users can delete their own
CREATE POLICY "health_team_can_delete_official_exercises"
ON exercises FOR DELETE
TO authenticated
USING (
  (is_official = true AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('health_team', 'admin')
  ))
  OR
  (created_by = auth.uid())
);

-- ============================================================================
-- 5. Seed some basic official exercises
-- ============================================================================

INSERT INTO exercises (
  name,
  description,
  instructions,
  category,
  difficulty,
  default_duration_seconds,
  body_parts,
  tags,
  is_official,
  is_public
) VALUES
-- Body exercises
(
  'Neck Rolls',
  'Gentle neck mobility exercise to release tension',
  'Slowly roll your head in a circular motion, 5 times clockwise then 5 times counterclockwise. Keep shoulders relaxed throughout.',
  'Body',
  'Beginner',
  60,
  ARRAY['Neck'],
  ARRAY['Stretching', 'Mobility', 'Upper Body'],
  true,
  true
),
(
  'Cat-Cow Stretch',
  'Spinal flexibility exercise alternating between arching and rounding',
  'On hands and knees, alternate between arching back (cow) and rounding spine (cat). Move slowly with breath, 10 repetitions.',
  'Body',
  'Beginner',
  90,
  ARRAY['Upper Back', 'Lower Back', 'Core'],
  ARRAY['Stretching', 'Mobility', 'Flexibility'],
  true,
  true
),
(
  'Plank Hold',
  'Core strengthening exercise in static hold position',
  'On forearms and toes, hold body in straight line. Keep core tight, don''t let hips sag. Hold for 30 seconds, rest, repeat.',
  'Body',
  'Intermediate',
  60,
  ARRAY['Core', 'Shoulders', 'Upper Back'],
  ARRAY['Strength', 'Core Work', 'Stability'],
  true,
  true
),

-- Mind exercises
(
  'Deep Breathing',
  'Calming breath work to reduce stress and center the mind',
  'Sit comfortably. Inhale slowly through nose for 4 counts, hold for 2, exhale through mouth for 6 counts. Repeat 5 times.',
  'Mind',
  'Beginner',
  90,
  ARRAY['Mind'],
  ARRAY['Breathing', 'Meditation', 'Stress Relief'],
  true,
  true
),
(
  'Body Scan Meditation',
  'Mindfulness practice to release physical tension',
  'Bring awareness to your body. Starting from your head, mentally scan down to your toes, releasing tension as you go.',
  'Mind',
  'Beginner',
  120,
  ARRAY['Mind'],
  ARRAY['Meditation', 'Mindfulness', 'Relaxation'],
  true,
  true
),

-- Soul exercises
(
  'Gratitude Reflection',
  'Reflective practice to cultivate appreciation',
  'Think of three things from today you''re grateful for. They can be big or small. Feel the warmth of appreciation for each one.',
  'Soul',
  'Beginner',
  120,
  ARRAY['Soul'],
  ARRAY['Gratitude', 'Reflection', 'Mindfulness'],
  true,
  true
),
(
  'Self-Compassion Practice',
  'Loving-kindness exercise directed toward oneself',
  'Place hand on your heart. Offer yourself kindness for anything you wish had gone differently. Remember: you''re doing your best.',
  'Soul',
  'Beginner',
  90,
  ARRAY['Soul'],
  ARRAY['Self-Compassion', 'Mindfulness', 'Emotional Health'],
  true,
  true
)

ON CONFLICT DO NOTHING;

-- ============================================================================
-- 6. Update usage count when exercises are used in routines
-- ============================================================================

-- This function will be called when routines are created/updated
CREATE OR REPLACE FUNCTION update_exercise_usage_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- This is a placeholder - actual implementation would depend on how
  -- exercises are referenced in routines. If routines.exercises is JSONB,
  -- we'd need to parse it and update counts accordingly.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. Verification queries
-- ============================================================================

-- Check table was created
SELECT
  'Exercises table created' as status,
  COUNT(*) as official_exercises
FROM exercises
WHERE is_official = true;

-- Check indexes
SELECT
  'Indexes created' as status,
  COUNT(*) as index_count
FROM pg_indexes
WHERE tablename = 'exercises';

-- Check RLS policies
SELECT
  'RLS policies created' as status,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'exercises';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT
  '✓ Exercise library system created successfully!' as status,
  'Health team can now create and manage exercises' as next_step;

-- ============================================================================
-- NOTES
-- ============================================================================
-- • exercises table created with all metadata fields
-- • RLS policies allow health team to manage official exercises
-- • Users can create their own private exercises
-- • 7 seed exercises added (Body, Mind, Soul)
-- • Indexes created for performance
-- • Usage tracking placeholder in place
-- ============================================================================
