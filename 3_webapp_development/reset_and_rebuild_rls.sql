-- =====================================================
-- COMPLETE RLS RESET AND REBUILD
-- =====================================================
-- This script removes all RLS and rebuilds from scratch with a minimal,
-- non-recursive approach. Run this FIRST, then test the app.

-- =====================================================
-- STEP 1: DISABLE RLS ON ALL TABLES
-- =====================================================
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS task_assignees DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS task_attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS task_subtasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contributions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS activity_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notification_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS team_join_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS team_assignment_audit DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 2: DROP ALL EXISTING POLICIES
-- =====================================================
-- Drop all policies to start completely fresh
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname 
              FROM pg_policies 
              WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                       r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- =====================================================
-- STEP 3: DROP HELPER FUNCTIONS (if they exist)
-- =====================================================
DROP FUNCTION IF EXISTS is_user_workspace_member(UUID, UUID);
DROP FUNCTION IF EXISTS user_workspace_role(UUID, UUID);
DROP FUNCTION IF EXISTS is_user_team_member(UUID, UUID);
DROP FUNCTION IF EXISTS is_user_team_leader(UUID, UUID);
DROP FUNCTION IF EXISTS is_user_workspace_member_safe(UUID, UUID);
DROP FUNCTION IF EXISTS users_share_workspace(UUID, UUID);

-- =====================================================
-- STEP 4: CREATE HELPER FUNCTIONS (Bypass RLS safely)
-- =====================================================

-- Helper function to check team membership (bypasses RLS to prevent recursion)
CREATE OR REPLACE FUNCTION is_user_team_member(p_team_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  -- SECURITY DEFINER functions bypass RLS by default
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id
    AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- Helper function to check if user is a team leader (bypasses RLS to prevent recursion)
CREATE OR REPLACE FUNCTION is_user_team_leader(p_team_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  -- SECURITY DEFINER functions bypass RLS by default
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id
    AND user_id = p_user_id
    AND role = 'leader'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- Helper function to check if user is a workspace member (bypasses RLS to prevent recursion)
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

GRANT EXECUTE ON FUNCTION is_user_team_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_team_leader(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_workspace_member_safe(UUID, UUID) TO authenticated;

-- =====================================================
-- STEP 5: REBUILD RLS WITH MINIMAL, NON-RECURSIVE POLICIES
-- =====================================================

-- PROFILES: Users can see their own profile + profiles of people they share tasks/workspaces with
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Helper function to check if two users share a workspace (bypasses RLS to prevent recursion)
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

CREATE POLICY "profiles_select" ON profiles
FOR SELECT TO authenticated
USING (
  -- Users can always see their own profile
  id = auth.uid()
  
  -- OR users can see profiles of people they share tasks with
  OR EXISTS (
    SELECT 1 FROM tasks t
    WHERE (t.assigned_to = auth.uid() OR t.assigned_to = profiles.id)
    OR EXISTS (
      SELECT 1 FROM task_assignees ta
      WHERE ta.task_id = t.id
      AND (ta.user_id = auth.uid() OR ta.user_id = profiles.id)
    )
  )
  
  -- OR users can see profiles of people in the same workspace
  -- Using helper function to avoid RLS recursion - this is the primary check for workspace membership
  OR users_share_workspace(profiles.id, auth.uid())
);

CREATE POLICY "profiles_update" ON profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_insert" ON profiles
FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

-- WORKSPACES: CRITICAL - Cannot query workspace_members (it queries workspaces, causing recursion)
-- Only allow workspace owners to see workspaces initially
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspaces_select" ON workspaces
FOR SELECT TO authenticated
USING (
  -- Only workspace owners can see workspaces (no recursion possible)
  owner_id = auth.uid()
);

CREATE POLICY "workspaces_insert" ON workspaces
FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "workspaces_update" ON workspaces
FOR UPDATE TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "workspaces_delete" ON workspaces
FOR DELETE TO authenticated
USING (owner_id = auth.uid());

-- WORKSPACE_MEMBERS: CRITICAL - NO SELF-REFERENCE
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_members_select" ON workspace_members
FOR SELECT TO authenticated
USING (
  -- User can see their own membership
  user_id = auth.uid()
  OR
  -- Workspace owner can see all members (via workspaces table, no recursion)
  EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = workspace_members.workspace_id
    AND w.owner_id = auth.uid()
  )
);

CREATE POLICY "workspace_members_insert" ON workspace_members
FOR INSERT TO authenticated
WITH CHECK (
  -- Workspace owner can add members
  EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = workspace_members.workspace_id
    AND w.owner_id = auth.uid()
  )
  OR
  -- User can join themselves
  user_id = auth.uid()
);

CREATE POLICY "workspace_members_update" ON workspace_members
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = workspace_members.workspace_id
    AND w.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = workspace_members.workspace_id
    AND w.owner_id = auth.uid()
  )
);

CREATE POLICY "workspace_members_delete" ON workspace_members
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = workspace_members.workspace_id
    AND w.owner_id = auth.uid()
  )
  OR
  user_id = auth.uid()
);

-- TEAMS: Users can see teams they are members of OR where they are workspace owners
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teams_select" ON teams
FOR SELECT TO authenticated
USING (
  -- Workspace owner can see teams (no recursion - direct check)
  EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = teams.workspace_id
    AND w.owner_id = auth.uid()
  )
  OR
  -- Team member can see their team (via helper function - bypasses RLS, no recursion)
  is_user_team_member(teams.id, auth.uid())
);

CREATE POLICY "teams_insert" ON teams
FOR INSERT TO authenticated
WITH CHECK (
  -- Only workspace owner can create teams (no recursion)
  EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = teams.workspace_id
    AND w.owner_id = auth.uid()
  )
);

CREATE POLICY "teams_update" ON teams
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = teams.workspace_id
    AND w.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = teams.workspace_id
    AND w.owner_id = auth.uid()
  )
);

CREATE POLICY "teams_delete" ON teams
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = teams.workspace_id
    AND w.owner_id = auth.uid()
  )
);

-- TEAM_MEMBERS: Users can see team members for teams they can access
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_members_select" ON team_members
FOR SELECT TO authenticated
USING (
  -- User can see their own membership (direct check, no recursion)
  user_id = auth.uid()
  OR
  -- Users can see members of teams they belong to (via helper function - bypasses RLS, no recursion)
  is_user_team_member(team_members.team_id, auth.uid())
  OR
  -- Workspace owner can see all team members in their workspace
  EXISTS (
    SELECT 1 FROM teams t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE t.id = team_members.team_id
    AND w.owner_id = auth.uid()
  )
  OR
  -- Workspace members can see team members in their workspace (via helper function)
  EXISTS (
    SELECT 1 FROM teams t
    WHERE t.id = team_members.team_id
    AND is_user_workspace_member_safe(t.workspace_id, auth.uid())
  )
);

CREATE POLICY "team_members_insert" ON team_members
FOR INSERT TO authenticated
WITH CHECK (
  -- User can join themselves (no recursion)
  user_id = auth.uid()
  OR
  -- Workspace owner can add members to teams in their workspace (no recursion - direct check, safe)
  EXISTS (
    SELECT 1 FROM teams t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE t.id = team_members.team_id
    AND w.owner_id = auth.uid()
  )
  OR
  -- Team leader can add members to their team (via helper function - bypasses RLS, no recursion)
  is_user_team_leader(team_members.team_id, auth.uid())
  OR
  -- Workspace members can add other workspace members to teams (for instructors/TAs)
  -- Check if current user is a workspace member of the team's workspace
  EXISTS (
    SELECT 1 FROM teams t
    WHERE t.id = team_members.team_id
    AND is_user_workspace_member_safe(t.workspace_id, auth.uid())
  )
);

CREATE POLICY "team_members_update" ON team_members
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR
  -- Workspace owner can update members in their workspace
  EXISTS (
    SELECT 1 FROM teams t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE t.id = team_members.team_id
    AND w.owner_id = auth.uid()
  )
  OR
  -- Team leader can update members in their team
  is_user_team_leader(team_members.team_id, auth.uid())
)
WITH CHECK (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM teams t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE t.id = team_members.team_id
    AND w.owner_id = auth.uid()
  )
  OR
  is_user_team_leader(team_members.team_id, auth.uid())
);

CREATE POLICY "team_members_delete" ON team_members
FOR DELETE TO authenticated
USING (
  -- User can remove their own membership (no recursion)
  user_id = auth.uid()
  OR
  -- Workspace owner can remove members from teams in their workspace
  EXISTS (
    SELECT 1 FROM teams t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE t.id = team_members.team_id
    AND w.owner_id = auth.uid()
  )
  OR
  -- Team leader can remove members from their team
  is_user_team_leader(team_members.team_id, auth.uid())
);

-- PROJECTS: Team members can access projects (using helper function to avoid recursion)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_select" ON projects
FOR SELECT TO authenticated
USING (
  -- Use helper function to check team membership (bypasses RLS, no recursion)
  is_user_team_member(projects.team_id, auth.uid())
);

CREATE POLICY "projects_insert" ON projects
FOR INSERT TO authenticated
WITH CHECK (
  is_user_team_member(projects.team_id, auth.uid())
);

CREATE POLICY "projects_update" ON projects
FOR UPDATE TO authenticated
USING (
  is_user_team_member(projects.team_id, auth.uid())
)
WITH CHECK (
  is_user_team_member(projects.team_id, auth.uid())
);

CREATE POLICY "projects_delete" ON projects
FOR DELETE TO authenticated
USING (
  -- Only workspace owner can delete projects (simplified to avoid recursion)
  EXISTS (
    SELECT 1 FROM teams t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE t.id = projects.team_id
    AND w.owner_id = auth.uid()
  )
);

-- TASKS: Team members can access tasks (using helper function to avoid recursion)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_select" ON tasks
FOR SELECT TO authenticated
USING (
  -- Use helper function via projects (bypasses RLS, no recursion)
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = tasks.project_id
    AND is_user_team_member(p.team_id, auth.uid())
  )
);

CREATE POLICY "tasks_insert" ON tasks
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = tasks.project_id
    AND is_user_team_member(p.team_id, auth.uid())
  )
);

CREATE POLICY "tasks_update" ON tasks
FOR UPDATE TO authenticated
USING (
  assigned_to = auth.uid()
  OR EXISTS (
    SELECT 1 FROM task_assignees ta
    WHERE ta.task_id = tasks.id
    AND ta.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM projects p
    JOIN teams t ON t.id = p.team_id
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE p.id = tasks.project_id
    AND w.owner_id = auth.uid()
  )
)
WITH CHECK (
  assigned_to = auth.uid()
  OR EXISTS (
    SELECT 1 FROM task_assignees ta
    WHERE ta.task_id = tasks.id
    AND ta.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM projects p
    JOIN teams t ON t.id = p.team_id
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE p.id = tasks.project_id
    AND w.owner_id = auth.uid()
  )
);

CREATE POLICY "tasks_delete" ON tasks
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN teams t ON t.id = p.team_id
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE p.id = tasks.project_id
    AND w.owner_id = auth.uid()
  )
);

-- TASK_ASSIGNEES, TASK_ATTACHMENTS, TASK_SUBTASKS: Inherit access from tasks
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_assignees_select" ON task_assignees
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON t.project_id = p.id
    WHERE t.id = task_assignees.task_id
    AND is_user_team_member(p.team_id, auth.uid())
  )
);

CREATE POLICY "task_assignees_insert" ON task_assignees
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON t.project_id = p.id
    JOIN teams tm ON tm.id = p.team_id
    JOIN workspaces w ON w.id = tm.workspace_id
    WHERE t.id = task_assignees.task_id
    AND w.owner_id = auth.uid()
  )
);

CREATE POLICY "task_assignees_delete" ON task_assignees
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON t.project_id = p.id
    JOIN teams tm ON tm.id = p.team_id
    JOIN workspaces w ON w.id = tm.workspace_id
    WHERE t.id = task_assignees.task_id
    AND w.owner_id = auth.uid()
  )
);

ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_attachments_select" ON task_attachments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON t.project_id = p.id
    WHERE t.id = task_attachments.task_id
    AND is_user_team_member(p.team_id, auth.uid())
  )
);

CREATE POLICY "task_attachments_insert" ON task_attachments
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON t.project_id = p.id
    WHERE t.id = task_attachments.task_id
    AND is_user_team_member(p.team_id, auth.uid())
  )
  AND user_id = auth.uid()
);

CREATE POLICY "task_attachments_delete" ON task_attachments
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON t.project_id = p.id
    JOIN teams tm ON tm.id = p.team_id
    JOIN workspaces w ON w.id = tm.workspace_id
    WHERE t.id = task_attachments.task_id
    AND w.owner_id = auth.uid()
  )
);

ALTER TABLE task_subtasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_subtasks_select" ON task_subtasks
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON t.project_id = p.id
    WHERE t.id = task_subtasks.task_id
    AND is_user_team_member(p.team_id, auth.uid())
  )
);

CREATE POLICY "task_subtasks_insert" ON task_subtasks
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON t.project_id = p.id
    WHERE t.id = task_subtasks.task_id
    AND is_user_team_member(p.team_id, auth.uid())
  )
  AND created_by = auth.uid()
);

CREATE POLICY "task_subtasks_update" ON task_subtasks
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON t.project_id = p.id
    WHERE t.id = task_subtasks.task_id
    AND is_user_team_member(p.team_id, auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON t.project_id = p.id
    WHERE t.id = task_subtasks.task_id
    AND is_user_team_member(p.team_id, auth.uid())
  )
);

CREATE POLICY "task_subtasks_delete" ON task_subtasks
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON t.project_id = p.id
    WHERE t.id = task_subtasks.task_id
    AND is_user_team_member(p.team_id, auth.uid())
  )
);

-- CONTRIBUTIONS: Team members can view, users can create their own
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contributions_select" ON contributions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = contributions.project_id
    AND is_user_team_member(p.team_id, auth.uid())
  )
);

CREATE POLICY "contributions_insert" ON contributions
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "contributions_update" ON contributions
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "contributions_delete" ON contributions
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- ACTIVITY_LOG: CRITICAL - Cannot query workspace_members (recursion risk)
-- Only workspace owners can view initially
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_log_select" ON activity_log
FOR SELECT TO authenticated
USING (
  -- Only workspace owner can view activity (no recursion)
  EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = activity_log.workspace_id
    AND w.owner_id = auth.uid()
  )
);

CREATE POLICY "activity_log_insert" ON activity_log
FOR INSERT TO authenticated
WITH CHECK (
  -- Only workspace owner can insert activity (no recursion)
  EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = activity_log.workspace_id
    AND w.owner_id = auth.uid()
  )
);

-- NOTIFICATIONS: Users can see their own, anyone can create notifications for any user
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (idempotent)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'notifications_select') THEN
    DROP POLICY "notifications_select" ON notifications;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'notifications_update') THEN
    DROP POLICY "notifications_update" ON notifications;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'notifications_insert') THEN
    DROP POLICY "notifications_insert" ON notifications;
  END IF;
END $$;

CREATE POLICY "notifications_select" ON notifications
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "notifications_update" ON notifications
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow any authenticated user to insert notifications for any user
-- This is essential for cross-user notifications (team assignments, etc.)
CREATE POLICY "notifications_insert" ON notifications
FOR INSERT TO authenticated
WITH CHECK (true);

-- NOTIFICATION_PREFERENCES: Users manage their own
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notification_preferences_select" ON notification_preferences
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "notification_preferences_insert" ON notification_preferences
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "notification_preferences_update" ON notification_preferences
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- TEAM_JOIN_REQUESTS: Users can see their own, team leaders and workspace owners can see team requests
ALTER TABLE team_join_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_join_requests_select" ON team_join_requests
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR requested_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM teams t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE t.id = team_join_requests.team_id
    AND w.owner_id = auth.uid()
  )
);

CREATE POLICY "team_join_requests_insert" ON team_join_requests
FOR INSERT TO authenticated
WITH CHECK (
  (request_type = 'self_request' AND user_id = auth.uid() AND requested_by = auth.uid())
  OR
  (request_type = 'owner_invitation' AND requested_by = auth.uid())
);

CREATE POLICY "team_join_requests_update" ON team_join_requests
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE t.id = team_join_requests.team_id
    AND w.owner_id = auth.uid()
  )
  OR (user_id = auth.uid() AND status = 'pending')
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teams t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE t.id = team_join_requests.team_id
    AND w.owner_id = auth.uid()
  )
  OR (user_id = auth.uid() AND status = 'pending')
);

CREATE POLICY "team_join_requests_delete" ON team_join_requests
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM teams t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE t.id = team_join_requests.team_id
    AND w.owner_id = auth.uid()
  )
);

-- TEAM_ASSIGNMENT_AUDIT: Related users and workspace owners can see
ALTER TABLE team_assignment_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_assignment_audit_select" ON team_assignment_audit
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR performed_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM teams t
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE t.id = team_assignment_audit.team_id
    AND w.owner_id = auth.uid()
  )
);

CREATE POLICY "team_assignment_audit_insert" ON team_assignment_audit
FOR INSERT TO authenticated
WITH CHECK (performed_by = auth.uid());

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
