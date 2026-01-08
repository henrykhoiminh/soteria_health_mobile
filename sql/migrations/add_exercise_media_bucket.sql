-- Migration: Add Exercise Media Storage Bucket
-- Description: Creates storage bucket for exercise demo videos
-- All authenticated users can upload videos for their own exercises

-- ============================================
-- 1. Create the exercise-media bucket
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exercise-media',
  'exercise-media',
  true,  -- Public read access for demo content
  104857600,  -- 100MB max file size
  ARRAY['video/mp4', 'video/quicktime', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- 2. RLS Policies for exercise-media bucket
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access for exercise media" ON storage.objects;
DROP POLICY IF EXISTS "Health team can upload exercise media" ON storage.objects;
DROP POLICY IF EXISTS "Health team can update exercise media" ON storage.objects;
DROP POLICY IF EXISTS "Health team can delete exercise media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload exercise media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update exercise media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete exercise media" ON storage.objects;

-- Policy: Anyone can view exercise media (public demos)
CREATE POLICY "Public read access for exercise media"
ON storage.objects FOR SELECT
USING (bucket_id = 'exercise-media');

-- Policy: All authenticated users can upload (they can only create exercises they own)
CREATE POLICY "Authenticated users can upload exercise media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'exercise-media');

-- Policy: All authenticated users can update their uploads
-- Note: Exercise-level permissions are enforced in the application layer
CREATE POLICY "Authenticated users can update exercise media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'exercise-media');

-- Policy: All authenticated users can delete their uploads
-- Note: Exercise-level permissions are enforced in the application layer
CREATE POLICY "Authenticated users can delete exercise media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'exercise-media');

-- ============================================
-- 3. Verify bucket creation
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'exercise-media') THEN
    RAISE NOTICE 'exercise-media bucket created successfully';
  ELSE
    RAISE EXCEPTION 'Failed to create exercise-media bucket';
  END IF;
END $$;
