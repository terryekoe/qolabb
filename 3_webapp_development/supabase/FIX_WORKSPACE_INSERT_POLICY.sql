-- =====================================================
-- FIX: Workspace INSERT policy
-- The issue: WITH CHECK is too restrictive
-- Solution: Allow any authenticated user to insert if they set themselves as owner
-- =====================================================

-- Drop the current insert policy
DROP POLICY IF EXISTS "workspaces_insert" ON workspaces;

-- Create a new, simpler insert policy
-- This allows ANY authenticated user to create a workspace
-- as long as they are setting themselves as the owner
CREATE POLICY "workspaces_insert"
  ON workspaces FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Verify the policy was created
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies 
WHERE tablename = 'workspaces' AND cmd = 'INSERT';

-- Test: Check what auth.uid() returns when you run this
-- (Make sure you're logged in to Supabase Dashboard)
SELECT 
  auth.uid() as current_user,
  auth.email() as current_email;
