-- =====================================================
-- Fix RLS InitPlan Warnings
-- =====================================================
-- This migration fixes performance warnings by wrapping auth.uid() calls
-- in (select auth.uid()) to prevent re-evaluation for each row.
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- Helper function to get current user ID (optimized)
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
  SELECT (select auth.uid());
$$ LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public;

-- Note: Function default parameters must use auth.uid() directly
-- The optimization happens in the policy calls, not in function defaults

-- Create helper function to check workspace membership (bypasses RLS)
CREATE OR REPLACE FUNCTION is_user_workspace_member_safe(p_workspace_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  -- SECURITY DEFINER functions bypass RLS by default
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id
    AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

GRANT EXECUTE ON FUNCTION is_user_workspace_member_safe(UUID, UUID) TO authenticated;

-- Create helper function to check workspace ownership (bypasses RLS)
CREATE OR REPLACE FUNCTION is_user_workspace_owner_safe(p_workspace_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  -- SECURITY DEFINER functions bypass RLS by default
  RETURN EXISTS (
    SELECT 1 FROM workspaces
    WHERE id = p_workspace_id
    AND owner_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

GRANT EXECUTE ON FUNCTION is_user_workspace_owner_safe(UUID, UUID) TO authenticated;

-- Create helper function to check if team belongs to workspace owner (bypasses RLS)
CREATE OR REPLACE FUNCTION is_user_team_workspace_owner(p_team_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM teams t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE t.id = p_team_id
      AND w.owner_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

GRANT EXECUTE ON FUNCTION is_user_team_workspace_owner(UUID, UUID) TO authenticated;

-- Create helper function to check if two users share a workspace (bypasses RLS)
CREATE OR REPLACE FUNCTION users_share_workspace(p_user1_id UUID, p_user2_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  -- SECURITY DEFINER functions bypass RLS by default
  RETURN EXISTS (
    SELECT 1 
    FROM workspace_members wm1
    INNER JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
    WHERE wm1.user_id = p_user1_id
    AND wm2.user_id = p_user2_id
    AND wm1.workspace_id = wm2.workspace_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

GRANT EXECUTE ON FUNCTION users_share_workspace(UUID, UUID) TO authenticated;

-- Create helper function to check if user is team member (bypasses RLS)
CREATE OR REPLACE FUNCTION is_user_team_member(p_team_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id
      AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

GRANT EXECUTE ON FUNCTION is_user_team_member(UUID, UUID) TO authenticated;

-- Create helper function to check if user is team leader (bypasses RLS)
CREATE OR REPLACE FUNCTION is_user_team_leader(p_team_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id
      AND user_id = p_user_id
      AND role = 'leader'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

GRANT EXECUTE ON FUNCTION is_user_team_leader(UUID, UUID) TO authenticated;

-- =====================================================
-- PROFILES POLICIES
-- =====================================================

-- Fix profiles_insert
DROP POLICY IF EXISTS profiles_insert ON profiles;
CREATE POLICY profiles_insert ON profiles
  FOR INSERT
  WITH CHECK ((select auth.uid()) = id);

-- Fix profiles_select
DROP POLICY IF EXISTS profiles_select ON profiles;
CREATE POLICY profiles_select ON profiles
  FOR SELECT
  USING (
    id = (select auth.uid())
    OR users_share_workspace(profiles.id, (select auth.uid()))
  );

-- Fix profiles_update
DROP POLICY IF EXISTS profiles_update ON profiles;
CREATE POLICY profiles_update ON profiles
  FOR UPDATE
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- =====================================================
-- WORKSPACES POLICIES
-- =====================================================

-- Fix workspaces_delete
DROP POLICY IF EXISTS workspaces_delete ON workspaces;
CREATE POLICY workspaces_delete ON workspaces
  FOR DELETE
  USING (owner_id = (select auth.uid()));

-- Fix workspaces_insert
DROP POLICY IF EXISTS workspaces_insert ON workspaces;
CREATE POLICY workspaces_insert ON workspaces
  FOR INSERT
  WITH CHECK (owner_id = (select auth.uid()));

-- Fix workspaces_select
-- Use SECURITY DEFINER helper function to avoid recursion with workspace_members
DROP POLICY IF EXISTS workspaces_select ON workspaces;
CREATE POLICY workspaces_select ON workspaces
  FOR SELECT
  USING (
    owner_id = (select auth.uid())
    OR is_user_workspace_member_safe(workspaces.id, (select auth.uid()))
  );

-- Fix workspaces_update
DROP POLICY IF EXISTS workspaces_update ON workspaces;
CREATE POLICY workspaces_update ON workspaces
  FOR UPDATE
  USING (owner_id = (select auth.uid()))
  WITH CHECK (owner_id = (select auth.uid()));

-- =====================================================
-- WORKSPACE_MEMBERS POLICIES
-- =====================================================

-- Fix workspace_members_delete
DROP POLICY IF EXISTS workspace_members_delete ON workspace_members;
CREATE POLICY workspace_members_delete ON workspace_members
  FOR DELETE
  USING (
    user_id = (select auth.uid())
    OR is_user_workspace_owner_safe(workspace_members.workspace_id, (select auth.uid()))
  );

-- Fix workspace_members_insert
DROP POLICY IF EXISTS workspace_members_insert ON workspace_members;
CREATE POLICY workspace_members_insert ON workspace_members
  FOR INSERT
  WITH CHECK (
    user_id = (select auth.uid())
    OR is_user_workspace_owner_safe(workspace_members.workspace_id, (select auth.uid()))
  );

-- Fix workspace_members_select
-- This policy allows users to see workspace_members if:
-- 1. They are the member themselves
-- 2. They are the workspace owner
-- 3. They are a member of the same workspace (using SECURITY DEFINER function to avoid recursion)
DROP POLICY IF EXISTS workspace_members_select ON workspace_members;
CREATE POLICY workspace_members_select ON workspace_members
  FOR SELECT
  USING (
    user_id = (select auth.uid())
    OR is_user_workspace_owner_safe(workspace_members.workspace_id, (select auth.uid()))
    OR is_user_workspace_member_safe(workspace_members.workspace_id, (select auth.uid()))
  );

-- Fix workspace_members_update
DROP POLICY IF EXISTS workspace_members_update ON workspace_members;
CREATE POLICY workspace_members_update ON workspace_members
  FOR UPDATE
  USING (
    user_id = (select auth.uid())
    OR is_user_workspace_owner_safe(workspace_members.workspace_id, (select auth.uid()))
  )
  WITH CHECK (
    user_id = (select auth.uid())
    OR is_user_workspace_owner_safe(workspace_members.workspace_id, (select auth.uid()))
  );

-- =====================================================
-- TEAMS POLICIES
-- =====================================================

-- Fix teams_delete
DROP POLICY IF EXISTS teams_delete ON teams;
CREATE POLICY teams_delete ON teams
  FOR DELETE
  USING (
    is_user_team_leader(teams.id, (select auth.uid()))
    OR is_user_workspace_owner_safe(teams.workspace_id, (select auth.uid()))
  );

-- Fix teams_insert
DROP POLICY IF EXISTS teams_insert ON teams;
CREATE POLICY teams_insert ON teams
  FOR INSERT
  WITH CHECK (
    is_user_workspace_owner_safe(teams.workspace_id, (select auth.uid()))
    OR is_user_workspace_member_safe(teams.workspace_id, (select auth.uid()))
  );

-- Fix teams_select
DROP POLICY IF EXISTS teams_select ON teams;
CREATE POLICY teams_select ON teams
  FOR SELECT
  USING (
    is_user_team_member(teams.id, (select auth.uid()))
    OR is_user_workspace_owner_safe(teams.workspace_id, (select auth.uid()))
    OR is_user_workspace_member_safe(teams.workspace_id, (select auth.uid()))
  );

-- Fix teams_update
DROP POLICY IF EXISTS teams_update ON teams;
CREATE POLICY teams_update ON teams
  FOR UPDATE
  USING (
    is_user_team_leader(teams.id, (select auth.uid()))
    OR is_user_workspace_owner_safe(teams.workspace_id, (select auth.uid()))
  )
  WITH CHECK (
    is_user_team_leader(teams.id, (select auth.uid()))
    OR is_user_workspace_owner_safe(teams.workspace_id, (select auth.uid()))
  );

-- =====================================================
-- TEAM_MEMBERS POLICIES
-- =====================================================

-- Fix team_members_delete
DROP POLICY IF EXISTS team_members_delete ON team_members;
CREATE POLICY team_members_delete ON team_members
  FOR DELETE
  USING (
    user_id = (select auth.uid())
    OR is_user_team_leader(team_members.team_id, (select auth.uid()))
    OR is_user_team_workspace_owner(team_members.team_id, (select auth.uid()))
  );

-- Fix team_members_insert
DROP POLICY IF EXISTS team_members_insert ON team_members;
CREATE POLICY team_members_insert ON team_members
  FOR INSERT
  WITH CHECK (
    user_id = (select auth.uid())
    OR is_user_team_leader(team_members.team_id, (select auth.uid()))
    OR is_user_team_workspace_owner(team_members.team_id, (select auth.uid()))
  );

-- Fix team_members_select
DROP POLICY IF EXISTS team_members_select ON team_members;
CREATE POLICY team_members_select ON team_members
  FOR SELECT
  USING (
    user_id = (select auth.uid())
    OR is_user_team_member(team_members.team_id, (select auth.uid()))
    OR is_user_team_leader(team_members.team_id, (select auth.uid()))
    OR is_user_team_workspace_owner(team_members.team_id, (select auth.uid()))
  );

-- Fix team_members_update
DROP POLICY IF EXISTS team_members_update ON team_members;
CREATE POLICY team_members_update ON team_members
  FOR UPDATE
  USING (
    user_id = (select auth.uid())
    OR is_user_team_leader(team_members.team_id, (select auth.uid()))
    OR is_user_team_workspace_owner(team_members.team_id, (select auth.uid()))
  )
  WITH CHECK (
    user_id = (select auth.uid())
    OR is_user_team_leader(team_members.team_id, (select auth.uid()))
    OR is_user_team_workspace_owner(team_members.team_id, (select auth.uid()))
  );

-- =====================================================
-- PROJECTS POLICIES
-- =====================================================

-- Fix projects_delete
DROP POLICY IF EXISTS projects_delete ON projects;
CREATE POLICY projects_delete ON projects
  FOR DELETE
  USING (
    is_user_team_member(projects.team_id, (select auth.uid()))
    OR EXISTS (
      SELECT 1 FROM teams t
      JOIN workspaces w ON w.id = t.workspace_id
      WHERE t.id = projects.team_id
        AND w.owner_id = (select auth.uid())
    )
  );

-- Fix projects_insert
DROP POLICY IF EXISTS projects_insert ON projects;
CREATE POLICY projects_insert ON projects
  FOR INSERT
  WITH CHECK (
    is_user_team_member(projects.team_id, (select auth.uid()))
    OR EXISTS (
      SELECT 1 FROM teams t
      JOIN workspaces w ON w.id = t.workspace_id
      WHERE t.id = projects.team_id
        AND w.owner_id = (select auth.uid())
    )
  );

-- Fix projects_select
DROP POLICY IF EXISTS projects_select ON projects;
CREATE POLICY projects_select ON projects
  FOR SELECT
  USING (
    is_user_team_member(projects.team_id, (select auth.uid()))
    OR EXISTS (
      SELECT 1 FROM teams t
      JOIN workspaces w ON w.id = t.workspace_id
      WHERE t.id = projects.team_id
        AND w.owner_id = (select auth.uid())
    )
  );

-- Fix projects_update
DROP POLICY IF EXISTS projects_update ON projects;
CREATE POLICY projects_update ON projects
  FOR UPDATE
  USING (
    is_user_team_member(projects.team_id, (select auth.uid()))
    OR EXISTS (
      SELECT 1 FROM teams t
      JOIN workspaces w ON w.id = t.workspace_id
      WHERE t.id = projects.team_id
        AND w.owner_id = (select auth.uid())
    )
  )
  WITH CHECK (
    is_user_team_member(projects.team_id, (select auth.uid()))
    OR EXISTS (
      SELECT 1 FROM teams t
      JOIN workspaces w ON w.id = t.workspace_id
      WHERE t.id = projects.team_id
        AND w.owner_id = (select auth.uid())
    )
  );

-- =====================================================
-- TASKS POLICIES
-- =====================================================

-- Fix tasks_delete
DROP POLICY IF EXISTS tasks_delete ON tasks;
CREATE POLICY tasks_delete ON tasks
  FOR DELETE
  USING (
    can_access_task(tasks.id, (select auth.uid()))
    OR can_manage_project_tasks(tasks.project_id, (select auth.uid()))
  );

-- Fix tasks_insert
DROP POLICY IF EXISTS tasks_insert ON tasks;
CREATE POLICY tasks_insert ON tasks
  FOR INSERT
  WITH CHECK (
    can_manage_project_tasks(tasks.project_id, (select auth.uid()))
  );

-- Fix tasks_select
DROP POLICY IF EXISTS tasks_select ON tasks;
CREATE POLICY tasks_select ON tasks
  FOR SELECT
  USING (
    can_access_task(tasks.id, (select auth.uid()))
    OR can_manage_project_tasks(tasks.project_id, (select auth.uid()))
  );

-- Fix tasks_update
DROP POLICY IF EXISTS tasks_update ON tasks;
CREATE POLICY tasks_update ON tasks
  FOR UPDATE
  USING (
    can_access_task(tasks.id, (select auth.uid()))
    OR can_manage_project_tasks(tasks.project_id, (select auth.uid()))
  )
  WITH CHECK (
    can_access_task(tasks.id, (select auth.uid()))
    OR can_manage_project_tasks(tasks.project_id, (select auth.uid()))
  );

-- =====================================================
-- TASK_ASSIGNEES POLICIES
-- =====================================================

-- Fix task_assignees_delete
DROP POLICY IF EXISTS task_assignees_delete ON task_assignees;
CREATE POLICY task_assignees_delete ON task_assignees
  FOR DELETE
  USING (
    can_access_task(task_assignees.task_id, (select auth.uid()))
    OR EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON p.id = t.project_id
      JOIN teams tm ON tm.id = p.team_id
      JOIN workspaces w ON w.id = tm.workspace_id
      WHERE t.id = task_assignees.task_id
        AND can_manage_project_tasks(t.project_id, (select auth.uid()))
    )
  );

-- Fix task_assignees_insert
DROP POLICY IF EXISTS task_assignees_insert ON task_assignees;
CREATE POLICY task_assignees_insert ON task_assignees
  FOR INSERT
  WITH CHECK (
    can_manage_task(task_assignees.task_id, (select auth.uid()))
  );

-- Fix task_assignees_select
DROP POLICY IF EXISTS task_assignees_select ON task_assignees;
CREATE POLICY task_assignees_select ON task_assignees
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_assignees.task_id
        AND can_access_task(t.id, (select auth.uid()))
    )
  );

-- =====================================================
-- TASK_ATTACHMENTS POLICIES
-- =====================================================

-- Fix task_attachments_delete
DROP POLICY IF EXISTS task_attachments_delete ON task_attachments;
CREATE POLICY task_attachments_delete ON task_attachments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON p.id = t.project_id
      JOIN teams tm ON tm.id = p.team_id
      JOIN workspaces w ON w.id = tm.workspace_id
      WHERE t.id = task_attachments.task_id
        AND is_user_team_member(p.team_id, (select auth.uid()))
    )
  );

-- Fix task_attachments_insert
DROP POLICY IF EXISTS task_attachments_insert ON task_attachments;
CREATE POLICY task_attachments_insert ON task_attachments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = task_attachments.task_id
        AND is_user_team_member(p.team_id, (select auth.uid()))
    )
    AND user_id = (select auth.uid())
  );

-- Fix task_attachments_select
DROP POLICY IF EXISTS task_attachments_select ON task_attachments;
CREATE POLICY task_attachments_select ON task_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = task_attachments.task_id
        AND is_user_team_member(p.team_id, (select auth.uid()))
    )
  );

-- =====================================================
-- TASK_SUBTASKS POLICIES
-- =====================================================

-- Fix task_subtasks_delete
DROP POLICY IF EXISTS task_subtasks_delete ON task_subtasks;
CREATE POLICY task_subtasks_delete ON task_subtasks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = task_subtasks.task_id
        AND is_user_team_member(p.team_id, (select auth.uid()))
    )
  );

-- Fix task_subtasks_insert
DROP POLICY IF EXISTS task_subtasks_insert ON task_subtasks;
CREATE POLICY task_subtasks_insert ON task_subtasks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = task_subtasks.task_id
        AND is_user_team_member(p.team_id, (select auth.uid()))
    )
    AND task_subtasks.created_by = (select auth.uid())
  );

-- Fix task_subtasks_select
DROP POLICY IF EXISTS task_subtasks_select ON task_subtasks;
CREATE POLICY task_subtasks_select ON task_subtasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = task_subtasks.task_id
        AND is_user_team_member(p.team_id, (select auth.uid()))
    )
  );

-- Fix task_subtasks_update
DROP POLICY IF EXISTS task_subtasks_update ON task_subtasks;
CREATE POLICY task_subtasks_update ON task_subtasks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = task_subtasks.task_id
        AND is_user_team_member(p.team_id, (select auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = task_subtasks.task_id
        AND is_user_team_member(p.team_id, (select auth.uid()))
    )
  );

-- =====================================================
-- CONTRIBUTIONS POLICIES
-- =====================================================

-- Fix contributions_delete
DROP POLICY IF EXISTS contributions_delete ON contributions;
CREATE POLICY contributions_delete ON contributions
  FOR DELETE
  USING (
    can_manage_project_tasks(contributions.project_id, (select auth.uid()))
  );

-- Fix contributions_insert
DROP POLICY IF EXISTS contributions_insert ON contributions;
CREATE POLICY contributions_insert ON contributions
  FOR INSERT
  WITH CHECK (
    can_manage_project_tasks(contributions.project_id, (select auth.uid()))
    AND user_id = (select auth.uid())
  );

-- Fix contributions_select
DROP POLICY IF EXISTS contributions_select ON contributions;
CREATE POLICY contributions_select ON contributions
  FOR SELECT
  USING (
    can_manage_project_tasks(contributions.project_id, (select auth.uid()))
  );

-- Fix contributions_update
DROP POLICY IF EXISTS contributions_update ON contributions;
CREATE POLICY contributions_update ON contributions
  FOR UPDATE
  USING (
    can_manage_project_tasks(contributions.project_id, (select auth.uid()))
  )
  WITH CHECK (
    can_manage_project_tasks(contributions.project_id, (select auth.uid()))
  );

-- =====================================================
-- ACTIVITY_LOG POLICIES
-- =====================================================

-- Fix activity_log_insert
DROP POLICY IF EXISTS activity_log_insert ON activity_log;
CREATE POLICY activity_log_insert ON activity_log
  FOR INSERT
  WITH CHECK (
    is_user_workspace_owner_safe(activity_log.workspace_id, (select auth.uid()))
    OR is_user_workspace_member_safe(activity_log.workspace_id, (select auth.uid()))
    OR activity_log.user_id = (select auth.uid())
  );

-- Fix activity_log_select
DROP POLICY IF EXISTS activity_log_select ON activity_log;
CREATE POLICY activity_log_select ON activity_log
  FOR SELECT
  USING (
    is_user_workspace_owner_safe(activity_log.workspace_id, (select auth.uid()))
    OR is_user_workspace_member_safe(activity_log.workspace_id, (select auth.uid()))
    OR activity_log.user_id = (select auth.uid())
  );

-- =====================================================
-- TEAM_JOIN_REQUESTS POLICIES
-- =====================================================

-- Fix team_join_requests_delete
DROP POLICY IF EXISTS team_join_requests_delete ON team_join_requests;
CREATE POLICY team_join_requests_delete ON team_join_requests
  FOR DELETE
  USING (
    user_id = (select auth.uid())
    OR requested_by = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM teams t
      JOIN workspaces w ON w.id = t.workspace_id
      WHERE t.id = team_join_requests.team_id
        AND w.owner_id = (select auth.uid())
    )
  );

-- Fix team_join_requests_insert
DROP POLICY IF EXISTS team_join_requests_insert ON team_join_requests;
CREATE POLICY team_join_requests_insert ON team_join_requests
  FOR INSERT
  WITH CHECK (
    (request_type = 'self_request' AND user_id = (select auth.uid()) AND requested_by = (select auth.uid()))
    OR (request_type = 'owner_invitation' AND requested_by = (select auth.uid()))
    OR EXISTS (
      SELECT 1 FROM teams t
      JOIN workspaces w ON w.id = t.workspace_id
      WHERE t.id = team_join_requests.team_id
        AND w.owner_id = (select auth.uid())
    )
  );

-- Fix team_join_requests_select
DROP POLICY IF EXISTS team_join_requests_select ON team_join_requests;
CREATE POLICY team_join_requests_select ON team_join_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teams t
      JOIN workspaces w ON w.id = t.workspace_id
      WHERE t.id = team_join_requests.team_id
        AND w.owner_id = (select auth.uid())
    )
    OR (user_id = (select auth.uid()) AND status = 'pending')
  );

-- Fix team_join_requests_update
DROP POLICY IF EXISTS team_join_requests_update ON team_join_requests;
CREATE POLICY team_join_requests_update ON team_join_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM teams t
      JOIN workspaces w ON w.id = t.workspace_id
      WHERE t.id = team_join_requests.team_id
        AND w.owner_id = (select auth.uid())
    )
    OR (user_id = (select auth.uid()) AND status = 'pending')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams t
      JOIN workspaces w ON w.id = t.workspace_id
      WHERE t.id = team_join_requests.team_id
        AND w.owner_id = (select auth.uid())
    )
    OR (user_id = (select auth.uid()) AND status = 'pending')
  );

-- =====================================================
-- TEAM_ASSIGNMENT_AUDIT POLICIES
-- =====================================================

-- Fix team_assignment_audit_insert
DROP POLICY IF EXISTS team_assignment_audit_insert ON team_assignment_audit;
CREATE POLICY team_assignment_audit_insert ON team_assignment_audit
  FOR INSERT
  WITH CHECK (
    user_id = (select auth.uid())
    OR performed_by = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM teams t
      JOIN workspaces w ON w.id = t.workspace_id
      WHERE t.id = team_assignment_audit.team_id
        AND w.owner_id = (select auth.uid())
    )
  );

-- Fix team_assignment_audit_select
DROP POLICY IF EXISTS team_assignment_audit_select ON team_assignment_audit;
CREATE POLICY team_assignment_audit_select ON team_assignment_audit
  FOR SELECT
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM teams t
      JOIN workspaces w ON w.id = t.workspace_id
      WHERE t.id = team_assignment_audit.team_id
        AND w.owner_id = (select auth.uid())
    )
  );

-- =====================================================
-- NOTIFICATIONS POLICIES
-- =====================================================

-- Fix notifications_select
DROP POLICY IF EXISTS notifications_select ON notifications;
CREATE POLICY notifications_select ON notifications
  FOR SELECT
  USING (user_id = (select auth.uid()));

-- Fix notifications_update
DROP POLICY IF EXISTS notifications_update ON notifications;
CREATE POLICY notifications_update ON notifications
  FOR UPDATE
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- =====================================================
-- NOTIFICATION_PREFERENCES POLICIES
-- =====================================================

-- Fix notification_preferences_insert
DROP POLICY IF EXISTS notification_preferences_insert ON notification_preferences;
CREATE POLICY notification_preferences_insert ON notification_preferences
  FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

-- Fix notification_preferences_select
DROP POLICY IF EXISTS notification_preferences_select ON notification_preferences;
CREATE POLICY notification_preferences_select ON notification_preferences
  FOR SELECT
  USING (user_id = (select auth.uid()));

-- Fix notification_preferences_update
DROP POLICY IF EXISTS notification_preferences_update ON notification_preferences;
CREATE POLICY notification_preferences_update ON notification_preferences
  FOR UPDATE
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));
