-- Add task submissions table for URL-based submissions with auto-verification
-- Students submit links to their work (GitHub, Google Docs, etc.)
-- System automatically verifies accessibility and extracts metadata

CREATE TABLE IF NOT EXISTS task_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  submitted_by UUID REFERENCES profiles(id),
  
  -- Submission data
  url TEXT NOT NULL,
  notes TEXT,
  
  -- Auto-verification
  url_type TEXT CHECK (url_type IN ('github', 'google_docs', 'google_sheets', 'other')),
  verification_status TEXT CHECK (verification_status IN ('verified', 'failed', 'pending')) DEFAULT 'pending',
  verification_data JSONB,
  verification_error TEXT,
  
  -- Manual review
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  feedback TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_task_submissions_task_id ON task_submissions(task_id);
CREATE INDEX idx_task_submissions_submitted_by ON task_submissions(submitted_by);
CREATE INDEX idx_task_submissions_status ON task_submissions(status);
CREATE INDEX idx_task_submissions_verification_status ON task_submissions(verification_status);

-- Enable Row Level Security
ALTER TABLE task_submissions ENABLE ROW LEVEL SECURITY;

-- Users can view submissions for tasks in their projects
CREATE POLICY "Users can view submissions for their tasks"
  ON task_submissions FOR SELECT
  USING (
    submitted_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN team_members tm ON p.team_id = tm.team_id
      WHERE t.id = task_submissions.task_id
      AND tm.user_id = auth.uid()
    )
  );

-- Users can create their own submissions
CREATE POLICY "Users can create their own submissions"
  ON task_submissions FOR INSERT
  WITH CHECK (submitted_by = auth.uid());

-- Users can update their own pending submissions
CREATE POLICY "Users can update their own pending submissions"
  ON task_submissions FOR UPDATE
  USING (
    submitted_by = auth.uid() AND status = 'pending'
  );

-- Users can delete their own pending submissions
CREATE POLICY "Users can delete their own pending submissions"
  ON task_submissions FOR DELETE
  USING (
    submitted_by = auth.uid() AND status = 'pending'
  );

-- Add comment to document the structure
COMMENT ON TABLE task_submissions IS 'URL-based task submissions with auto-verification for GitHub and Google Workspace links';
COMMENT ON COLUMN task_submissions.verification_data IS 'JSONB containing metadata from GitHub/Google APIs (commits, last_updated, etc.)';
