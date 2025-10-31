-- =====================================================
-- Migration: 026_fix_profile_creation_race_condition.sql
-- Description: Fix race condition in profile creation by improving the trigger
-- and making it more robust against timing issues
-- =====================================================

-- Drop the existing trigger and function to recreate them with better error handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Use INSERT ... ON CONFLICT to handle race conditions
  INSERT INTO public.profiles (id, full_name, role, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    'student',
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    email = COALESCE(EXCLUDED.email, profiles.email),
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger with better timing
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also create a function to safely create profiles from application code
CREATE OR REPLACE FUNCTION public.safe_create_profile(
  user_id UUID,
  user_full_name TEXT DEFAULT 'User',
  user_role TEXT DEFAULT 'student',
  user_email TEXT DEFAULT NULL
)
RETURNS TABLE(id UUID, full_name TEXT, role TEXT, email TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ) AS $$
BEGIN
  -- Check if user exists in auth.users first
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = user_id) THEN
    RAISE EXCEPTION 'User with ID % does not exist in auth.users', user_id;
  END IF;

  -- Use INSERT ... ON CONFLICT to handle race conditions
  INSERT INTO public.profiles (id, full_name, role, email)
  VALUES (user_id, user_full_name, user_role, user_email)
  ON CONFLICT (id) DO UPDATE SET
    full_name = CASE 
      WHEN profiles.full_name = 'User' AND EXCLUDED.full_name != 'User' 
      THEN EXCLUDED.full_name 
      ELSE profiles.full_name 
    END,
    email = COALESCE(EXCLUDED.email, profiles.email),
    updated_at = NOW();

  -- Return the profile
  RETURN QUERY
  SELECT p.id, p.full_name, p.role, p.email, p.created_at, p.updated_at
  FROM public.profiles p
  WHERE p.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.safe_create_profile TO authenticated, anon;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';