-- =====================================================
-- ULTIMATE RLS FIX - Complete Reset and Rebuild
-- =====================================================
-- This script completely removes all RLS policies and rebuilds them
-- Run this in your Supabase SQL Editor

-- Step 1: COMPLETELY DISABLE RLS on both tables
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop EVERY possible policy name (comprehensive cleanup)
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all policies on workspace_members
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'workspace_members' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON workspace_members', policy_record.policyname);
    END LOOP;
    
    -- Drop all policies on workspaces
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'workspaces' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON workspaces', policy_record.policyname);
    END LOOP;
END $$;

-- Step 3: Fix the RPC function to work without RLS
CREATE OR REPLACE FUNCTION get_user_workspaces(user_id_param UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  workspace_id UUID,
  role TEXT,
  joined_at TIMESTAMPTZ,
  workspace JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Temporarily disable RLS for this function
  SET LOCAL row_security = off;
  
  RETURN QUERY
  SELECT 
    wm.id,
    wm.user_id,
    wm.workspace_id,
    wm.role,
    wm.joined_at,
    row_to_json(w.*) as workspace
  FROM workspace_members wm
  JOIN workspaces w ON w.id = wm.workspace_id
  WHERE wm.user_id = user_id_param;
END;
$$;

-- Step 4: Wait a moment for cleanup
SELECT pg_sleep(1);

-- Step 5: Re-enable RLS
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Step 6: Create ULTRA-SIMPLE policies with NO subqueries

-- WORKSPACE_MEMBERS: Only allow users to see/manage their own records
CREATE POLICY "wm_select_own" ON workspace_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "wm_insert_own" ON workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "wm_update_own" ON workspace_members
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "wm_delete_own" ON workspace_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- WORKSPACES: Only allow owners to manage their workspaces
CREATE POLICY "ws_select_owner" ON workspaces
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "ws_insert_owner" ON workspaces
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "ws_update_owner" ON workspaces
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "ws_delete_owner" ON workspaces
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- Step 7: Create additional RPC functions that bypass RLS completely
CREATE OR REPLACE FUNCTION get_workspace_activity(workspace_id_param UUID, user_id_param UUID)
RETURNS TABLE (
  activity_count BIGINT,
  recent_tasks JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Temporarily disable RLS for this function
  SET LOCAL row_security = off;
  
  -- Check if user has access to this workspace
  IF NOT EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = workspace_id_param AND user_id = user_id_param
  ) THEN
    RAISE EXCEPTION 'Access denied to workspace';
  END IF;
  
  RETURN QUERY
  SELECT 
    COALESCE(COUNT(*), 0) as activity_count,
    COALESCE(json_agg(t.*), '[]'::json) as recent_tasks
  FROM tasks t
  JOIN projects p ON p.id = t.project_id
  WHERE p.workspace_id = workspace_id_param
  AND t.updated_at > NOW() - INTERVAL '7 days'
  LIMIT 10;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_workspaces(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_workspace_activity(UUID, UUID) TO authenticated;

-- Step 8: Force schema refresh
NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');

-- Step 9: Clear any cached plans
DISCARD PLANS;

-- Step 10: Verify the policies
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('workspaces', 'workspace_members')
ORDER BY tablename, policyname;