-- Add work_content field to tasks table for students to write their work output
-- This allows students to type their actual work directly in the task

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS work_content TEXT;

-- Add index for faster lookups when viewing completed work
CREATE INDEX IF NOT EXISTS idx_tasks_work_content ON tasks(id) WHERE work_content IS NOT NULL;

COMMENT ON COLUMN tasks.work_content IS 'The actual work output written by the student for this task';
