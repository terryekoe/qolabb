-- =====================================================
-- Multiple Task Assignees Support
-- Migration: 031_add_multiple_task_assignees.sql
-- =====================================================

-- Create task_assignees table for many-to-many relationship
CREATE TABLE IF NOT EXISTS public.task_assignees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(task_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_assignees_task ON public.task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON public.task_assignees(user_id);

-- Enable RLS
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Policy: Users can view assignees for tasks they can access
CREATE POLICY "Users can view task assignees"
ON public.task_assignees
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON t.project_id = p.id
    JOIN public.workspace_members wm ON p.workspace_id = wm.workspace_id
    WHERE t.id = task_assignees.task_id
    AND wm.user_id = auth.uid()
  )
);

-- Policy: Team leaders and instructors can assign users to tasks
CREATE POLICY "Leaders can assign users to tasks"
ON public.task_assignees
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON t.project_id = p.id
    JOIN public.teams tm ON p.team_id = tm.id
    JOIN public.team_members tmm ON tm.id = tmm.team_id
    WHERE t.id = task_assignees.task_id
    AND tmm.user_id = auth.uid()
    AND (tmm.role = 'leader' OR EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid()
      AND (pr.role = 'instructor' OR pr.role = 'teaching_assistant')
    ))
  )
  AND assigned_by = auth.uid()
);

-- Policy: Team leaders and instructors can remove assignees
CREATE POLICY "Leaders can remove task assignees"
ON public.task_assignees
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON t.project_id = p.id
    JOIN public.teams tm ON p.team_id = tm.id
    JOIN public.team_members tmm ON tm.id = tmm.team_id
    WHERE t.id = task_assignees.task_id
    AND tmm.user_id = auth.uid()
    AND (tmm.role = 'leader' OR EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid()
      AND (pr.role = 'instructor' OR pr.role = 'teaching_assistant')
    ))
  )
);

-- Migrate existing assigned_to data to task_assignees
INSERT INTO public.task_assignees (task_id, user_id, assigned_at)
SELECT id, assigned_to, updated_at
FROM public.tasks
WHERE assigned_to IS NOT NULL
ON CONFLICT (task_id, user_id) DO NOTHING;

-- Add comment to tasks table about deprecated field
COMMENT ON COLUMN public.tasks.assigned_to IS 'DEPRECATED: Use task_assignees table instead. Kept for backward compatibility.';
