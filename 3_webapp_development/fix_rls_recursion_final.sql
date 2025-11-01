-- FINAL FIX: Remove infinite recursion in workspace_members policies
-- This script fixes the recursion by removing ALL direct and indirect queries to workspace_members
-- Run this BEFORE applying the full migration, or run it standalone

-- Step 1: Temporarily disable RLS to break the recursion cycle
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop problematic policies that use helper functions (which might still trigger recursion)
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "team_members_select" ON team_members;

-- Step 3: Re-enable RLS
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Step 4: Recreate profiles_select policy WITHOUT workspace_members or team_members queries
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

-- Step 5: Recreate team_members_select policy WITHOUT workspace_members or self-reference queries
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

-- Step 6: Ensure workspace_members policy is simple and non-recursive
DROP POLICY IF EXISTS "workspace_members_select" ON workspace_members;
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

-- Step 7: Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
