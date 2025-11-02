-- Add first_tour_completed field to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS first_tour_completed BOOLEAN DEFAULT false;

-- Add onboarding_completed if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_profiles_first_tour_completed ON profiles(first_tour_completed);
