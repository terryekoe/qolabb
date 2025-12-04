-- Add content column to projects table for Native Group Workspace
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS content JSONB DEFAULT '{}'::jsonb;

-- Add last_edited_by and last_edited_at for tracking
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ DEFAULT NOW();

-- Update RLS policies to allow team members to update content
-- (Existing policies might already cover this if they allow UPDATE on projects for team members)
-- Let's verify and ensure team members can update their own project's content

-- Policy: Team members can update their own project (specifically content)
CREATE POLICY "Team members can update project content" ON projects
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = projects.team_id
    AND tm.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = projects.team_id
    AND tm.user_id = auth.uid()
  )
);
