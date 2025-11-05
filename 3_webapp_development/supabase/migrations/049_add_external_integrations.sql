-- =====================================================
-- Migration: 049_add_external_integrations.sql
-- Description: Adds tables for GitHub and Google Docs integration
-- =====================================================

-- =====================================================
-- 1. EXTERNAL INTEGRATIONS TABLE
-- Stores OAuth tokens and connection info for external platforms
-- =====================================================
CREATE TABLE IF NOT EXISTS external_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  
  -- Integration Type
  platform TEXT NOT NULL CHECK (platform IN ('github', 'google_docs', 'google_drive')),
  
  -- OAuth Credentials (encrypted at application level)
  access_token TEXT NOT NULL, -- Should be encrypted in production
  refresh_token TEXT, -- For Google OAuth
  token_expires_at TIMESTAMPTZ,
  
  -- Platform-specific data
  external_user_id TEXT, -- GitHub username, Google email, etc.
  external_username TEXT, -- Display name
  external_avatar_url TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}', -- Store additional platform-specific info
  is_active BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT CHECK (sync_status IN ('active', 'error', 'paused')) DEFAULT 'active',
  sync_error TEXT, -- Last error message if sync failed
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Ensure one integration per user per platform per workspace
  UNIQUE(user_id, platform, workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_external_integrations_user ON external_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_external_integrations_workspace ON external_integrations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_external_integrations_team ON external_integrations(team_id);
CREATE INDEX IF NOT EXISTS idx_external_integrations_platform ON external_integrations(platform);
CREATE INDEX IF NOT EXISTS idx_external_integrations_active ON external_integrations(is_active) WHERE is_active = TRUE;

-- =====================================================
-- 2. LINKED REPOSITORIES TABLE
-- Links GitHub repositories to projects
-- =====================================================
CREATE TABLE IF NOT EXISTS linked_repositories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  integration_id UUID REFERENCES external_integrations(id) ON DELETE CASCADE NOT NULL,
  
  -- Repository Info
  repository_full_name TEXT NOT NULL, -- e.g., "username/repo-name"
  repository_id TEXT NOT NULL, -- GitHub repository ID
  repository_url TEXT NOT NULL,
  is_private BOOLEAN DEFAULT FALSE,
  
  -- Sync Settings
  auto_sync BOOLEAN DEFAULT TRUE,
  sync_commits BOOLEAN DEFAULT TRUE,
  sync_pull_requests BOOLEAN DEFAULT TRUE,
  sync_issues BOOLEAN DEFAULT TRUE,
  
  -- Webhook Info (for GitHub)
  webhook_id TEXT, -- GitHub webhook ID
  webhook_secret TEXT, -- Webhook secret for verification
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  last_synced_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(project_id, repository_full_name)
);

CREATE INDEX IF NOT EXISTS idx_linked_repos_project ON linked_repositories(project_id);
CREATE INDEX IF NOT EXISTS idx_linked_repos_integration ON linked_repositories(integration_id);
CREATE INDEX IF NOT EXISTS idx_linked_repos_auto_sync ON linked_repositories(auto_sync) WHERE auto_sync = TRUE;

-- =====================================================
-- 3. LINKED DOCUMENTS TABLE
-- Links Google Docs to projects
-- =====================================================
CREATE TABLE IF NOT EXISTS linked_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  integration_id UUID REFERENCES external_integrations(id) ON DELETE CASCADE NOT NULL,
  
  -- Document Info
  document_id TEXT NOT NULL, -- Google Docs document ID
  document_name TEXT NOT NULL,
  document_url TEXT NOT NULL,
  document_type TEXT CHECK (document_type IN ('document', 'spreadsheet', 'presentation')) DEFAULT 'document',
  
  -- Sync Settings
  auto_sync BOOLEAN DEFAULT TRUE,
  sync_edits BOOLEAN DEFAULT TRUE,
  sync_comments BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  last_synced_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(project_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_linked_docs_project ON linked_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_linked_docs_integration ON linked_documents(integration_id);
CREATE INDEX IF NOT EXISTS idx_linked_docs_auto_sync ON linked_documents(auto_sync) WHERE auto_sync = TRUE;

-- =====================================================
-- 4. AUTOMATED CONTRIBUTIONS TABLE
-- Stores contributions automatically captured from external sources
-- =====================================================
CREATE TABLE IF NOT EXISTS automated_contributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Link to existing contribution (if merged with manual entry)
  contribution_id UUID REFERENCES contributions(id) ON DELETE SET NULL,
  
  -- Source Info
  source_platform TEXT NOT NULL CHECK (source_platform IN ('github', 'google_docs')),
  source_id TEXT NOT NULL, -- External ID (commit SHA, revision ID, etc.)
  source_type TEXT NOT NULL, -- 'commit', 'pull_request', 'issue', 'edit', 'comment'
  
  -- Project/User Info
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  
  -- Contribution Data
  title TEXT NOT NULL,
  description TEXT,
  contribution_type TEXT CHECK (contribution_type IN ('code', 'documentation', 'research', 'design', 'meeting', 'other')) DEFAULT 'other',
  
  -- Metrics (automatically calculated)
  lines_added INTEGER DEFAULT 0,
  lines_removed INTEGER DEFAULT 0,
  files_changed INTEGER DEFAULT 0,
  characters_added INTEGER DEFAULT 0, -- For Google Docs
  characters_removed INTEGER DEFAULT 0, -- For Google Docs
  hours_spent NUMERIC(5,2) CHECK (hours_spent >= 0),
  
  -- Timestamps
  external_created_at TIMESTAMPTZ NOT NULL, -- When it happened on external platform
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Metadata from external source
  metadata JSONB DEFAULT '{}', -- Store full API response, commit details, etc.
  
  -- Status
  is_merged BOOLEAN DEFAULT FALSE, -- If merged with manual contribution
  is_verified BOOLEAN DEFAULT FALSE, -- User can verify accuracy
  
  UNIQUE(source_platform, source_id) -- Prevent duplicate captures
);

CREATE INDEX IF NOT EXISTS idx_automated_contrib_project ON automated_contributions(project_id);
CREATE INDEX IF NOT EXISTS idx_automated_contrib_user ON automated_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_automated_contrib_source ON automated_contributions(source_platform, source_id);
CREATE INDEX IF NOT EXISTS idx_automated_contrib_created ON automated_contributions(created_at DESC);

-- =====================================================
-- 5. SYNC HISTORY TABLE
-- Track sync operations and their results
-- =====================================================
CREATE TABLE IF NOT EXISTS sync_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID REFERENCES external_integrations(id) ON DELETE CASCADE NOT NULL,
  
  -- Sync Info
  sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'incremental', 'webhook')),
  platform TEXT NOT NULL,
  
  -- Results
  status TEXT CHECK (status IN ('success', 'partial', 'error')) NOT NULL,
  contributions_synced INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  error_message TEXT,
  
  -- Timing
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_history_integration ON sync_history(integration_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_created ON sync_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_history_status ON sync_history(status);

-- =====================================================
-- 6. RLS POLICIES
-- =====================================================

-- External Integrations
ALTER TABLE external_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own integrations" ON external_integrations;
CREATE POLICY "Users can view own integrations" ON external_integrations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own integrations" ON external_integrations;
CREATE POLICY "Users can create own integrations" ON external_integrations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own integrations" ON external_integrations;
CREATE POLICY "Users can update own integrations" ON external_integrations
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own integrations" ON external_integrations;
CREATE POLICY "Users can delete own integrations" ON external_integrations
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Linked Repositories
ALTER TABLE linked_repositories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team members can view linked repos" ON linked_repositories;
CREATE POLICY "Team members can view linked repos" ON linked_repositories
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN team_members tm ON tm.team_id = p.team_id
      WHERE p.id = linked_repositories.project_id
      AND tm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Team leaders can manage linked repos" ON linked_repositories;
CREATE POLICY "Team leaders can manage linked repos" ON linked_repositories
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN team_members tm ON tm.team_id = p.team_id
      WHERE p.id = linked_repositories.project_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'leader'
    )
  );

-- Linked Documents
ALTER TABLE linked_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team members can view linked docs" ON linked_documents;
CREATE POLICY "Team members can view linked docs" ON linked_documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN team_members tm ON tm.team_id = p.team_id
      WHERE p.id = linked_documents.project_id
      AND tm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Team members can manage linked docs" ON linked_documents;
CREATE POLICY "Team members can manage linked docs" ON linked_documents
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN team_members tm ON tm.team_id = p.team_id
      WHERE p.id = linked_documents.project_id
      AND tm.user_id = auth.uid()
    )
  );

-- Automated Contributions
ALTER TABLE automated_contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view automated contributions" ON automated_contributions;
CREATE POLICY "Users can view automated contributions" ON automated_contributions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM projects p
      JOIN team_members tm ON tm.team_id = p.team_id
      WHERE p.id = automated_contributions.project_id
      AND tm.user_id = auth.uid()
    )
  );

-- Sync History
ALTER TABLE sync_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own sync history" ON sync_history;
CREATE POLICY "Users can view own sync history" ON sync_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM external_integrations ei
      WHERE ei.id = sync_history.integration_id
      AND ei.user_id = auth.uid()
    )
  );

-- =====================================================
-- 7. TRIGGERS
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_external_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_external_integrations_updated_at ON external_integrations;
CREATE TRIGGER trigger_update_external_integrations_updated_at
  BEFORE UPDATE ON external_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_external_integrations_updated_at();

CREATE OR REPLACE FUNCTION update_linked_repos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_linked_repos_updated_at ON linked_repositories;
CREATE TRIGGER trigger_update_linked_repos_updated_at
  BEFORE UPDATE ON linked_repositories
  FOR EACH ROW
  EXECUTE FUNCTION update_linked_repos_updated_at();

CREATE OR REPLACE FUNCTION update_linked_docs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_linked_docs_updated_at ON linked_documents;
CREATE TRIGGER trigger_update_linked_docs_updated_at
  BEFORE UPDATE ON linked_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_linked_docs_updated_at();

-- When automated contribution is created, optionally create/merge with manual contribution
CREATE OR REPLACE FUNCTION auto_create_contribution_from_automated()
RETURNS TRIGGER AS $$
BEGIN
  -- Optionally create a contribution entry if one doesn't exist
  -- This can be configured per project/workspace
  -- For now, we'll just log it - the app can handle merging
  
  -- Log activity
  INSERT INTO activity_log (
    workspace_id,
    user_id,
    action_type,
    entity_type,
    entity_id,
    metadata
  )
  SELECT 
    p.workspace_id,
    NEW.user_id,
    'automated_contribution_captured',
    'automated_contribution',
    NEW.id,
    jsonb_build_object(
      'source_platform', NEW.source_platform,
      'source_type', NEW.source_type,
      'contribution_type', NEW.contribution_type
    )
  FROM projects p
  WHERE p.id = NEW.project_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_create_contribution ON automated_contributions;
CREATE TRIGGER trigger_auto_create_contribution
  AFTER INSERT ON automated_contributions
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_contribution_from_automated();
