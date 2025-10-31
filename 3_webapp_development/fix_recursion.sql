-- Direct fix for workspace_members infinite recursion
-- This script will be executed directly on the remote database

-- Disable RLS temporarily
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
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

-- Create simple, non-recursive policies
CREATE POLICY "workspace_members_select_policy" ON workspace_members
FOR SELECT USING (
  -- User is the workspace owner
  EXISTS (
    SELECT 1 FROM workspaces w 
    WHERE w.id = workspace_members.workspace_id 
    AND w.owner_id = auth.uid()
  )
  OR
  -- User is this specific member
  workspace_members.user_id = auth.uid()
);

CREATE POLICY "workspace_members_insert_policy" ON workspace_members
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspaces w 
    WHERE w.id = workspace_members.workspace_id 
    AND w.owner_id = auth.uid()
  )
);

CREATE POLICY "workspace_members_update_policy" ON workspace_members
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM workspaces w 
    WHERE w.id = workspace_members.workspace_id 
    AND w.owner_id = auth.uid()
  )
);

CREATE POLICY "workspace_members_delete_policy" ON workspace_members
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM workspaces w 
    WHERE w.id = workspace_members.workspace_id 
    AND w.owner_id = auth.uid()
  )
  OR
  workspace_members.user_id = auth.uid()
);

-- Refresh schema
NOTIFY pgrst, 'reload schema';