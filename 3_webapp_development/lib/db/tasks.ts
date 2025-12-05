// =====================================================
// Task Database Functions
// Functions for task CRUD, assignments, attachments, and subtasks
// =====================================================

import { supabase } from '../supabase';
import type { Task, TaskInsert } from '../types/database';
import { logActivity } from './activity';
import {
  createTaskAssignmentNotification,
  createTaskCompletedNotification,
} from './notifications';

// =====================================================
// CORE TASK FUNCTIONS
// =====================================================

/**
 * Create a new task
 * Logs activity and notifies assignee if applicable
 * @param task - Task data to insert
 * @param userId - Creator's user ID
 * @returns The created task
 */
export async function createTask(task: TaskInsert, userId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...task, created_by: userId } as any)
    .select()
    .single();

  if (error) throw error;

  // Log activity
  const { data: project } = await supabase
    .from('projects')
    .select('workspace_id')
    .eq('id', task.project_id)
    .single();

  if (project) {
    await logActivity({
      workspace_id: (project as any).workspace_id,
      user_id: userId,
      action_type: 'created_task',
      entity_type: 'task',
      entity_id: (data as any).id,
      metadata: { task_title: task.title, assigned_to: task.assigned_to },
    });

    // Create notification if task is assigned during creation (old single assignee system)
    if (task.assigned_to && task.assigned_to !== userId) {
      const { data: projectData } = await supabase
        .from('projects')
        .select('name')
        .eq('id', task.project_id)
        .single();

      await createTaskAssignmentNotification(
        task.assigned_to,
        task.title,
        (data as any).id,
        userId,
        projectData?.name
      );
    }
  }

  return data as Task;
}

/**
 * Get all tasks for a project
 * @param projectId - Project ID
 * @returns List of tasks with assignees and creator details
 */
export async function getProjectTasks(projectId: string) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(
        `
        *,
        assignee:profiles!assigned_to(*),
        creator:profiles!created_by(*),
        assignees:task_assignees(
          id,
          user_id,
          assigned_at,
          user:profiles!user_id(id, full_name, avatar_url)
        )
      `
      )
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('getProjectTasks error:', JSON.stringify(error, null, 2));
      throw error;
    }
    return data || [];
  } catch (error: any) {
    console.error('getProjectTasks catch:', error?.message || error);
    throw error;
  }
}

/**
 * Get all tasks assigned to a user
 * Handles both single assignee (legacy) and multiple assignees
 * @param userId - User ID
 * @returns List of unique tasks sorted by creation date
 */
export async function getUserTasks(userId: string) {
  // Get tasks where user is assigned (either via old assigned_to or new task_assignees)
  const { data: tasksByOld, error: error1 } = await supabase
    .from('tasks')
    .select(
      `
      *,
      project:projects(*),
      assignee:profiles!assigned_to(*),
      assignees:task_assignees(
        id,
        user_id,
        assigned_at,
        user:profiles!user_id(id, full_name, avatar_url)
      )
    `
    )
    .eq('assigned_to', userId);

  const { data: tasksByNew, error: error2 } = await supabase
    .from('task_assignees')
    .select(
      `
      task:tasks(
        *,
        project:projects(*),
        assignee:profiles!assigned_to(*),
        assignees:task_assignees(
          id,
          user_id,
          assigned_at,
          user:profiles!user_id(id, full_name, avatar_url)
        )
      )
    `
    )
    .eq('user_id', userId);

  if (error1 || error2) {
    throw error1 || error2;
  }

  // Combine and deduplicate
  const allTasks = [
    ...(tasksByOld || []),
    ...(tasksByNew?.map((ta: any) => ta.task).filter(Boolean) || []),
  ];

  // Deduplicate by task id
  const uniqueTasks = Array.from(new Map(allTasks.map((task: any) => [task.id, task])).values());

  return uniqueTasks.sort(
    (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/**
 * Get count of pending (non-completed) tasks assigned to a user
 * @param userId - User ID
 * @returns Count of pending tasks
 */
export async function getUserPendingTasksCount(userId: string) {
  try {
    // Get the actual tasks and deduplicate
    const { data: tasksByOld } = await supabase
      .from('tasks')
      .select('id')
      .eq('assigned_to', userId)
      .neq('status', 'completed');

    const { data: tasksByNew } = await supabase
      .from('task_assignees')
      .select('task:tasks!inner(id)')
      .eq('user_id', userId)
      .neq('task.status', 'completed');

    // Combine and deduplicate task IDs
    const allTaskIds = new Set<string>();
    tasksByOld?.forEach((task: any) => allTaskIds.add(task.id));
    tasksByNew?.forEach((ta: any) => {
      if (ta.task?.id) allTaskIds.add(ta.task.id);
    });

    return allTaskIds.size;
  } catch (error: any) {
    console.error(
      'getUserPendingTasksCount error:',
      error?.message || JSON.stringify(error, null, 2)
    );
    return 0;
  }
}

/**
 * Update a task
 * Logs activity and sends notifications for status changes
 * @param taskId - Task ID
 * @param updates - Fields to update
 * @returns Updated task
 */
export async function updateTask(taskId: string, updates: Partial<Task>) {
  try {
    // Get current task to detect changes
    const { data: currentTask } = await supabase
      .from('tasks')
      .select(
        `
        *,
        project:projects!project_id(id, workspace_id)
      `
      )
      .eq('id', taskId)
      .single();

    const { data, error } = await supabase
      .from('tasks')
      .update(updates as any)
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      // Provide more context in the error
      const enhancedError = new Error(error.message || 'Failed to update task');
      (enhancedError as any).code = error.code;
      (enhancedError as any).details = error.details;
      (enhancedError as any).hint = error.hint;
      (enhancedError as any).taskId = taskId;
      (enhancedError as any).updates = updates;
      throw enhancedError;
    }

    if (!data) {
      throw new Error(`Task with id ${taskId} not found or update failed`);
    }

    // Log activity for significant changes
    if (currentTask && (currentTask as any).project?.workspace_id) {
      const workspaceId = (currentTask as any).project.workspace_id;

      // Get current user from auth
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      const userId = authUser?.id || currentTask.created_by || '';

      if (!userId) {
        console.warn('No user ID available for activity logging');
      }

      // Log status change
      if (updates.status && updates.status !== currentTask.status && userId) {
        await logActivity({
          workspace_id: workspaceId,
          user_id: userId,
          action_type: 'status_changed',
          entity_type: 'task',
          entity_id: taskId,
          metadata: {
            old_status: currentTask.status,
            new_status: updates.status,
            task_title: data.title,
          },
        });

        // Get project name for notifications
        const { data: project } = await supabase
          .from('projects')
          .select('name, team_id, workspace_id')
          .eq('id', data.project_id)
          .single();

        const projectName = project?.name;

        // Create notification for task status change
        if (updates.status === 'completed' && currentTask.status !== 'completed') {
          // Notify task assignees and team members about completion
          const { data: assignees } = await supabase
            .from('task_assignees')
            .select('user_id')
            .eq('task_id', taskId);

          const assigneeIds = assignees?.map((a) => a.user_id) || [];
          // Include old assigned_to for backward compatibility
          if (currentTask.assigned_to) {
            assigneeIds.push(currentTask.assigned_to);
          }

          // Get team members if project has a team
          let teamMemberIds: string[] = [];
          if (project?.team_id) {
            const { data: teamMembers } = await supabase
              .from('team_members')
              .select('user_id')
              .eq('team_id', project.team_id);
            teamMemberIds = teamMembers?.map((m) => m.user_id) || [];
          }

          // Combine unique IDs
          const uniqueIds = [...new Set([...assigneeIds, ...teamMemberIds])].filter(
            (id) => id !== userId
          );

          await Promise.all(
            uniqueIds.map((notifyUserId) =>
              createTaskCompletedNotification(notifyUserId, data.title, taskId, userId, projectName)
            )
          );

          // Send motivational message to user who completed the task
          if (userId && project) {
            try {
              const { checkTaskCompletionTriggers } = await import(
                '../services/motivationalMessageTriggers'
              );
              await checkTaskCompletionTriggers(
                {
                  userId,
                  workspaceId: (project as any).workspace_id,
                  teamId: project.team_id,
                },
                taskId
              );
            } catch (error) {
              // Silently fail - motivational messages are nice-to-have
              console.error('Error sending motivational message:', error);
            }
          }
        }
      }

      // Log assignment change (old single assignee system)
      if (
        updates.assigned_to !== undefined &&
        updates.assigned_to !== currentTask.assigned_to &&
        userId
      ) {
        const assigneeName = updates.assigned_to
          ? (
              await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', updates.assigned_to)
                .single()
            ).data?.full_name || 'someone'
          : null;

        await logActivity({
          workspace_id: workspaceId,
          user_id: userId,
          action_type: 'assigned_task',
          entity_type: 'task',
          entity_id: taskId,
          metadata: {
            assignee_id: updates.assigned_to,
            assignee_name: assigneeName,
            task_title: data.title,
          },
        });

        // Create notification for newly assigned user (old system)
        if (updates.assigned_to) {
          const { data: project } = await supabase
            .from('projects')
            .select('name')
            .eq('id', data.project_id)
            .single();

          await createTaskAssignmentNotification(
            updates.assigned_to,
            data.title,
            taskId,
            userId,
            project?.name
          );
        }
      }

      // Log general update (if not already logged above)
      if (!updates.status && updates.assigned_to === undefined && userId) {
        await logActivity({
          workspace_id: workspaceId,
          user_id: userId,
          action_type: 'updated_task',
          entity_type: 'task',
          entity_id: taskId,
          metadata: {
            task_title: data.title,
            changes: Object.keys(updates),
          },
        });
      }
    }

    return data as Task;
  } catch (error: any) {
    // Re-throw with additional context
    if (error.message && error.code) {
      throw error; // Already enhanced
    }

    // Wrap unknown errors
    const wrappedError = new Error(error?.message || 'Failed to update task');
    (wrappedError as any).originalError = error;
    (wrappedError as any).taskId = taskId;
    (wrappedError as any).updates = updates;
    throw wrappedError;
  }
}

/**
 * Delete a task
 * @param taskId - Task ID
 */
export async function deleteTask(taskId: string) {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);

  if (error) throw error;
}

/**
 * Get task assignees
 * @param taskId - Task ID
 * @returns List of assignees with profile data
 */
export async function getTaskAssignees(taskId: string) {
  const { data, error } = await supabase
    .from('task_assignees')
    .select(
      `
      id,
      user_id,
      assigned_at,
      user:profiles!user_id(id, full_name, avatar_url, email)
    `
    )
    .eq('task_id', taskId);

  if (error) throw error;
  return data || [];
}
