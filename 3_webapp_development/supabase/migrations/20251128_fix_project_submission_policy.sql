-- Fix RLS policy for project_submissions
-- 1. Make script idempotent (DROP before CREATE)
-- 2. Restrict submission to Group Leaders only (removed Instructor submission)
-- 3. Allow Instructors to grade (UPDATE)
-- 4. Setup Storage

-- ==========================================
-- DATABASE POLICIES
-- ==========================================

-- Drop potential existing policies to avoid "already exists" errors
DROP POLICY IF EXISTS "Group leaders can create project submissions" ON project_submissions;
DROP POLICY IF EXISTS "Group leaders and instructors can create project submissions" ON project_submissions;
DROP POLICY IF EXISTS "Instructors and admins can update project submissions" ON project_submissions;
DROP POLICY IF EXISTS "Group leaders can update own submissions" ON project_submissions;

-- 1. Submission Policy (INSERT)
-- STRICTLY Group Leaders and Workspace Owners/Admins only.
-- Instructors cannot submit (unless they are also admins).
CREATE POLICY "Group leaders can create project submissions"
  ON project_submissions FOR INSERT
  WITH CHECK (
    -- 1. User is a Team Leader for the project's team
    EXISTS (
      SELECT 1 FROM projects p
      JOIN team_members tm ON p.team_id = tm.team_id
      WHERE p.id = project_submissions.project_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'leader'
    )
    OR
    -- 2. User is a Workspace Owner or Admin
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = project_submissions.project_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- 2. Grading Policy (UPDATE)
-- Instructors and Admins can update (grade) submissions
CREATE POLICY "Instructors and admins can update project submissions"
  ON project_submissions FOR UPDATE
  USING (
    -- 1. User is a Workspace Owner or Admin
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = project_submissions.project_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
    OR
    -- 2. User is an Instructor
    EXISTS (
      SELECT 1 FROM profiles pr
      WHERE pr.id = auth.uid()
      AND pr.role IN ('instructor', 'both')
    )
  );

-- 3. Resubmission Policy (UPDATE)
-- Group Leaders can update their own submissions (if not graded yet)
CREATE POLICY "Group leaders can update own submissions"
  ON project_submissions FOR UPDATE
  USING (
    submitted_by = auth.uid()
    AND status != 'graded'
  );

-- ==========================================
-- STORAGE SETUP (Project Submissions)
-- ==========================================

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-submissions', 'project-submissions', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on objects (Usually enabled by default, skipping to avoid permission errors)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing storage policies
DROP POLICY IF EXISTS "View project submissions" ON storage.objects;
DROP POLICY IF EXISTS "Upload project submissions" ON storage.objects;
DROP POLICY IF EXISTS "Manage own project submissions" ON storage.objects;

-- Policy: View submissions (Team Members, Instructors, Admins)
CREATE POLICY "View project submissions"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-submissions'
  AND (
    auth.role() = 'authenticated'
  )
);

-- Policy: Upload submissions (Group Leaders, Instructors)
CREATE POLICY "Upload project submissions"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-submissions'
  AND auth.role() = 'authenticated'
);

-- Policy: Update/Delete own submissions (Group Leaders)
CREATE POLICY "Manage own project submissions"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'project-submissions'
  AND owner = auth.uid()
);
