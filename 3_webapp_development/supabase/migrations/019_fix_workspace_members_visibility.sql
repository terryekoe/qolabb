-- Migration: 019_fix_workspace_members_visibility.sql
-- Description: Fix RLS policies to allow workspace owners/admins to see all workspace members

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "workspace_members_simple_select" ON workspace_members;

-- Create new policy that allows:
-- 1. Users to see their own memberships
-- 2. Workspace owners/admins to see all members in their workspaces
CREATE POLICY "workspace_members_enhanced_select" ON workspace_members
FOR SELECT
TO authenticated
USING (
  -- User can see their own membership
  user_id = auth.uid()
  OR
  -- User can see all members if they are owner/admin of the workspace
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  )
  OR
  -- Workspace owner can see all members
  EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = workspace_members.workspace_id
    AND w.owner_id = auth.uid()
  )
);

-- Update INSERT policy to allow workspace owners/admins to add members
DROP POLICY IF EXISTS "workspace_members_simple_insert" ON workspace_members;
CREATE POLICY "workspace_members_enhanced_insert" ON workspace_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can join themselves
  user_id = auth.uid()
  OR
  -- Workspace owners/admins can add members
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  )
  OR
  -- Workspace owner can add members
  EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = workspace_members.workspace_id
    AND w.owner_id = auth.uid()
  )
);

-- Update UPDATE policy to allow workspace owners/admins to update member roles
DROP POLICY IF EXISTS "workspace_members_simple_update" ON workspace_members;
CREATE POLICY "workspace_members_enhanced_update" ON workspace_members
FOR UPDATE
TO authenticated
USING (
  -- User can update their own membership (limited)
  user_id = auth.uid()
  OR
  -- Workspace owners/admins can update members
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  )
  OR
  -- Workspace owner can update members
  EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = workspace_members.workspace_id
    AND w.owner_id = auth.uid()
  )
)
WITH CHECK (
  -- Same conditions for WITH CHECK
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  )
  OR
  EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = workspace_members.workspace_id
    AND w.owner_id = auth.uid()
  )
);

-- Update DELETE policy to allow workspace owners/admins to remove members
DROP POLICY IF EXISTS "workspace_members_simple_delete" ON workspace_members;
CREATE POLICY "workspace_members_enhanced_delete" ON workspace_members
FOR DELETE
TO authenticated
USING (
  -- User can leave themselves
  user_id = auth.uid()
  OR
  -- Workspace owners/admins can remove members
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  )
  OR
  -- Workspace owner can remove members
  EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = workspace_members.workspace_id
    AND w.owner_id = auth.uid()
  )
);

-- Ensure RLS is enabled
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;