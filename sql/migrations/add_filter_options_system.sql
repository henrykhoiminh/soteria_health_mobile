-- ============================================================================
-- ADD FILTER OPTIONS SYSTEM
-- ============================================================================
-- Description: Creates a dynamic filter_options table for managing body parts
-- and other filter types. Replaces hardcoded UPPER_BODY_AREAS/LOWER_BODY_AREAS
-- with database-driven values that health team members can manage.
-- ============================================================================

-- Create filter_options table
CREATE TABLE IF NOT EXISTS filter_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filter_type TEXT NOT NULL,
  value TEXT NOT NULL,
  group_name TEXT,
  group_order INTEGER DEFAULT 0,
  item_order INTEGER DEFAULT 0,
  is_enabled BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- No duplicate values within the same filter type
  UNIQUE (filter_type, value)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_filter_options_type
ON filter_options(filter_type);

CREATE INDEX IF NOT EXISTS idx_filter_options_type_enabled
ON filter_options(filter_type, is_enabled)
WHERE is_enabled = true;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE filter_options ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read filter options
CREATE POLICY "Authenticated users can read filter options"
ON filter_options FOR SELECT
TO authenticated
USING (true);

-- Health team and admin can insert filter options
CREATE POLICY "Health team and admin can insert filter options"
ON filter_options FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('health_team', 'admin')
  )
);

-- Health team and admin can update filter options
CREATE POLICY "Health team and admin can update filter options"
ON filter_options FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('health_team', 'admin')
  )
);

-- Only admin can delete filter options
CREATE POLICY "Admin can delete filter options"
ON filter_options FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ============================================================================
-- SEED DATA: Body Parts
-- ============================================================================

INSERT INTO filter_options (filter_type, value, group_name, group_order, item_order)
VALUES
  -- Upper Body (group_order = 0)
  ('body_part', 'Neck',       'Upper Body', 0, 0),
  ('body_part', 'Shoulder',   'Upper Body', 0, 1),
  ('body_part', 'Upper Back', 'Upper Body', 0, 2),
  ('body_part', 'Elbow',      'Upper Body', 0, 3),
  ('body_part', 'Wrist',      'Upper Body', 0, 4),
  ('body_part', 'Hand',       'Upper Body', 0, 5),
  -- Lower Body (group_order = 1)
  ('body_part', 'Lower Back', 'Lower Body', 1, 0),
  ('body_part', 'Hip',        'Lower Body', 1, 1),
  ('body_part', 'Knee',       'Lower Body', 1, 2),
  ('body_part', 'Ankle',      'Lower Body', 1, 3),
  ('body_part', 'Foot',       'Lower Body', 1, 4)
ON CONFLICT (filter_type, value) DO NOTHING;

-- ============================================================================
-- RPC FUNCTION: Rename Body Part (cascades to routines, exercises, profiles)
-- ============================================================================

CREATE OR REPLACE FUNCTION rename_body_part(old_value TEXT, new_value TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check caller is health_team or admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('health_team', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only health team members and admins can rename body parts';
  END IF;

  -- Update filter_options
  UPDATE filter_options
  SET value = new_value
  WHERE filter_type = 'body_part' AND value = old_value;

  -- Cascade to routines.body_parts (text array)
  UPDATE routines
  SET body_parts = array_replace(body_parts, old_value, new_value)
  WHERE body_parts @> ARRAY[old_value];

  -- Cascade to exercises.body_parts (text array, if the column exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exercises' AND column_name = 'body_parts'
  ) THEN
    EXECUTE format(
      'UPDATE exercises SET body_parts = array_replace(body_parts, %L, %L) WHERE body_parts @> ARRAY[%L]',
      old_value, new_value, old_value
    );
  END IF;

  -- Cascade to profiles.recovery_areas (text array)
  UPDATE profiles
  SET recovery_areas = array_replace(recovery_areas, old_value, new_value)
  WHERE recovery_areas @> ARRAY[old_value];
END;
$$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check table was created
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'filter_options'
ORDER BY ordinal_position;

-- Check seed data
SELECT filter_type, group_name, value, group_order, item_order
FROM filter_options
WHERE filter_type = 'body_part'
ORDER BY group_order, item_order;

-- Check RLS policies
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'filter_options';
