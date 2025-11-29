-- Fix projects select policy to allow workspace owners/admins AND global instructors to view projects
-- This script is idempotent (can be run multiple times without error)

-- 1. Drop the policy if it exists with the NEW name
DROP POLICY IF EXISTS "Projects are viewable by team members and workspace admins" ON projects;

-- 2. Drop the policy if it exists with the OLD name
DROP POLICY IF EXISTS "Projects are viewable by team members" ON projects;

-- 3. Create the comprehensive policy
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
    OR
    -- User has global instructor role (fallback)
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('instructor', 'both')
    )
  );
