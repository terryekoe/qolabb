-- =====================================================
-- Migration: 034_add_task_assignment_notifications.sql
-- Description: Adds support for task assignment notifications
-- =====================================================

-- Drop the old CHECK constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add new CHECK constraint that includes all notification types
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN (
    'team_assignment', 
    'join_request_approved', 
    'join_request_rejected', 
    'team_invitation', 
    'general',
    'task_assignment',
    'task_completed',
    'task_status_changed',
    'project_update',
    'project_created',
    'project_completed',
    'role_change',
    'team_update',
    'contribution_logged',
    'milestone_achieved'
  ));

-- Update notification_preferences table to include all new preferences
ALTER TABLE notification_preferences 
  ADD COLUMN IF NOT EXISTS task_assignment BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS task_completed BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS project_updates BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS contribution_logged BOOLEAN DEFAULT TRUE;

-- Update the create_notification function to support task_assignment
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
    INSERT INTO notification_preferences (user_id, task_assignment, task_completed, project_updates, contribution_logged) 
    VALUES (p_user_id, TRUE, TRUE, TRUE, TRUE);
    user_preferences.team_assignment := TRUE;
    user_preferences.join_request_approved := TRUE;
    user_preferences.join_request_rejected := TRUE;
    user_preferences.team_invitation := TRUE;
    user_preferences.general := TRUE;
    user_preferences.task_assignment := TRUE;
    user_preferences.task_completed := TRUE;
    user_preferences.project_updates := TRUE;
    user_preferences.contribution_logged := TRUE;
  END IF;
  
  -- Check if this notification type is enabled for the user
  IF (p_type = 'team_assignment' AND user_preferences.team_assignment) OR
     (p_type = 'join_request_approved' AND user_preferences.join_request_approved) OR
     (p_type = 'join_request_rejected' AND user_preferences.join_request_rejected) OR
     (p_type = 'team_invitation' AND user_preferences.team_invitation) OR
     (p_type = 'general' AND user_preferences.general) OR
     (p_type = 'task_assignment' AND COALESCE(user_preferences.task_assignment, TRUE)) OR
     (p_type = 'task_completed' AND COALESCE(user_preferences.task_completed, TRUE)) OR
     (p_type = 'task_status_changed' AND COALESCE(user_preferences.task_assignment, TRUE)) OR
     (p_type = 'project_update' AND COALESCE(user_preferences.project_updates, TRUE)) OR
     (p_type = 'project_created' AND COALESCE(user_preferences.project_updates, TRUE)) OR
     (p_type = 'project_completed' AND COALESCE(user_preferences.project_updates, TRUE)) OR
     (p_type = 'contribution_logged' AND COALESCE(user_preferences.contribution_logged, TRUE)) OR
     (p_type = 'role_change' AND TRUE) OR
     (p_type = 'team_update' AND TRUE) OR
     (p_type = 'milestone_achieved' AND TRUE) THEN
    
    -- Insert the notification
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (p_user_id, p_type, p_title, p_message, p_data)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
