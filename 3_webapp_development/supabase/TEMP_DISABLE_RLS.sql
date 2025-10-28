-- =====================================================
-- TEMPORARY TEST: Disable RLS to see if insert works
-- WARNING: This is just for testing! Re-enable after!
-- =====================================================

-- Disable RLS on workspaces temporarily
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;

-- Try to insert from your app now
-- If it works, the problem is the RLS policy logic
-- If it still fails, the problem is something else

-- After testing, RE-ENABLE RLS:
-- ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
