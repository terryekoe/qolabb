-- =====================================================
-- Add Missing Foreign Key Constraints
-- This migration adds foreign key constraints that are needed
-- for PostgREST relationship queries to work properly
-- =====================================================

-- Add foreign key constraint from team_members.user_id to profiles.id
ALTER TABLE team_members
  DROP CONSTRAINT IF EXISTS team_members_user_id_fkey,
  ADD CONSTRAINT team_members_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES profiles(id)
  ON DELETE CASCADE;

-- Add foreign key constraint from workspace_members.user_id to profiles.id
ALTER TABLE workspace_members
  DROP CONSTRAINT IF EXISTS workspace_members_user_id_fkey,
  ADD CONSTRAINT workspace_members_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES profiles(id)
  ON DELETE CASCADE;

-- Add foreign key constraint from contributions.user_id to profiles.id
ALTER TABLE contributions
  DROP CONSTRAINT IF EXISTS contributions_user_id_fkey,
  ADD CONSTRAINT contributions_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES profiles(id)
  ON DELETE CASCADE;

-- Add foreign key constraint from activity_log.user_id to profiles.id
ALTER TABLE activity_log
  DROP CONSTRAINT IF EXISTS activity_log_user_id_fkey,
  ADD CONSTRAINT activity_log_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES profiles(id)
  ON DELETE CASCADE;

-- Add foreign key constraint from tasks.assigned_to to profiles.id
ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey,
  ADD CONSTRAINT tasks_assigned_to_fkey
  FOREIGN KEY (assigned_to)
  REFERENCES profiles(id)
  ON DELETE SET NULL;

-- Add foreign key constraint from tasks.created_by to profiles.id
ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_created_by_fkey,
  ADD CONSTRAINT tasks_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES profiles(id)
  ON DELETE SET NULL;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Verify all constraints were added
SELECT
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('team_members', 'workspace_members', 'activity_log', 'contributions', 'tasks')
  AND kcu.column_name IN ('user_id', 'assigned_to', 'created_by')
ORDER BY tc.table_name, kcu.column_name;
