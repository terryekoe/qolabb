-- =====================================================
-- Migration: 027_force_fix_workspace_members_recursion.sql
-- Description: Forcefully fix infinite recursion in workspace_members policies
-- by completely removing all policies and recreating them with direct checks
-- =====================================================

-- Disable RLS temporarily to avoid recursion during policy changes
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on workspace_members table
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

-- Create new non-recursive policies using direct workspace ownership checks
-- SELECT policy: Users can view members of workspaces they own or are members of
CREATE POLICY "workspace_members_select_policy" ON workspace_members
FOR SELECT USING (
  -- User is the workspace owner
  EXISTS (
    SELECT 1 FROM workspaces w 
    WHERE w.id = workspace_members.workspace_id 
    AND w.owner_id = auth.uid()
  )
  OR
  -- User is a member of this workspace (direct check without recursion)
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
  -- User is removing themselves
  workspace_members.user_id = auth.uid()
);

-- Create a simple helper function that doesn't use workspace_members table
-- This function only checks workspace ownership, not membership
CREATE OR REPLACE FUNCTION is_workspace_owner(workspace_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = workspace_uuid
    AND w.owner_id = user_uuid
  );
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION is_workspace_owner TO authenticated, anon;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';