-- Add resources column to projects table
-- This allows storing external links and files as resources for assignments

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS resources JSONB DEFAULT '[]'::jsonb;

-- Add comment to document the structure
COMMENT ON COLUMN projects.resources IS 'Array of resource objects with structure: {id, type, name, url, size?, fileType?, addedBy, addedAt}';
