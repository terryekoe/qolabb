-- Fix projects update policy to allow workspace owners/admins to update projects
-- This ensures instructors can edit assignment details

-- 1. Drop the old policy
DROP POLICY IF EXISTS "Team members can update projects" ON projects;
DROP POLICY IF EXISTS "Team members and workspace admins can update projects" ON projects;

-- 2. Create the new permissive policy
CREATE POLICY "Team members and workspace admins can update projects"
  ON projects FOR UPDATE
  USING (
    -- User is a team member
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = projects.team_id 
      AND user_id = auth.uid()
    )
    OR
    -- User is a workspace owner/admin
    EXISTS (
      SELECT 1 FROM workspace_members 
      WHERE workspace_id = projects.workspace_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
    OR
    -- User has global instructor role
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('instructor', 'both')
    )
  );
