-- =====================================================
-- Migration: 048_add_project_to_evaluations.sql
-- Description: Adds project_id to evaluation_periods and updates related functions
-- =====================================================

-- Add project_id column to evaluation_periods (optional - can be NULL for general team evaluations)
ALTER TABLE evaluation_periods 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_evaluation_periods_project ON evaluation_periods(project_id);

-- Update the function to accept and use project_id
CREATE OR REPLACE FUNCTION create_evaluation_period_with_responses(
  p_team_id UUID,
  p_workspace_id UUID,
  p_period_name TEXT,
  p_period_type TEXT,
  p_start_date DATE,
  p_end_date DATE,
  p_due_date TIMESTAMPTZ,
  p_is_anonymous BOOLEAN DEFAULT true,
  p_created_by UUID DEFAULT auth.uid(),
  p_project_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  period_id UUID;
  team_member RECORD;
BEGIN
  -- Create evaluation period
  INSERT INTO evaluation_periods (
    team_id, workspace_id, period_name, period_type,
    start_date, end_date, due_date, is_anonymous, created_by, status, project_id
  ) VALUES (
    p_team_id, p_workspace_id, p_period_name, p_period_type,
    p_start_date, p_end_date, p_due_date, p_is_anonymous, p_created_by, 'active', p_project_id
  )
  RETURNING id INTO period_id;
  
  -- Create evaluation responses for all team member pairs
  FOR team_member IN 
    SELECT user_id FROM team_members WHERE team_id = p_team_id
  LOOP
    INSERT INTO evaluation_responses (
      evaluation_period_id, evaluator_id, evaluatee_id, status
    )
    SELECT 
      period_id,
      team_member.user_id,
      other_member.user_id,
      'pending'
    FROM team_members other_member
    WHERE other_member.team_id = p_team_id
    AND other_member.user_id != team_member.user_id;
  END LOOP;
  
  RETURN period_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
