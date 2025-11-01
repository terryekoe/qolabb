-- =====================================================
-- Enable RLS and Create All Policies
-- Migration: 035_enable_rls_all_tables.sql
-- Description: Enables Row Level Security on all tables and ensures all policies exist
-- This fixes the critical security issue where RLS was disabled
-- =====================================================

-- =====================================================
-- STEP 1: ENABLE RLS ON ALL TABLES
-- =====================================================

-- Core Tables
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.activity_log ENABLE ROW LEVEL SECURITY;

-- Notification Tables
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Team Management Tables
ALTER TABLE IF EXISTS public.team_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.team_assignment_audit ENABLE ROW LEVEL SECURITY;

-- Task Enhancement Tables
ALTER TABLE IF EXISTS public.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.task_subtasks ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 2: CREATE ALL POLICIES (IF THEY DON'T EXIST)
-- =====================================================

-- =====================================================
-- PROFILES POLICIES
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_select') THEN
    -- CRITICAL: Cannot query team_members (causes recursion) or workspace_members (causes recursion)
    -- Solution: Only check through tasks/projects/task_assignees which have simpler policies
    CREATE POLICY "profiles_select" ON profiles
    FOR SELECT
    TO authenticated
    USING (
      -- User can see their own profile
      id = auth.uid()
      OR
      -- User can see profiles if they share tasks (via assigned_to or task_assignees)
      EXISTS (
        SELECT 1 FROM tasks t
        WHERE (
          (t.assigned_to = auth.uid() OR t.assigned_to = profiles.id)
          OR EXISTS (
            SELECT 1 FROM task_assignees ta
            WHERE ta.task_id = t.id
            AND (ta.user_id = auth.uid() OR ta.user_id = profiles.id)
          )
        )
      )
      OR
      -- User can see profiles if they are workspace owners of shared workspaces
      EXISTS (
        SELECT 1 FROM workspaces w1
        INNER JOIN workspaces w2 ON w1.id = w2.id
        WHERE w1.owner_id = auth.uid()
        AND w2.owner_id = profiles.id
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_update') THEN
    CREATE POLICY "profiles_update" ON profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_insert') THEN
    CREATE POLICY "profiles_insert" ON profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());
  END IF;
END $$;

-- =====================================================
-- WORKSPACES POLICIES
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspaces' AND policyname = 'workspaces_select') THEN
    CREATE POLICY "workspaces_select" ON workspaces
    FOR SELECT
    TO authenticated
    USING (
      -- User is the owner
      owner_id = auth.uid()
      OR
      -- User is a member (using helper function to avoid recursion)
      is_user_workspace_member(workspaces.id, auth.uid())
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspaces' AND policyname = 'workspaces_insert') THEN
    CREATE POLICY "workspaces_insert" ON workspaces
    FOR INSERT
    TO authenticated
    WITH CHECK (owner_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspaces' AND policyname = 'workspaces_update') THEN
    CREATE POLICY "workspaces_update" ON workspaces
    FOR UPDATE
    TO authenticated
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspaces' AND policyname = 'workspaces_delete') THEN
    CREATE POLICY "workspaces_delete" ON workspaces
    FOR DELETE
    TO authenticated
    USING (owner_id = auth.uid());
  END IF;
END $$;

-- =====================================================
-- CREATE HELPER FUNCTION FOR WORKSPACE MEMBERSHIP (Bypasses RLS)
-- =====================================================
-- This function is SECURITY DEFINER, so it bypasses RLS when checking workspace membership
-- This prevents infinite recursion when other policies query workspace_members

-- Drop existing functions if they exist (to ensure clean recreation)
DROP FUNCTION IF EXISTS is_user_workspace_member(UUID, UUID);
DROP FUNCTION IF EXISTS user_workspace_role(UUID, UUID);

-- Helper function to check workspace membership (bypasses RLS to prevent recursion)
-- SECURITY DEFINER ensures this runs with the creator's privileges, bypassing RLS
-- Set search_path to prevent injection attacks
CREATE OR REPLACE FUNCTION is_user_workspace_member(p_workspace_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  -- SECURITY DEFINER functions bypass RLS by default
  -- This query will not trigger workspace_members policies
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id
    AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- Helper function to check user role in workspace (bypasses RLS to prevent recursion)
CREATE OR REPLACE FUNCTION user_workspace_role(p_workspace_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- SECURITY DEFINER functions bypass RLS by default
  -- This query will not trigger workspace_members policies
  SELECT role INTO user_role
  FROM workspace_members
  WHERE workspace_id = p_workspace_id
  AND user_id = p_user_id
  LIMIT 1;
  
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_user_workspace_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION user_workspace_role(UUID, UUID) TO authenticated;

-- =====================================================
-- WORKSPACE_MEMBERS POLICIES (Safe - No Recursion)
-- =====================================================
-- IMPORTANT: Cannot query workspace_members from within its own policy - causes infinite recursion
-- Solution: Only check workspace ownership (via workspaces table) and user's own membership
-- Members can see other members through other tables (teams, projects) if needed

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "workspace_members_select" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_select_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_update_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete_policy" ON workspace_members;
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can insert workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can update workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can delete workspace members" ON workspace_members;

-- Create simple, non-recursive policies
DO $$
BEGIN
  -- SELECT: Users can see their own membership or if they are workspace owner
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspace_members' AND policyname = 'workspace_members_select') THEN
    CREATE POLICY "workspace_members_select" ON workspace_members
    FOR SELECT
    TO authenticated
    USING (
      -- User can see their own membership (direct check, no recursion)
      user_id = auth.uid()
      OR
      -- Workspace owner can see all members (checks workspaces table directly, no recursion)
      EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id = workspace_members.workspace_id
        AND w.owner_id = auth.uid()
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  -- INSERT: Workspace owners can add members, users can join themselves
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspace_members' AND policyname = 'workspace_members_insert') THEN
    CREATE POLICY "workspace_members_insert" ON workspace_members
    FOR INSERT
    TO authenticated
    WITH CHECK (
      -- Workspace owner can add members (checks workspaces table directly, no recursion)
      EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id = workspace_members.workspace_id
        AND w.owner_id = auth.uid()
      )
      OR
      -- User can join themselves
      user_id = auth.uid()
    );
  END IF;
END $$;

DO $$
BEGIN
  -- UPDATE: Only workspace owners can update member roles
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspace_members' AND policyname = 'workspace_members_update') THEN
    CREATE POLICY "workspace_members_update" ON workspace_members
    FOR UPDATE
    TO authenticated
    USING (
      -- Workspace owner can update any membership
      EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id = workspace_members.workspace_id
        AND w.owner_id = auth.uid()
      )
    )
    WITH CHECK (
      -- Same condition for WITH CHECK
      EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id = workspace_members.workspace_id
        AND w.owner_id = auth.uid()
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  -- DELETE: Workspace owners can remove members, users can remove themselves
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workspace_members' AND policyname = 'workspace_members_delete') THEN
    CREATE POLICY "workspace_members_delete" ON workspace_members
    FOR DELETE
    TO authenticated
    USING (
      -- Workspace owner can remove members
      EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id = workspace_members.workspace_id
        AND w.owner_id = auth.uid()
      )
      OR
      -- User can leave themselves
      user_id = auth.uid()
    );
  END IF;
END $$;

-- =====================================================
-- TEAMS POLICIES
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'teams' AND policyname = 'teams_select') THEN
    CREATE POLICY "teams_select" ON teams
    FOR SELECT
    TO authenticated
    USING (
      -- Team is in a workspace where user is a member (using helper function to avoid recursion)
      is_user_workspace_member(teams.workspace_id, auth.uid())
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'teams' AND policyname = 'teams_insert') THEN
    CREATE POLICY "teams_insert" ON teams
    FOR INSERT
    TO authenticated
    WITH CHECK (
      -- User is a member of the workspace (using helper function to avoid recursion)
      is_user_workspace_member(teams.workspace_id, auth.uid())
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'teams' AND policyname = 'teams_update') THEN
    CREATE POLICY "teams_update" ON teams
    FOR UPDATE
    TO authenticated
    USING (
      -- Team leader can update
      EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = teams.id
        AND tm.user_id = auth.uid()
        AND tm.role = 'leader'
      )
      OR
      -- Workspace owner/admin can update (check workspace ownership directly, no recursion)
      EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id = teams.workspace_id
        AND w.owner_id = auth.uid()
      )
      OR
      -- Check if user is workspace member with admin role (using helper function to avoid recursion)
      (is_user_workspace_member(teams.workspace_id, auth.uid()) AND user_workspace_role(teams.workspace_id, auth.uid()) IN ('admin'))
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'teams' AND policyname = 'teams_delete') THEN
    CREATE POLICY "teams_delete" ON teams
    FOR DELETE
    TO authenticated
    USING (
      -- Team leader can delete
      EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = teams.id
        AND tm.user_id = auth.uid()
        AND tm.role = 'leader'
      )
      OR
      -- Workspace owner/admin can delete (check workspace ownership or role via helper function)
      EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id = teams.workspace_id
        AND w.owner_id = auth.uid()
      )
      OR
      (is_user_workspace_member(teams.workspace_id, auth.uid()) AND user_workspace_role(teams.workspace_id, auth.uid()) IN ('admin'))
    );
  END IF;
END $$;

-- =====================================================
-- TEAM_MEMBERS POLICIES
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'team_members' AND policyname = 'team_members_select') THEN
    -- CRITICAL: Cannot query team_members from within its own policy - causes recursion
    -- Solution: Only check workspace ownership OR user's own membership
    CREATE POLICY "team_members_select" ON team_members
    FOR SELECT
    TO authenticated
    USING (
      -- User can see their own membership (direct check, no recursion)
      user_id = auth.uid()
      OR
      -- Workspace owner can see all team members (checks workspaces table directly, no recursion)
      EXISTS (
        SELECT 1 FROM teams t
        JOIN workspaces w ON w.id = t.workspace_id
        WHERE t.id = team_members.team_id
        AND w.owner_id = auth.uid()
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'team_members' AND policyname = 'team_members_insert') THEN
    CREATE POLICY "team_members_insert" ON team_members
    FOR INSERT
    TO authenticated
    WITH CHECK (
      -- Team leader can add members
      EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'leader'
      )
      OR
      -- User can join themselves
      user_id = auth.uid()
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'team_members' AND policyname = 'team_members_update') THEN
    CREATE POLICY "team_members_update" ON team_members
    FOR UPDATE
    TO authenticated
    USING (
      -- Team leader can update roles
      EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'leader'
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'team_members' AND policyname = 'team_members_delete') THEN
    CREATE POLICY "team_members_delete" ON team_members
    FOR DELETE
    TO authenticated
    USING (
      -- User can leave themselves
      user_id = auth.uid()
      OR
      -- Team leader can remove members
      EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'leader'
      )
    );
  END IF;
END $$;

-- =====================================================
-- PROJECTS POLICIES
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'projects_select') THEN
    CREATE POLICY "projects_select" ON projects
    FOR SELECT
    TO authenticated
    USING (
      -- User is a team member
      EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = projects.team_id
        AND tm.user_id = auth.uid()
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'projects_insert') THEN
    CREATE POLICY "projects_insert" ON projects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      -- User is a team member
      EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = projects.team_id
        AND tm.user_id = auth.uid()
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'projects_update') THEN
    CREATE POLICY "projects_update" ON projects
    FOR UPDATE
    TO authenticated
    USING (
      -- Team members can update
      EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = projects.team_id
        AND tm.user_id = auth.uid()
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'projects_delete') THEN
    CREATE POLICY "projects_delete" ON projects
    FOR DELETE
    TO authenticated
    USING (
      -- Team leader can delete
      EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = projects.team_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'leader'
      )
    );
  END IF;
END $$;

-- =====================================================
-- TASKS POLICIES
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'tasks_select') THEN
    CREATE POLICY "tasks_select" ON tasks
    FOR SELECT
    TO authenticated
    USING (
      -- User is a team member
      EXISTS (
        SELECT 1 FROM projects p
        JOIN team_members tm ON tm.team_id = p.team_id
        WHERE p.id = tasks.project_id
        AND tm.user_id = auth.uid()
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'tasks_insert') THEN
    CREATE POLICY "tasks_insert" ON tasks
    FOR INSERT
    TO authenticated
    WITH CHECK (
      -- User is a team member
      EXISTS (
        SELECT 1 FROM projects p
        JOIN team_members tm ON tm.team_id = p.team_id
        WHERE p.id = tasks.project_id
        AND tm.user_id = auth.uid()
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'tasks_update') THEN
    CREATE POLICY "tasks_update" ON tasks
    FOR UPDATE
    TO authenticated
    USING (
      -- Assigned user can update
      assigned_to = auth.uid()
      OR
      -- User is in task_assignees
      EXISTS (
        SELECT 1 FROM task_assignees ta
        WHERE ta.task_id = tasks.id
        AND ta.user_id = auth.uid()
      )
      OR
      -- Team leader can update
      EXISTS (
        SELECT 1 FROM projects p
        JOIN team_members tm ON tm.team_id = p.team_id
        WHERE p.id = tasks.project_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'leader'
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'tasks_delete') THEN
    CREATE POLICY "tasks_delete" ON tasks
    FOR DELETE
    TO authenticated
    USING (
      -- Team leader can delete
      EXISTS (
        SELECT 1 FROM projects p
        JOIN team_members tm ON tm.team_id = p.team_id
        WHERE p.id = tasks.project_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'leader'
      )
    );
  END IF;
END $$;

-- =====================================================
-- CONTRIBUTIONS POLICIES
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contributions' AND policyname = 'contributions_select') THEN
    CREATE POLICY "contributions_select" ON contributions
    FOR SELECT
    TO authenticated
    USING (
      -- Team members can view
      EXISTS (
        SELECT 1 FROM projects p
        JOIN team_members tm ON tm.team_id = p.team_id
        WHERE p.id = contributions.project_id
        AND tm.user_id = auth.uid()
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contributions' AND policyname = 'contributions_insert') THEN
    CREATE POLICY "contributions_insert" ON contributions
    FOR INSERT
    TO authenticated
    WITH CHECK (
      -- User can create their own contributions
      user_id = auth.uid()
      AND
      -- User is a team member
      EXISTS (
        SELECT 1 FROM projects p
        JOIN team_members tm ON tm.team_id = p.team_id
        WHERE p.id = contributions.project_id
        AND tm.user_id = auth.uid()
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contributions' AND policyname = 'contributions_update') THEN
    CREATE POLICY "contributions_update" ON contributions
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contributions' AND policyname = 'contributions_delete') THEN
    CREATE POLICY "contributions_delete" ON contributions
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());
  END IF;
END $$;

-- =====================================================
-- ACTIVITY_LOG POLICIES
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_log' AND policyname = 'activity_log_select') THEN
    CREATE POLICY "activity_log_select" ON activity_log
    FOR SELECT
    TO authenticated
    USING (
      -- Workspace members can view activity (using helper function to avoid recursion)
      is_user_workspace_member(activity_log.workspace_id, auth.uid())
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_log' AND policyname = 'activity_log_insert') THEN
    CREATE POLICY "activity_log_insert" ON activity_log
    FOR INSERT
    TO authenticated
    WITH CHECK (
      -- System can log activities for workspace members (using helper function to avoid recursion)
      is_user_workspace_member(activity_log.workspace_id, activity_log.user_id)
    );
  END IF;
END $$;

-- =====================================================
-- NOTIFICATIONS POLICIES (Already in migration 016, but ensure they exist)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can view own notifications') THEN
    CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can update own notifications') THEN
    CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'System can insert notifications') THEN
    CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT
    WITH CHECK (true);
  END IF;
END $$;

-- =====================================================
-- NOTIFICATION_PREFERENCES POLICIES (Already in migration 016, but ensure they exist)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notification_preferences' AND policyname = 'Users can view own preferences') THEN
    CREATE POLICY "Users can view own preferences" ON notification_preferences
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notification_preferences' AND policyname = 'Users can update own preferences') THEN
    CREATE POLICY "Users can update own preferences" ON notification_preferences
    FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notification_preferences' AND policyname = 'Users can insert own preferences') THEN
    CREATE POLICY "Users can insert own preferences" ON notification_preferences
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- =====================================================
-- TEAM_JOIN_REQUESTS POLICIES (Already in migration 015, but ensure they exist)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'team_join_requests' AND policyname = 'team_join_requests_select') THEN
    CREATE POLICY "team_join_requests_select" ON team_join_requests
    FOR SELECT
    TO authenticated
    USING (
      auth.uid() = user_id
      OR auth.uid() = requested_by
      OR auth.uid() = responded_by
      OR
      EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = team_join_requests.team_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'leader'
      )
      OR
      (EXISTS (
        SELECT 1 FROM teams t
        JOIN workspaces w ON w.id = t.workspace_id
        WHERE t.id = team_join_requests.team_id
        AND w.owner_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM teams t
        WHERE t.id = team_join_requests.team_id
        AND is_user_workspace_member(t.workspace_id, auth.uid())
        AND user_workspace_role(t.workspace_id, auth.uid()) IN ('admin')
      ))
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'team_join_requests' AND policyname = 'team_join_requests_insert') THEN
    CREATE POLICY "team_join_requests_insert" ON team_join_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (
      (request_type = 'self_request' AND auth.uid() = user_id AND auth.uid() = requested_by
       AND EXISTS (
         SELECT 1 FROM teams t
         WHERE t.id = team_id
         AND is_user_workspace_member(t.workspace_id, auth.uid())
       ))
      OR
      (request_type = 'owner_invitation' AND auth.uid() = requested_by
       AND (EXISTS (
         SELECT 1 FROM teams t
         JOIN workspaces w ON w.id = t.workspace_id
         WHERE t.id = team_id AND w.owner_id = auth.uid()
       ) OR EXISTS (
         SELECT 1 FROM teams t
         WHERE t.id = team_id
         AND is_user_workspace_member(t.workspace_id, auth.uid())
         AND user_workspace_role(t.workspace_id, auth.uid()) IN ('admin')
       )))
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'team_join_requests' AND policyname = 'team_join_requests_update') THEN
    CREATE POLICY "team_join_requests_update" ON team_join_requests
    FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = team_join_requests.team_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'leader'
      )
      OR
      (EXISTS (
        SELECT 1 FROM teams t
        JOIN workspaces w ON w.id = t.workspace_id
        WHERE t.id = team_join_requests.team_id
        AND w.owner_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM teams t
        WHERE t.id = team_join_requests.team_id
        AND is_user_workspace_member(t.workspace_id, auth.uid())
        AND user_workspace_role(t.workspace_id, auth.uid()) IN ('admin')
      ))
      OR
      (auth.uid() = user_id AND status = 'pending')
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'team_join_requests' AND policyname = 'team_join_requests_delete') THEN
    CREATE POLICY "team_join_requests_delete" ON team_join_requests
    FOR DELETE
    TO authenticated
    USING (
      auth.uid() = user_id
      OR
      (EXISTS (
        SELECT 1 FROM teams t
        JOIN workspaces w ON w.id = t.workspace_id
        WHERE t.id = team_join_requests.team_id
        AND w.owner_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM teams t
        WHERE t.id = team_join_requests.team_id
        AND is_user_workspace_member(t.workspace_id, auth.uid())
        AND user_workspace_role(t.workspace_id, auth.uid()) IN ('admin')
      ))
    );
  END IF;
END $$;

-- =====================================================
-- TEAM_ASSIGNMENT_AUDIT POLICIES (Already in migration 015, but ensure they exist)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'team_assignment_audit' AND policyname = 'team_assignment_audit_insert') THEN
    CREATE POLICY "team_assignment_audit_insert" ON team_assignment_audit
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = performed_by);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'team_assignment_audit' AND policyname = 'team_assignment_audit_select') THEN
    CREATE POLICY "team_assignment_audit_select" ON team_assignment_audit
    FOR SELECT
    TO authenticated
    USING (
      auth.uid() = user_id
      OR auth.uid() = performed_by
      OR
      EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = team_assignment_audit.team_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'leader'
      )
      OR
      EXISTS (
        (SELECT 1 FROM teams t
        JOIN workspaces w ON w.id = t.workspace_id
        WHERE t.id = team_assignment_audit.team_id
        AND w.owner_id = auth.uid())
      ) OR EXISTS (
        SELECT 1 FROM teams t
        WHERE t.id = team_assignment_audit.team_id
        AND is_user_workspace_member(t.workspace_id, auth.uid())
        AND user_workspace_role(t.workspace_id, auth.uid()) IN ('admin')
      )
    );
  END IF;
END $$;

-- =====================================================
-- TASK_ASSIGNEES POLICIES (Already in migration 031, but ensure they exist)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_assignees' AND policyname = 'Users can view task assignees') THEN
    CREATE POLICY "Users can view task assignees" ON task_assignees
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.id = task_assignees.task_id
        AND is_user_workspace_member(p.workspace_id, auth.uid())
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_assignees' AND policyname = 'Leaders can assign users to tasks') THEN
    CREATE POLICY "Leaders can assign users to tasks" ON task_assignees
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM tasks t
        JOIN projects p ON t.project_id = p.id
        JOIN teams tm ON p.team_id = tm.id
        JOIN team_members tmm ON tm.id = tmm.team_id
        WHERE t.id = task_assignees.task_id
        AND tmm.user_id = auth.uid()
        AND (tmm.role = 'leader' OR EXISTS (
          SELECT 1 FROM profiles pr
          WHERE pr.id = auth.uid()
          AND (pr.role = 'instructor' OR pr.role = 'teaching_assistant')
        ))
      )
      AND assigned_by = auth.uid()
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_assignees' AND policyname = 'Leaders can remove task assignees') THEN
    CREATE POLICY "Leaders can remove task assignees" ON task_assignees
    FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM tasks t
        JOIN projects p ON t.project_id = p.id
        JOIN teams tm ON p.team_id = tm.id
        JOIN team_members tmm ON tm.id = tmm.team_id
        WHERE t.id = task_assignees.task_id
        AND tmm.user_id = auth.uid()
        AND (tmm.role = 'leader' OR EXISTS (
          SELECT 1 FROM profiles pr
          WHERE pr.id = auth.uid()
          AND (pr.role = 'instructor' OR pr.role = 'teaching_assistant')
        ))
      )
    );
  END IF;
END $$;

-- =====================================================
-- TASK_ATTACHMENTS POLICIES (Already in migration 030, but ensure they exist)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_attachments' AND policyname = 'Users can view task attachments') THEN
    CREATE POLICY "Users can view task attachments" ON task_attachments
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.id = task_attachments.task_id
        AND is_user_workspace_member(p.workspace_id, auth.uid())
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_attachments' AND policyname = 'Users can upload task attachments') THEN
    CREATE POLICY "Users can upload task attachments" ON task_attachments
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.id = task_attachments.task_id
        AND is_user_workspace_member(p.workspace_id, auth.uid())
      )
      AND user_id = auth.uid()
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_attachments' AND policyname = 'Users can delete task attachments') THEN
    CREATE POLICY "Users can delete task attachments" ON task_attachments
    FOR DELETE
    USING (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM tasks t
        JOIN projects p ON t.project_id = p.id
        JOIN teams tm ON p.team_id = tm.id
        JOIN team_members tmm ON tm.id = tmm.team_id
        WHERE t.id = task_attachments.task_id
        AND (tmm.user_id = auth.uid() AND tmm.role = 'leader')
      )
    );
  END IF;
END $$;

-- =====================================================
-- TASK_SUBTASKS POLICIES (Already in migration 032, but ensure they exist)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_subtasks' AND policyname = 'Users can view task subtasks') THEN
    CREATE POLICY "Users can view task subtasks" ON task_subtasks
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.id = task_subtasks.task_id
        AND is_user_workspace_member(p.workspace_id, auth.uid())
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_subtasks' AND policyname = 'Users can create task subtasks') THEN
    CREATE POLICY "Users can create task subtasks" ON task_subtasks
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.id = task_subtasks.task_id
        AND is_user_workspace_member(p.workspace_id, auth.uid())
      )
      AND created_by = auth.uid()
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_subtasks' AND policyname = 'Users can update task subtasks') THEN
    CREATE POLICY "Users can update task subtasks" ON task_subtasks
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.id = task_subtasks.task_id
        AND is_user_workspace_member(p.workspace_id, auth.uid())
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_subtasks' AND policyname = 'Users can delete task subtasks') THEN
    CREATE POLICY "Users can delete task subtasks" ON task_subtasks
    FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM tasks t
        JOIN projects p ON t.project_id = p.id
        WHERE t.id = task_subtasks.task_id
        AND is_user_workspace_member(p.workspace_id, auth.uid())
      )
    );
  END IF;
END $$;

-- =====================================================
-- REFRESH SCHEMA CACHE
-- =====================================================

-- Refresh PostgREST schema cache to ensure policies are active
NOTIFY pgrst, 'reload schema';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- All tables now have RLS enabled and all policies are ensured to exist.
-- 
-- To verify RLS is enabled:
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND rowsecurity = true;
--
-- To verify policies exist:
-- SELECT tablename, policyname 
-- FROM pg_policies 
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
