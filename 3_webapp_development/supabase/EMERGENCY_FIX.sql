-- =====================================================
-- EMERGENCY FIX - Run this RIGHT NOW
-- This will immediately fix your workspace creation issue
-- =====================================================

-- Step 1: Check current policies
SELECT tablename, policyname, cmd FROM pg_policies 
WHERE tablename = 'workspaces' 
ORDER BY policyname;

-- Step 2: Drop ALL workspace policies
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Workspaces are viewable by members" ON workspaces;
DROP POLICY IF EXISTS "Workspace owners and admins can update" ON workspaces;
DROP POLICY IF EXISTS "Workspace owners can delete" ON workspaces;
DROP POLICY IF EXISTS "workspaces_insert_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_select_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_update_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_delete_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_insert" ON workspaces;
DROP POLICY IF EXISTS "workspaces_select" ON workspaces;
DROP POLICY IF EXISTS "workspaces_update" ON workspaces;
DROP POLICY IF EXISTS "workspaces_delete" ON workspaces;

-- Step 3: Create SIMPLE workspace policies
CREATE POLICY "workspaces_insert"
  ON workspaces FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "workspaces_select"
  ON workspaces FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = workspaces.id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "workspaces_update"
  ON workspaces FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = workspaces.id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "workspaces_delete"
  ON workspaces FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Step 4: Fix workspace_members policies
DROP POLICY IF EXISTS "Workspace members are viewable by workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace admins can add members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace admins can update members" ON workspace_members;
DROP POLICY IF EXISTS "Members can leave or be removed by admins" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_select_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_update_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_select" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_update" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete" ON workspace_members;

CREATE POLICY "workspace_members_select"
  ON workspace_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "workspace_members_insert"
  ON workspace_members FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "workspace_members_update"
  ON workspace_members FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "workspace_members_delete"
  ON workspace_members FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- Step 5: Verify policies were created
SELECT 
  tablename, 
  policyname, 
  cmd,
  CASE 
    WHEN cmd = 'INSERT' THEN 'INSERT ✓'
    WHEN cmd = 'SELECT' THEN 'SELECT ✓'
    WHEN cmd = 'UPDATE' THEN 'UPDATE ✓'
    WHEN cmd = 'DELETE' THEN 'DELETE ✓'
  END as operation
FROM pg_policies 
WHERE tablename IN ('workspaces', 'workspace_members')
ORDER BY tablename, cmd;
