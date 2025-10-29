-- =====================================================
-- Add Goals Column to Profiles Table
-- Migration: 007_add_goals_to_profiles.sql
-- Description: Adds goals column to store user goals from onboarding
-- =====================================================

-- Add goals column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS goals TEXT[] DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.goals IS 'User goals selected during onboarding (e.g., Research Excellence, Academic Publishing)';

-- Create index for faster goal-based queries (optional)
CREATE INDEX IF NOT EXISTS idx_profiles_goals ON profiles USING GIN (goals);