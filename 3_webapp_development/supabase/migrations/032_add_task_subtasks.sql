-- =====================================================
-- Task Subtasks/Checklist Support
-- Migration: 032_add_task_subtasks.sql
-- =====================================================

-- Create task_subtasks table
CREATE TABLE IF NOT EXISTS public.task_subtasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT false NOT NULL,
  position INTEGER DEFAULT 0 NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_subtasks_task ON public.task_subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_task_subtasks_position ON public.task_subtasks(task_id, position);

-- Enable RLS
ALTER TABLE public.task_subtasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Policy: Users can view subtasks for tasks they can access
CREATE POLICY "Users can view task subtasks"
ON public.task_subtasks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON t.project_id = p.id
    JOIN public.workspace_members wm ON p.workspace_id = wm.workspace_id
    WHERE t.id = task_subtasks.task_id
    AND wm.user_id = auth.uid()
  )
);

-- Policy: Users can create subtasks for tasks they can access
CREATE POLICY "Users can create task subtasks"
ON public.task_subtasks
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON t.project_id = p.id
    JOIN public.workspace_members wm ON p.workspace_id = wm.workspace_id
    WHERE t.id = task_subtasks.task_id
    AND wm.user_id = auth.uid()
  )
  AND created_by = auth.uid()
);

-- Policy: Users can update subtasks for tasks they can access
CREATE POLICY "Users can update task subtasks"
ON public.task_subtasks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON t.project_id = p.id
    JOIN public.workspace_members wm ON p.workspace_id = wm.workspace_id
    WHERE t.id = task_subtasks.task_id
    AND wm.user_id = auth.uid()
  )
);

-- Policy: Users can delete subtasks for tasks they can access
CREATE POLICY "Users can delete task subtasks"
ON public.task_subtasks
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON t.project_id = p.id
    JOIN public.workspace_members wm ON p.workspace_id = wm.workspace_id
    WHERE t.id = task_subtasks.task_id
    AND wm.user_id = auth.uid()
  )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_task_subtasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER task_subtasks_updated_at
  BEFORE UPDATE ON public.task_subtasks
  FOR EACH ROW
  EXECUTE FUNCTION update_task_subtasks_updated_at();
