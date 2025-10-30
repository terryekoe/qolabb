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

-- Drop existing function first (needed when changing return type)
DROP FUNCTION IF EXISTS get_workspace_rpc(UUID, UUID);

-- Create RPC function to get a single workspace (bypasses RLS)
CREATE OR REPLACE FUNCTION get_workspace_rpc(workspace_id_param UUID, user_id_param UUID)
RETURNS TABLE (
  workspace_id UUID,
  workspace_name TEXT,
  workspace_description TEXT,
  workspace_invite_code TEXT,
  workspace_owner_id UUID,
  workspace_settings JSONB,
  workspace_created_at TIMESTAMPTZ,
  workspace_updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_access BOOLEAN := FALSE;
  workspace_exists BOOLEAN := FALSE;
BEGIN
  -- Temporarily disable RLS for this function
  SET LOCAL row_security = off;
  
  -- First check if workspace exists
  SELECT EXISTS(SELECT 1 FROM workspaces WHERE id = workspace_id_param) INTO workspace_exists;
  
  IF NOT workspace_exists THEN
    RAISE EXCEPTION 'Workspace not found';
  END IF;
  
  -- Check if user has access to this workspace (either as owner or member)
  -- Check if user is the owner
  SELECT EXISTS(
    SELECT 1 FROM workspaces 
    WHERE id = workspace_id_param AND owner_id = user_id_param
  ) INTO has_access;
  
  -- If not owner, check if user is a member
  IF NOT has_access THEN
    SELECT EXISTS(
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_id_param AND wm.user_id = user_id_param
    ) INTO has_access;
  END IF;
  
  IF NOT has_access THEN
    RAISE EXCEPTION 'Access denied to workspace: user % does not have access to workspace %', user_id_param, workspace_id_param;
  END IF;
  
  RETURN QUERY
  SELECT 
    w.id as workspace_id,
    w.name as workspace_name,
    w.description as workspace_description,
    w.invite_code as workspace_invite_code,
    w.owner_id as workspace_owner_id,
    w.settings as workspace_settings,
    w.created_at as workspace_created_at,
    w.updated_at as workspace_updated_at
  FROM workspaces w
  WHERE w.id = workspace_id_param;
END;
$$;

-- Create debug function to check workspace access
CREATE OR REPLACE FUNCTION debug_workspace_access(workspace_id_param UUID, user_id_param UUID)
RETURNS TABLE (
  workspace_exists BOOLEAN,
  is_owner BOOLEAN,
  is_member BOOLEAN,
  workspace_owner_id UUID,
  member_count BIGINT
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
    EXISTS(SELECT 1 FROM workspaces WHERE id = workspace_id_param) as workspace_exists,
    EXISTS(SELECT 1 FROM workspaces WHERE id = workspace_id_param AND owner_id = user_id_param) as is_owner,
    EXISTS(SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = workspace_id_param AND wm.user_id = user_id_param) as is_member,
    (SELECT owner_id FROM workspaces WHERE id = workspace_id_param) as workspace_owner_id,
    (SELECT COUNT(*) FROM workspace_members wm WHERE wm.workspace_id = workspace_id_param) as member_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_workspaces(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_workspace_activity(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_workspace_rpc(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION debug_workspace_access(UUID, UUID) TO authenticated;

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