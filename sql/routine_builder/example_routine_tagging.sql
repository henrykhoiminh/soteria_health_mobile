-- Example UPDATE Statements: Tag Existing Routines
-- Description: Tag 10+ existing routines with body_parts and tags

-- ============================================================================
-- UPPER BODY ROUTINES
-- ============================================================================

-- 1. Neck & Shoulder Relief
UPDATE routines
SET
  body_parts = ARRAY['Neck', 'Shoulder', 'Upper Back'],
  tags = ARRAY['Desk Work', 'Upper Body', 'Mobility', 'Stretching', 'Office', 'Posture']
WHERE name ILIKE '%neck%shoulder%' OR name ILIKE '%shoulder%neck%';

-- 2. Upper Back Release
UPDATE routines
SET
  body_parts = ARRAY['Upper Back', 'Shoulder', 'Neck'],
  tags = ARRAY['Upper Body', 'Stretching', 'Mobility', 'Desk Work', 'Posture']
WHERE name ILIKE '%upper%back%' AND name NOT ILIKE '%lower%';

-- 3. Wrist & Hand Mobility
UPDATE routines
SET
  body_parts = ARRAY['Wrist', 'Hand', 'Elbow'],
  tags = ARRAY['Upper Body', 'Mobility', 'Desk Work', 'Office', 'Computer Work']
WHERE name ILIKE '%wrist%' OR name ILIKE '%hand%';

-- ============================================================================
-- LOWER BODY ROUTINES
-- ============================================================================

-- 4. Lower Back Relief
UPDATE routines
SET
  body_parts = ARRAY['Lower Back', 'Hip'],
  tags = ARRAY['Lower Body', 'Back Care', 'Mobility', 'Stretching', 'Core']
WHERE name ILIKE '%lower%back%' OR name ILIKE '%back%relief%';

-- 5. Hip Mobility & Flexibility
UPDATE routines
SET
  body_parts = ARRAY['Hip', 'Lower Back'],
  tags = ARRAY['Lower Body', 'Mobility', 'Flexibility', 'Stretching', 'Athletes']
WHERE name ILIKE '%hip%' AND (name ILIKE '%mobility%' OR name ILIKE '%flexibility%');

-- 6. Knee Strengthening & Stability
UPDATE routines
SET
  body_parts = ARRAY['Knee', 'Hip', 'Ankle'],
  tags = ARRAY['Lower Body', 'Strength', 'Injury Prevention', 'Recovery', 'Athletes']
WHERE name ILIKE '%knee%';

-- 7. Ankle & Foot Care
UPDATE routines
SET
  body_parts = ARRAY['Ankle', 'Foot'],
  tags = ARRAY['Lower Body', 'Mobility', 'Recovery', 'Athletes', 'Balance']
WHERE name ILIKE '%ankle%' OR name ILIKE '%foot%';

-- ============================================================================
-- MIND & STRESS RELIEF ROUTINES
-- ============================================================================

-- 8. Stress & Anxiety Relief
UPDATE routines
SET
  tags = ARRAY['Mind', 'Mental Health', 'Breathing', 'Meditation', 'Relaxation']
WHERE name ILIKE '%stress%' OR name ILIKE '%anxiety%';

-- 9. Better Sleep & Relaxation
UPDATE routines
SET
  tags = ARRAY['Mind', 'Sleep', 'Relaxation', 'Evening', 'Wind Down']
WHERE name ILIKE '%sleep%' OR name ILIKE '%bedtime%' OR name ILIKE '%evening%';

-- 10. Morning Energy & Focus
UPDATE routines
SET
  tags = ARRAY['Mind', 'Morning', 'Energy', 'Focus', 'Productivity']
WHERE name ILIKE '%morning%' AND (name ILIKE '%energy%' OR name ILIKE '%wake%');

-- ============================================================================
-- FULL BODY & GENERAL WELLNESS ROUTINES
-- ============================================================================

-- 11. Desk Worker Relief (Full Body)
UPDATE routines
SET
  body_parts = ARRAY['Neck', 'Shoulder', 'Upper Back', 'Lower Back', 'Hip', 'Wrist'],
  tags = ARRAY['Office', 'Desk Work', 'Full Body', 'Stretching', 'Posture', 'Computer Work']
WHERE name ILIKE '%desk%' OR name ILIKE '%office%';

-- 12. Post-Workout Recovery
UPDATE routines
SET
  tags = ARRAY['Recovery', 'Athletes', 'Cool Down', 'Stretching', 'Muscle Recovery']
WHERE name ILIKE '%post%workout%' OR name ILIKE '%recovery%' OR name ILIKE '%cool%down%';

-- 13. Runner's Maintenance
UPDATE routines
SET
  body_parts = ARRAY['Hip', 'Knee', 'Ankle', 'Lower Back', 'Foot'],
  tags = ARRAY['Athletes', 'Running', 'Lower Body', 'Injury Prevention', 'Stretching']
WHERE name ILIKE '%runner%' OR name ILIKE '%running%';

-- ============================================================================
-- GENERIC FALLBACK for Untagged Routines
-- ============================================================================

-- Tag Mind category routines that haven't been tagged yet
UPDATE routines
SET
  tags = ARRAY['Mind', 'Mental Health', 'Wellness', 'Relaxation']
WHERE category = 'Mind'
  AND (tags IS NULL OR tags = '{}');

-- Tag Body category routines that haven't been tagged yet
UPDATE routines
SET
  tags = ARRAY['Body', 'Stretching', 'Mobility', 'Wellness']
WHERE category = 'Body'
  AND (tags IS NULL OR tags = '{}');

-- Tag Soul category routines that haven't been tagged yet
UPDATE routines
SET
  tags = ARRAY['Soul', 'Spiritual', 'Wellness', 'Balance']
WHERE category = 'Soul'
  AND (tags IS NULL OR tags = '{}');

-- ============================================================================
-- Verification queries
-- ============================================================================

-- Check tagged routines
-- SELECT name, body_parts, tags
-- FROM routines
-- WHERE tags IS NOT NULL AND tags != '{}'
-- ORDER BY name
-- LIMIT 20;

-- Count routines by tag
-- SELECT unnest(tags) as tag, COUNT(*) as count
-- FROM routines
-- WHERE tags IS NOT NULL
-- GROUP BY tag
-- ORDER BY count DESC;

-- Count routines by body part
-- SELECT unnest(body_parts) as body_part, COUNT(*) as count
-- FROM routines
-- WHERE body_parts IS NOT NULL
-- GROUP BY body_part
-- ORDER BY count DESC;
