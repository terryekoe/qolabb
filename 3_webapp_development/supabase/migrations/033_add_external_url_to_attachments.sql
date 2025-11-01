-- =====================================================
-- Add External URL Support to Task Attachments
-- Migration: 033_add_external_url_to_attachments.sql
-- Allows users to attach files via URL instead of uploading
-- =====================================================

-- Add external_url column to task_attachments
ALTER TABLE public.task_attachments
ADD COLUMN IF NOT EXISTS external_url TEXT;

-- Make file_path nullable (since external_url can be used instead)
ALTER TABLE public.task_attachments
ALTER COLUMN file_path DROP NOT NULL;

-- Add check constraint: either file_path or external_url must be present
ALTER TABLE public.task_attachments
ADD CONSTRAINT task_attachments_file_or_url_check
CHECK (
  (file_path IS NOT NULL AND file_path != '') OR 
  (external_url IS NOT NULL AND external_url != '')
);

-- Update file_name to be nullable (for external URLs, we can extract from URL or use a default)
ALTER TABLE public.task_attachments
ALTER COLUMN file_name DROP NOT NULL;

-- Update file_size to be nullable (external URLs don't have a size)
ALTER TABLE public.task_attachments
ALTER COLUMN file_size DROP NOT NULL;

-- Add comment explaining the dual approach
COMMENT ON COLUMN public.task_attachments.external_url IS 'External URL for attachments stored outside Supabase (e.g., Google Drive, Dropbox, etc.). Either file_path or external_url must be provided.';
