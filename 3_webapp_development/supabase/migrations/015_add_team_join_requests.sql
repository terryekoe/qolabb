-- =====================================================
-- Migration: 015_add_team_join_requests.sql
-- Description: Adds team join requests functionality for enhanced team assignment
-- =====================================================

-- =====================================================
-- 1. TEAM JOIN REQUESTS TABLE
-- Manages requests to join teams (both self-requests and owner invitations)
-- =====================================================
DROP TABLE IF EXISTS team_join_requests CASCADE;
CREATE TABLE team_join_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  requested_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  request_type TEXT CHECK (request_type IN ('self_request', 'owner_invitation')) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')) DEFAULT 'pending',
  message TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  response_message TEXT,
  UNIQUE(team_id, user_id, status) DEFERRABLE INITIALLY DEFERRED
);

-- Create indexes for efficient queries
CREATE INDEX idx_team_join_requests_team ON team_join_requests(team_id);
CREATE INDEX idx_team_join_requests_user ON team_join_requests(user_id);
CREATE INDEX idx_team_join_requests_status ON team_join_requests(status);
CREATE INDEX idx_team_join_requests_type ON team_join_requests(request_type);
CREATE INDEX idx_team_join_requests_requested_by ON team_join_requests(requested_by);

-- =====================================================
-- 2. TEAM ASSIGNMENT AUDIT LOG
-- Tracks all team assignment activities for audit purposes
-- =====================================================
CREATE TABLE team_assignment_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT CHECK (action IN ('join_request', 'invitation_sent', 'approved', 'rejected', 'cancelled', 'member_added', 'member_removed', 'role_changed')) NOT NULL,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for audit queries
CREATE INDEX idx_team_assignment_audit_team ON team_assignment_audit(team_id);
CREATE INDEX idx_team_assignment_audit_user ON team_assignment_audit(user_id);
CREATE INDEX idx_team_assignment_audit_action ON team_assignment_audit(action);
CREATE INDEX idx_team_assignment_audit_performed_by ON team_assignment_audit(performed_by);
CREATE INDEX idx_team_assignment_audit_created_at ON team_assignment_audit(created_at);

-- =====================================================
-- 3. ADD TEAM SETTINGS
-- Enhance teams table with settings for join requests
-- =====================================================
ALTER TABLE teams ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{"allow_self_join": true, "require_approval": true, "max_members": null}';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Create index for team settings queries
CREATE INDEX idx_teams_is_public ON teams(is_public);

-- =====================================================
-- 4. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE team_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_assignment_audit ENABLE ROW LEVEL SECURITY;

-- Team Join Requests Policies
CREATE POLICY "team_join_requests_insert"
  ON team_join_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Users can create self-requests for teams in their workspace
    (request_type = 'self_request' AND auth.uid() = user_id AND auth.uid() = requested_by
     AND EXISTS (
       SELECT 1 FROM workspace_members wm
       JOIN teams t ON t.workspace_id = wm.workspace_id
       WHERE t.id = team_id AND wm.user_id = auth.uid()
     ))
    OR
    -- Workspace owners/admins can create invitations
    (request_type = 'owner_invitation' AND auth.uid() = requested_by
     AND EXISTS (
       SELECT 1 FROM workspace_members wm
       JOIN teams t ON t.workspace_id = wm.workspace_id
       WHERE t.id = team_id AND wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin')
     ))
  );

CREATE POLICY "team_join_requests_select"
  ON team_join_requests FOR SELECT
  TO authenticated
  USING (
    -- Users can see their own requests
    auth.uid() = user_id
    OR auth.uid() = requested_by
    OR auth.uid() = responded_by
    OR
    -- Team leaders can see requests for their teams
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_join_requests.team_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'leader'
    )
    OR
    -- Workspace owners/admins can see all requests in their workspace
    EXISTS (
      SELECT 1 FROM workspace_members wm
      JOIN teams t ON t.workspace_id = wm.workspace_id
      WHERE t.id = team_join_requests.team_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "team_join_requests_update"
  ON team_join_requests FOR UPDATE
  TO authenticated
  USING (
    -- Team leaders can respond to requests
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_join_requests.team_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'leader'
    )
    OR
    -- Workspace owners/admins can respond to requests
    EXISTS (
      SELECT 1 FROM workspace_members wm
      JOIN teams t ON t.workspace_id = wm.workspace_id
      WHERE t.id = team_join_requests.team_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
    OR
    -- Users can cancel their own pending requests
    (auth.uid() = user_id AND status = 'pending')
  );

CREATE POLICY "team_join_requests_delete"
  ON team_join_requests FOR DELETE
  TO authenticated
  USING (
    -- Users can delete their own cancelled/rejected requests
    auth.uid() = user_id
    OR
    -- Workspace owners/admins can delete requests
    EXISTS (
      SELECT 1 FROM workspace_members wm
      JOIN teams t ON t.workspace_id = wm.workspace_id
      WHERE t.id = team_join_requests.team_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- Team Assignment Audit Policies
CREATE POLICY "team_assignment_audit_insert"
  ON team_assignment_audit FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = performed_by);

CREATE POLICY "team_assignment_audit_select"
  ON team_assignment_audit FOR SELECT
  TO authenticated
  USING (
    -- Users can see audit logs related to themselves
    auth.uid() = user_id
    OR auth.uid() = performed_by
    OR
    -- Team leaders can see audit logs for their teams
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_assignment_audit.team_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'leader'
    )
    OR
    -- Workspace owners/admins can see all audit logs in their workspace
    EXISTS (
      SELECT 1 FROM workspace_members wm
      JOIN teams t ON t.workspace_id = wm.workspace_id
      WHERE t.id = team_assignment_audit.team_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Function to automatically approve join requests when team allows auto-join
CREATE OR REPLACE FUNCTION auto_approve_join_request()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if team allows auto-join (no approval required)
  IF EXISTS (
    SELECT 1 FROM teams 
    WHERE id = NEW.team_id 
    AND (settings->>'require_approval')::boolean = false
  ) THEN
    -- Auto-approve the request
    NEW.status := 'approved';
    NEW.responded_at := NOW();
    NEW.responded_by := NEW.requested_by;
    NEW.response_message := 'Auto-approved (team allows instant joining)';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-approval
CREATE TRIGGER auto_approve_join_request_trigger
  BEFORE INSERT ON team_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_approve_join_request();

-- Function to automatically add member when request is approved
CREATE OR REPLACE FUNCTION add_member_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- If request was just approved, add the user to the team
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    INSERT INTO team_members (team_id, user_id, role)
    VALUES (NEW.team_id, NEW.user_id, 'member')
    ON CONFLICT (team_id, user_id) DO NOTHING;
    
    -- Log the action
    INSERT INTO team_assignment_audit (team_id, user_id, action, performed_by, details)
    VALUES (
      NEW.team_id, 
      NEW.user_id, 
      'member_added', 
      COALESCE(NEW.responded_by, NEW.requested_by),
      jsonb_build_object(
        'request_id', NEW.id,
        'request_type', NEW.request_type,
        'auto_added', true
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-adding members
CREATE TRIGGER add_member_on_approval_trigger
  AFTER UPDATE ON team_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION add_member_on_approval();

-- =====================================================
-- 6. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE team_join_requests IS 'Manages requests to join teams (self-requests and owner invitations)';
COMMENT ON TABLE team_assignment_audit IS 'Audit log for all team assignment activities';
COMMENT ON COLUMN teams.settings IS 'Team settings including join policies and member limits';
COMMENT ON COLUMN teams.is_public IS 'Whether team is visible to all workspace members for joining';