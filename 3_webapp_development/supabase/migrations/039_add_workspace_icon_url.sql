-- Migration: Add icon_url column to workspaces table
-- Allows workspaces to have custom icons

-- Add icon_url column to workspaces
ALTER TABLE public.workspaces
ADD COLUMN IF NOT EXISTS icon_url TEXT;

-- Add comment
COMMENT ON COLUMN public.workspaces.icon_url IS 'URL to the workspace icon image';
