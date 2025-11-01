-- =====================================================
-- Task Attachments Table and Storage Setup
-- Migration: 030_add_task_attachments.sql
-- =====================================================

-- Create task_attachments table
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON public.task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_user ON public.task_attachments(user_id);

-- Enable RLS
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Policy: Users can view attachments for tasks they can access
CREATE POLICY "Users can view task attachments"
ON public.task_attachments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON t.project_id = p.id
    JOIN public.workspace_members wm ON p.workspace_id = wm.workspace_id
    WHERE t.id = task_attachments.task_id
    AND wm.user_id = auth.uid()
  )
);

-- Policy: Users can upload attachments to tasks they can access
CREATE POLICY "Users can upload task attachments"
ON public.task_attachments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON t.project_id = p.id
    JOIN public.workspace_members wm ON p.workspace_id = wm.workspace_id
    WHERE t.id = task_attachments.task_id
    AND wm.user_id = auth.uid()
  )
  AND user_id = auth.uid()
);

-- Policy: Users can delete their own attachments or attachments for tasks they manage
CREATE POLICY "Users can delete task attachments"
ON public.task_attachments
FOR DELETE
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON t.project_id = p.id
    JOIN public.teams tm ON p.team_id = tm.id
    JOIN public.team_members tmm ON tm.id = tmm.team_id
    WHERE t.id = task_attachments.task_id
    AND (tmm.user_id = auth.uid() AND tmm.role = 'leader')
  )
);

-- Create storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-attachments',
  'task-attachments',
  false, -- Private bucket for security
  10485760, -- 10MB limit
  ARRAY[
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv',
    'application/zip', 'application/x-zip-compressed'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760;

-- Storage policies for task-attachments bucket
-- Note: In storage policies, we reference the outer 'name' from storage.objects
-- Using LATERAL join pattern to access outer context variables in subquery

-- Policy: Users can view attachments for tasks they can access
CREATE POLICY "Users can view task attachment files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'task-attachments'
  AND EXISTS (
    SELECT 1 
    FROM public.task_attachments ta
    INNER JOIN public.tasks t ON ta.task_id = t.id
    INNER JOIN public.projects proj ON t.project_id = proj.id
    INNER JOIN public.workspace_members wm ON proj.workspace_id = wm.workspace_id
    WHERE ta.file_path = storage.objects.name
    AND wm.user_id = auth.uid()
  )
);

-- Policy: Users can upload attachments to tasks they can access
CREATE POLICY "Users can upload task attachment files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'task-attachments'
  AND auth.uid() IS NOT NULL
);

-- Policy: Users can delete their own attachments or attachments they manage
CREATE POLICY "Users can delete task attachment files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'task-attachments'
  AND (
    EXISTS (
      SELECT 1 
      FROM public.task_attachments ta
      WHERE ta.file_path = storage.objects.name
      AND ta.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 
      FROM public.task_attachments ta
      INNER JOIN public.tasks t ON ta.task_id = t.id
      INNER JOIN public.projects proj ON t.project_id = proj.id
      INNER JOIN public.teams tm ON proj.team_id = tm.id
      INNER JOIN public.team_members tmm ON tm.id = tmm.team_id
      WHERE ta.file_path = storage.objects.name
      AND (tmm.user_id = auth.uid() AND tmm.role = 'leader')
    )
  )
);
