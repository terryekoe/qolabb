-- Fix projects delete policy to allow instructors and admins to delete
-- Migration: 20251129_fix_projects_delete_policy.sql

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "projects_delete" ON projects;

-- Create the new comprehensive policy
-- Helper function to check workspace membership (bypasses RLS to prevent recursion)
CREATE OR REPLACE FUNCTION is_user_workspace_member(p_workspace_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  -- SECURITY DEFINER functions bypass RLS by default
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id
    AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- Helper function to check user role in workspace
CREATE OR REPLACE FUNCTION user_workspace_role(p_workspace_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM workspace_members
  WHERE workspace_id = p_workspace_id
  AND user_id = p_user_id
  LIMIT 1;
  
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_user_workspace_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION user_workspace_role(UUID, UUID) TO authenticated;

-- Create the new comprehensive policy
CREATE POLICY "projects_delete" ON projects
FOR DELETE
TO authenticated
USING (
  -- 1. Workspace owner can delete
  EXISTS (
    SELECT 1 FROM teams t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE t.id = projects.team_id
    AND w.owner_id = auth.uid()
  )
  OR
  -- 2. Workspace admin or instructor can delete
  EXISTS (
    SELECT 1 FROM teams t
    WHERE t.id = projects.team_id
    AND is_user_workspace_member(t.workspace_id, auth.uid())
    AND user_workspace_role(t.workspace_id, auth.uid()) IN ('admin', 'instructor')
  )
);
