-- =====================================================
-- Fix Infinite Recursion in workspace_members RLS Policies
-- Migration: 023_fix_workspace_members_recursion_final.sql
-- Description: Remove recursive policy checks that cause infinite recursion
-- =====================================================

-- Drop all existing workspace_members policies
DROP POLICY IF EXISTS "workspace_members_select" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_update" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_safe_select" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_safe_insert" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_safe_update" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_safe_delete" ON workspace_members;

-- Ensure RLS is enabled
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CREATE NON-RECURSIVE POLICIES
-- =====================================================

-- SELECT: Simple policy - users can see their own memberships + workspace owners can see all
CREATE POLICY "workspace_members_final_select" ON workspace_members
FOR SELECT
TO authenticated
USING (
  -- User can see their own membership
  user_id = auth.uid()
  OR
  -- Workspace owner can see all members (direct check, no recursion)
  EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = workspace_members.workspace_id
    AND w.owner_id = auth.uid()
  )
);

-- INSERT: Users can join themselves + workspace owners can add members
CREATE POLICY "workspace_members_final_insert" ON workspace_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can join themselves
  user_id = auth.uid()
  OR
  -- Workspace owner can add members (direct check, no recursion)
  EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = workspace_members.workspace_id
    AND w.owner_id = auth.uid()
  )
);

-- UPDATE: Users can update their own membership + workspace owners can update any
CREATE POLICY "workspace_members_final_update" ON workspace_members
FOR UPDATE
TO authenticated
USING (
  -- User can update their own membership
  user_id = auth.uid()
  OR
  -- Workspace owner can update any membership (direct check, no recursion)
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

-- DELETE: Users can leave themselves + workspace owners can remove members
CREATE POLICY "workspace_members_final_delete" ON workspace_members
FOR DELETE
TO authenticated
USING (
  -- User can leave themselves
  user_id = auth.uid()
  OR
  -- Workspace owner can remove members (direct check, no recursion)
  EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = workspace_members.workspace_id
    AND w.owner_id = auth.uid()
  )
);

-- =====================================================
-- CREATE HELPER FUNCTION FOR WORKSPACE MEMBERSHIP CHECKS
-- =====================================================

-- FUNCTION REMOVED TO PREVENT RECURSION
-- The is_workspace_member function has been removed because it causes
-- infinite recursion when used in workspace_members RLS policies.
-- Policies now use direct SQL queries instead.