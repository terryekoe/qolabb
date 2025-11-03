/**
 * Actionable Recommendations Service
 * Generates specific, actionable recommendations for analytics dashboard
 */

import { supabase } from '@/lib/supabase';

export interface ActionableRecommendation {
  id: string;
  type: 'task_redistribution' | 'workload_balance' | 'support_needed' | 'deadline_warning';
  title: string;
  description: string;
  specificAction: string;
  affectedEntities: {
    from?: { type: 'team' | 'user'; name: string; id: string };
    to?: { type: 'team' | 'user'; name: string; id: string };
    task?: { title: string; id: string };
  };
  impact: 'high' | 'medium' | 'low';
}

/**
 * Generate actionable recommendations based on team analytics
 */
export async function generateActionableRecommendations(
  workspaceId: string,
  teamId?: string
): Promise<ActionableRecommendation[]> {
  const recommendations: ActionableRecommendation[] = [];

  // Get team members and their task counts
  let teamMembersQuery;
  
  if (teamId) {
    teamMembersQuery = supabase
      .from('team_members')
      .select('user_id, team_id, profiles(full_name, id)')
      .eq('team_id', teamId);
  } else {
    // Get all teams in workspace
    const { data: teams } = await supabase.from('teams').select('id').eq('workspace_id', workspaceId);
    if (teams && teams.length > 0) {
      teamMembersQuery = supabase
        .from('team_members')
        .select('user_id, team_id, profiles(full_name, id)')
        .in('team_id', teams.map((t) => t.id));
    } else {
      teamMembersQuery = supabase
        .from('team_members')
        .select('user_id, team_id, profiles(full_name, id)')
        .limit(0);
    }
  }

  const { data: teamMembers } = await teamMembersQuery;

  if (!teamMembers || teamMembers.length === 0) return recommendations;

  const userIds = teamMembers.map((m) => m.user_id);

  // Get task counts per user
  const { data: taskAssignees } = await supabase
    .from('task_assignees')
    .select('user_id, tasks!inner(id, title, status, priority, project_id, projects(name))')
    .in('user_id', userIds)
    .eq('tasks.status', 'in_progress');

  // Calculate task distribution
  const taskCounts: Record<string, { count: number; tasks: any[]; userName: string }> = {};
  
  teamMembers.forEach((member) => {
    const userTasks = taskAssignees?.filter((ta) => ta.user_id === member.user_id) || [];
    taskCounts[member.user_id] = {
      count: userTasks.length,
      tasks: userTasks.map((ta) => ta.tasks),
      userName: (member.profiles as any)?.full_name || 'Unknown',
    };
  });

  const avgTasks = Object.values(taskCounts).reduce((sum, tc) => sum + tc.count, 0) / Object.values(taskCounts).length;

  // Find overloaded and underutilized members
  const sortedByTasks = Object.entries(taskCounts).sort((a, b) => b[1].count - a[1].count);
  const overloaded = sortedByTasks.find(([_, tc]) => tc.count > avgTasks * 1.5);
  const underutilized = sortedByTasks.reverse().find(([_, tc]) => tc.count < avgTasks * 0.7 && tc.count > 0);

  // Generate task redistribution recommendation
  if (overloaded && underutilized && overloaded[1].tasks.length > 0) {
    const taskToMove = overloaded[1].tasks[0];
    recommendations.push({
      id: `redistribute-${overloaded[0]}-${underutilized[0]}-${taskToMove.id}`,
      type: 'task_redistribution',
      title: 'Task Redistribution Needed',
      description: `${overloaded[1].userName} is overloaded with ${overloaded[1].count} tasks, while ${underutilized[1].userName} has capacity.`,
      specificAction: `${overloaded[1].userName} is overloaded with ${overloaded[1].count} tasks—swap "${taskToMove.title}" to ${underutilized[1].userName} to balance workload.`,
      affectedEntities: {
        from: {
          type: 'user',
          name: overloaded[1].userName,
          id: overloaded[0],
        },
        to: {
          type: 'user',
          name: underutilized[1].userName,
          id: underutilized[0],
        },
        task: {
          title: taskToMove.title,
          id: taskToMove.id,
        },
      },
      impact: overloaded[1].count > avgTasks * 2 ? 'high' : 'medium',
    });
  }

  // Generate workload balance recommendation
  if (overloaded && overloaded[1].count > avgTasks * 2) {
    recommendations.push({
      id: `workload-balance-${overloaded[0]}`,
      type: 'workload_balance',
      title: 'Critical Workload Imbalance',
      description: `${overloaded[1].userName} has ${overloaded[1].count} tasks, more than double the team average.`,
      specificAction: `Immediately redistribute ${Math.ceil((overloaded[1].count - avgTasks) / 2)} tasks from ${overloaded[1].userName} to balance the workload.`,
      affectedEntities: {
        from: {
          type: 'user',
          name: overloaded[1].userName,
          id: overloaded[0],
        },
      },
      impact: 'high',
    });
  }

  return recommendations;
}

/**
 * Execute a task redistribution recommendation
 */
export async function executeTaskRedistribution(
  taskId: string,
  fromUserId: string,
  toUserId: string
): Promise<boolean> {
  try {
    // Remove assignee from current user
    await supabase.from('task_assignees').delete().eq('task_id', taskId).eq('user_id', fromUserId);

    // Add assignee to new user
    await supabase.from('task_assignees').insert({
      task_id: taskId,
      user_id: toUserId,
    });

    // Log the action
    await supabase.from('activity_log').insert({
      action_type: 'task_reassigned',
      description: `Task redistributed for workload balance`,
      metadata: {
        task_id: taskId,
        from_user_id: fromUserId,
        to_user_id: toUserId,
        reason: 'workload_balance',
      },
    });

    return true;
  } catch (error) {
    console.error('Failed to execute task redistribution:', error);
    return false;
  }
}
