-- =====================================================
-- Migration: 048_add_communication_channels.sql
-- Description: Adds team chat, project discussions, and direct messaging
-- =====================================================

-- =====================================================
-- 1. TEAM CHAT MESSAGES TABLE
-- Real-time messaging within teams
-- Note: If team_chat_messages already exists (from older migrations), we'll adapt
-- =====================================================
DO $$ 
BEGIN
  -- Check if table exists with channel_id (old schema)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'team_chat_messages' 
    AND column_name = 'channel_id'
  ) THEN
    -- Table exists with old schema, add missing columns if needed
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'team_chat_messages' 
      AND column_name = 'is_edited'
    ) THEN
      ALTER TABLE team_chat_messages 
      ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
    END IF;
  ELSE
    -- Table doesn't exist or doesn't have channel_id, create new schema
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'team_chat_messages'
    ) THEN
      CREATE TABLE team_chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  edited_at TIMESTAMPTZ,
  is_edited BOOLEAN DEFAULT FALSE,
  reply_to_id UUID REFERENCES team_chat_messages(id) ON DELETE SET NULL,
  
  -- Metadata
  attachments JSONB DEFAULT '[]', -- Array of attachment objects
  metadata JSONB DEFAULT '{}' -- Additional metadata (mentions, etc.)
);

      CREATE INDEX IF NOT EXISTS idx_team_chat_messages_team ON team_chat_messages(team_id);
      CREATE INDEX IF NOT EXISTS idx_team_chat_messages_user ON team_chat_messages(user_id);
      CREATE INDEX IF NOT EXISTS idx_team_chat_messages_created ON team_chat_messages(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_team_chat_messages_reply ON team_chat_messages(reply_to_id);
      CREATE INDEX IF NOT EXISTS idx_team_chat_messages_team_created ON team_chat_messages(team_id, created_at DESC);
    END IF;
  END IF;
END $$;

-- =====================================================
-- 1B. TEAM CHAT CHANNELS TABLE (if using channel-based schema)
-- =====================================================
CREATE TABLE IF NOT EXISTS team_chat_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(team_id, name)
);

CREATE INDEX IF NOT EXISTS idx_team_chat_channels_team ON team_chat_channels(team_id);
CREATE INDEX IF NOT EXISTS idx_team_chat_channels_is_default ON team_chat_channels(team_id, is_default) WHERE is_default = TRUE;

-- Enable RLS for team_chat_channels if not already enabled
ALTER TABLE team_chat_channels ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Team members can view channels" ON team_chat_channels;
DROP POLICY IF EXISTS "Team leaders can create channels" ON team_chat_channels;
DROP POLICY IF EXISTS "Team leaders can update channels" ON team_chat_channels;
DROP POLICY IF EXISTS "Team leaders can delete channels" ON team_chat_channels;

-- Team members can view channels for their teams
CREATE POLICY "Team members can view channels" ON team_chat_channels
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_chat_channels.team_id
      AND team_members.user_id = auth.uid()
    )
  );

-- Team leaders can create channels
CREATE POLICY "Team leaders can create channels" ON team_chat_channels
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_chat_channels.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'leader'
    )
  );

-- Team leaders can update channels
CREATE POLICY "Team leaders can update channels" ON team_chat_channels
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_chat_channels.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'leader'
    )
  );

-- Team leaders can delete channels (except default)
CREATE POLICY "Team leaders can delete channels" ON team_chat_channels
  FOR DELETE TO authenticated
  USING (
    is_default = FALSE
    AND EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_chat_channels.team_id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'leader'
    )
  );

-- Create default channels for existing teams (if they don't exist)
DO $$
BEGIN
  INSERT INTO team_chat_channels (team_id, name, description, is_default, created_by)
  SELECT 
    t.id,
    'general',
    'General team discussion',
    TRUE,
    t.created_by
  FROM teams t
  WHERE NOT EXISTS (
    SELECT 1 FROM team_chat_channels tcc
    WHERE tcc.team_id = t.id AND tcc.name = 'general'
  )
  ON CONFLICT (team_id, name) DO NOTHING;
EXCEPTION
  WHEN OTHERS THEN
    -- If insertion fails, that's okay - channels might already exist
    NULL;
END $$;

-- Create trigger function for default channel creation (if not exists)
CREATE OR REPLACE FUNCTION create_default_team_channel()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO team_chat_channels (team_id, name, description, is_default, created_by)
  VALUES (NEW.id, 'general', 'General team discussion', TRUE, NEW.created_by)
  ON CONFLICT (team_id, name) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new teams (drop if exists first)
DROP TRIGGER IF EXISTS create_default_channel_on_team_create ON teams;
CREATE TRIGGER create_default_channel_on_team_create
  AFTER INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION create_default_team_channel();

-- =====================================================
-- 2. PROJECT DISCUSSIONS TABLE
-- Threaded discussions for projects
-- =====================================================
CREATE TABLE IF NOT EXISTS project_discussions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_activity_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_project_discussions_project ON project_discussions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_discussions_user ON project_discussions(user_id);
CREATE INDEX IF NOT EXISTS idx_project_discussions_created ON project_discussions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_discussions_last_activity ON project_discussions(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_discussions_pinned ON project_discussions(project_id, is_pinned) WHERE is_pinned = TRUE;

-- =====================================================
-- 3. PROJECT DISCUSSION COMMENTS TABLE
-- Comments/replies on project discussions
-- =====================================================
CREATE TABLE IF NOT EXISTS project_discussion_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  discussion_id UUID REFERENCES project_discussions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  edited_at TIMESTAMPTZ,
  is_edited BOOLEAN DEFAULT FALSE,
  parent_comment_id UUID REFERENCES project_discussion_comments(id) ON DELETE CASCADE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_project_discussion_comments_discussion ON project_discussion_comments(discussion_id);
CREATE INDEX IF NOT EXISTS idx_project_discussion_comments_user ON project_discussion_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_project_discussion_comments_created ON project_discussion_comments(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_project_discussion_comments_parent ON project_discussion_comments(parent_comment_id);

-- =====================================================
-- 4. DIRECT MESSAGES TABLE
-- Private messages between users
-- =====================================================
CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  reply_to_id UUID REFERENCES direct_messages(id) ON DELETE SET NULL,
  
  -- Metadata
  attachments JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  
  -- Ensure sender and recipient are different
  CONSTRAINT check_different_users CHECK (sender_id != recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient ON direct_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_created ON direct_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_unread ON direct_messages(recipient_id, is_read) WHERE is_read = FALSE;
-- Composite index for conversation queries
CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation ON direct_messages(
  LEAST(sender_id, recipient_id),
  GREATEST(sender_id, recipient_id),
  created_at DESC
);

-- =====================================================
-- 5. MESSAGE READ STATUS TABLE (for team chat)
-- Track read status of team messages
-- =====================================================
CREATE TABLE IF NOT EXISTS team_chat_read_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES team_chat_messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  read_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_chat_read_status_message ON team_chat_read_status(message_id);
CREATE INDEX IF NOT EXISTS idx_team_chat_read_status_user ON team_chat_read_status(user_id);

-- =====================================================
-- 6. RLS POLICIES - Team Chat Messages
-- =====================================================
ALTER TABLE team_chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
-- Drop old policies from previous migrations
DROP POLICY IF EXISTS "Team members can view messages" ON team_chat_messages;
DROP POLICY IF EXISTS "Team members can send messages" ON team_chat_messages;
DROP POLICY IF EXISTS "Users can edit own messages" ON team_chat_messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON team_chat_messages;
-- Drop new policy names
DROP POLICY IF EXISTS "Team members can view team chat messages" ON team_chat_messages;
DROP POLICY IF EXISTS "Team members can create team chat messages" ON team_chat_messages;
DROP POLICY IF EXISTS "Users can update own team chat messages" ON team_chat_messages;
DROP POLICY IF EXISTS "Users can delete own team chat messages" ON team_chat_messages;

-- Team members can view messages in their teams
CREATE POLICY "Team members can view team chat messages" ON team_chat_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_chat_messages.team_id
      AND team_members.user_id = auth.uid()
    )
  );

-- Team members can create messages in their teams
CREATE POLICY "Team members can create team chat messages" ON team_chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_chat_messages.team_id
      AND team_members.user_id = auth.uid()
    )
  );

-- Users can update their own messages
CREATE POLICY "Users can update own team chat messages" ON team_chat_messages
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own messages
CREATE POLICY "Users can delete own team chat messages" ON team_chat_messages
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- 7. RLS POLICIES - Project Discussions
-- =====================================================
ALTER TABLE project_discussions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Team members can view project discussions" ON project_discussions;
DROP POLICY IF EXISTS "Team members can create project discussions" ON project_discussions;
DROP POLICY IF EXISTS "Users can update own project discussions" ON project_discussions;
DROP POLICY IF EXISTS "Team leaders can update project discussions" ON project_discussions;
DROP POLICY IF EXISTS "Users can delete own project discussions" ON project_discussions;

-- Team members can view discussions in their project's team
CREATE POLICY "Team members can view project discussions" ON project_discussions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN team_members tm ON tm.team_id = p.team_id
      WHERE p.id = project_discussions.project_id
      AND tm.user_id = auth.uid()
    )
  );

-- Team members can create discussions
CREATE POLICY "Team members can create project discussions" ON project_discussions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM projects p
      JOIN team_members tm ON tm.team_id = p.team_id
      WHERE p.id = project_discussions.project_id
      AND tm.user_id = auth.uid()
    )
  );

-- Users can update their own discussions
CREATE POLICY "Users can update own project discussions" ON project_discussions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Team leaders can update any discussion in their team's projects
CREATE POLICY "Team leaders can update project discussions" ON project_discussions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN team_members tm ON tm.team_id = p.team_id
      WHERE p.id = project_discussions.project_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'leader'
    )
  );

-- Users can delete their own discussions
CREATE POLICY "Users can delete own project discussions" ON project_discussions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- 8. RLS POLICIES - Project Discussion Comments
-- =====================================================
ALTER TABLE project_discussion_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Team members can view discussion comments" ON project_discussion_comments;
DROP POLICY IF EXISTS "Team members can create discussion comments" ON project_discussion_comments;
DROP POLICY IF EXISTS "Users can update own discussion comments" ON project_discussion_comments;
DROP POLICY IF EXISTS "Users can delete own discussion comments" ON project_discussion_comments;

-- Team members can view comments on discussions they can see
CREATE POLICY "Team members can view discussion comments" ON project_discussion_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_discussions pd
      JOIN projects p ON p.id = pd.project_id
      JOIN team_members tm ON tm.team_id = p.team_id
      WHERE pd.id = project_discussion_comments.discussion_id
      AND tm.user_id = auth.uid()
    )
  );

-- Team members can create comments
CREATE POLICY "Team members can create discussion comments" ON project_discussion_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM project_discussions pd
      JOIN projects p ON p.id = pd.project_id
      JOIN team_members tm ON tm.team_id = p.team_id
      WHERE pd.id = project_discussion_comments.discussion_id
      AND tm.user_id = auth.uid()
    )
  );

-- Users can update their own comments
CREATE POLICY "Users can update own discussion comments" ON project_discussion_comments
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own comments
CREATE POLICY "Users can delete own discussion comments" ON project_discussion_comments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- =====================================================
-- 9. RLS POLICIES - Direct Messages
-- =====================================================
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own direct messages" ON direct_messages;
DROP POLICY IF EXISTS "Users can send direct messages" ON direct_messages;
DROP POLICY IF EXISTS "Users can update own sent messages" ON direct_messages;
DROP POLICY IF EXISTS "Users can mark messages as read" ON direct_messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON direct_messages;

-- Users can view messages they sent or received
CREATE POLICY "Users can view own direct messages" ON direct_messages
  FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- Users can send messages
CREATE POLICY "Users can send direct messages" ON direct_messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- Users can update their own sent messages (within time limit - handled in app)
CREATE POLICY "Users can update own sent messages" ON direct_messages
  FOR UPDATE TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- Users can mark received messages as read
CREATE POLICY "Users can mark messages as read" ON direct_messages
  FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages" ON direct_messages
  FOR DELETE TO authenticated
  USING (sender_id = auth.uid());

-- =====================================================
-- 10. RLS POLICIES - Team Chat Read Status
-- =====================================================
ALTER TABLE team_chat_read_status ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own read status" ON team_chat_read_status;
DROP POLICY IF EXISTS "Users can create own read status" ON team_chat_read_status;

-- Users can view their own read status
CREATE POLICY "Users can view own read status" ON team_chat_read_status
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can create their own read status
CREATE POLICY "Users can create own read status" ON team_chat_read_status
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 11. TRIGGERS - Update timestamps
-- =====================================================

-- Update last_activity_at on project discussions when comments are added
CREATE OR REPLACE FUNCTION update_discussion_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE project_discussions
  SET last_activity_at = NOW()
  WHERE id = NEW.discussion_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_discussion_activity ON project_discussion_comments;
CREATE TRIGGER trigger_update_discussion_activity
  AFTER INSERT ON project_discussion_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_discussion_last_activity();

-- Update updated_at timestamps (create if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_team_chat_messages_updated_at ON team_chat_messages;
CREATE TRIGGER trigger_team_chat_messages_updated_at
  BEFORE UPDATE ON team_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_project_discussions_updated_at ON project_discussions;
CREATE TRIGGER trigger_project_discussions_updated_at
  BEFORE UPDATE ON project_discussions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_project_discussion_comments_updated_at ON project_discussion_comments;
CREATE TRIGGER trigger_project_discussion_comments_updated_at
  BEFORE UPDATE ON project_discussion_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_direct_messages_updated_at ON direct_messages;
CREATE TRIGGER trigger_direct_messages_updated_at
  BEFORE UPDATE ON direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 12. TRIGGER - Mark message as edited
-- =====================================================

CREATE OR REPLACE FUNCTION mark_message_as_edited()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.message != OLD.message THEN
    NEW.is_edited = TRUE;
    NEW.edited_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_mark_team_chat_edited ON team_chat_messages;
CREATE TRIGGER trigger_mark_team_chat_edited
  BEFORE UPDATE ON team_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION mark_message_as_edited();

DROP TRIGGER IF EXISTS trigger_mark_discussion_comment_edited ON project_discussion_comments;
CREATE TRIGGER trigger_mark_discussion_comment_edited
  BEFORE UPDATE ON project_discussion_comments
  FOR EACH ROW
  EXECUTE FUNCTION mark_message_as_edited();

DROP TRIGGER IF EXISTS trigger_mark_direct_message_edited ON direct_messages;
CREATE TRIGGER trigger_mark_direct_message_edited
  BEFORE UPDATE ON direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION mark_message_as_edited();
