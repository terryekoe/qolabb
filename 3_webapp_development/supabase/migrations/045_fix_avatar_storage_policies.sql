-- =====================================================
-- Fix Avatar Storage RLS Policies
-- =====================================================
-- Issue: Storage policies don't match actual file path structure
-- Solution: Update policies to correctly extract user ID from filename
--
-- File upload pattern: .from('avatars').upload('avatars/{user-id}-{timestamp}.ext', file)
-- The 'name' field in storage.objects will be: 'avatars/{user-id}-{timestamp}.ext'
-- We need to extract: filename part (after '/') then user ID part (before '-')

-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;

-- Create helper function to extract user ID from avatar path
-- Handles paths like: 'avatars/{user-id}-{timestamp}.ext' or '{user-id}-{timestamp}.ext'
CREATE OR REPLACE FUNCTION extract_user_id_from_avatar_path(file_path TEXT)
RETURNS TEXT AS $$
DECLARE
  filename TEXT;
  path_parts TEXT[];
BEGIN
  -- Split path by '/' to get parts
  path_parts := string_to_array(file_path, '/');
  
  -- Get the last part (filename)
  filename := path_parts[array_length(path_parts, 1)];
  
  -- Extract user ID (part before first '-')
  RETURN split_part(filename, '-', 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION extract_user_id_from_avatar_path(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION extract_user_id_from_avatar_path(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION extract_user_id_from_avatar_path(TEXT) TO public;

-- Policy: Users can upload their own avatars
CREATE POLICY "Users can upload own avatar" ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = extract_user_id_from_avatar_path(name)
);

-- Policy: Users can update their own avatars
CREATE POLICY "Users can update own avatar" ON storage.objects
FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = extract_user_id_from_avatar_path(name)
);

-- Policy: Users can delete their own avatars
CREATE POLICY "Users can delete own avatar" ON storage.objects
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = extract_user_id_from_avatar_path(name)
);

-- Ensure public read access policy exists
DROP POLICY IF EXISTS "Public Avatar Access" ON storage.objects;
CREATE POLICY "Public Avatar Access" ON storage.objects
FOR SELECT 
TO public
USING (bucket_id = 'avatars');
