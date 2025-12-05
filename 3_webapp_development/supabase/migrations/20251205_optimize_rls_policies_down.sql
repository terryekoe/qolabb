-- Rollback script for RLS optimization
-- Reverts policies to use standard auth.uid() without caching
-- This restores the previous performance characteristics if the optimization causes issues

-- Projects
DROP POLICY IF EXISTS "Projects are viewable by team members and workspace admins" ON public.projects;
CREATE POLICY "Projects are viewable by team members and workspace admins" ON public.projects
  FOR SELECT USING (
    (team_id IN (
      SELECT team_members.team_id
      FROM team_members
      WHERE (team_members.user_id = auth.uid())
    )) OR (workspace_id IN (
      SELECT workspace_members.workspace_id
      FROM workspace_members
      WHERE ((workspace_members.user_id = auth.uid()) AND (workspace_members.role = 'admin'::text))
    ))
  );

DROP POLICY IF EXISTS "Team members and workspace admins can update projects" ON public.projects;
CREATE POLICY "Team members and workspace admins can update projects" ON public.projects
  FOR UPDATE USING (
    (team_id IN (
      SELECT team_members.team_id
      FROM team_members
      WHERE (team_members.user_id = auth.uid())
    )) OR (workspace_id IN (
      SELECT workspace_members.workspace_id
      FROM workspace_members
      WHERE ((workspace_members.user_id = auth.uid()) AND (workspace_members.role = 'admin'::text))
    ))
  );

DROP POLICY IF EXISTS "Team members can update project content" ON public.projects;
CREATE POLICY "Team members can update project content" ON public.projects
  FOR UPDATE USING (
    team_id IN (
      SELECT team_members.team_id
      FROM team_members
      WHERE team_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "projects_delete" ON public.projects;
CREATE POLICY "projects_delete" ON public.projects
  FOR DELETE USING (
    (workspace_id IN (
      SELECT workspace_members.workspace_id
      FROM workspace_members
      WHERE ((workspace_members.user_id = auth.uid()) AND (workspace_members.role = 'admin'::text))
    ))
  );

-- Motivational Messages
DROP POLICY IF EXISTS "Users can view own messages" ON public.motivational_messages;
CREATE POLICY "Users can view own messages" ON public.motivational_messages
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own messages" ON public.motivational_messages;
CREATE POLICY "Users can update own messages" ON public.motivational_messages
  FOR UPDATE USING (user_id = auth.uid());

-- Evaluation Periods
DROP POLICY IF EXISTS "Team members can view periods" ON public.evaluation_periods;
CREATE POLICY "Team members can view periods" ON public.evaluation_periods
  FOR SELECT USING (
    team_id IN (
      SELECT team_members.team_id
      FROM team_members
      WHERE team_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Team leaders can create periods" ON public.evaluation_periods;
CREATE POLICY "Team leaders can create periods" ON public.evaluation_periods
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_members.team_id
      FROM team_members
      WHERE (team_members.user_id = auth.uid() AND team_members.role = 'leader')
    )
  );

DROP POLICY IF EXISTS "Team leaders can update periods" ON public.evaluation_periods;
CREATE POLICY "Team leaders can update periods" ON public.evaluation_periods
  FOR UPDATE USING (
    team_id IN (
      SELECT team_members.team_id
      FROM team_members
      WHERE (team_members.user_id = auth.uid() AND team_members.role = 'leader')
    )
  );

-- Peer Evaluations
DROP POLICY IF EXISTS "Users can view own evaluations" ON public.peer_evaluations;
CREATE POLICY "Users can view own evaluations" ON public.peer_evaluations
  FOR SELECT USING (
    evaluator_id = auth.uid() OR evaluatee_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can create evaluations" ON public.peer_evaluations;
CREATE POLICY "Users can create evaluations" ON public.peer_evaluations
  FOR INSERT WITH CHECK (evaluator_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own evaluations" ON public.peer_evaluations;
CREATE POLICY "Users can update own evaluations" ON public.peer_evaluations
  FOR UPDATE USING (evaluator_id = auth.uid());

-- Evaluation Responses
DROP POLICY IF EXISTS "Users can view own responses" ON public.evaluation_responses;
CREATE POLICY "Users can view own responses" ON public.evaluation_responses
  FOR SELECT USING (evaluator_id = auth.uid());

DROP POLICY IF EXISTS "Users can create responses" ON public.evaluation_responses;
CREATE POLICY "Users can create responses" ON public.evaluation_responses
  FOR INSERT WITH CHECK (evaluator_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own responses" ON public.evaluation_responses;
CREATE POLICY "Users can update own responses" ON public.evaluation_responses
  FOR UPDATE USING (evaluator_id = auth.uid());

-- Team Members
DROP POLICY IF EXISTS "Team members are viewable by workspace members" ON public.team_members;
CREATE POLICY "Team members are viewable by workspace members" ON public.team_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = (
        SELECT t.workspace_id FROM teams t WHERE t.id = team_members.team_id
      )
      AND wm.user_id = auth.uid()
    )
  );

-- Team Chat Channels
DROP POLICY IF EXISTS "Team members can view channels" ON public.team_chat_channels;
CREATE POLICY "Team members can view channels" ON public.team_chat_channels
  FOR SELECT USING (
    team_id IN (
      SELECT team_members.team_id
      FROM team_members
      WHERE team_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Team leaders can create channels" ON public.team_chat_channels;
CREATE POLICY "Team leaders can create channels" ON public.team_chat_channels
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_members.team_id
      FROM team_members
      WHERE (team_members.user_id = auth.uid() AND team_members.role = 'leader')
    )
  );

DROP POLICY IF EXISTS "Team leaders can update channels" ON public.team_chat_channels;
CREATE POLICY "Team leaders can update channels" ON public.team_chat_channels
  FOR UPDATE USING (
    team_id IN (
      SELECT team_members.team_id
      FROM team_members
      WHERE (team_members.user_id = auth.uid() AND team_members.role = 'leader')
    )
  );

DROP POLICY IF EXISTS "Team leaders can delete channels" ON public.team_chat_channels;
CREATE POLICY "Team leaders can delete channels" ON public.team_chat_channels
  FOR DELETE USING (
    team_id IN (
      SELECT team_members.team_id
      FROM team_members
      WHERE (team_members.user_id = auth.uid() AND team_members.role = 'leader')
    )
  );

-- Team Chat Messages
DROP POLICY IF EXISTS "Team members can view team chat messages" ON public.team_chat_messages;
CREATE POLICY "Team members can view team chat messages" ON public.team_chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_chat_messages.team_id
      AND team_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Team members can create team chat messages" ON public.team_chat_messages;
CREATE POLICY "Team members can create team chat messages" ON public.team_chat_messages
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_chat_messages.team_id
      AND team_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own team chat messages" ON public.team_chat_messages;
CREATE POLICY "Users can update own team chat messages" ON public.team_chat_messages
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own team chat messages" ON public.team_chat_messages;
CREATE POLICY "Users can delete own team chat messages" ON public.team_chat_messages
  FOR DELETE USING (user_id = auth.uid());

-- Project Discussions
DROP POLICY IF EXISTS "Team members can view project discussions" ON public.project_discussions;
CREATE POLICY "Team members can view project discussions" ON public.project_discussions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN team_members tm ON tm.team_id = p.team_id
      WHERE p.id = project_discussions.project_id
      AND tm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Team members can create project discussions" ON public.project_discussions;
CREATE POLICY "Team members can create project discussions" ON public.project_discussions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN team_members tm ON tm.team_id = p.team_id
      WHERE p.id = project_discussions.project_id
      AND tm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own project discussions" ON public.project_discussions;
CREATE POLICY "Users can update own project discussions" ON public.project_discussions
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Team leaders can update project discussions" ON public.project_discussions;
CREATE POLICY "Team leaders can update project discussions" ON public.project_discussions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN team_members tm ON tm.team_id = p.team_id
      WHERE p.id = project_discussions.project_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'leader'
    )
  );

DROP POLICY IF EXISTS "Users can delete own project discussions" ON public.project_discussions;
CREATE POLICY "Users can delete own project discussions" ON public.project_discussions
  FOR DELETE USING (user_id = auth.uid());

-- Project Discussion Comments
DROP POLICY IF EXISTS "Team members can view discussion comments" ON public.project_discussion_comments;
CREATE POLICY "Team members can view discussion comments" ON public.project_discussion_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_discussions pd
      JOIN projects p ON p.id = pd.project_id
      JOIN team_members tm ON tm.team_id = p.team_id
      WHERE pd.id = project_discussion_comments.discussion_id
      AND tm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Team members can create discussion comments" ON public.project_discussion_comments;
CREATE POLICY "Team members can create discussion comments" ON public.project_discussion_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_discussions pd
      JOIN projects p ON p.id = pd.project_id
      JOIN team_members tm ON tm.team_id = p.team_id
      WHERE pd.id = project_discussion_comments.discussion_id
      AND tm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own discussion comments" ON public.project_discussion_comments;
CREATE POLICY "Users can update own discussion comments" ON public.project_discussion_comments
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own discussion comments" ON public.project_discussion_comments;
CREATE POLICY "Users can delete own discussion comments" ON public.project_discussion_comments
  FOR DELETE USING (user_id = auth.uid());

-- Direct Messages
DROP POLICY IF EXISTS "Users can view own direct messages" ON public.direct_messages;
CREATE POLICY "Users can view own direct messages" ON public.direct_messages
  FOR SELECT USING (
    sender_id = auth.uid() OR recipient_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can send direct messages" ON public.direct_messages;
CREATE POLICY "Users can send direct messages" ON public.direct_messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own sent messages" ON public.direct_messages;
CREATE POLICY "Users can update own sent messages" ON public.direct_messages
  FOR UPDATE USING (sender_id = auth.uid());

DROP POLICY IF EXISTS "Users can mark messages as read" ON public.direct_messages;
CREATE POLICY "Users can mark messages as read" ON public.direct_messages
  FOR UPDATE USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own messages" ON public.direct_messages;
CREATE POLICY "Users can delete own messages" ON public.direct_messages
  FOR DELETE USING (sender_id = auth.uid());

-- Team Chat Read Status
DROP POLICY IF EXISTS "Users can view own read status" ON public.team_chat_read_status;
CREATE POLICY "Users can view own read status" ON public.team_chat_read_status
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own read status" ON public.team_chat_read_status;
CREATE POLICY "Users can create own read status" ON public.team_chat_read_status
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- External Integrations
DROP POLICY IF EXISTS "Users can view own integrations" ON public.external_integrations;
CREATE POLICY "Users can view own integrations" ON public.external_integrations
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own integrations" ON public.external_integrations;
CREATE POLICY "Users can create own integrations" ON public.external_integrations
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own integrations" ON public.external_integrations;
CREATE POLICY "Users can update own integrations" ON public.external_integrations
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own integrations" ON public.external_integrations;
CREATE POLICY "Users can delete own integrations" ON public.external_integrations
  FOR DELETE USING (user_id = auth.uid());

-- Linked Repositories
DROP POLICY IF EXISTS "Team members can view linked repos" ON public.linked_repositories;
CREATE POLICY "Team members can view linked repos" ON public.linked_repositories
  FOR SELECT USING (
    team_id IN (
      SELECT team_members.team_id
      FROM team_members
      WHERE team_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Team leaders can manage linked repos" ON public.linked_repositories;
CREATE POLICY "Team leaders can manage linked repos" ON public.linked_repositories
  FOR ALL USING (
    team_id IN (
      SELECT team_members.team_id
      FROM team_members
      WHERE (team_members.user_id = auth.uid() AND team_members.role = 'leader')
    )
  );

-- Linked Documents
DROP POLICY IF EXISTS "Team members can view linked docs" ON public.linked_documents;
CREATE POLICY "Team members can view linked docs" ON public.linked_documents
  FOR SELECT USING (
    team_id IN (
      SELECT team_members.team_id
      FROM team_members
      WHERE team_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Team members can manage linked docs" ON public.linked_documents;
CREATE POLICY "Team members can manage linked docs" ON public.linked_documents
  FOR ALL USING (
    team_id IN (
      SELECT team_members.team_id
      FROM team_members
      WHERE team_members.user_id = auth.uid()
    )
  );

-- Automated Contributions
DROP POLICY IF EXISTS "Users can view automated contributions" ON public.automated_contributions;
CREATE POLICY "Users can view automated contributions" ON public.automated_contributions
  FOR SELECT USING (user_id = auth.uid());

-- Sync History
DROP POLICY IF EXISTS "Users can view own sync history" ON public.sync_history;
CREATE POLICY "Users can view own sync history" ON public.sync_history
  FOR SELECT USING (user_id = auth.uid());

-- Task Submissions
DROP POLICY IF EXISTS "Users can view submissions for their tasks" ON public.task_submissions;
CREATE POLICY "Users can view submissions for their tasks" ON public.task_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_submissions.task_id
      AND (
        t.assignee_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.team_id = t.team_id
          AND tm.user_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can create their own submissions" ON public.task_submissions;
CREATE POLICY "Users can create their own submissions" ON public.task_submissions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_submissions.task_id
      AND t.assignee_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own pending submissions" ON public.task_submissions;
CREATE POLICY "Users can update their own pending submissions" ON public.task_submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_submissions.task_id
      AND t.assignee_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their own pending submissions" ON public.task_submissions;
CREATE POLICY "Users can delete their own pending submissions" ON public.task_submissions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_submissions.task_id
      AND t.assignee_id = auth.uid()
    )
  );

-- Project Submissions
DROP POLICY IF EXISTS "Group leaders can create project submissions" ON public.project_submissions;
CREATE POLICY "Group leaders can create project submissions" ON public.project_submissions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN team_members tm ON tm.team_id = p.team_id
      WHERE p.id = project_submissions.project_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'leader'
    )
  );

DROP POLICY IF EXISTS "Instructors and admins can update project submissions" ON public.project_submissions;
CREATE POLICY "Instructors and admins can update project submissions" ON public.project_submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = project_submissions.project_id
      AND wm.user_id = auth.uid()
      AND (wm.role = 'instructor' OR wm.role = 'admin')
    )
  );

DROP POLICY IF EXISTS "Group leaders can update own submissions" ON public.project_submissions;
CREATE POLICY "Group leaders can update own submissions" ON public.project_submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN team_members tm ON tm.team_id = p.team_id
      WHERE p.id = project_submissions.project_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'leader'
    )
  );

DROP POLICY IF EXISTS "Team members and instructors can view project submissions" ON public.project_submissions;
CREATE POLICY "Team members and instructors can view project submissions" ON public.project_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      LEFT JOIN team_members tm ON tm.team_id = p.team_id AND tm.user_id = auth.uid()
      LEFT JOIN workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
      WHERE p.id = project_submissions.project_id
      AND (
        tm.user_id IS NOT NULL 
        OR (wm.user_id IS NOT NULL AND (wm.role = 'instructor' OR wm.role = 'admin'))
      )
    )
  );
