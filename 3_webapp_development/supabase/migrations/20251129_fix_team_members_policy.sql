-- Fix team_members visibility policy
-- Ensure that any member of a workspace can see ALL team members in that workspace
-- This is required for the "Groups" page to show member counts correctly

DROP POLICY IF EXISTS "Team members are viewable by workspace members" ON team_members;

CREATE POLICY "Team members are viewable by workspace members" ON team_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = team_members.team_id
    AND (
      -- User is a member of the workspace the team belongs to
      EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_members.workspace_id = teams.workspace_id
        AND workspace_members.user_id = auth.uid()
      )
    )
  )
);
