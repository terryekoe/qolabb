-- =====================================================
-- Qolabb Row Level Security (RLS) Policies
-- Migration: 002_rls_policies.sql
-- Description: Sets up security policies for all tables
-- =====================================================

-- =====================================================
-- 1. PROFILES TABLE RLS
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view all profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- =====================================================
-- 2. WORKSPACES TABLE RLS
-- =====================================================

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Users can view workspaces they're members of
CREATE POLICY "Workspaces are viewable by members"
  ON workspaces FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM workspace_members WHERE workspace_id = id
    )
  );

-- Users can create workspaces
CREATE POLICY "Users can create workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Workspace owners and admins can update
CREATE POLICY "Workspace owners and admins can update"
  ON workspaces FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM workspace_members 
      WHERE workspace_id = id 
      AND role IN ('owner', 'admin')
    )
  );

-- Workspace owners can delete
CREATE POLICY "Workspace owners can delete"
  ON workspaces FOR DELETE
  USING (auth.uid() = owner_id);

-- =====================================================
-- 3. WORKSPACE MEMBERS TABLE RLS
-- =====================================================

ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Members can view other members in their workspace
CREATE POLICY "Workspace members are viewable by workspace members"
  ON workspace_members FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM workspace_members WHERE workspace_id = workspace_members.workspace_id
    )
  );

-- Admins and owners can add members
CREATE POLICY "Workspace admins can add members"
  ON workspace_members FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM workspace_members 
      WHERE workspace_id = workspace_members.workspace_id 
      AND role IN ('owner', 'admin')
    )
    OR auth.uid() = user_id -- Users can join workspace with invite code
  );

-- Admins can update member roles
CREATE POLICY "Workspace admins can update members"
  ON workspace_members FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM workspace_members 
      WHERE workspace_id = workspace_members.workspace_id 
      AND role IN ('owner', 'admin')
    )
  );

-- Members can remove themselves, admins can remove others
CREATE POLICY "Members can leave or be removed by admins"
  ON workspace_members FOR DELETE
  USING (
    auth.uid() = user_id
    OR auth.uid() IN (
      SELECT user_id FROM workspace_members 
      WHERE workspace_id = workspace_members.workspace_id 
      AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- 4. TEAMS TABLE RLS
-- =====================================================

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Teams are viewable by workspace members
CREATE POLICY "Teams are viewable by workspace members"
  ON teams FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM workspace_members WHERE workspace_id = teams.workspace_id
    )
  );

-- Workspace members can create teams
CREATE POLICY "Workspace members can create teams"
  ON teams FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM workspace_members WHERE workspace_id = workspace_id
    )
  );

-- Team leaders and workspace admins can update teams
CREATE POLICY "Team leaders and workspace admins can update teams"
  ON teams FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM team_members 
      WHERE team_id = id AND role = 'leader'
    )
    OR auth.uid() IN (
      SELECT user_id FROM workspace_members 
      WHERE workspace_id = teams.workspace_id 
      AND role IN ('owner', 'admin')
    )
  );

-- Team leaders and workspace admins can delete teams
CREATE POLICY "Team leaders and workspace admins can delete teams"
  ON teams FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM team_members 
      WHERE team_id = id AND role = 'leader'
    )
    OR auth.uid() IN (
      SELECT user_id FROM workspace_members 
      WHERE workspace_id = teams.workspace_id 
      AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- 5. TEAM MEMBERS TABLE RLS
-- =====================================================

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Team members are viewable by workspace members
CREATE POLICY "Team members are viewable by workspace members"
  ON team_members FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM workspace_members 
      WHERE workspace_id = (
        SELECT workspace_id FROM teams WHERE id = team_members.team_id
      )
    )
  );

-- Team leaders can add members
CREATE POLICY "Team leaders can add members"
  ON team_members FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM team_members 
      WHERE team_id = team_members.team_id AND role = 'leader'
    )
    OR auth.uid() = user_id -- Users can join teams
  );

-- Team leaders can update member roles
CREATE POLICY "Team leaders can update members"
  ON team_members FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM team_members 
      WHERE team_id = team_members.team_id AND role = 'leader'
    )
  );

-- Members can leave, team leaders can remove members
CREATE POLICY "Members can leave or be removed"
  ON team_members FOR DELETE
  USING (
    auth.uid() = user_id
    OR auth.uid() IN (
      SELECT user_id FROM team_members 
      WHERE team_id = team_members.team_id AND role = 'leader'
    )
  );

-- =====================================================
-- 6. PROJECTS TABLE RLS
-- =====================================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Projects are viewable by team members
CREATE POLICY "Projects are viewable by team members"
  ON projects FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM team_members WHERE team_id = projects.team_id
    )
  );

-- Team members can create projects
CREATE POLICY "Team members can create projects"
  ON projects FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM team_members WHERE team_id = team_id
    )
  );

-- Team members can update projects
CREATE POLICY "Team members can update projects"
  ON projects FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM team_members WHERE team_id = projects.team_id
    )
  );

-- Team leaders can delete projects
CREATE POLICY "Team leaders can delete projects"
  ON projects FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM team_members 
      WHERE team_id = projects.team_id AND role = 'leader'
    )
  );

-- =====================================================
-- 7. TASKS TABLE RLS
-- =====================================================

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Tasks are viewable by team members
CREATE POLICY "Tasks are viewable by team members"
  ON tasks FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM team_members 
      WHERE team_id = (
        SELECT team_id FROM projects WHERE id = tasks.project_id
      )
    )
  );

-- Team members can create tasks
CREATE POLICY "Team members can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM team_members 
      WHERE team_id = (
        SELECT team_id FROM projects WHERE id = project_id
      )
    )
  );

-- Assigned users and team leaders can update tasks
CREATE POLICY "Assigned users and team leaders can update tasks"
  ON tasks FOR UPDATE
  USING (
    auth.uid() = assigned_to
    OR auth.uid() IN (
      SELECT user_id FROM team_members 
      WHERE team_id = (
        SELECT team_id FROM projects WHERE id = tasks.project_id
      ) AND role = 'leader'
    )
  );

-- Team leaders can delete tasks
CREATE POLICY "Team leaders can delete tasks"
  ON tasks FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM team_members 
      WHERE team_id = (
        SELECT team_id FROM projects WHERE id = tasks.project_id
      ) AND role = 'leader'
    )
  );

-- =====================================================
-- 8. CONTRIBUTIONS TABLE RLS
-- =====================================================

ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;

-- Contributions are viewable by team members
CREATE POLICY "Contributions are viewable by team members"
  ON contributions FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM team_members 
      WHERE team_id = (
        SELECT team_id FROM projects WHERE id = contributions.project_id
      )
    )
  );

-- Users can create their own contributions
CREATE POLICY "Users can create their own contributions"
  ON contributions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own contributions
CREATE POLICY "Users can update their own contributions"
  ON contributions FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own contributions
CREATE POLICY "Users can delete their own contributions"
  ON contributions FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 9. ACTIVITY LOG TABLE RLS
-- =====================================================

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Activity log is viewable by workspace members
CREATE POLICY "Activity log is viewable by workspace members"
  ON activity_log FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM workspace_members WHERE workspace_id = activity_log.workspace_id
    )
  );

-- Users can create activity logs
CREATE POLICY "Users can create activity logs"
  ON activity_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No updates or deletes allowed on activity log
-- (Activity log is append-only for audit purposes)
