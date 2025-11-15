-- =====================================================
-- FIX: Circle Routines Delete Policy
-- =====================================================
-- Allow circle admins to delete any routine from their circle
-- Previously only the person who added the routine could delete it
-- =====================================================

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "circle_routines_delete" ON public.circle_routines;

-- Create new policy that allows:
-- 1. User who added the routine (shared_by)
-- 2. Circle admins
CREATE POLICY "circle_routines_delete"
  ON public.circle_routines FOR DELETE TO authenticated
  USING (
    -- User who added the routine can delete it
    shared_by = auth.uid()
    OR
    -- Circle admins can delete any routine in their circle
    EXISTS (
      SELECT 1
      FROM public.circle_members
      WHERE circle_members.circle_id = circle_routines.circle_id
      AND circle_members.user_id = auth.uid()
      AND circle_members.role = 'admin'
      LIMIT 1
    )
  );

RAISE NOTICE '✓ Updated circle_routines delete policy to allow admins';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓✓✓ POLICY FIX COMPLETE! ✓✓✓';
  RAISE NOTICE '';
  RAISE NOTICE 'Circle admins can now delete any routine';
  RAISE NOTICE 'Users can still delete routines they added';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
