-- =====================================================
-- Migration: 028_simple_fix_workspace_members.sql
-- Description: Simple fix for workspace_members recursion - only update policies
-- =====================================================

-- Disable RLS temporarily
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on workspace_members
DROP POLICY IF EXISTS "workspace_members_select_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_update_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete_policy" ON workspace_members;
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can insert workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can update workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can delete workspace members" ON workspace_members;

-- Re-enable RLS
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Create simple policies that don't cause recursion
CREATE POLICY "workspace_members_select_policy" ON workspace_members
FOR SELECT USING (
  -- User is the workspace owner (direct check, no recursion)
  EXISTS (
    SELECT 1 FROM workspaces w 
    WHERE w.id = workspace_members.workspace_id 
    AND w.owner_id = auth.uid()
  )
  OR
  -- User is this specific member (direct check, no recursion)
  workspace_members.user_id = auth.uid()
);

CREATE POLICY "workspace_members_insert_policy" ON workspace_members
FOR INSERT WITH CHECK (
  -- Only workspace owners can add members
  EXISTS (
    SELECT 1 FROM workspaces w 
    WHERE w.id = workspace_members.workspace_id 
    AND w.owner_id = auth.uid()
  )
);

CREATE POLICY "workspace_members_update_policy" ON workspace_members
FOR UPDATE USING (
  -- Only workspace owners can update member roles
  EXISTS (
    SELECT 1 FROM workspaces w 
    WHERE w.id = workspace_members.workspace_id 
    AND w.owner_id = auth.uid()
  )
);

CREATE POLICY "workspace_members_delete_policy" ON workspace_members
FOR DELETE USING (
  -- Workspace owners can remove any member, users can remove themselves
  EXISTS (
    SELECT 1 FROM workspaces w 
    WHERE w.id = workspace_members.workspace_id 
    AND w.owner_id = auth.uid()
  )
  OR
  workspace_members.user_id = auth.uid()
);

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';