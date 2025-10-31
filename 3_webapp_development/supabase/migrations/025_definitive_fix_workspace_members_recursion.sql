-- =====================================================
-- DEFINITIVE FIX: Remove ALL workspace_members RLS recursion
-- Migration: 025_definitive_fix_workspace_members_recursion.sql
-- Description: Completely eliminate infinite recursion by removing recursive policy checks
-- =====================================================

-- Drop ALL existing workspace_members policies (including any from migration 021)
DROP POLICY IF EXISTS "workspace_members_select" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_update" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_final_select" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_final_insert" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_final_update" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_final_delete" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_safe_select" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_safe_insert" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_safe_update" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_safe_delete" ON workspace_members;

-- Ensure RLS is enabled
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CREATE COMPLETELY NON-RECURSIVE POLICIES
-- =====================================================

-- SELECT: Only allow users to see their own memberships + workspace owners to see all
-- NO RECURSIVE CHECKS - no checking workspace_members from within workspace_members policy
CREATE POLICY "workspace_members_no_recursion_select" ON workspace_members
FOR SELECT
TO authenticated
USING (
  -- User can see their own membership (direct check, no recursion)
  user_id = auth.uid()
  OR
  -- Workspace owner can see all members (direct workspace check, no workspace_members recursion)
  EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = workspace_members.workspace_id
    AND w.owner_id = auth.uid()
  )
);

-- INSERT: Users can join themselves + workspace owners can add members
CREATE POLICY "workspace_members_no_recursion_insert" ON workspace_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can join themselves (direct check)
  user_id = auth.uid()
  OR
  -- Workspace owner can add members (direct workspace check)
  EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = workspace_members.workspace_id
    AND w.owner_id = auth.uid()
  )
);

-- UPDATE: Users can update their own membership + workspace owners can update any
CREATE POLICY "workspace_members_no_recursion_update" ON workspace_members
FOR UPDATE
TO authenticated
USING (
  -- User can update their own membership (direct check)
  user_id = auth.uid()
  OR
  -- Workspace owner can update any membership (direct workspace check)
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
CREATE POLICY "workspace_members_no_recursion_delete" ON workspace_members
FOR DELETE
TO authenticated
USING (
  -- User can leave themselves (direct check)
  user_id = auth.uid()
  OR
  -- Workspace owner can remove members (direct workspace check)
  EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = workspace_members.workspace_id
    AND w.owner_id = auth.uid()
  )
);

-- =====================================================
-- HELPER FUNCTION REMOVED TO PREVENT RECURSION
-- =====================================================
-- Note: The is_workspace_member function has been removed to prevent
-- infinite recursion in workspace_members policies. Policies now use
-- direct SQL queries instead of helper functions.