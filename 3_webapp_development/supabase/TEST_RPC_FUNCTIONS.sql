-- Test script to verify RPC functions exist and work
-- Run this in your Supabase SQL Editor to test the functions

-- Test 1: Check if the RPC functions exist
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_workspace_rpc', 'debug_workspace_access', 'get_user_workspaces')
ORDER BY routine_name;

-- Test 2: Check current user (replace with your actual user ID)
-- SELECT auth.uid() as current_user_id;

-- Test 3: List all workspaces (to get a workspace ID for testing)
-- SELECT id, name, owner_id FROM workspaces LIMIT 5;

-- Test 4: Test debug_workspace_access function (replace UUIDs with actual values)
-- SELECT * FROM debug_workspace_access('your-workspace-id-here', 'your-user-id-here');

-- Test 5: Test get_workspace_rpc function (replace UUIDs with actual values)
-- SELECT * FROM get_workspace_rpc('your-workspace-id-here', 'your-user-id-here');

-- Test 6: Check workspace_members table
-- SELECT workspace_id, user_id, role FROM workspace_members LIMIT 5;

-- Test 7: Check if RLS is enabled
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('workspaces', 'workspace_members')
AND schemaname = 'public';

-- Test 8: Check current policies
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd,
    permissive
FROM pg_policies 
WHERE tablename IN ('workspaces', 'workspace_members')
ORDER BY tablename, policyname;