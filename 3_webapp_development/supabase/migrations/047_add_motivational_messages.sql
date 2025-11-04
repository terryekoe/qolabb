-- =====================================================
-- Migration: 047_add_motivational_messages.sql
-- Description: Adds motivational messages system for encouraging user engagement
-- =====================================================

-- =====================================================
-- 1. MOTIVATIONAL MESSAGES TABLE
-- Stores individual motivational messages sent to users
-- =====================================================
CREATE TABLE motivational_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  
  -- Message Content
  message_type TEXT CHECK (message_type IN (
    'achievement', 'milestone', 'encouragement', 'participation', 
    'teamwork', 'improvement', 'consistency', 'leadership', 'support'
  )) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  emoji TEXT, -- Optional emoji for visual appeal
  
  -- Context
  trigger_event TEXT, -- e.g., 'task_completed', 'contribution_logged', 'week_active'
  trigger_data JSONB DEFAULT '{}', -- Additional context data
  
  -- Delivery
  delivery_method TEXT CHECK (delivery_method IN ('in_app', 'notification', 'email', 'all')) DEFAULT 'in_app',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  is_read BOOLEAN DEFAULT false,
  
  -- Priority
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_motivational_messages_user ON motivational_messages(user_id);
CREATE INDEX idx_motivational_messages_unread ON motivational_messages(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_motivational_messages_type ON motivational_messages(message_type);
CREATE INDEX idx_motivational_messages_created ON motivational_messages(created_at DESC);

-- =====================================================
-- 2. MESSAGE TEMPLATES TABLE
-- Pre-defined message templates for different scenarios
-- =====================================================
CREATE TABLE message_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_type TEXT NOT NULL,
  trigger_condition TEXT NOT NULL, -- SQL-like condition description
  
  title_template TEXT NOT NULL,
  message_template TEXT NOT NULL,
  emoji TEXT,
  
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  frequency_limit INTERVAL, -- e.g., '1 day' to prevent spam
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_message_templates_active ON message_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_message_templates_type ON message_templates(message_type);

-- =====================================================
-- 3. INSERT DEFAULT MESSAGE TEMPLATES
-- =====================================================
INSERT INTO message_templates (message_type, trigger_condition, title_template, message_template, emoji, priority, frequency_limit) VALUES
-- Achievement messages
('achievement', 'task_completed_first_week', 'First Task Complete! 🎉', 'Great job completing your first task this week! Keep up the momentum!', '🎉', 'high', '7 days'),
('achievement', 'task_completed_streak_3', '3-Day Streak! 🔥', 'You''ve completed tasks for 3 days in a row! Your consistency is impressive!', '🔥', 'high', '1 day'),
('achievement', 'contribution_logged_5', '5 Contributions Logged! 📊', 'You''ve logged 5 contributions this week. Your dedication is showing!', '📊', 'medium', '7 days'),
('achievement', 'task_completed_on_time', 'On Time! ✅', 'Great work completing your task on time. Your reliability helps the whole team!', '✅', 'medium', '1 day'),

-- Encouragement messages
('encouragement', 'low_participation_3_days', 'We Miss You! 💙', 'Haven''t seen you active lately. Your team could use your input!', '💙', 'high', '3 days'),
('encouragement', 'first_contribution', 'Getting Started! 🌱', 'Nice work on logging your first contribution! Every step counts.', '🌱', 'medium', '30 days'),
('encouragement', 'first_task_assigned', 'New Task! 🚀', 'You''ve been assigned a new task. You''ve got this!', '🚀', 'medium', '1 day'),

-- Teamwork messages
('teamwork', 'team_milestone_reached', 'Team Milestone! 🎯', 'Your team just reached a milestone! Thanks for being part of the success!', '🎯', 'high', '7 days'),
('teamwork', 'helping_others', 'Great Team Player! 🤝', 'You''ve been helping other team members. Your collaboration is appreciated!', '🤝', 'medium', '7 days'),
('teamwork', 'team_workload_balanced', 'Balanced Team! ⚖️', 'Great job maintaining balanced workload in your team. Teamwork makes the dream work!', '⚖️', 'medium', '7 days'),

-- Improvement messages
('improvement', 'participation_increased', 'On the Rise! 📈', 'Your participation has improved this week. Keep it up!', '📈', 'medium', '7 days'),
('improvement', 'quality_contributions', 'Quality Work! ⭐', 'Your recent contributions show great attention to detail. Well done!', '⭐', 'medium', '7 days'),

-- Consistency messages
('consistency', 'active_week', 'Active Week! 💪', 'You''ve been active every day this week. Consistency is key to success!', '💪', 'medium', '7 days'),
('consistency', 'consistent_contributions', 'Steady Progress! 📊', 'You''ve been consistently logging contributions. Keep the momentum going!', '📊', 'medium', '7 days'),

-- Leadership messages
('leadership', 'leading_team', 'Natural Leader! 👑', 'You''re showing great leadership in your team. Keep inspiring others!', '👑', 'high', '7 days'),
('leadership', 'organizing_tasks', 'Great Organizer! 📋', 'Your task organization skills are helping the team stay on track!', '📋', 'medium', '7 days');

-- =====================================================
-- 4. UPDATE NOTIFICATION PREFERENCES
-- Add motivational message preferences
-- =====================================================
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS motivational_messages BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS achievement_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS encouragement_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS teamwork_notifications BOOLEAN DEFAULT true;

-- =====================================================
-- 5. RLS POLICIES
-- =====================================================
ALTER TABLE motivational_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages" ON motivational_messages
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own messages" ON motivational_messages
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- System can create messages via SECURITY DEFINER function
CREATE POLICY "System can create messages" ON motivational_messages
FOR INSERT TO authenticated
WITH CHECK (true);

-- =====================================================
-- 6. HELPER FUNCTION: Send Motivational Message
-- =====================================================
CREATE OR REPLACE FUNCTION send_motivational_message(
  p_user_id UUID,
  p_message_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_emoji TEXT DEFAULT NULL,
  p_trigger_event TEXT DEFAULT NULL,
  p_trigger_data JSONB DEFAULT '{}',
  p_priority TEXT DEFAULT 'medium',
  p_workspace_id UUID DEFAULT NULL,
  p_team_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  message_id UUID;
  user_prefs RECORD;
BEGIN
  -- Check user preferences
  SELECT * INTO user_prefs
  FROM notification_preferences
  WHERE user_id = p_user_id;
  
  -- If no preferences, create default
  IF NOT FOUND THEN
    INSERT INTO notification_preferences (user_id, motivational_messages)
    VALUES (p_user_id, true)
    ON CONFLICT (user_id) DO NOTHING;
    
    SELECT * INTO user_prefs
    FROM notification_preferences
    WHERE user_id = p_user_id;
  END IF;
  
  -- Check if user wants this type of message
  IF (p_message_type IN ('achievement', 'milestone', 'leadership') AND COALESCE(user_prefs.achievement_notifications, true)) OR
     (p_message_type IN ('encouragement', 'support') AND COALESCE(user_prefs.encouragement_notifications, true)) OR
     (p_message_type IN ('teamwork') AND COALESCE(user_prefs.teamwork_notifications, true)) OR
     (COALESCE(user_prefs.motivational_messages, true) AND user_prefs.motivational_messages) THEN
    
    -- Check frequency limit (prevent spam)
    -- Check if similar message was sent recently
    IF EXISTS (
      SELECT 1 FROM motivational_messages
      WHERE user_id = p_user_id
      AND message_type = p_message_type
      AND trigger_event = p_trigger_event
      AND sent_at > NOW() - INTERVAL '1 day'
    ) THEN
      -- Skip if similar message sent within last day
      RETURN NULL;
    END IF;
    
    -- Insert the message
    INSERT INTO motivational_messages (
      user_id, workspace_id, team_id, message_type, title, message, emoji,
      trigger_event, trigger_data, priority
    ) VALUES (
      p_user_id, p_workspace_id, p_team_id, p_message_type, p_title, p_message, p_emoji,
      p_trigger_event, p_trigger_data, p_priority
    )
    RETURNING id INTO message_id;
    
    RETURN message_id;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION send_motivational_message(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, UUID, UUID
) TO authenticated;
GRANT EXECUTE ON FUNCTION send_motivational_message(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, UUID, UUID
) TO anon;

-- =====================================================
-- 7. HELPER FUNCTION: Mark Message as Read
-- =====================================================
CREATE OR REPLACE FUNCTION mark_motivational_message_read(p_message_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE motivational_messages
  SET is_read = true, read_at = NOW()
  WHERE id = p_message_id AND user_id = p_user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION mark_motivational_message_read(UUID, UUID) TO authenticated;

-- =====================================================
-- Migration Complete
-- =====================================================
