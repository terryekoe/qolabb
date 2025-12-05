// =====================================================
// Task Extras Database Functions
// Attachments, Subtasks, and Assignees management
// =====================================================

import { supabase } from '../supabase';
import { logActivity } from './activity';
import { createTaskAssignmentNotification } from './notifications';

// =====================================================
// TASK ASSIGNEE FUNCTIONS
// =====================================================

// Note: getTaskAssignees is exported from tasks.ts

/**
 * Add assignees to a task
 * Logs activity and sends notifications
 * @param taskId - Task ID
 * @param userIds - List of user IDs to assign
 * @param assignedBy - ID of user performing the assignment
 * @returns List of new assignee records
 */
export async function addTaskAssignees(taskId: string, userIds: string[], assignedBy: string) {
  try {
    // Get current assignees to avoid duplicates
    const { data: existing } = await supabase
      .from('task_assignees')
      .select('user_id')
      .eq('task_id', taskId);

    const existingUserIds = new Set(existing?.map((a: any) => a.user_id) || []);
    const newUserIds = userIds.filter((id) => !existingUserIds.has(id));

    if (newUserIds.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('task_assignees')
      .insert(
        newUserIds.map((userId) => ({
          task_id: taskId,
          user_id: userId,
          assigned_by: assignedBy,
        }))
      )
      .select(
        `
        id,
        user_id,
        assigned_at,
        assigned_by,
        user:profiles!user_id(id, full_name, avatar_url)
      `
      );

    if (error) throw error;

    // Log activity
    const { data: task } = await supabase
      .from('tasks')
      .select('project:projects!inner(workspace_id), title, project_id')
      .eq('id', taskId)
      .single();

    if (task && (task as any).project?.workspace_id) {
      const { data: users } = await supabase
        .from('profiles')
        .select('full_name')
        .in('id', newUserIds);

      const userNames = users?.map((u: any) => u.full_name).join(', ') || 'users';

      // Get project name for notifications
      const { data: project } = await supabase
        .from('projects')
        .select('name')
        .eq('id', (task as any).project_id)
        .single();

      const projectName = project?.name;

      // Log activity
      await logActivity({
        workspace_id: (task as any).project.workspace_id,
        user_id: assignedBy,
        action_type: 'assigned_task',
        entity_type: 'task',
        entity_id: taskId,
        metadata: {
          assignee_ids: newUserIds,
          assignee_names: userNames,
          task_title: (task as any).title,
        },
      });

      // Create notifications for newly assigned users
      await Promise.all(
        newUserIds.map((userId) =>
          createTaskAssignmentNotification(
            userId,
            (task as any).title,
            taskId,
            assignedBy,
            projectName
          )
        )
      );
    }

    return data || [];
  } catch (error: any) {
    console.error('addTaskAssignees error:', error?.message || JSON.stringify(error, null, 2));
    throw error;
  }
}

/**
 * Remove an assignee from a task
 * Logs activity
 * @param taskId - Task ID
 * @param userId - User ID to remove
 * @param removedBy - ID of user performing the removal
 * @returns True if successful
 */
export async function removeTaskAssignee(taskId: string, userId: string, removedBy: string) {
  try {
    const { error } = await supabase
      .from('task_assignees')
      .delete()
      .eq('task_id', taskId)
      .eq('user_id', userId);

    if (error) throw error;

    // Log activity
    const { data: task } = await supabase
      .from('tasks')
      .select('project:projects!inner(workspace_id), title')
      .eq('id', taskId)
      .single();

    if (task && (task as any).project?.workspace_id) {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();

      await logActivity({
        workspace_id: (task as any).project.workspace_id,
        user_id: removedBy,
        action_type: 'unassigned_task',
        entity_type: 'task',
        entity_id: taskId,
        metadata: {
          assignee_id: userId,
          assignee_name: userProfile?.full_name || 'someone',
          task_title: (task as any).title,
        },
      });
    }

    return true;
  } catch (error: any) {
    console.error('removeTaskAssignee error:', error?.message || JSON.stringify(error, null, 2));
    throw error;
  }
}

// =====================================================
// TASK ATTACHMENT FUNCTIONS
// =====================================================

/**
 * Get attachments for a task
 * @param taskId - Task ID
 * @returns List of attachments with uploader profiles
 */
export async function getTaskAttachments(taskId: string) {
  try {
    const { data, error } = await supabase
      .from('task_attachments')
      .select(
        `
        *,
        user:profiles!user_id(id, full_name, avatar_url)
      `
      )
      .eq('task_id', taskId)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('getTaskAttachments error:', error?.message || JSON.stringify(error, null, 2));
    throw error;
  }
}

/**
 * Upload a file attachment for a task
 * Uploads to storage and creates database record
 * Logs activity
 * @param taskId - Task ID
 * @param userId - User ID uploading
 * @param file - File object to upload
 * @returns Attachment record with public URL
 */
export async function uploadTaskAttachment(
  taskId: string,
  userId: string,
  file: File
): Promise<any> {
  try {
    // Create unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${taskId}/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('task-attachments')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Get file URL
    const { data: urlData } = supabase.storage.from('task-attachments').getPublicUrl(filePath);

    // Create attachment record
    const { data: attachment, error: dbError } = await supabase
      .from('task_attachments')
      .insert({
        task_id: taskId,
        user_id: userId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
        external_url: null,
      })
      .select(
        `
        *,
        user:profiles!user_id(id, full_name, avatar_url)
      `
      )
      .single();

    if (dbError) {
      // If DB insert fails, try to delete the uploaded file
      await supabase.storage.from('task-attachments').remove([filePath]);
      throw dbError;
    }

    // Log activity
    const { data: task } = await supabase
      .from('tasks')
      .select('project:projects!inner(workspace_id)')
      .eq('id', taskId)
      .single();

    if (task && (task as any).project?.workspace_id) {
      await logActivity({
        workspace_id: (task as any).project.workspace_id,
        user_id: userId,
        action_type: 'added_attachment',
        entity_type: 'task',
        entity_id: taskId,
        metadata: { file_name: file.name, file_size: file.size, type: 'upload' },
      });
    }

    return { ...attachment, url: urlData.publicUrl };
  } catch (error: any) {
    console.error('uploadTaskAttachment error:', error?.message || JSON.stringify(error, null, 2));
    throw error;
  }
}

/**
 * Add a link attachment to a task
 * Logs activity
 * @param taskId - Task ID
 * @param userId - User ID adding the link
 * @param url - External URL
 * @param fileName - Optional name for the link
 * @returns Attachment record
 */
export async function addTaskAttachmentLink(
  taskId: string,
  userId: string,
  url: string,
  fileName?: string
): Promise<any> {
  try {
    // Validate URL
    try {
      new URL(url);
    } catch {
      throw new Error('Invalid URL format');
    }

    // Extract filename from URL if not provided
    let attachmentName = fileName || 'External Link';
    if (!fileName) {
      try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        if (pathParts.length > 0) {
          attachmentName = pathParts[pathParts.length - 1];
          attachmentName = attachmentName.split('?')[0];
        }
      } catch {
        attachmentName = 'External Link';
      }
    }

    // Create attachment record with external URL
    const { data: attachment, error: dbError } = await supabase
      .from('task_attachments')
      .insert({
        task_id: taskId,
        user_id: userId,
        file_name: attachmentName,
        file_path: null,
        file_size: null,
        file_type: null,
        external_url: url,
      })
      .select(
        `
        *,
        user:profiles!user_id(id, full_name, avatar_url)
      `
      )
      .single();

    if (dbError) throw dbError;

    // Log activity
    const { data: task } = await supabase
      .from('tasks')
      .select('project:projects!inner(workspace_id)')
      .eq('id', taskId)
      .single();

    if (task && (task as any).project?.workspace_id) {
      await logActivity({
        workspace_id: (task as any).project.workspace_id,
        user_id: userId,
        action_type: 'added_attachment',
        entity_type: 'task',
        entity_id: taskId,
        metadata: { file_name: attachmentName, type: 'link', url },
      });
    }

    return { ...attachment, url };
  } catch (error: any) {
    console.error('addTaskAttachmentLink error:', error?.message || JSON.stringify(error, null, 2));
    throw error;
  }
}

/**
 * Delete a task attachment
 * Removes from storage if it's a file
 * Logs activity
 * @param attachmentId - Attachment ID
 * @param userId - User ID requesting deletion
 * @returns True if successful
 */
export async function deleteTaskAttachment(attachmentId: string, userId: string) {
  try {
    // Get attachment info
    const { data: attachment, error: fetchError } = await supabase
      .from('task_attachments')
      .select('*')
      .eq('id', attachmentId)
      .single();

    if (fetchError) throw fetchError;
    if (!attachment) throw new Error('Attachment not found');

    // Check permission (user owns it or is team leader)
    if (attachment.user_id !== userId) {
      const { data: task } = await supabase
        .from('tasks')
        .select('project:projects!inner(team_id)')
        .eq('id', attachment.task_id)
        .single();

      if (task && (task as any).project?.team_id) {
        const { data: teamMember } = await supabase
          .from('team_members')
          .select('role')
          .eq('team_id', (task as any).project.team_id)
          .eq('user_id', userId)
          .single();

        if (teamMember?.role !== 'leader') {
          throw new Error('You do not have permission to delete this attachment');
        }
      } else {
        throw new Error('You do not have permission to delete this attachment');
      }
    }

    // Delete from storage only if it's a file upload (not external URL)
    if (attachment.file_path) {
      const { error: storageError } = await supabase.storage
        .from('task-attachments')
        .remove([attachment.file_path]);

      if (storageError) {
        console.warn('Storage delete error (file may not exist):', storageError);
      }
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('task_attachments')
      .delete()
      .eq('id', attachmentId);

    if (dbError) throw dbError;

    // Log activity
    const { data: task } = await supabase
      .from('tasks')
      .select('project:projects!inner(workspace_id)')
      .eq('id', attachment.task_id)
      .single();

    if (task && (task as any).project?.workspace_id) {
      await logActivity({
        workspace_id: (task as any).project.workspace_id,
        user_id: userId,
        action_type: 'removed_attachment',
        entity_type: 'task',
        entity_id: attachment.task_id,
        metadata: { file_name: attachment.file_name },
      });
    }

    return true;
  } catch (error: any) {
    console.error('deleteTaskAttachment error:', error?.message || JSON.stringify(error, null, 2));
    throw error;
  }
}

// =====================================================
// TASK SUBTASK FUNCTIONS
// =====================================================

/**
 * Get subtasks for a task
 * @param taskId - Task ID
 * @returns List of subtasks ordered by position
 */
export async function getTaskSubtasks(taskId: string) {
  try {
    const { data, error } = await supabase
      .from('task_subtasks')
      .select('*')
      .eq('task_id', taskId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('getTaskSubtasks error:', error?.message || JSON.stringify(error, null, 2));
    throw error;
  }
}

/**
 * Create a subtask
 * Logs activity
 * @param taskId - Task ID
 * @param title - Subtask title
 * @param userId - Creator's user ID
 * @param position - Optional position (auto-calculated if omitted)
 * @returns Created subtask
 */
export async function createTaskSubtask(
  taskId: string,
  title: string,
  userId: string,
  position?: number
) {
  try {
    // Get max position if not provided
    if (position === undefined) {
      const { data: existing } = await supabase
        .from('task_subtasks')
        .select('position')
        .eq('task_id', taskId)
        .order('position', { ascending: false })
        .limit(1)
        .single();

      position = existing ? (existing as any).position + 1 : 0;
    }

    const { data, error } = await supabase
      .from('task_subtasks')
      .insert({
        task_id: taskId,
        title: title.trim(),
        created_by: userId,
        position: position,
      })
      .select()
      .single();

    if (error) throw error;

    // Log activity
    const { data: task } = await supabase
      .from('tasks')
      .select('project:projects!inner(workspace_id), title')
      .eq('id', taskId)
      .single();

    if (task && (task as any).project?.workspace_id) {
      await logActivity({
        workspace_id: (task as any).project.workspace_id,
        user_id: userId,
        action_type: 'added_subtask',
        entity_type: 'task',
        entity_id: taskId,
        metadata: { subtask_title: title.trim(), task_title: (task as any).title },
      });
    }

    return data;
  } catch (error: any) {
    console.error('createTaskSubtask error:', error?.message || JSON.stringify(error, null, 2));
    throw error;
  }
}

/**
 * Update a subtask
 * Logs activity for completion status changes
 * @param subtaskId - Subtask ID
 * @param updates - Fields to update (title, completed, position)
 * @returns Updated subtask
 */
export async function updateTaskSubtask(
  subtaskId: string,
  updates: { title?: string; completed?: boolean; position?: number }
) {
  try {
    const { data, error } = await supabase
      .from('task_subtasks')
      .update(updates)
      .eq('id', subtaskId)
      .select()
      .single();

    if (error) throw error;

    // Log activity if completed status changed
    if (updates.completed !== undefined) {
      const { data: subtask } = await supabase
        .from('task_subtasks')
        .select('task_id')
        .eq('id', subtaskId)
        .single();

      if (subtask) {
        const { data: task } = await supabase
          .from('tasks')
          .select('project:projects!inner(workspace_id), title')
          .eq('id', subtask.task_id)
          .single();

        if (task && (task as any).project?.workspace_id) {
          const {
            data: { user: authUser },
          } = await supabase.auth.getUser();
          if (authUser) {
            await logActivity({
              workspace_id: (task as any).project.workspace_id,
              user_id: authUser.id,
              action_type: updates.completed ? 'completed_subtask' : 'uncompleted_subtask',
              entity_type: 'task',
              entity_id: subtask.task_id,
              metadata: { task_title: (task as any).title },
            });
          }
        }
      }
    }

    return data;
  } catch (error: any) {
    console.error('updateTaskSubtask error:', error?.message || JSON.stringify(error, null, 2));
    throw error;
  }
}

/**
 * Delete a subtask
 * Logs activity
 * @param subtaskId - Subtask ID
 * @returns True if successful
 */
export async function deleteTaskSubtask(subtaskId: string) {
  try {
    const { data: subtask } = await supabase
      .from('task_subtasks')
      .select('task_id, title')
      .eq('id', subtaskId)
      .single();

    if (!subtask) throw new Error('Subtask not found');

    const { error } = await supabase.from('task_subtasks').delete().eq('id', subtaskId);

    if (error) throw error;

    // Log activity
    const { data: task } = await supabase
      .from('tasks')
      .select('project:projects!inner(workspace_id), title')
      .eq('id', (subtask as any).task_id)
      .single();

    if (task && (task as any).project?.workspace_id) {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (authUser) {
        await logActivity({
          workspace_id: (task as any).project.workspace_id,
          user_id: authUser.id,
          action_type: 'removed_subtask',
          entity_type: 'task',
          entity_id: (subtask as any).task_id,
          metadata: {
            subtask_title: (subtask as any).title,
            task_title: (task as any).title,
          },
        });
      }
    }

    return true;
  } catch (error: any) {
    console.error('deleteTaskSubtask error:', error?.message || JSON.stringify(error, null, 2));
    throw error;
  }
}
