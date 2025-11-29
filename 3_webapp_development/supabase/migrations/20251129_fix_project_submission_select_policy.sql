-- Fix SELECT policy for project_submissions to allow Instructors (Workspace Owners/Admins) to view
-- Currently only team members can view, which hides submissions from instructors.

DROP POLICY IF EXISTS "Team members can view project submissions" ON project_submissions;
DROP POLICY IF EXISTS "Team members and instructors can view project submissions" ON project_submissions;

CREATE POLICY "Team members and instructors can view project submissions"
  ON project_submissions FOR SELECT
  USING (
    -- 1. User is a Team Member
    EXISTS (
      SELECT 1 FROM projects p
      JOIN team_members tm ON p.team_id = tm.team_id
      WHERE p.id = project_submissions.project_id
      AND tm.user_id = auth.uid()
    )
    OR
    -- 2. User is a Workspace Owner or Admin (Instructor)
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = project_submissions.project_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
    OR
    -- 3. User is an Instructor (Global Role)
    EXISTS (
      SELECT 1 FROM profiles pr
      WHERE pr.id = auth.uid()
      AND pr.role IN ('instructor', 'both')
    )
  );
