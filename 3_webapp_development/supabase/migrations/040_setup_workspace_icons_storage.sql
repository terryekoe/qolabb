-- =====================================================
-- Setup Workspace Icons Storage Bucket
-- Migration: 040_setup_workspace_icons_storage.sql
-- =====================================================

-- Create the workspace-icons storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workspace-icons',
  'workspace-icons',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

-- =====================================================
-- Helper Function to Check Workspace Ownership
-- =====================================================

-- Drop existing function if it exists (may have different parameter names)
DO $$ 
BEGIN
  -- Try to drop with different possible signatures
  DROP FUNCTION IF EXISTS is_workspace_owner(UUID, UUID);
  DROP FUNCTION IF EXISTS is_workspace_owner(uuid, uuid);
  DROP FUNCTION IF EXISTS is_workspace_owner(workspace_uuid uuid, user_uuid uuid);
EXCEPTION 
  WHEN OTHERS THEN 
    -- Function might not exist or have dependencies, continue
    NULL;
END $$;

-- Create a SECURITY DEFINER function to check workspace ownership
-- This bypasses RLS to check ownership safely
CREATE OR REPLACE FUNCTION is_workspace_owner(p_workspace_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  SET search_path = public;
  RETURN EXISTS (
    SELECT 1 FROM workspaces
    WHERE id = p_workspace_id
    AND owner_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_workspace_owner(UUID, UUID) TO authenticated;

-- =====================================================
-- Storage Policies for Workspace Icons Bucket
-- =====================================================

-- Policy: Users can view all workspace icons (public read)
DROP POLICY IF EXISTS "Public Workspace Icon Access" ON storage.objects;
CREATE POLICY "Public Workspace Icon Access" ON storage.objects
FOR SELECT USING (bucket_id = 'workspace-icons');

-- Policy: Workspace owners can upload workspace icons
DROP POLICY IF EXISTS "Workspace owners can upload icons" ON storage.objects;
CREATE POLICY "Workspace owners can upload icons" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'workspace-icons'
  AND is_workspace_owner((storage.foldername(name))[1]::UUID, auth.uid())
);

-- Policy: Workspace owners can update workspace icons
DROP POLICY IF EXISTS "Workspace owners can update icons" ON storage.objects;
CREATE POLICY "Workspace owners can update icons" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'workspace-icons'
  AND is_workspace_owner((storage.foldername(name))[1]::UUID, auth.uid())
);

-- Policy: Workspace owners can delete workspace icons
DROP POLICY IF EXISTS "Workspace owners can delete icons" ON storage.objects;
CREATE POLICY "Workspace owners can delete icons" ON storage.objects
FOR DELETE USING (
  bucket_id = 'workspace-icons'
  AND is_workspace_owner((storage.foldername(name))[1]::UUID, auth.uid())
);
