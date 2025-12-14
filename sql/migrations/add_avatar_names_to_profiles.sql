-- Migration: Add onboarding-related columns to profiles table
-- These columns support the onboarding flow and avatar companions

-- Avatar name columns
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS mind_name TEXT;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS body_name TEXT;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS soul_name TEXT;

-- Onboarding status columns
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Journey columns (if not already present)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS journey_focus TEXT;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS journey_started_at TIMESTAMPTZ;

-- User identity columns (if not already present)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS first_name TEXT;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_name TEXT;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS username TEXT;

-- Add unique constraint on username if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_key'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN profiles.mind_name IS 'Name given to the Mind avatar companion (e.g., Theo, Mina, Mochi)';
COMMENT ON COLUMN profiles.body_name IS 'Name given to the Body avatar companion (e.g., Atlas, Paz, Miguel)';
COMMENT ON COLUMN profiles.soul_name IS 'Name given to the Soul avatar companion (e.g., Bodhi, Lotus, Tofu)';
COMMENT ON COLUMN profiles.onboarding_completed IS 'Whether the user has completed the onboarding flow';
COMMENT ON COLUMN profiles.onboarding_completed_at IS 'Timestamp when onboarding was completed';
COMMENT ON COLUMN profiles.journey_focus IS 'User journey type: Injury Prevention or Recovery';
COMMENT ON COLUMN profiles.journey_started_at IS 'Timestamp when the journey was started';
