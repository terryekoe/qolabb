-- =====================================================
-- Fix Contributions RLS Policy
-- =====================================================
-- Issue: Users cannot view their own contributions if they're not team members
-- Solution: Allow users to view their own contributions OR team members to view team contributions

-- Drop existing policy
DROP POLICY IF EXISTS "contributions_select" ON contributions;

-- Create updated policy that allows:
-- 1. Users to view their own contributions
-- 2. Team members to view contributions from their team's projects
CREATE POLICY "contributions_select" ON contributions
FOR SELECT TO authenticated
USING (
  -- User can see their own contributions
  user_id = auth.uid()
  OR
  -- OR user is a team member of the project's team
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = contributions.project_id
    AND is_user_team_member(p.team_id, auth.uid())
  )
);

-- Ensure RLS is enabled
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
