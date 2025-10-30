-- =====================================================
-- Migration: 018_fix_team_join_requests_relationships.sql
-- Description: Fix foreign key relationships in team_join_requests to reference profiles table
-- =====================================================

-- Drop existing foreign key constraints that reference auth.users
ALTER TABLE team_join_requests 
  DROP CONSTRAINT IF EXISTS team_join_requests_user_id_fkey,
  DROP CONSTRAINT IF EXISTS team_join_requests_requested_by_fkey,
  DROP CONSTRAINT IF EXISTS team_join_requests_responded_by_fkey;

-- Add new foreign key constraints that reference profiles table
ALTER TABLE team_join_requests
  ADD CONSTRAINT team_join_requests_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE team_join_requests
  ADD CONSTRAINT team_join_requests_requested_by_fkey
  FOREIGN KEY (requested_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE team_join_requests
  ADD CONSTRAINT team_join_requests_responded_by_fkey
  FOREIGN KEY (responded_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- Also fix team_assignment_audit table for consistency
ALTER TABLE team_assignment_audit
  DROP CONSTRAINT IF EXISTS team_assignment_audit_user_id_fkey,
  DROP CONSTRAINT IF EXISTS team_assignment_audit_performed_by_fkey;

ALTER TABLE team_assignment_audit
  ADD CONSTRAINT team_assignment_audit_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE team_assignment_audit
  ADD CONSTRAINT team_assignment_audit_performed_by_fkey
  FOREIGN KEY (performed_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the new constraints
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
  AND tc.table_name IN ('team_join_requests', 'team_assignment_audit')
ORDER BY tc.table_name, kcu.column_name;