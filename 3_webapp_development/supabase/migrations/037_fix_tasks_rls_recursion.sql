-- =====================================================
-- Fix tasks RLS recursion issue
-- Migration: 037_fix_tasks_rls_recursion.sql
-- Description: Fixes infinite recursion in tasks RLS policies by using helper functions
-- =====================================================

-- Create helper function to check if user can manage tasks in a project (bypasses RLS)
CREATE OR REPLACE FUNCTION can_manage_project_tasks(p_project_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  -- SECURITY DEFINER functions bypass RLS by default
  RETURN EXISTS (
    SELECT 1 
    FROM projects p
    JOIN teams t ON t.id = p.team_id
    JOIN workspaces w ON w.id = t.workspace_id
    WHERE p.id = p_project_id
    AND (
      -- User is workspace owner
      w.owner_id = p_user_id
      -- OR user is a team member
      OR EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = t.id
        AND tm.user_id = p_user_id
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION can_manage_project_tasks(UUID, UUID) TO authenticated;

-- Create helper function to check if user can access a task (bypasses RLS)
CREATE OR REPLACE FUNCTION can_access_task(p_task_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  -- SECURITY DEFINER functions bypass RLS by default
  RETURN EXISTS (
    SELECT 1 
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    JOIN teams tm ON tm.id = p.team_id
    WHERE t.id = p_task_id
    AND (
      -- User is assigned to the task (old single assignee)
      t.assigned_to = p_user_id
      -- OR user is assigned via task_assignees
      OR EXISTS (
        SELECT 1 FROM task_assignees ta
        WHERE ta.task_id = p_task_id
        AND ta.user_id = p_user_id
      )
      -- OR user can manage project tasks
      OR can_manage_project_tasks(p.project_id, p_user_id)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION can_access_task(UUID, UUID) TO authenticated;

-- Drop existing policies
DROP POLICY IF EXISTS "tasks_select" ON tasks;
DROP POLICY IF EXISTS "tasks_insert" ON tasks;
DROP POLICY IF EXISTS "tasks_update" ON tasks;
DROP POLICY IF EXISTS "task_assignees_select" ON task_assignees;
DROP POLICY IF EXISTS "task_assignees_insert" ON task_assignees;

-- Recreate tasks policies using helper functions (no recursion)
CREATE POLICY "tasks_select" ON tasks
FOR SELECT TO authenticated
USING (
  -- Use helper function to check access (bypasses RLS, no recursion)
  can_access_task(tasks.id, auth.uid())
  -- OR user can manage the project tasks
  OR can_manage_project_tasks(tasks.project_id, auth.uid())
);

CREATE POLICY "tasks_insert" ON tasks
FOR INSERT TO authenticated
WITH CHECK (
  -- Use helper function to check if user can manage project tasks (bypasses RLS)
  can_manage_project_tasks(tasks.project_id, auth.uid())
);

CREATE POLICY "tasks_update" ON tasks
FOR UPDATE TO authenticated
USING (
  -- Use helper function to check access (bypasses RLS, no recursion)
  can_access_task(tasks.id, auth.uid())
  -- OR user can manage the project tasks
  OR can_manage_project_tasks(tasks.project_id, auth.uid())
)
WITH CHECK (
  -- Same checks for WITH CHECK clause
  can_access_task(tasks.id, auth.uid())
  OR can_manage_project_tasks(tasks.project_id, auth.uid())
);

-- Recreate task_assignees policies using helper functions (no recursion)
CREATE POLICY "task_assignees_select" ON task_assignees
FOR SELECT TO authenticated
USING (
  -- Use helper function to check if user can access the task (bypasses RLS, no recursion)
  can_access_task(task_assignees.task_id, auth.uid())
  -- OR user can manage the project tasks
  OR EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_assignees.task_id
    AND can_manage_project_tasks(t.project_id, auth.uid())
  )
);

CREATE POLICY "task_assignees_insert" ON task_assignees
FOR INSERT TO authenticated
WITH CHECK (
  -- Use helper function to check if user can manage project tasks (bypasses RLS)
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_assignees.task_id
    AND can_manage_project_tasks(t.project_id, auth.uid())
  )
);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

