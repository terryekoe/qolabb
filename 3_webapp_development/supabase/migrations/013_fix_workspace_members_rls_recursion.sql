-- Fix infinite recursion in workspace_members RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own workspace memberships" ON workspace_members;
DROP POLICY IF EXISTS "Users can view workspace memberships" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_select_policy" ON workspace_members;

-- Create simple, non-recursive SELECT policy for workspace_members
DROP POLICY IF EXISTS "workspace_members_simple_select" ON workspace_members;
CREATE POLICY "workspace_members_simple_select" ON workspace_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create simple INSERT policy for workspace_members
DROP POLICY IF EXISTS "Users can join workspaces" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert_policy" ON workspace_members;

DROP POLICY IF EXISTS "workspace_members_simple_insert" ON workspace_members;
CREATE POLICY "workspace_members_simple_insert" ON workspace_members
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Create simple UPDATE policy for workspace_members
DROP POLICY IF EXISTS "workspace_members_update_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_simple_update" ON workspace_members;

CREATE POLICY "workspace_members_simple_update" ON workspace_members
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create simple DELETE policy for workspace_members
DROP POLICY IF EXISTS "workspace_members_delete_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_simple_delete" ON workspace_members;

CREATE POLICY "workspace_members_simple_delete" ON workspace_members
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Ensure RLS is enabled
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;