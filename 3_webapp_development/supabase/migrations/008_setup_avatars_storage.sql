-- =====================================================
-- Setup Avatars Storage Bucket
-- Migration: 008_setup_avatars_storage.sql
-- =====================================================

-- Create the avatars storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

-- =====================================================
-- Storage Policies for Avatars Bucket
-- =====================================================

-- Policy: Users can view all avatars (public read)
CREATE POLICY "Public Avatar Access" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- Policy: Users can upload their own avatars
CREATE POLICY "Users can upload own avatar" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their own avatars
CREATE POLICY "Users can update own avatar" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own avatars
CREATE POLICY "Users can delete own avatar" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- Enable RLS on storage.objects (if not already enabled)
-- =====================================================

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Comments for documentation
-- =====================================================

COMMENT ON POLICY "Public Avatar Access" ON storage.objects IS 
'Allows public read access to all avatar images';

COMMENT ON POLICY "Users can upload own avatar" ON storage.objects IS 
'Allows authenticated users to upload avatar images to their own folder';

COMMENT ON POLICY "Users can update own avatar" ON storage.objects IS 
'Allows authenticated users to update their own avatar images';

COMMENT ON POLICY "Users can delete own avatar" ON storage.objects IS 
'Allows authenticated users to delete their own avatar images';