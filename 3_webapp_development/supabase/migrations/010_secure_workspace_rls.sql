-- =====================================================
-- Secure Workspace RLS Policy
-- Migration: 010_secure_workspace_rls.sql
-- Description: Fixes the overly permissive workspace RLS policy
-- =====================================================

-- Drop the overly permissive workspace select policy
DROP POLICY IF EXISTS "workspaces_select_policy" ON workspaces;

-- Recreate the original secure policy that only allows members to view workspaces
CREATE POLICY "Workspaces are viewable by members"
  ON workspaces FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM workspace_members WHERE workspace_id = id
    )
  );

-- The get_workspace_by_invite_code function already exists and provides
-- a secure way to lookup workspaces by invite code without exposing
-- all workspace data to unauthorized users