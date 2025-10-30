-- =====================================================
-- Migration: 016_add_notifications_system.sql
-- Description: Adds notifications system for team assignment activities
-- =====================================================

-- =====================================================
-- 1. NOTIFICATIONS TABLE
-- Stores notifications for users about various system events
-- =====================================================
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('team_assignment', 'join_request_approved', 'join_request_rejected', 'team_invitation', 'general')) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for efficient queries
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read) WHERE read = FALSE;

-- =====================================================
-- 2. NOTIFICATION PREFERENCES TABLE
-- Allows users to configure their notification preferences
-- =====================================================
CREATE TABLE notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  team_assignment BOOLEAN DEFAULT TRUE,
  join_request_approved BOOLEAN DEFAULT TRUE,
  join_request_rejected BOOLEAN DEFAULT TRUE,
  team_invitation BOOLEAN DEFAULT TRUE,
  general BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id)
);

-- Create index for user lookups
CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id);

-- =====================================================
-- 3. ROW LEVEL SECURITY POLICIES
-- Ensure users can only access their own notifications
-- =====================================================

-- Enable RLS on notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: System can insert notifications for any user
CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Enable RLS on notification_preferences table
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own preferences
CREATE POLICY "Users can view own preferences" ON notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can update their own preferences
CREATE POLICY "Users can update own preferences" ON notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can insert their own preferences
CREATE POLICY "Users can insert own preferences" ON notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 4. HELPER FUNCTIONS
-- Functions to create and manage notifications
-- =====================================================

-- Function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  notification_id UUID;
  user_preferences RECORD;
BEGIN
  -- Check if user has this type of notification enabled
  SELECT * INTO user_preferences 
  FROM notification_preferences 
  WHERE user_id = p_user_id;
  
  -- If no preferences exist, create default ones
  IF NOT FOUND THEN
    INSERT INTO notification_preferences (user_id) VALUES (p_user_id);
    user_preferences.team_assignment := TRUE;
    user_preferences.join_request_approved := TRUE;
    user_preferences.join_request_rejected := TRUE;
    user_preferences.team_invitation := TRUE;
    user_preferences.general := TRUE;
  END IF;
  
  -- Check if this notification type is enabled for the user
  IF (p_type = 'team_assignment' AND user_preferences.team_assignment) OR
     (p_type = 'join_request_approved' AND user_preferences.join_request_approved) OR
     (p_type = 'join_request_rejected' AND user_preferences.join_request_rejected) OR
     (p_type = 'team_invitation' AND user_preferences.team_invitation) OR
     (p_type = 'general' AND user_preferences.general) THEN
    
    -- Insert the notification
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (p_user_id, p_type, p_title, p_message, p_data)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notifications 
  SET read = TRUE, updated_at = NOW()
  WHERE id = notification_id AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  target_user_id UUID;
  updated_count INTEGER;
BEGIN
  -- Use provided user_id or current authenticated user
  target_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Only allow users to mark their own notifications as read
  IF target_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: Cannot mark other users notifications as read';
  END IF;
  
  UPDATE notifications 
  SET read = TRUE, updated_at = NOW()
  WHERE user_id = target_user_id AND read = FALSE;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  target_user_id UUID;
  unread_count INTEGER;
BEGIN
  -- Use provided user_id or current authenticated user
  target_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Only allow users to get their own notification count
  IF target_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: Cannot access other users notification count';
  END IF;
  
  SELECT COUNT(*) INTO unread_count
  FROM notifications 
  WHERE user_id = target_user_id AND read = FALSE;
  
  RETURN unread_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. TRIGGERS
-- Automatically update timestamps
-- =====================================================

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to notifications table
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to notification_preferences table
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();