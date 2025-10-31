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
-- Note: RLS is already enabled on storage.objects by default in Supabase
-- =====================================================

-- =====================================================
-- Storage policies are now configured for avatar management
-- Users can upload, update, and delete their own avatars
-- All avatars are publicly readable
-- =====================================================