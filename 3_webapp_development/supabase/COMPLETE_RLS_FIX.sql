-- =====================================================
-- COMPLETE RLS FIX - All Tables
-- =====================================================
-- This script fixes RLS policies for ALL tables to ensure proper access

-- Step 1: Drop all existing policies on all tables
DO $$ 
DECLARE
    policy_record RECORD;
    table_name TEXT;
BEGIN
    -- List of all tables that need RLS policies
    FOR table_name IN VALUES ('workspaces'), ('workspace_members'), ('teams'), ('team_members'), ('projects'), ('tasks'), ('contributions'), ('activity_log'), ('profiles')
    LOOP
        -- Drop all policies for each table
        FOR policy_record IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = table_name AND schemaname = 'public'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_record.policyname, table_name);
        END LOOP;
    END LOOP;
END $$;

-- Step 2: Enable RLS on all tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create simple, non-recursive policies

-- =====================================================
-- WORKSPACES POLICIES
-- =====================================================

-- Workspace owners can manage their workspaces
CREATE POLICY "workspaces_owner_all" ON workspaces
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Workspace members can view workspaces they belong to
CREATE POLICY "workspaces_member_select" ON workspaces
  FOR SELECT TO authenticated
  USING (
    id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

-- =====================================================
-- WORKSPACE_MEMBERS POLICIES
-- =====================================================

-- Users can view workspace memberships they're part of
CREATE POLICY "workspace_members_select" ON workspace_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Workspace owners can manage memberships
CREATE POLICY "workspace_members_owner_all" ON workspace_members
  FOR ALL TO authenticated
  USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- Users can join workspaces (insert their own membership)
CREATE POLICY "workspace_members_self_insert" ON workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- TEAMS POLICIES
-- =====================================================

-- Workspace members can view teams in their workspaces
CREATE POLICY "teams_select" ON teams
  FOR SELECT TO authenticated
  USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

-- Workspace owners can manage teams
CREATE POLICY "teams_owner_all" ON teams
  FOR ALL TO authenticated
  USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- =====================================================
-- TEAM_MEMBERS POLICIES
-- =====================================================

-- Users can view team memberships in their workspaces
CREATE POLICY "team_members_select" ON team_members
  FOR SELECT TO authenticated
  USING (
    team_id IN (
      SELECT id FROM teams WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

-- Team leaders can manage team memberships
CREATE POLICY "team_members_leader_all" ON team_members
  FOR ALL TO authenticated
  USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role = 'leader')
  )
  WITH CHECK (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role = 'leader')
  );

-- Users can join teams (insert their own membership)
CREATE POLICY "team_members_self_insert" ON team_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- PROJECTS POLICIES
-- =====================================================

-- Team members can view projects in their teams
CREATE POLICY "projects_select" ON projects
  FOR SELECT TO authenticated
  USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- Team members can create projects
CREATE POLICY "projects_insert" ON projects
  FOR INSERT TO authenticated
  WITH CHECK (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- Team members can update projects
CREATE POLICY "projects_update" ON projects
  FOR UPDATE TO authenticated
  USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- Team leaders can delete projects
CREATE POLICY "projects_delete" ON projects
  FOR DELETE TO authenticated
  USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role = 'leader')
  );

-- =====================================================
-- TASKS POLICIES
-- =====================================================

-- Team members can view tasks in their projects
CREATE POLICY "tasks_select" ON tasks
  FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

-- Team members can create tasks
CREATE POLICY "tasks_insert" ON tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

-- Assigned users and team leaders can update tasks
CREATE POLICY "tasks_update" ON tasks
  FOR UPDATE TO authenticated
  USING (
    assigned_to = auth.uid() OR
    project_id IN (
      SELECT id FROM projects WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role = 'leader'
      )
    )
  );

-- Team leaders can delete tasks
CREATE POLICY "tasks_delete" ON tasks
  FOR DELETE TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role = 'leader'
      )
    )
  );

-- =====================================================
-- CONTRIBUTIONS POLICIES
-- =====================================================

-- Team members can view contributions in their projects
CREATE POLICY "contributions_select" ON contributions
  FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

-- Users can create their own contributions
CREATE POLICY "contributions_insert" ON contributions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own contributions
CREATE POLICY "contributions_update" ON contributions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Users can delete their own contributions
CREATE POLICY "contributions_delete" ON contributions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- ACTIVITY_LOG POLICIES
-- =====================================================

-- Workspace members can view activity in their workspaces
CREATE POLICY "activity_log_select" ON activity_log
  FOR SELECT TO authenticated
  USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

-- Users can create activity logs
CREATE POLICY "activity_log_insert" ON activity_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- PROFILES POLICIES
-- =====================================================

-- Users can view all profiles
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO authenticated
  USING (true);

-- Users can update their own profile
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- Users can insert their own profile
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- =====================================================
-- GRANT PERMISSIONS TO RPC FUNCTIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION get_user_workspaces(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_workspace_activity(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_workspace_rpc(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION debug_workspace_access(UUID, UUID) TO authenticated;

-- =====================================================
-- REFRESH SCHEMA
-- =====================================================

NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');
DISCARD PLANS;

-- =====================================================
-- VERIFY POLICIES
-- =====================================================

SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('workspaces', 'workspace_members', 'teams', 'team_members', 'projects', 'tasks', 'contributions', 'activity_log', 'profiles')
ORDER BY tablename, policyname;