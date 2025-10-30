-- =====================================================
-- Migration: 017_add_email_to_profiles.sql
-- Description: Add email field to profiles table for easier access
-- =====================================================

-- Add email column to profiles table
ALTER TABLE profiles ADD COLUMN email TEXT;

-- Create index for email lookups
CREATE INDEX idx_profiles_email ON profiles(email);

-- Update existing profiles with email from auth.users
-- Note: This will be handled by the application code during profile updates

-- Add comment for documentation
COMMENT ON COLUMN profiles.email IS 'User email address, synced from auth.users for easier access';