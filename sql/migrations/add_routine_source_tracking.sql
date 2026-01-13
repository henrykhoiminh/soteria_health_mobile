-- ============================================================================
-- ADD ROUTINE SOURCE TRACKING
-- ============================================================================
-- Description: Adds source_routine_id column to track which routine a
-- customized routine was based on. Enables "Clone & Customize" feature.
-- ============================================================================

-- Add source_routine_id column
-- NULL = original routine, not based on another
-- UUID = references the source routine this was customized from
ALTER TABLE routines
ADD COLUMN IF NOT EXISTS source_routine_id UUID REFERENCES routines(id) ON DELETE SET NULL;

-- Add index for efficient queries
-- Partial index since most routines won't have a source
CREATE INDEX IF NOT EXISTS idx_routines_source_routine
ON routines(source_routine_id)
WHERE source_routine_id IS NOT NULL;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check column was added
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'routines'
  AND column_name = 'source_routine_id';

-- Check index was created
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'routines'
  AND indexname = 'idx_routines_source_routine';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT
  '✓ Source routine tracking added!' as status,
  'Routines can now be customized from existing routines' as result;

-- ============================================================================
-- NOTES
-- ============================================================================
-- • source_routine_id is NULL for original routines
-- • When a user customizes a routine, source_routine_id points to the original
-- • ON DELETE SET NULL ensures customized routines survive if source is deleted
-- • Partial index only indexes rows with a source (saves space)
-- ============================================================================
