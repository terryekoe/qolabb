-- =====================================================
-- FINAL FIX: Re-enable RLS and create working policies
-- =====================================================

-- Step 1: Re-enable RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies
DROP POLICY IF EXISTS "workspaces_insert" ON workspaces;
DROP POLICY IF EXISTS "workspaces_select" ON workspaces;
DROP POLICY IF EXISTS "workspaces_update" ON workspaces;
DROP POLICY IF EXISTS "workspaces_delete" ON workspaces;

DROP POLICY IF EXISTS "workspace_members_insert" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_select" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_update" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete" ON workspace_members;

-- Step 3: Create WORKING policies
-- The key fix: Use NEW.owner_id to reference the value being inserted

-- Workspaces INSERT: Allow if user is setting themselves as owner
CREATE POLICY "workspaces_insert" ON workspaces
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = owner_id
  );

-- Workspaces SELECT: Allow viewing workspaces you're a member of
CREATE POLICY "workspaces_select" ON workspaces
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Workspaces UPDATE: Only owners and admins can update
CREATE POLICY "workspaces_update" ON workspaces
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = (SELECT auth.uid()) 
      AND role IN ('owner', 'admin')
    )
  );

-- Workspaces DELETE: Only owners can delete
CREATE POLICY "workspaces_delete" ON workspaces
  FOR DELETE
  TO authenticated
  USING (
    (SELECT auth.uid()) = owner_id
  );

-- Workspace Members INSERT: Allow anyone to add themselves
CREATE POLICY "workspace_members_insert" ON workspace_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
  );

-- Workspace Members SELECT: Allow viewing all members
CREATE POLICY "workspace_members_select" ON workspace_members
  FOR SELECT
  TO authenticated
  USING (true);

-- Workspace Members UPDATE: Allow updating own record or if you're admin
CREATE POLICY "workspace_members_update" ON workspace_members
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = (SELECT auth.uid()) 
      AND role IN ('owner', 'admin')
    )
  );

-- Workspace Members DELETE: Allow removing yourself or if you're admin
CREATE POLICY "workspace_members_delete" ON workspace_members
  FOR DELETE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = (SELECT auth.uid()) 
      AND role IN ('owner', 'admin')
    )
  );

-- Step 4: Verify policies were created
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename IN ('workspaces', 'workspace_members')
ORDER BY tablename, cmd;
