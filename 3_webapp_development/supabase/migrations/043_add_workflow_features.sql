-- Add task triage status
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS triage_status TEXT CHECK (triage_status IN ('inbox', 'triage', 'working')) DEFAULT 'inbox';

-- Add WIP limit to user preferences (stored in profiles or separate preferences table)
-- For now, we'll add it to profiles as a JSON field for preferences
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

-- Create weekly retrospectives table
CREATE TABLE IF NOT EXISTS weekly_retrospectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  responses JSONB NOT NULL,
  completed_by UUID REFERENCES profiles(id),
  week_start_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, week_start_date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_weekly_retros_team_id ON weekly_retrospectives(team_id);
CREATE INDEX IF NOT EXISTS idx_weekly_retros_week_start ON weekly_retrospectives(week_start_date);

-- Create decisions/decision log table
CREATE TABLE IF NOT EXISTS decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  decided_by UUID REFERENCES profiles(id),
  decision_date TIMESTAMPTZ DEFAULT NOW(),
  status TEXT CHECK (status IN ('active', 'superseded', 'archived')) DEFAULT 'active',
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for decisions
CREATE INDEX IF NOT EXISTS idx_decisions_team_id ON decisions(team_id);
CREATE INDEX IF NOT EXISTS idx_decisions_project_id ON decisions(project_id);
CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(status);

-- Create participation alerts table (for proactive alerts)
CREATE TABLE IF NOT EXISTS participation_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('workload_imbalance', 'low_participation', 'overloaded', 'underutilized')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  affected_user_ids UUID[],
  recommendations JSONB,
  status TEXT CHECK (status IN ('active', 'dismissed', 'resolved')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ
);

-- Create indexes for alerts
CREATE INDEX IF NOT EXISTS idx_participation_alerts_workspace ON participation_alerts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_participation_alerts_team ON participation_alerts(team_id);
CREATE INDEX IF NOT EXISTS idx_participation_alerts_status ON participation_alerts(status);
CREATE INDEX IF NOT EXISTS idx_participation_alerts_type ON participation_alerts(alert_type);

-- RLS Policies for new tables
ALTER TABLE weekly_retrospectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participation_alerts ENABLE ROW LEVEL SECURITY;

-- Weekly retrospectives: team members can view their team's retros
CREATE POLICY weekly_retros_select ON weekly_retrospectives
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = weekly_retrospectives.team_id
      AND tm.user_id = (SELECT auth.uid())
    )
  );

-- Weekly retrospectives: team members can create retros
CREATE POLICY weekly_retros_insert ON weekly_retrospectives
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = weekly_retrospectives.team_id
      AND tm.user_id = (SELECT auth.uid())
    )
  );

-- Decisions: team members can view their team's decisions
CREATE POLICY decisions_select ON decisions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = decisions.team_id
      AND tm.user_id = (SELECT auth.uid())
    )
  );

-- Decisions: team members can create decisions
CREATE POLICY decisions_insert ON decisions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = decisions.team_id
      AND tm.user_id = (SELECT auth.uid())
    )
  );

-- Participation alerts: workspace members can view alerts for their workspace
CREATE POLICY participation_alerts_select ON participation_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = participation_alerts.workspace_id
      AND wm.user_id = (SELECT auth.uid())
    )
  );

-- Participation alerts: system can create alerts (via service role)
-- This would typically be done through a service role or trigger
