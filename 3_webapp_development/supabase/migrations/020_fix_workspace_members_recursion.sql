-- Migration: 020_fix_workspace_members_recursion.sql
-- Description: Fix infinite recursion in workspace_members RLS policies

-- Drop the problematic policies that cause recursion
DROP POLICY IF EXISTS "workspace_members_enhanced_select" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_enhanced_insert" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_enhanced_update" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_enhanced_delete" ON workspace_members;

-- Create simple, non-recursive policies
-- SELECT: Allow users to see their own memberships + workspace owners can see all members
CREATE POLICY "workspace_members_safe_select" ON workspace_members
FOR SELECT
TO authenticated
USING (
  -- User can see their own membership
  user_id = auth.uid()
  OR
  -- Workspace owner can see all members (no recursion - direct check)
  EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = workspace_members.workspace_id
    AND w.owner_id = auth.uid()
  )
);

-- INSERT: Allow users to join themselves + workspace owners can add members
CREATE POLICY "workspace_members_safe_insert" ON workspace_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can join themselves
  user_id = auth.uid()
  OR
  -- Workspace owner can add members (no recursion - direct check)
  EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = workspace_members.workspace_id
    AND w.owner_id = auth.uid()
  )
);

-- UPDATE: Allow users to update their own membership + workspace owners can update members
CREATE POLICY "workspace_members_safe_update" ON workspace_members
FOR UPDATE
TO authenticated
USING (
  -- User can update their own membership
  user_id = auth.uid()
  OR
  -- Workspace owner can update members (no recursion - direct check)
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
    SELECT 1 FROM workspaces w
    WHERE w.id = workspace_members.workspace_id
    AND w.owner_id = auth.uid()
  )
);

-- DELETE: Allow users to leave themselves + workspace owners can remove members
CREATE POLICY "workspace_members_safe_delete" ON workspace_members
FOR DELETE
TO authenticated
USING (
  -- User can leave themselves
  user_id = auth.uid()
  OR
  -- Workspace owner can remove members (no recursion - direct check)
  EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = workspace_members.workspace_id
    AND w.owner_id = auth.uid()
  )
);

-- Ensure RLS is enabled
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;