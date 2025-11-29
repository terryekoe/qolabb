-- Fix projects select policy to allow workspace owners/admins to view projects
-- This ensures instructors can see assignment details even if they are not in the team

DROP POLICY IF EXISTS "Projects are viewable by team members" ON projects;

CREATE POLICY "Projects are viewable by team members and workspace admins"
  ON projects FOR SELECT
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
  );
