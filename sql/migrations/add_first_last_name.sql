-- Migration: Add first_name and last_name columns, migrate from full_name
-- This migration splits the full_name column into first_name and last_name

-- Step 1: Add new columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Step 2: Migrate existing data from full_name to first_name/last_name
-- This splits on the first space: everything before is first_name, after is last_name
UPDATE profiles
SET
  first_name = CASE
    WHEN full_name IS NOT NULL AND full_name != '' THEN
      CASE
        WHEN position(' ' in full_name) > 0 THEN split_part(full_name, ' ', 1)
        ELSE full_name
      END
    ELSE NULL
  END,
  last_name = CASE
    WHEN full_name IS NOT NULL AND full_name != '' AND position(' ' in full_name) > 0 THEN
      substring(full_name from position(' ' in full_name) + 1)
    ELSE NULL
  END
WHERE first_name IS NULL;

-- Step 3: Create index on first_name for search optimization
CREATE INDEX IF NOT EXISTS idx_profiles_first_name ON profiles(first_name);
CREATE INDEX IF NOT EXISTS idx_profiles_last_name ON profiles(last_name);

-- Note: We keep the full_name column for backwards compatibility
-- It can be dropped in a future migration once all code is updated
-- To drop later: ALTER TABLE profiles DROP COLUMN full_name;
