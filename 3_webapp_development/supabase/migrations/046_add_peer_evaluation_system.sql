-- =====================================================
-- Migration: 046_add_peer_evaluation_system.sql
-- Description: Adds peer evaluation system for team members to provide feedback
-- =====================================================

-- =====================================================
-- 1. EVALUATION PERIODS TABLE
-- Manages evaluation cycles (weekly, mid-term, final, etc.)
-- =====================================================
CREATE TABLE evaluation_periods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  
  period_name TEXT NOT NULL, -- e.g., "Week 5 Evaluation", "Mid-Term Review"
  period_type TEXT CHECK (period_type IN ('weekly', 'mid_term', 'final', 'custom')) NOT NULL,
  
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  
  status TEXT CHECK (status IN ('scheduled', 'active', 'closed', 'cancelled')) DEFAULT 'scheduled',
  
  -- Settings
  is_anonymous BOOLEAN DEFAULT true,
  allow_self_evaluation BOOLEAN DEFAULT false,
  require_all_members BOOLEAN DEFAULT true,
  
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

CREATE INDEX idx_evaluation_periods_team ON evaluation_periods(team_id);
CREATE INDEX idx_evaluation_periods_status ON evaluation_periods(status);
CREATE INDEX idx_evaluation_periods_workspace ON evaluation_periods(workspace_id);

-- =====================================================
-- 2. PEER EVALUATIONS TABLE
-- Stores individual peer evaluation submissions
-- =====================================================
CREATE TABLE peer_evaluations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  evaluatee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  evaluation_period_id UUID REFERENCES evaluation_periods(id) ON DELETE CASCADE NOT NULL,
  
  -- Evaluation Scores (1-5 scale)
  contribution_score INTEGER CHECK (contribution_score >= 1 AND contribution_score <= 5),
  communication_score INTEGER CHECK (communication_score >= 1 AND communication_score <= 5),
  collaboration_score INTEGER CHECK (collaboration_score >= 1 AND collaboration_score <= 5),
  reliability_score INTEGER CHECK (reliability_score >= 1 AND reliability_score <= 5),
  
  -- Calculated overall score
  overall_score NUMERIC(3, 2) GENERATED ALWAYS AS (
    CASE 
      WHEN contribution_score IS NOT NULL AND communication_score IS NOT NULL 
           AND collaboration_score IS NOT NULL AND reliability_score IS NOT NULL
      THEN (contribution_score + communication_score + collaboration_score + reliability_score)::NUMERIC / 4
      ELSE NULL
    END
  ) STORED,
  
  -- Qualitative Feedback
  strengths TEXT,
  areas_for_improvement TEXT,
  additional_comments TEXT,
  
  -- Metadata
  is_anonymous BOOLEAN DEFAULT false,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_evaluation UNIQUE (evaluator_id, evaluatee_id, evaluation_period_id),
  CONSTRAINT no_self_evaluation CHECK (evaluator_id != evaluatee_id)
);

CREATE INDEX idx_peer_evaluations_team ON peer_evaluations(team_id);
CREATE INDEX idx_peer_evaluations_period ON peer_evaluations(evaluation_period_id);
CREATE INDEX idx_peer_evaluations_evaluatee ON peer_evaluations(evaluatee_id);
CREATE INDEX idx_peer_evaluations_evaluator ON peer_evaluations(evaluator_id);

-- =====================================================
-- 3. EVALUATION RESPONSES TABLE
-- Tracks who has completed evaluations (for progress tracking)
-- =====================================================
CREATE TABLE evaluation_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluation_period_id UUID REFERENCES evaluation_periods(id) ON DELETE CASCADE NOT NULL,
  evaluator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  evaluatee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  peer_evaluation_id UUID REFERENCES peer_evaluations(id) ON DELETE SET NULL,
  
  status TEXT CHECK (status IN ('pending', 'in_progress', 'submitted', 'reminded')) DEFAULT 'pending',
  reminder_sent_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_response UNIQUE (evaluation_period_id, evaluator_id, evaluatee_id)
);

CREATE INDEX idx_evaluation_responses_period ON evaluation_responses(evaluation_period_id);
CREATE INDEX idx_evaluation_responses_evaluator ON evaluation_responses(evaluator_id);
CREATE INDEX idx_evaluation_responses_status ON evaluation_responses(status);

-- =====================================================
-- 4. RLS POLICIES - EVALUATION PERIODS
-- =====================================================
ALTER TABLE evaluation_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view periods" ON evaluation_periods
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE t.id = evaluation_periods.team_id
    AND tm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = evaluation_periods.workspace_id
    AND w.owner_id = auth.uid()
  )
);

CREATE POLICY "Team leaders can create periods" ON evaluation_periods
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE t.id = evaluation_periods.team_id
    AND tm.user_id = auth.uid()
    AND tm.role = 'leader'
  )
  OR EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = evaluation_periods.workspace_id
    AND w.owner_id = auth.uid()
  )
);

CREATE POLICY "Team leaders can update periods" ON evaluation_periods
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE t.id = evaluation_periods.team_id
    AND tm.user_id = auth.uid()
    AND tm.role = 'leader'
  )
  OR EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = evaluation_periods.workspace_id
    AND w.owner_id = auth.uid()
  )
);

-- =====================================================
-- 5. RLS POLICIES - PEER EVALUATIONS
-- =====================================================
ALTER TABLE peer_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own evaluations" ON peer_evaluations
FOR SELECT TO authenticated
USING (
  evaluator_id = auth.uid() 
  OR evaluatee_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE t.id = peer_evaluations.team_id
    AND tm.user_id = auth.uid()
    AND tm.role = 'leader'
  )
);

CREATE POLICY "Users can create evaluations" ON peer_evaluations
FOR INSERT TO authenticated
WITH CHECK (
  evaluator_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE t.id = peer_evaluations.team_id
    AND tm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own evaluations" ON peer_evaluations
FOR UPDATE TO authenticated
USING (evaluator_id = auth.uid())
WITH CHECK (evaluator_id = auth.uid());

-- =====================================================
-- 6. RLS POLICIES - EVALUATION RESPONSES
-- =====================================================
ALTER TABLE evaluation_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own responses" ON evaluation_responses
FOR SELECT TO authenticated
USING (
  evaluator_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM evaluation_periods ep
    JOIN teams t ON t.id = ep.team_id
    JOIN team_members tm ON tm.team_id = t.id
    WHERE ep.id = evaluation_responses.evaluation_period_id
    AND tm.user_id = auth.uid()
    AND tm.role = 'leader'
  )
);

CREATE POLICY "Users can create responses" ON evaluation_responses
FOR INSERT TO authenticated
WITH CHECK (evaluator_id = auth.uid());

CREATE POLICY "Users can update own responses" ON evaluation_responses
FOR UPDATE TO authenticated
USING (evaluator_id = auth.uid())
WITH CHECK (evaluator_id = auth.uid());

-- =====================================================
-- 7. HELPER FUNCTION: Create Evaluation Period with Responses
-- =====================================================
CREATE OR REPLACE FUNCTION create_evaluation_period_with_responses(
  p_team_id UUID,
  p_workspace_id UUID,
  p_period_name TEXT,
  p_period_type TEXT,
  p_start_date DATE,
  p_end_date DATE,
  p_due_date TIMESTAMPTZ,
  p_is_anonymous BOOLEAN DEFAULT true,
  p_created_by UUID DEFAULT auth.uid()
) RETURNS UUID AS $$
DECLARE
  period_id UUID;
  team_member RECORD;
BEGIN
  -- Create evaluation period
  INSERT INTO evaluation_periods (
    team_id, workspace_id, period_name, period_type,
    start_date, end_date, due_date, is_anonymous, created_by, status
  ) VALUES (
    p_team_id, p_workspace_id, p_period_name, p_period_type,
    p_start_date, p_end_date, p_due_date, p_is_anonymous, p_created_by, 'active'
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

GRANT EXECUTE ON FUNCTION create_evaluation_period_with_responses(UUID, UUID, TEXT, TEXT, DATE, DATE, TIMESTAMPTZ, BOOLEAN, UUID) TO authenticated;

-- =====================================================
-- Migration Complete
-- =====================================================
