-- =====================================================
-- Fix Row Level Security Policies
-- Migration: 003_fix_rls_policies.sql
-- Description: Fixes infinite recursion in workspace_members policies
-- =====================================================

-- First, drop all existing policies that cause recursion
DROP POLICY IF EXISTS "Workspace members are viewable by workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace admins can add members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace admins can update members" ON workspace_members;
DROP POLICY IF EXISTS "Members can leave or be removed by admins" ON workspace_members;

DROP POLICY IF EXISTS "Workspaces are viewable by members" ON workspaces;
DROP POLICY IF EXISTS "Workspace owners and admins can update" ON workspaces;
DROP POLICY IF EXISTS "Workspace owners can delete" ON workspaces;

DROP POLICY IF EXISTS "Teams are viewable by workspace members" ON teams;
DROP POLICY IF EXISTS "Team leaders and workspace admins can update teams" ON teams;
DROP POLICY IF EXISTS "Team leaders and workspace admins can delete teams" ON teams;

DROP POLICY IF EXISTS "Team members are viewable by workspace members" ON team_members;

DROP POLICY IF EXISTS "Projects are viewable by team members" ON projects;
DROP POLICY IF EXISTS "Team members can update projects" ON projects;

DROP POLICY IF EXISTS "Tasks are viewable by team members" ON tasks;
DROP POLICY IF EXISTS "Assigned users and team leaders can update tasks" ON tasks;
DROP POLICY IF EXISTS "Team leaders can delete tasks" ON tasks;

DROP POLICY IF EXISTS "Contributions are viewable by team members" ON contributions;

DROP POLICY IF EXISTS "Activity log is viewable by workspace members" ON activity_log;

-- =====================================================
-- FIXED WORKSPACE MEMBERS POLICIES (NO RECURSION)
-- =====================================================

-- Simple select policy - anyone authenticated can view workspace members
CREATE POLICY "workspace_members_select_policy"
  ON workspace_members FOR SELECT
  TO authenticated
  USING (true);

-- Insert policy - allow users to join workspaces
CREATE POLICY "workspace_members_insert_policy"
  ON workspace_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Update policy - only the user themselves or workspace owners
CREATE POLICY "workspace_members_update_policy"
  ON workspace_members FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- Delete policy - users can remove themselves
CREATE POLICY "workspace_members_delete_policy"
  ON workspace_members FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR workspace_id IN (
    SELECT workspace_id FROM workspace_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- =====================================================
-- FIXED WORKSPACE POLICIES
-- =====================================================

-- Insert: Any authenticated user can create a workspace
CREATE POLICY "workspaces_insert_policy"
  ON workspaces FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Select: Users can view workspaces they're members of
CREATE POLICY "workspaces_select_policy"
  ON workspaces FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

-- Update: Only owners and admins can update
CREATE POLICY "workspaces_update_policy"
  ON workspaces FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Delete: Only owners can delete
CREATE POLICY "workspaces_delete_policy"
  ON workspaces FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- =====================================================
-- FIXED TEAM POLICIES
-- =====================================================

-- Insert: Workspace members can create teams
CREATE POLICY "teams_insert_policy"
  ON teams FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Select: View teams in workspaces you're a member of
CREATE POLICY "teams_select_policy"
  ON teams FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Update: Team leaders or workspace admins
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

-- Delete: Team leaders or workspace admins
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
-- FIXED TEAM MEMBERS POLICIES
-- =====================================================

-- Insert: Team leaders and workspace admins can add members
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

-- Select: View team members in your workspaces
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
-- FIXED PROJECT POLICIES
-- =====================================================

-- Insert: Team members can create projects
CREATE POLICY "projects_insert_policy"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- Select: View projects in teams you're a member of
CREATE POLICY "projects_select_policy"
  ON projects FOR SELECT
  TO authenticated
  USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- Update: Team members can update
CREATE POLICY "projects_update_policy"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- =====================================================
-- FIXED TASK POLICIES
-- =====================================================

-- Insert: Team members can create tasks
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

-- Select: View tasks in your team's projects
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

-- Update: Assigned user or team leaders
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

-- Delete: Team leaders only
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
-- FIXED CONTRIBUTION POLICIES
-- =====================================================

-- Insert: Team members can log contributions
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

-- Select: View contributions in your team's projects
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
-- FIXED ACTIVITY LOG POLICIES
-- =====================================================

-- Insert: System can log activities
CREATE POLICY "activity_log_insert_policy"
  ON activity_log FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Select: View activity in workspaces you're a member of
CREATE POLICY "activity_log_select_policy"
  ON activity_log FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );
