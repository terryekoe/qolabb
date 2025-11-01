-- =====================================================
-- Fix profiles_select policy to allow workspace members to see each other
-- Migration: 036_fix_profiles_select_for_workspace_members.sql
-- Description: Updates profiles_select policy to allow workspace members to view each other's profiles
-- =====================================================

-- Create a helper function to check if two users share a workspace (bypasses RLS to prevent recursion)
CREATE OR REPLACE FUNCTION users_share_workspace(p_user1_id UUID, p_user2_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  -- SECURITY DEFINER functions bypass RLS by default
  RETURN EXISTS (
    SELECT 1 
    FROM workspace_members wm1
    INNER JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
    WHERE wm1.user_id = p_user1_id
    AND wm2.user_id = p_user2_id
    AND wm1.workspace_id = wm2.workspace_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION users_share_workspace(UUID, UUID) TO authenticated;

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "profiles_select" ON profiles;

-- Create a new policy that allows:
-- 1. Users to see their own profile
-- 2. Users to see profiles of people they share tasks with
-- 3. Users to see profiles of people in the same workspace (using helper function to avoid recursion)
CREATE POLICY "profiles_select" ON profiles
FOR SELECT TO authenticated
USING (
  -- Users can always see their own profile
  id = auth.uid()
  
  -- OR users can see profiles of people they share tasks with
  OR EXISTS (
    SELECT 1 FROM tasks t
    WHERE (t.assigned_to = auth.uid() OR t.assigned_to = profiles.id)
    OR EXISTS (
      SELECT 1 FROM task_assignees ta
      WHERE ta.task_id = t.id
      AND (ta.user_id = auth.uid() OR ta.user_id = profiles.id)
    )
  )
  
  -- OR users can see profiles of people in the same workspace
  -- Using helper function to avoid RLS recursion
  OR users_share_workspace(profiles.id, auth.uid())
  
  -- OR if current user owns a workspace that the profile user is in
  OR EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = w.id
      AND wm.user_id = profiles.id
    )
  )
  
  -- OR if profile user owns a workspace that current user is in
  OR EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.owner_id = profiles.id
    AND EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = w.id
      AND wm.user_id = auth.uid()
    )
  )
);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

