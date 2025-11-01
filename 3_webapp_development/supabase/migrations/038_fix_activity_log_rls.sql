-- =====================================================
-- Fix activity_log RLS policy to allow workspace members to log activities
-- Migration: 038_fix_activity_log_rls.sql
-- Description: Updates activity_log_insert policy to allow all workspace members (not just owners) to log activities
-- =====================================================

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "activity_log_insert" ON activity_log;
DROP POLICY IF EXISTS "activity_log_select" ON activity_log;

-- Create new policies that allow workspace members to log and view activities
CREATE POLICY "activity_log_insert" ON activity_log
FOR INSERT TO authenticated
WITH CHECK (
  -- Workspace owners can log activity
  EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = activity_log.workspace_id
    AND w.owner_id = auth.uid()
  )
  -- OR workspace members can log activity (using helper function to avoid recursion)
  OR is_user_workspace_member_safe(activity_log.workspace_id, auth.uid())
  -- OR user is logging their own activity (user_id matches)
  OR activity_log.user_id = auth.uid()
);

CREATE POLICY "activity_log_select" ON activity_log
FOR SELECT TO authenticated
USING (
  -- Workspace owners can view all activity
  EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = activity_log.workspace_id
    AND w.owner_id = auth.uid()
  )
  -- OR workspace members can view activity (using helper function to avoid recursion)
  OR is_user_workspace_member_safe(activity_log.workspace_id, auth.uid())
  -- OR user can view their own activity
  OR activity_log.user_id = auth.uid()
);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

