-- =====================================================
-- FINAL RLS FIX - NO RECURSION
-- =====================================================

-- Step 1: Disable RLS temporarily to clean up
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies
DROP POLICY IF EXISTS "workspaces_insert" ON workspaces;
DROP POLICY IF EXISTS "workspaces_select" ON workspaces;
DROP POLICY IF EXISTS "workspaces_update" ON workspaces;
DROP POLICY IF EXISTS "workspaces_delete" ON workspaces;

DROP POLICY IF EXISTS "workspace_members_insert" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_select" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_update" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete" ON workspace_members;

-- Step 3: Re-enable RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Step 4: Create NON-RECURSIVE policies

-- WORKSPACES POLICIES (Simple, no cross-table references)
-- INSERT: Allow if user is setting themselves as owner
CREATE POLICY "workspaces_insert" ON workspaces
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- SELECT: Allow viewing if you're the owner
CREATE POLICY "workspaces_select_owner" ON workspaces
  FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

-- UPDATE: Only owners can update
CREATE POLICY "workspaces_update" ON workspaces
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);

-- DELETE: Only owners can delete
CREATE POLICY "workspaces_delete" ON workspaces
  FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- WORKSPACE MEMBERS POLICIES (Simple, no cross-table references)
-- INSERT: Allow adding yourself to any workspace
CREATE POLICY "workspace_members_insert" ON workspace_members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- SELECT: Allow viewing your own membership records
CREATE POLICY "workspace_members_select_own" ON workspace_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- UPDATE: Allow updating your own membership
CREATE POLICY "workspace_members_update" ON workspace_members
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- DELETE: Allow removing your own membership
CREATE POLICY "workspace_members_delete" ON workspace_members
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Step 5: Add additional SELECT policy for workspace members to see workspace details
-- This allows members to view workspaces they belong to (separate policy to avoid recursion)
CREATE POLICY "workspaces_select_member" ON workspaces
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members 
      WHERE workspace_id = workspaces.id 
      AND user_id = auth.uid()
    )
  );

-- Step 6: Add policy for workspace owners to see all members
CREATE POLICY "workspace_members_select_as_owner" ON workspace_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspaces 
      WHERE id = workspace_members.workspace_id 
      AND owner_id = auth.uid()
    )
  );

-- Step 7: Verify policies
SELECT 
  tablename,
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies 
WHERE tablename IN ('workspaces', 'workspace_members')
ORDER BY tablename, cmd;