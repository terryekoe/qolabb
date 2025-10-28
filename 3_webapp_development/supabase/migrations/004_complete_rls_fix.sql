-- =====================================================
-- Complete RLS Fix with DROP IF EXISTS
-- Migration: 004_complete_rls_fix.sql
-- Description: Safely recreates all RLS policies including INSERT
-- =====================================================

-- =====================================================
-- DROP ALL EXISTING POLICIES SAFELY
-- =====================================================

-- Workspace Members Policies
DROP POLICY IF EXISTS "workspace_members_select_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_update_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete_policy" ON workspace_members;
DROP POLICY IF EXISTS "Workspace members are viewable by workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace admins can add members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace admins can update members" ON workspace_members;
DROP POLICY IF EXISTS "Members can leave or be removed by admins" ON workspace_members;

-- Workspace Policies
DROP POLICY IF EXISTS "workspaces_insert_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_select_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_update_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_delete_policy" ON workspaces;
DROP POLICY IF EXISTS "Workspaces are viewable by members" ON workspaces;
DROP POLICY IF EXISTS "Workspace owners and admins can update" ON workspaces;
DROP POLICY IF EXISTS "Workspace owners can delete" ON workspaces;

-- Team Policies
DROP POLICY IF EXISTS "teams_insert_policy" ON teams;
DROP POLICY IF EXISTS "teams_select_policy" ON teams;
DROP POLICY IF EXISTS "teams_update_policy" ON teams;
DROP POLICY IF EXISTS "teams_delete_policy" ON teams;
DROP POLICY IF EXISTS "Teams are viewable by workspace members" ON teams;
DROP POLICY IF EXISTS "Team leaders and workspace admins can update teams" ON teams;
DROP POLICY IF EXISTS "Team leaders and workspace admins can delete teams" ON teams;

-- Team Members Policies
DROP POLICY IF EXISTS "team_members_insert_policy" ON team_members;
DROP POLICY IF EXISTS "team_members_select_policy" ON team_members;
DROP POLICY IF EXISTS "team_members_update_policy" ON team_members;
DROP POLICY IF EXISTS "team_members_delete_policy" ON team_members;
DROP POLICY IF EXISTS "Team members are viewable by workspace members" ON team_members;

-- Project Policies
DROP POLICY IF EXISTS "projects_insert_policy" ON projects;
DROP POLICY IF EXISTS "projects_select_policy" ON projects;
DROP POLICY IF EXISTS "projects_update_policy" ON projects;
DROP POLICY IF EXISTS "projects_delete_policy" ON projects;
DROP POLICY IF EXISTS "Projects are viewable by team members" ON projects;
DROP POLICY IF EXISTS "Team members can update projects" ON projects;

-- Task Policies
DROP POLICY IF EXISTS "tasks_insert_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_select_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON tasks;
DROP POLICY IF EXISTS "Tasks are viewable by team members" ON tasks;
DROP POLICY IF EXISTS "Assigned users and team leaders can update tasks" ON tasks;
DROP POLICY IF EXISTS "Team leaders can delete tasks" ON tasks;

-- Contribution Policies
DROP POLICY IF EXISTS "contributions_insert_policy" ON contributions;
DROP POLICY IF EXISTS "contributions_select_policy" ON contributions;
DROP POLICY IF EXISTS "contributions_update_policy" ON contributions;
DROP POLICY IF EXISTS "contributions_delete_policy" ON contributions;
DROP POLICY IF EXISTS "Contributions are viewable by team members" ON contributions;

-- Activity Log Policies
DROP POLICY IF EXISTS "activity_log_insert_policy" ON activity_log;
DROP POLICY IF EXISTS "activity_log_select_policy" ON activity_log;
DROP POLICY IF EXISTS "activity_log_update_policy" ON activity_log;
DROP POLICY IF EXISTS "activity_log_delete_policy" ON activity_log;
DROP POLICY IF EXISTS "Activity log is viewable by workspace members" ON activity_log;

-- Profile Policies
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- =====================================================
-- CREATE ALL COMPLETE POLICIES
-- =====================================================

-- =====================================================
-- PROFILE POLICIES
-- =====================================================

CREATE POLICY "profiles_select_policy"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_update_policy"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- =====================================================
-- WORKSPACE MEMBERS POLICIES
-- =====================================================

CREATE POLICY "workspace_members_select_policy"
  ON workspace_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "workspace_members_insert_policy"
  ON workspace_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "workspace_members_update_policy"
  ON workspace_members FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id OR workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "workspace_members_delete_policy"
  ON workspace_members FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id OR workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- WORKSPACE POLICIES
-- =====================================================

CREATE POLICY "workspaces_insert_policy"
  ON workspaces FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "workspaces_select_policy"
  ON workspaces FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "workspaces_update_policy"
  ON workspaces FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "workspaces_delete_policy"
  ON workspaces FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- =====================================================
-- TEAM POLICIES
-- =====================================================

CREATE POLICY "teams_insert_policy"
  ON teams FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "teams_select_policy"
  ON teams FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "teams_update_policy"
  ON teams FOR UPDATE
  TO authenticated
  USING (
    id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role = 'leader')
    OR workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "teams_delete_policy"
  ON teams FOR DELETE
  TO authenticated
  USING (
    id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role = 'leader')
    OR workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- TEAM MEMBERS POLICIES
-- =====================================================

CREATE POLICY "team_members_insert_policy"
  ON team_members FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT id FROM teams WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "team_members_select_policy"
  ON team_members FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT id FROM teams WHERE workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- PROJECT POLICIES
-- =====================================================

CREATE POLICY "projects_insert_policy"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "projects_select_policy"
  ON projects FOR SELECT
  TO authenticated
  USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "projects_update_policy"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- =====================================================
-- TASK POLICIES
-- =====================================================

CREATE POLICY "tasks_insert_policy"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "tasks_select_policy"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "tasks_update_policy"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = assigned_to OR
    project_id IN (
      SELECT id FROM projects WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role = 'leader'
      )
    )
  );

CREATE POLICY "tasks_delete_policy"
  ON tasks FOR DELETE
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid() AND role = 'leader'
      )
    )
  );

-- =====================================================
-- CONTRIBUTION POLICIES
-- =====================================================

CREATE POLICY "contributions_insert_policy"
  ON contributions FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "contributions_select_policy"
  ON contributions FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- ACTIVITY LOG POLICIES
-- =====================================================

CREATE POLICY "activity_log_insert_policy"
  ON activity_log FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "activity_log_select_policy"
  ON activity_log FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );
