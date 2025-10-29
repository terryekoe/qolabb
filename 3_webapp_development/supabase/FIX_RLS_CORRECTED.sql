-- =====================================================
-- CORRECTED RLS POLICIES - Fixes Circular Dependency
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

-- Step 3: Create CORRECTED policies

-- WORKSPACES POLICIES
-- INSERT: Allow if user is setting themselves as owner (FIXED)
CREATE POLICY "workspaces_insert" ON workspaces
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    auth.uid() = owner_id
  );

-- SELECT: Allow viewing workspaces you're a member of OR own
CREATE POLICY "workspaces_select" ON workspaces
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = owner_id
    OR id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- UPDATE: Only owners and admins can update
CREATE POLICY "workspaces_update" ON workspaces
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = owner_id
    OR id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- DELETE: Only owners can delete
CREATE POLICY "workspaces_delete" ON workspaces
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = owner_id
  );

-- WORKSPACE MEMBERS POLICIES
-- INSERT: Allow adding yourself to any workspace (for invite codes)
CREATE POLICY "workspace_members_insert" ON workspace_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );

-- SELECT: Allow viewing members of workspaces you belong to
CREATE POLICY "workspace_members_select" ON workspace_members
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
    OR workspace_id IN (
      SELECT id 
      FROM workspaces 
      WHERE owner_id = auth.uid()
    )
  );

-- UPDATE: Allow updating your own record or if you're admin/owner
CREATE POLICY "workspace_members_update" ON workspace_members
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- DELETE: Allow removing yourself or if you're admin/owner
CREATE POLICY "workspace_members_delete" ON workspace_members
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- Step 4: Verify policies were created
SELECT 
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('workspaces', 'workspace_members')
ORDER BY tablename, cmd;