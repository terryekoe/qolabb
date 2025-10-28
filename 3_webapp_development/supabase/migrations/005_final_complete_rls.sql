-- =====================================================
-- FINAL COMPLETE RLS FIX
-- Migration: 005_final_complete_rls.sql
-- Description: Complete reset and recreation of all RLS policies
-- Run this ONE migration to fix everything
-- =====================================================

-- =====================================================
-- STEP 1: DISABLE RLS TEMPORARILY TO CLEAN UP
-- =====================================================

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE contributions DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 2: DROP ALL EXISTING POLICIES
-- =====================================================

-- Profile Policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;

-- Workspace Policies
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Workspaces are viewable by members" ON workspaces;
DROP POLICY IF EXISTS "Workspace owners and admins can update" ON workspaces;
DROP POLICY IF EXISTS "Workspace owners can delete" ON workspaces;
DROP POLICY IF EXISTS "workspaces_insert_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_select_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_update_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_delete_policy" ON workspaces;

-- Workspace Members Policies
DROP POLICY IF EXISTS "Workspace members are viewable by workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace admins can add members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace admins can update members" ON workspace_members;
DROP POLICY IF EXISTS "Members can leave or be removed by admins" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_select_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_update_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete_policy" ON workspace_members;

-- Team Policies
DROP POLICY IF EXISTS "Workspace members can create teams" ON teams;
DROP POLICY IF EXISTS "Teams are viewable by workspace members" ON teams;
DROP POLICY IF EXISTS "Team leaders and workspace admins can update teams" ON teams;
DROP POLICY IF EXISTS "Team leaders and workspace admins can delete teams" ON teams;
DROP POLICY IF EXISTS "teams_insert_policy" ON teams;
DROP POLICY IF EXISTS "teams_select_policy" ON teams;
DROP POLICY IF EXISTS "teams_update_policy" ON teams;
DROP POLICY IF EXISTS "teams_delete_policy" ON teams;

-- Team Members Policies
DROP POLICY IF EXISTS "Team leaders can add members" ON team_members;
DROP POLICY IF EXISTS "Team members are viewable by workspace members" ON team_members;
DROP POLICY IF EXISTS "Team leaders can update members" ON team_members;
DROP POLICY IF EXISTS "Members can leave or be removed" ON team_members;
DROP POLICY IF EXISTS "team_members_insert_policy" ON team_members;
DROP POLICY IF EXISTS "team_members_select_policy" ON team_members;
DROP POLICY IF EXISTS "team_members_update_policy" ON team_members;
DROP POLICY IF EXISTS "team_members_delete_policy" ON team_members;

-- Project Policies
DROP POLICY IF EXISTS "Team members can create projects" ON projects;
DROP POLICY IF EXISTS "Projects are viewable by team members" ON projects;
DROP POLICY IF EXISTS "Team members can update projects" ON projects;
DROP POLICY IF EXISTS "Team leaders can delete projects" ON projects;
DROP POLICY IF EXISTS "projects_insert_policy" ON projects;
DROP POLICY IF EXISTS "projects_select_policy" ON projects;
DROP POLICY IF EXISTS "projects_update_policy" ON projects;
DROP POLICY IF EXISTS "projects_delete_policy" ON projects;

-- Task Policies
DROP POLICY IF EXISTS "Team members can create tasks" ON tasks;
DROP POLICY IF EXISTS "Tasks are viewable by team members" ON tasks;
DROP POLICY IF EXISTS "Assigned users and team leaders can update tasks" ON tasks;
DROP POLICY IF EXISTS "Team leaders can delete tasks" ON tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_select_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON tasks;

-- Contribution Policies
DROP POLICY IF EXISTS "Users can create their own contributions" ON contributions;
DROP POLICY IF EXISTS "Contributions are viewable by team members" ON contributions;
DROP POLICY IF EXISTS "Users can update their own contributions" ON contributions;
DROP POLICY IF EXISTS "Users can delete their own contributions" ON contributions;
DROP POLICY IF EXISTS "contributions_insert_policy" ON contributions;
DROP POLICY IF EXISTS "contributions_select_policy" ON contributions;
DROP POLICY IF EXISTS "contributions_update_policy" ON contributions;
DROP POLICY IF EXISTS "contributions_delete_policy" ON contributions;

-- Activity Log Policies
DROP POLICY IF EXISTS "Users can create activity logs" ON activity_log;
DROP POLICY IF EXISTS "Activity log is viewable by workspace members" ON activity_log;
DROP POLICY IF EXISTS "activity_log_insert_policy" ON activity_log;
DROP POLICY IF EXISTS "activity_log_select_policy" ON activity_log;
DROP POLICY IF EXISTS "activity_log_update_policy" ON activity_log;
DROP POLICY IF EXISTS "activity_log_delete_policy" ON activity_log;

-- =====================================================
-- STEP 3: RE-ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 4: CREATE CLEAN, SIMPLE POLICIES
-- =====================================================

-- =====================================================
-- PROFILES POLICIES
-- =====================================================

CREATE POLICY "profiles_select"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_insert"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- =====================================================
-- WORKSPACE_MEMBERS POLICIES (Simple - No Recursion)
-- =====================================================

CREATE POLICY "workspace_members_select"
  ON workspace_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "workspace_members_insert"
  ON workspace_members FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "workspace_members_update"
  ON workspace_members FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "workspace_members_delete"
  ON workspace_members FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- WORKSPACES POLICIES
-- =====================================================

CREATE POLICY "workspaces_insert"
  ON workspaces FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "workspaces_select"
  ON workspaces FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = workspaces.id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "workspaces_update"
  ON workspaces FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = workspaces.id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "workspaces_delete"
  ON workspaces FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- =====================================================
-- TEAMS POLICIES
-- =====================================================

CREATE POLICY "teams_insert"
  ON teams FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = teams.workspace_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "teams_select"
  ON teams FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = teams.workspace_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "teams_update"
  ON teams FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_id = teams.id
      AND user_id = auth.uid()
      AND role = 'leader'
    )
    OR EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = teams.workspace_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "teams_delete"
  ON teams FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_id = teams.id
      AND user_id = auth.uid()
      AND role = 'leader'
    )
    OR EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = teams.workspace_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- TEAM_MEMBERS POLICIES
-- =====================================================

CREATE POLICY "team_members_insert"
  ON team_members FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "team_members_select"
  ON team_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "team_members_update"
  ON team_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'leader'
    )
  );

CREATE POLICY "team_members_delete"
  ON team_members FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'leader'
    )
  );

-- =====================================================
-- PROJECTS POLICIES
-- =====================================================

CREATE POLICY "projects_insert"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_id = projects.team_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "projects_select"
  ON projects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_id = projects.team_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "projects_update"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_id = projects.team_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "projects_delete"
  ON projects FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_id = projects.team_id
      AND user_id = auth.uid()
      AND role = 'leader'
    )
  );

-- =====================================================
-- TASKS POLICIES
-- =====================================================

CREATE POLICY "tasks_insert"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN team_members tm ON tm.team_id = p.team_id
      WHERE p.id = tasks.project_id
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "tasks_select"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN team_members tm ON tm.team_id = p.team_id
      WHERE p.id = tasks.project_id
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "tasks_update"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = assigned_to
    OR EXISTS (
      SELECT 1 FROM projects p
      JOIN team_members tm ON tm.team_id = p.team_id
      WHERE p.id = tasks.project_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'leader'
    )
  );

CREATE POLICY "tasks_delete"
  ON tasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN team_members tm ON tm.team_id = p.team_id
      WHERE p.id = tasks.project_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'leader'
    )
  );

-- =====================================================
-- CONTRIBUTIONS POLICIES
-- =====================================================

CREATE POLICY "contributions_insert"
  ON contributions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contributions_select"
  ON contributions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN team_members tm ON tm.team_id = p.team_id
      WHERE p.id = contributions.project_id
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "contributions_update"
  ON contributions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "contributions_delete"
  ON contributions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- ACTIVITY_LOG POLICIES
-- =====================================================

CREATE POLICY "activity_log_insert"
  ON activity_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "activity_log_select"
  ON activity_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = activity_log.workspace_id
      AND user_id = auth.uid()
    )
  );

-- =====================================================
-- VERIFICATION
-- =====================================================

-- You can run this to verify policies were created:
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;
