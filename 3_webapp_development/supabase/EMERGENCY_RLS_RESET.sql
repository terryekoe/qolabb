-- EMERGENCY RLS RESET - Complete reset of all RLS policies
-- This script completely disables RLS, drops all policies, and recreates simple ones

-- Step 1: Disable RLS on all tables to stop recursion immediately
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE contributions DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies (force drop)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on all tables
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Step 3: Clear any cached plans (skip - requires superuser privileges)
-- SELECT pg_stat_reset(); -- Not available in Supabase

-- Step 4: Re-enable RLS on tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 5: Create ULTRA-SIMPLE policies (no cross-table references)

-- Workspaces: Only owner can access
CREATE POLICY "workspaces_owner_access" ON workspaces
    FOR ALL USING (owner_id = auth.uid());

-- Workspace Members: Users see only their own memberships
CREATE POLICY "workspace_members_own_access" ON workspace_members
    FOR ALL USING (user_id = auth.uid());

-- Teams: Allow all authenticated users (will be filtered by application logic)
CREATE POLICY "teams_authenticated_access" ON teams
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Team Members: Users see only their own memberships
CREATE POLICY "team_members_own_access" ON team_members
    FOR ALL USING (user_id = auth.uid());

-- Projects: Allow all authenticated users (will be filtered by application logic)
CREATE POLICY "projects_authenticated_access" ON projects
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Tasks: Allow all authenticated users (will be filtered by application logic)
CREATE POLICY "tasks_authenticated_access" ON tasks
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Contributions: Users see only their own contributions
CREATE POLICY "contributions_own_access" ON contributions
    FOR ALL USING (user_id = auth.uid());

-- Activity Log: Allow all authenticated users (will be filtered by application logic)
CREATE POLICY "activity_log_authenticated_access" ON activity_log
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Profiles: Allow all authenticated users to view, users update their own
CREATE POLICY "profiles_view_all" ON profiles
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "profiles_insert_own" ON profiles
    FOR INSERT WITH CHECK (id = auth.uid());

-- Step 6: Grant execute permissions on RPC functions (skip - functions don't exist yet)
-- GRANT EXECUTE ON FUNCTION get_workspace_rpc(UUID) TO authenticated;
-- GRANT EXECUTE ON FUNCTION debug_workspace_access(UUID) TO authenticated;

-- Step 7: Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Verification query
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;