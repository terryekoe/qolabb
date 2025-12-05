/**
 * Participation Alerts Service
 * Generates proactive alerts for workload imbalances and participation issues
 */

import { supabase } from '@/lib/supabase';

export interface ParticipationAlertData {
  type: 'workload_imbalance' | 'low_participation' | 'overloaded' | 'underutilized';
  severity: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  affectedUserIds: string[];
  recommendations: string[];
}

interface TeamMemberWorkload {
  userId: string;
  userName: string;
  taskCount: number;
  contributionCount: number;
  avgContribution: number;
}

/**
 * Analyze team workload and generate alerts
 */
export async function analyzeTeamWorkload(
  teamId: string,
  workspaceId: string
): Promise<ParticipationAlertData[]> {
  // Get team members and their workloads
  const { data: teamMembers } = await supabase
    .from('team_members')
    .select('user_id, profiles(full_name, id)')
    .eq('team_id', teamId);

  if (!teamMembers || teamMembers.length === 0) return [];

  // Get task counts per member
  const { data: tasks } = await supabase
    .from('task_assignees')
    .select('user_id, tasks!inner(id, status)')
    .eq('tasks.status', 'in_progress')
    .in(
      'user_id',
      teamMembers.map((m) => m.user_id)
    );

  // Get contribution counts
  const { data: contributions } = await supabase
    .from('contributions')
    .select('user_id')
    .in(
      'user_id',
      teamMembers.map((m) => m.user_id)
    );

  // Calculate workloads
  const workloads: TeamMemberWorkload[] = teamMembers.map((member) => {
    const taskCount = tasks?.filter((t) => t.user_id === member.user_id).length || 0;
    const contributionCount =
      contributions?.filter((c) => c.user_id === member.user_id).length || 0;

    return {
      userId: member.user_id,
      userName: (member.profiles as any)?.full_name || 'Unknown',
      taskCount,
      contributionCount,
      avgContribution: contributionCount,
    };
  });

  const avgTasks = workloads.reduce((sum, w) => sum + w.taskCount, 0) / workloads.length;
  const avgContributions =
    workloads.reduce((sum, w) => sum + w.contributionCount, 0) / workloads.length;

  const alerts: ParticipationAlertData[] = [];

  // Check for overloaded members
  const overloaded = workloads.filter((w) => w.taskCount > avgTasks * 1.5);
  if (overloaded.length > 0) {
    alerts.push({
      type: 'overloaded',
      severity: overloaded.some((w) => w.taskCount > avgTasks * 2) ? 'high' : 'medium',
      title: 'Team Member Overloaded',
      message: `${overloaded.map((w) => w.userName).join(', ')} ${overloaded.length === 1 ? 'has' : 'have'} ${overloaded[0].taskCount} task${overloaded[0].taskCount !== 1 ? 's' : ''}, which is more than average.`,
      affectedUserIds: overloaded.map((w) => w.userId),
      recommendations: [
        `Consider redistributing ${Math.ceil((overloaded[0].taskCount - avgTasks) / 2)} tasks from ${overloaded[0].userName} to other team members.`,
        'Review task priorities and defer low-priority items.',
        'Check if ${overloaded[0].userName} needs additional support or resources.',
      ],
    });
  }

  // Check for underutilized members
  const underutilized = workloads.filter((w) => w.taskCount < avgTasks * 0.5 && w.taskCount > 0);
  if (underutilized.length > 0) {
    alerts.push({
      type: 'underutilized',
      severity: 'medium',
      title: 'Team Member Underutilized',
      message: `${underutilized.map((w) => w.userName).join(', ')} ${underutilized.length === 1 ? 'has' : 'have'} fewer tasks than average.`,
      affectedUserIds: underutilized.map((w) => w.userId),
      recommendations: [
        `Consider assigning more tasks to ${underutilized[0].userName} to balance the workload.`,
        'Check if they need help getting started or understanding requirements.',
        'Ensure they have the necessary resources and context.',
      ],
    });
  }

  // Check for workload imbalance
  if (workloads.length > 1) {
    const maxTasks = Math.max(...workloads.map((w) => w.taskCount));
    const minTasks = Math.min(...workloads.map((w) => w.taskCount));
    const imbalanceRatio = maxTasks / (minTasks || 1);

    if (imbalanceRatio > 2) {
      alerts.push({
        type: 'workload_imbalance',
        severity: imbalanceRatio > 3 ? 'high' : 'medium',
        title: 'Workload Imbalance Detected',
        message: `Task distribution is uneven. The busiest member has ${maxTasks} task${maxTasks !== 1 ? 's' : ''} while others have fewer.`,
        affectedUserIds: workloads.map((w) => w.userId),
        recommendations: [
          'Redistribute tasks to create a more balanced workload.',
          'Review team capacity and adjust assignments accordingly.',
          'Consider setting WIP limits to prevent overload.',
        ],
      });
    }
  }

  // Check for low participation
  const lowParticipation = workloads.filter((w) => w.contributionCount < avgContributions * 0.5);
  if (lowParticipation.length > 0 && avgContributions > 0) {
    alerts.push({
      type: 'low_participation',
      severity: lowParticipation.some((w) => w.contributionCount === 0) ? 'high' : 'medium',
      title: 'Low Participation Detected',
      message: `${lowParticipation.map((w) => w.userName).join(', ')} ${lowParticipation.length === 1 ? 'has' : 'have'} logged fewer contributions than average.`,
      affectedUserIds: lowParticipation.map((w) => w.userId),
      recommendations: [
        `Reach out to ${lowParticipation[0].userName} to understand any challenges they're facing.`,
        'Provide guidance on how to log contributions effectively.',
        'Check if they need additional support or resources.',
      ],
    });
  }

  return alerts;
}

/**
 * Save alert to database
 */
export async function saveParticipationAlert(
  workspaceId: string,
  teamId: string,
  alert: ParticipationAlertData
) {
  const { data, error } = await supabase.from('participation_alerts').insert({
    workspace_id: workspaceId,
    team_id: teamId,
    alert_type: alert.type,
    severity: alert.severity,
    title: alert.title,
    message: alert.message,
    affected_user_ids: alert.affectedUserIds,
    recommendations: alert.recommendations,
    status: 'active',
  });

  if (error) {
    console.error('Failed to save participation alert:', error);
    return null;
  }

  return data;
}

/**
 * Get active alerts for a workspace or team
 */
export async function getParticipationAlerts(workspaceId: string, teamId?: string) {
  let query = supabase
    .from('participation_alerts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (teamId) {
    query = query.eq('team_id', teamId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch participation alerts:', error);
    return [];
  }

  return data || [];
}
