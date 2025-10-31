-- URGENT FIX: Remove infinite recursion in workspace_members policies
-- Copy and paste this entire SQL into the Supabase dashboard SQL Editor and click "Run"

-- Step 1: Disable RLS temporarily to avoid recursion during policy changes
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies that might be causing recursion
DROP POLICY IF EXISTS "workspace_members_select_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_update_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete_policy" ON workspace_members;
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can insert workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can update workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can delete workspace members" ON workspace_members;

-- Step 3: Re-enable RLS
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Step 4: Create new non-recursive policies
-- SELECT policy: Users can view members of workspaces they own or their own membership
CREATE POLICY "workspace_members_select_policy" ON workspace_members
FOR SELECT USING (
  -- User is the workspace owner (direct check, no recursion)
  EXISTS (
    SELECT 1 FROM workspaces w 
    WHERE w.id = workspace_members.workspace_id 
    AND w.owner_id = auth.uid()
  )
  OR
  -- User is viewing their own membership record (direct check, no recursion)
  workspace_members.user_id = auth.uid()
);

-- INSERT policy: Only workspace owners can add members
CREATE POLICY "workspace_members_insert_policy" ON workspace_members
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspaces w 
    WHERE w.id = workspace_members.workspace_id 
    AND w.owner_id = auth.uid()
  )
);

-- UPDATE policy: Only workspace owners can update member roles
CREATE POLICY "workspace_members_update_policy" ON workspace_members
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM workspaces w 
    WHERE w.id = workspace_members.workspace_id 
    AND w.owner_id = auth.uid()
  )
);

-- DELETE policy: Workspace owners can remove any member, users can remove themselves
CREATE POLICY "workspace_members_delete_policy" ON workspace_members
FOR DELETE USING (
  -- User is the workspace owner
  EXISTS (
    SELECT 1 FROM workspaces w 
    WHERE w.id = workspace_members.workspace_id 
    AND w.owner_id = auth.uid()
  )
  OR
  -- User is removing their own membership
  workspace_members.user_id = auth.uid()
);

-- Step 5: Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';