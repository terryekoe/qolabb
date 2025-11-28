-- Create project_submissions table for final assignment submission
-- This allows the Group Leader to submit the entire project to the Instructor

CREATE TABLE IF NOT EXISTS project_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  submitted_by UUID REFERENCES profiles(id),
  
  -- Submission content
  content TEXT, -- URL or description
  resources JSONB DEFAULT '[]'::jsonb, -- Array of attached resources/files
  
  -- Status
  status TEXT CHECK (status IN ('submitted', 'graded', 'returned')) DEFAULT 'submitted',
  
  -- Grading
  grade NUMERIC,
  feedback TEXT,
  graded_by UUID REFERENCES profiles(id),
  graded_at TIMESTAMPTZ,
  
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_project_submissions_project_id ON project_submissions(project_id);
CREATE INDEX idx_project_submissions_submitted_by ON project_submissions(submitted_by);

-- RLS Policies
ALTER TABLE project_submissions ENABLE ROW LEVEL SECURITY;

-- Members of the team can view submissions
CREATE POLICY "Team members can view project submissions"
  ON project_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN team_members tm ON p.team_id = tm.team_id
      WHERE p.id = project_submissions.project_id
      AND tm.user_id = auth.uid()
    )
  );

-- Only Group Leaders (or Instructors) can create submissions
CREATE POLICY "Group leaders can create project submissions"
  ON project_submissions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN team_members tm ON p.team_id = tm.team_id
      WHERE p.id = project_submissions.project_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'leader'
    )
    OR
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = project_submissions.project_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- Add comment
COMMENT ON TABLE project_submissions IS 'Final project submissions made by Group Leaders to Instructors';
