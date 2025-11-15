-- Database Migration: Routine Search & Tagging System
-- Description: Add advanced search columns and GIN indexes for efficient array searching

-- ============================================================================
-- 1. Add new array columns to routines table for advanced search
-- ============================================================================

-- Add tags array for general categorization (e.g., "Desk Work", "Upper Body", "Stretching")
ALTER TABLE routines
ADD COLUMN IF NOT EXISTS tags text[];

-- Add body_parts array for targeted body areas (e.g., ["Neck", "Shoulder", "Upper Back"])
ALTER TABLE routines
ADD COLUMN IF NOT EXISTS body_parts text[];

-- Add comments to document the new fields
COMMENT ON COLUMN routines.tags IS 'General tags for categorization (e.g., Desk Work, Upper Body, Mobility, Stretching)';
COMMENT ON COLUMN routines.body_parts IS 'Body parts targeted by this routine (e.g., Neck, Shoulder, Lower Back)';

-- ============================================================================
-- 2. Create GIN indexes on array columns for efficient PostgreSQL array searching
-- ============================================================================

-- GIN (Generalized Inverted Index) indexes are optimal for array containment queries (@>)
-- These indexes will significantly speed up searches across array columns

-- Create GIN index on tags for fast tag-based searches
CREATE INDEX IF NOT EXISTS idx_routines_tags_gin ON routines USING GIN (tags);

-- Create GIN index on body_parts for fast body part searches
CREATE INDEX IF NOT EXISTS idx_routines_body_parts_gin ON routines USING GIN (body_parts);

-- Note: GIN indexes support the following PostgreSQL array operators efficiently:
-- @> (contains) - e.g., WHERE body_parts @> ARRAY['Neck']
-- <@ (is contained by) - e.g., WHERE body_parts <@ ARRAY['Neck', 'Shoulder']
-- && (overlaps) - e.g., WHERE tags && ARRAY['Upper Body', 'Stretching']

-- ============================================================================
-- 3. Create text search index for name and description
-- ============================================================================

-- Create a GIN index for full-text search on name and description
-- This enables efficient ILIKE queries for text matching
CREATE INDEX IF NOT EXISTS idx_routines_name_description_text
ON routines USING GIN (to_tsvector('english', name || ' ' || description));

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

-- Verification queries (run these after migration to verify success):
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'routines' AND column_name IN ('tags', 'body_parts');
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'routines' AND indexname LIKE '%_gin%';
