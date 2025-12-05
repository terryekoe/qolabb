// =====================================================
// Notification Database Functions
// Functions for creating and managing user notifications
// =====================================================

import { supabase } from '../supabase';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface Notification {
  id: string;
  user_id: string;
  type:
    | 'team_assignment'
    | 'team_invitation'
    | 'join_request'
    | 'role_change'
    | 'team_update'
    | 'task_assignment'
    | 'task_completed'
    | 'task_status_changed'
    | 'project_update'
    | 'project_created'
    | 'project_completed'
    | 'contribution_logged'
    | 'milestone_achieved';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  created_at: string;
  updated_at: string;
}

// =====================================================
// CORE NOTIFICATION FUNCTIONS
// =====================================================

/**
 * Create a new notification
 * Uses the SQL function create_notification which has SECURITY DEFINER and bypasses RLS
 * @param notification - Notification data
 * @returns Created notification object or null if disabled
 */
export async function createNotification(notification: {
  user_id: string;
  type: Notification['type'];
  title: string;
  message: string;
  data?: Record<string, any>;
}) {
  try {
    console.log('Creating notification:', {
      user_id: notification.user_id,
      type: notification.type,
      title: notification.title,
    });

    // Use the SQL function instead of direct insert - it has SECURITY DEFINER and bypasses RLS
    const { data, error } = await supabase.rpc('create_notification', {
      p_user_id: notification.user_id,
      p_type: notification.type,
      p_title: notification.title,
      p_message: notification.message,
      p_data: notification.data || {},
    });

    if (error) {
      console.error('Notification insert error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw error;
    }

    // If the function returns NULL (notification disabled), return null
    if (!data) {
      console.log('Notification creation skipped (user preference disabled)');
      return null;
    }

    // The SQL function returns the notification ID
    // We can't fetch the full notification here because RLS only allows users to see their own notifications
    // But the notification was successfully created, so we return a minimal object with the ID
    console.log('Notification created successfully with ID:', data);
    return {
      id: data,
      user_id: notification.user_id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data || {},
      read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any;
  } catch (error: any) {
    console.error('createNotification error:', {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      fullError: JSON.stringify(error, null, 2),
    });
    // Don't throw - just log the error so task assignment doesn't fail
    // This way tasks can still be assigned even if notifications fail
    return null;
  }
}

/**
 * Get user notifications with pagination and filtering
 * @param userId - User ID
 * @param options - Pagination and filtering options
 * @returns List of notifications
 */
export async function getUserNotifications(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    type?: Notification['type'];
  } = {}
) {
  try {
    const { limit = 20, offset = 0, unreadOnly = false, type } = options;

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('getUserNotifications error:', error?.message || JSON.stringify(error, null, 2));
    return [];
  }
}

/**
 * Mark a notification as read
 * @param notificationId - Notification ID
 * @param userId - User ID
 * @returns Updated notification
 */
export async function markNotificationAsRead(notificationId: string, userId: string) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error(
      'markNotificationAsRead error:',
      error?.message || JSON.stringify(error, null, 2)
    );
    throw error;
  }
}

/**
 * Mark all notifications as read for a user
 * @param userId - User ID
 * @returns List of updated notifications
 */
export async function markAllNotificationsAsRead(userId: string) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error(
      'markAllNotificationsAsRead error:',
      error?.message || JSON.stringify(error, null, 2)
    );
    throw error;
  }
}

/**
 * Delete a notification
 * @param notificationId - Notification ID
 * @param userId - User ID
 * @returns True if successful
 */
export async function deleteNotification(notificationId: string, userId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error: any) {
    console.error('deleteNotification error:', error?.message || JSON.stringify(error, null, 2));
    throw error;
  }
}

/**
 * Get unread notification count for a user
 * @param userId - User ID
 * @returns Count of unread notifications
 */
export async function getUnreadNotificationCount(userId: string) {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    return count || 0;
  } catch (error: any) {
    console.error(
      'getUnreadNotificationCount error:',
      error?.message || JSON.stringify(error, null, 2)
    );
    return 0;
  }
}

// =====================================================
// SPECIALIZED NOTIFICATION CREATORS
// =====================================================

/**
 * Create team assignment notification
 * @param userId - User ID to notify
 * @param teamName - Name of the team
 * @param assignedBy - ID of user who assigned
 * @param role - Role assigned (default: 'member')
 * @returns Created notification
 */
export async function createTeamAssignmentNotification(
  userId: string,
  teamName: string,
  assignedBy: string,
  role: string = 'member'
) {
  try {
    // Get assigned by user name
    const { data: assignedByUser } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', assignedBy)
      .single();

    const assignedByName = assignedByUser?.full_name || 'someone';

    return await createNotification({
      user_id: userId,
      type: 'team_assignment',
      title: 'Team Assignment',
      message: `You have been assigned to team "${teamName}" as a ${role} by ${assignedByName}`,
      data: {
        team_name: teamName,
        assigned_by: assignedBy,
        assigned_by_name: assignedByName,
        role: role,
      },
    });
  } catch (error: any) {
    console.error('createTeamAssignmentNotification error:', error);
    // Fallback: create notification with user ID if name fetch fails
    return await createNotification({
      user_id: userId,
      type: 'team_assignment',
      title: 'Team Assignment',
      message: `You have been assigned to team "${teamName}" as a ${role}`,
      data: {
        team_name: teamName,
        assigned_by: assignedBy,
        role: role,
      },
    });
  }
}

/**
 * Create team invitation notification
 * @param userId - User ID to notify
 * @param teamName - Name of the team
 * @param invitedBy - ID of user who invited
 * @returns Created notification
 */
export async function createTeamInvitationNotification(
  userId: string,
  teamName: string,
  invitedBy: string
) {
  return createNotification({
    user_id: userId,
    type: 'team_invitation',
    title: 'Team Invitation',
    message: `You have been invited to join team "${teamName}" by ${invitedBy}`,
    data: {
      team_name: teamName,
      invited_by: invitedBy,
    },
  });
}

/**
 * Create task assignment notification
 * @param userId - User ID to notify
 * @param taskTitle - Title of the task
 * @param taskId - Task ID
 * @param assignedBy - ID of user who assigned
 * @param projectName - Optional project name
 * @returns Created notification
 */
export async function createTaskAssignmentNotification(
  userId: string,
  taskTitle: string,
  taskId: string,
  assignedBy: string,
  projectName?: string
) {
  try {
    console.log('createTaskAssignmentNotification called:', {
      userId,
      taskTitle,
      taskId,
      assignedBy,
      projectName,
    });

    // Get assigned by user name
    const { data: assignedByUser } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', assignedBy)
      .single();

    const assignedByName = assignedByUser?.full_name || 'someone';

    const result = await createNotification({
      user_id: userId,
      type: 'task_assignment',
      title: 'New Task Assignment',
      message: projectName
        ? `${assignedByName} assigned you to "${taskTitle}" in ${projectName}`
        : `${assignedByName} assigned you to "${taskTitle}"`,
      data: {
        task_id: taskId,
        task_title: taskTitle,
        assigned_by: assignedBy,
        assigned_by_name: assignedByName,
        project_name: projectName,
      },
    });

    console.log('Task assignment notification result:', result);
    return result;
  } catch (error: any) {
    console.error('createTaskAssignmentNotification error:', error);
    return null;
  }
}

/**
 * Create join request notification
 * @param userId - User ID to notify
 * @param teamName - Name of the team
 * @param requesterName - Name of the user requesting to join
 * @param status - Status of the request
 * @returns Created notification
 */
export async function createJoinRequestNotification(
  userId: string,
  teamName: string,
  requesterName: string,
  status: 'pending' | 'approved' | 'rejected'
) {
  const messages = {
    pending: `${requesterName} has requested to join team "${teamName}"`,
    approved: `Your request to join team "${teamName}" has been approved`,
    rejected: `Your request to join team "${teamName}" has been rejected`,
  };

  return createNotification({
    user_id: userId,
    type: 'join_request',
    title: 'Join Request Update',
    message: messages[status],
    data: {
      team_name: teamName,
      requester_name: requesterName,
      status: status,
    },
  });
}

/**
 * Create task completion notification
 * @param userId - User ID to notify
 * @param taskTitle - Title of the task
 * @param taskId - Task ID
 * @param completedBy - ID of user who completed the task
 * @param projectName - Optional project name
 * @returns Created notification
 */
export async function createTaskCompletedNotification(
  userId: string,
  taskTitle: string,
  taskId: string,
  completedBy: string,
  projectName?: string
) {
  const { data: completedByUser } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', completedBy)
    .single();

  const completedByName = completedByUser?.full_name || 'someone';

  return createNotification({
    user_id: userId,
    type: 'task_completed',
    title: 'Task Completed! 🎉',
    message: projectName
      ? `"${taskTitle}" in ${projectName} has been completed by ${completedByName}`
      : `"${taskTitle}" has been completed by ${completedByName}`,
    data: {
      task_id: taskId,
      task_title: taskTitle,
      completed_by: completedBy,
      completed_by_name: completedByName,
      project_name: projectName,
    },
  });
}

/**
 * Create project update notification
 * @param userIds - List of user IDs to notify
 * @param projectName - Name of the project
 * @param projectId - Project ID
 * @param updateType - Type of update
 * @param updatedBy - ID of user who updated
 * @param message - Optional custom message
 * @returns List of created notifications
 */
export async function createProjectUpdateNotification(
  userIds: string[],
  projectName: string,
  projectId: string,
  updateType: 'created' | 'updated' | 'completed' | 'milestone',
  updatedBy: string,
  message?: string
) {
  const { data: updatedByUser } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', updatedBy)
    .single();

  const updatedByName = updatedByUser?.full_name || 'someone';

  const titles = {
    created: 'New Project Created 🚀',
    updated: 'Project Updated 📝',
    completed: 'Project Completed! 🎊',
    milestone: 'Project Milestone Achieved! 🏆',
  };

  const defaultMessages = {
    created: `${updatedByName} created a new project "${projectName}"`,
    updated: `${updatedByName} updated project "${projectName}"`,
    completed: `Project "${projectName}" has been completed!`,
    milestone: `Project "${projectName}" reached a new milestone!`,
  };

  const notificationType =
    updateType === 'created'
      ? 'project_created'
      : updateType === 'completed'
        ? 'project_completed'
        : updateType === 'milestone'
          ? 'milestone_achieved'
          : 'project_update';

  return Promise.all(
    userIds.map((userId) =>
      createNotification({
        user_id: userId,
        type: notificationType,
        title: titles[updateType],
        message: message || defaultMessages[updateType],
        data: {
          project_id: projectId,
          project_name: projectName,
          update_type: updateType,
          updated_by: updatedBy,
          updated_by_name: updatedByName,
        },
      })
    )
  );
}

/**
 * Create contribution logged notification
 * @param userId - User ID to notify
 * @param contributionType - Type of contribution
 * @param hours - Hours spent
 * @param loggedBy - ID of user who logged (usually self)
 * @returns Created notification
 */
export async function createContributionLoggedNotification(
  userId: string,
  contributionType: string,
  hours: number,
  loggedBy: string
) {
  const { data: loggedByUser } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', loggedBy)
    .single();

  const loggedByName = loggedByUser?.full_name || 'someone';

  return createNotification({
    user_id: userId,
    type: 'contribution_logged',
    title: 'Contribution Logged 📊',
    message: `${loggedByName} logged ${hours} hour${hours !== 1 ? 's' : ''} of ${contributionType} contribution`,
    data: {
      contribution_type: contributionType,
      hours: hours,
      logged_by: loggedBy,
      logged_by_name: loggedByName,
    },
  });
}
