-- =====================================================
-- DEBUG: Check what's wrong with workspace creation
-- =====================================================

-- 1. Check if RLS is enabled
SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('workspaces', 'workspace_members');

-- 2. Check the actual policy definitions
SELECT 
  tablename,
  policyname,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'workspaces';

-- 3. Test if the current user can insert
-- (This will show you the actual auth.uid())
SELECT auth.uid() as current_user_id;

-- 4. Check if there are any existing workspaces
SELECT id, name, owner_id FROM workspaces LIMIT 5;

-- 5. Check workspace_members policies
SELECT 
  policyname,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'workspace_members';
