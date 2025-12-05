// =====================================================
// Analytics Database Functions
// Functions for workspace, team, and user analytics
// =====================================================

import { supabase } from '../supabase';

/**
 * Get basic statistics for a workspace
 * @param workspaceId - Workspace ID
 * @returns Object containing active projects, total members, completed tasks, and avg participation
 */
export async function getWorkspaceStats(workspaceId: string) {
  try {
    // Get active projects count
    const { count: projectCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'active');

    // Get total members (excluding instructors)
    const { count: memberCount } = await supabase
      .from('workspace_members')
      .select('*, profiles!inner(role)', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .neq('profiles.role', 'instructor');

    // Get completed tasks
    const { count: completedTasks } = await supabase
      .from('tasks')
      .select('*, project:projects!inner(*)', { count: 'exact', head: true })
      .eq('status', 'completed')
      .eq('project.workspace_id', workspaceId);

    // Calculate average participation from contributions
    const { data: contributions } = await supabase
      .from('contributions')
      .select('hours_spent, project:projects!inner(workspace_id)')
      .eq('project.workspace_id', workspaceId);

    const totalHours = contributions?.reduce((sum, c) => sum + (c.hours_spent || 0), 0) || 0;
    const avgParticipation =
      memberCount && memberCount > 0 ? Math.round((totalHours / memberCount) * 10) / 10 : 0;

    return {
      activeProjects: projectCount || 0,
      totalMembers: memberCount || 0,
      tasksCompleted: completedTasks || 0,
      avgParticipation,
    };
  } catch (error: any) {
    console.error('getWorkspaceStats error:', error?.message || JSON.stringify(error, null, 2));
    return {
      activeProjects: 0,
      totalMembers: 0,
      tasksCompleted: 0,
      avgParticipation: 0,
    };
  }
}

/**
 * Get detailed analytics for a workspace
 * Includes team data, contribution stats, and participation metrics
 * @param workspaceId - Workspace ID
 * @returns Comprehensive analytics object
 */
export async function getWorkspaceAnalytics(workspaceId: string) {
  try {
    const stats = await getWorkspaceStats(workspaceId);

    // Get all teams with member counts
    const { data: teams } = await supabase
      .from('teams')
      .select(
        `
        id,
        name,
        team_members(count)
      `
      )
      .eq('workspace_id', workspaceId);

    // Get all contributions with user info
    const { data: contributionsData } = await supabase
      .from('contributions')
      .select(
        `
        id,
        user_id,
        task_id,
        hours_spent,
        contribution_type,
        created_at,
        project:projects!inner(id, workspace_id, team_id)
      `
      )
      .eq('project.workspace_id', workspaceId);

    // Get all tasks with status
    const { data: tasksData } = await supabase
      .from('tasks')
      .select(
        `
        id,
        status,
        assigned_to,
        project:projects!inner(id, workspace_id)
      `
      )
      .eq('project.workspace_id', workspaceId);

    // Normalize data - handle arrays from Supabase joins
    const contributions = (contributionsData || []).map((contrib: any) => {
      let project = contrib.project;
      if (Array.isArray(project)) {
        project = project[0] || null;
      }
      return {
        ...contrib,
        project: project,
      };
    });

    const tasks = (tasksData || []).map((task: any) => {
      let project = task.project;
      if (Array.isArray(project)) {
        project = project[0] || null;
      }
      return {
        ...task,
        project: project,
      };
    });

    // Calculate participation metrics (unified: contributions + tasks)
    const participationByUser: Record<
      string,
      { hours: number; contributions: number; tasksCompleted: number }
    > = {};

    // Initialize all users who have tasks
    tasks?.forEach((task) => {
      if (task.assigned_to && !participationByUser[task.assigned_to]) {
        participationByUser[task.assigned_to] = { hours: 0, contributions: 0, tasksCompleted: 0 };
      }
    });

    // Aggregate contributions
    contributions?.forEach((contrib) => {
      if (!participationByUser[contrib.user_id]) {
        participationByUser[contrib.user_id] = { hours: 0, contributions: 0, tasksCompleted: 0 };
      }
      participationByUser[contrib.user_id].hours += contrib.hours_spent || 0;
      participationByUser[contrib.user_id].contributions += 1;
    });

    // Enhance with completed tasks (estimate hours for tasks without contributions)
    const taskIdsWithContributions = new Set(
      contributions?.filter((c: any) => c.task_id).map((c: any) => c.task_id) || []
    );

    tasks?.forEach((task) => {
      if (task.status === 'completed' && task.assigned_to) {
        if (!participationByUser[task.assigned_to]) {
          participationByUser[task.assigned_to] = { hours: 0, contributions: 0, tasksCompleted: 0 };
        }
        participationByUser[task.assigned_to].tasksCompleted += 1;

        // If completed task has no contribution, estimate hours (1.5h per task)
        if (!taskIdsWithContributions.has(task.id)) {
          participationByUser[task.assigned_to].hours += 1.5;
        }
      }
    });

    const participationScores = Object.values(participationByUser).map((p) => p.hours);
    const avgParticipation =
      participationScores.length > 0
        ? participationScores.reduce((a, b) => a + b, 0) / participationScores.length
        : 0;

    // Task completion rate
    const totalTasks = tasks?.length || 0;
    const completedTasks = tasks?.filter((t) => t.status === 'completed').length || 0;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      ...stats,
      teams: teams || [],
      totalTeams: teams?.length || 0,
      totalContributions: contributions?.length || 0,
      totalHours: contributions?.reduce((sum, c) => sum + (c.hours_spent || 0), 0) || 0,
      participationByUser,
      completionRate,
      avgParticipation: Math.round(avgParticipation * 10) / 10,
    };
  } catch (error: any) {
    console.error('getWorkspaceAnalytics error:', error?.message || JSON.stringify(error, null, 2));
    throw error;
  }
}

/**
 * Get analytics for a specific team
 * Includes member participation, project stats, and fairness score
 * @param teamId - Team ID
 * @returns Team analytics object
 */
export async function getTeamAnalytics(teamId: string) {
  try {
    // Get team with members (excluding instructors)
    const { data: team } = await supabase
      .from('teams')
      .select(
        `
        id,
        name,
        workspace_id,
        team_members(
          id,
          user_id,
          role,
          user:profiles!user_id(id, full_name, avatar_url, role)
        )
      `
      )
      .eq('id', teamId)
      .single();

    if (!team) throw new Error('Team not found');

    // Get team projects
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, status')
      .eq('team_id', teamId);

    // Get contributions for team projects
    const projectIds = projects?.map((p) => p.id) || [];
    const { data: contributions } =
      projectIds.length > 0
        ? await supabase
            .from('contributions')
            .select('id, user_id, task_id, project_id, hours_spent, contribution_type, created_at')
            .in('project_id', projectIds)
        : { data: [] };

    // Get tasks for team projects
    const { data: tasks } =
      projectIds.length > 0
        ? await supabase.from('tasks').select('*').in('project_id', projectIds)
        : { data: [] };

    // Calculate participation by member (excluding instructors)
    const memberParticipation: Record<
      string,
      {
        userId: string;
        name: string;
        hours: number;
        contributions: number;
        tasksCompleted: number;
        tasksAssigned: number;
      }
    > = {};

    // Filter out instructors from team members
    const studentMembers =
      team.team_members?.filter((member: any) => {
        const userRole = member.user?.role?.toLowerCase() || '';
        return userRole !== 'instructor';
      }) || [];

    // Initialize members (only students, not instructors)
    studentMembers.forEach((member: any) => {
      memberParticipation[member.user_id] = {
        userId: member.user_id,
        name: member.user?.full_name || 'Unknown',
        hours: 0,
        contributions: 0,
        tasksCompleted: 0,
        tasksAssigned: 0,
      };
    });

    // Aggregate contributions
    contributions?.forEach((contrib) => {
      if (memberParticipation[contrib.user_id]) {
        memberParticipation[contrib.user_id].hours += contrib.hours_spent || 0;
        memberParticipation[contrib.user_id].contributions += 1;
      }
    });

    // Aggregate tasks and enhance hours with completed tasks
    const taskIdsWithContributions = new Set(
      contributions?.filter((c: any) => c.task_id).map((c: any) => c.task_id) || []
    );

    tasks?.forEach((task) => {
      if (task.assigned_to && memberParticipation[task.assigned_to]) {
        memberParticipation[task.assigned_to].tasksAssigned += 1;
        if (task.status === 'completed') {
          memberParticipation[task.assigned_to].tasksCompleted += 1;

          // If completed task has no contribution, estimate hours (1.5h per task)
          if (!taskIdsWithContributions.has(task.id)) {
            memberParticipation[task.assigned_to].hours += 1.5;
          }
        }
      }
    });

    const participationData = Object.values(memberParticipation);
    const totalHours = participationData.reduce((sum, m) => sum + m.hours, 0);
    const avgHours = participationData.length > 0 ? totalHours / participationData.length : 0;

    // Calculate fairness score (how balanced participation is)
    // Lower variance = more fair
    const hoursArray = participationData.map((m) => m.hours);
    const mean = avgHours;
    const variance =
      hoursArray.length > 0
        ? hoursArray.reduce((sum, h) => sum + Math.pow(h - mean, 2), 0) / hoursArray.length
        : 0;
    const fairnessScore =
      mean > 0 ? Math.max(0, Math.min(100, Math.round(100 - (variance / mean) * 10))) : 0;

    return {
      team: {
        id: team.id,
        name: team.name,
        workspaceId: team.workspace_id,
      },
      members: participationData,
      projects: projects || [],
      totalProjects: projects?.length || 0,
      totalContributions: contributions?.length || 0,
      totalHours,
      avgHours: Math.round(avgHours * 10) / 10,
      totalTasks: tasks?.length || 0,
      completedTasks: tasks?.filter((t) => t.status === 'completed').length || 0,
      fairnessScore,
    };
  } catch (error: any) {
    console.error('getTeamAnalytics error:', error?.message || JSON.stringify(error, null, 2));
    throw error;
  }
}

/**
 * Get personal analytics for a user
 * Includes contribution breakdown, weekly hours, and participation score
 * @param userId - User ID
 * @param workspaceId - Optional workspace ID to filter by
 * @returns User analytics object
 */
export async function getUserAnalytics(userId: string, workspaceId?: string) {
  try {
    // Get user's contributions
    let contributionsQuery = supabase
      .from('contributions')
      .select(
        `
        id,
        project_id,
        task_id,
        hours_spent,
        contribution_type,
        created_at,
        project:projects!inner(id, name, workspace_id, team_id)
      `
      )
      .eq('user_id', userId);

    if (workspaceId) {
      contributionsQuery = contributionsQuery.eq('project.workspace_id', workspaceId);
    }

    const { data: contributionsData } = await contributionsQuery;

    // Get user's tasks
    let tasksQuery = supabase
      .from('tasks')
      .select(
        `
        id,
        title,
        status,
        priority,
        project_id,
        project:projects!inner(id, name, workspace_id)
      `
      )
      .eq('assigned_to', userId);

    if (workspaceId) {
      tasksQuery = tasksQuery.eq('project.workspace_id', workspaceId);
    }

    const { data: tasksData } = await tasksQuery;

    // Normalize data - handle arrays from Supabase joins
    const contributions = (contributionsData || []).map((contrib: any) => {
      let project = contrib.project;
      if (Array.isArray(project)) {
        project = project[0] || null;
      }
      return {
        ...contrib,
        project: project,
      };
    });

    const tasks = (tasksData || []).map((task: any) => {
      let project = task.project;
      if (Array.isArray(project)) {
        project = project[0] || null;
      }
      return {
        ...task,
        project: project,
      };
    });

    // Calculate breakdown by contribution type
    const contributionBreakdown: Record<string, number> = {
      code: 0,
      documentation: 0,
      research: 0,
      design: 0,
      meeting: 0,
      other: 0,
    };

    contributions?.forEach((contrib) => {
      const type = contrib.contribution_type || 'other';
      contributionBreakdown[type] = (contributionBreakdown[type] || 0) + 1;
    });

    // Calculate weekly hours
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekContributions =
      contributions?.filter((c) => {
        const created = new Date(c.created_at);
        return created >= weekAgo;
      }) || [];
    const weekHours = weekContributions.reduce((sum, c) => sum + (c.hours_spent || 0), 0);

    // Total hours from contributions
    const totalHours = contributions?.reduce((sum, c) => sum + (c.hours_spent || 0), 0) || 0;

    // Calculate task completion participation
    const completedTasks = tasks?.filter((t) => t.status === 'completed') || [];
    const inProgressTasks = tasks?.filter((t) => t.status === 'in_progress') || [];

    // Find completed tasks without contributions (missing participation data)
    const completedTasksWithContributions = new Set(
      contributions?.filter((c: any) => c.task_id).map((c: any) => c.task_id) || []
    );
    const completedTasksWithoutContributions = completedTasks.filter(
      (t) => !completedTasksWithContributions.has(t.id)
    );

    // Estimate hours for completed tasks without contributions
    const estimatedHoursFromTasks = completedTasksWithoutContributions.length * 1.5;

    // Unified participation metrics
    const totalUnifiedHours = totalHours + estimatedHoursFromTasks;
    const totalUnifiedContributions =
      (contributions?.length || 0) + completedTasksWithoutContributions.length;

    // Calculate unified participation score (combines tasks + contributions)
    const taskCompletionWeight = completedTasks.length * 0.5;
    const contributionWeight = (contributions?.length || 0) * 1.0;
    const hoursWeight = totalUnifiedHours * 0.3;
    const unifiedParticipationScore = Math.round(
      taskCompletionWeight + contributionWeight + hoursWeight
    );

    return {
      totalContributions: contributions?.length || 0,
      totalHours: Math.round(totalHours * 10) / 10,
      weekHours: Math.round(weekHours * 10) / 10,
      totalTasks: tasks?.length || 0,
      completedTasks: completedTasks.length,
      inProgressTasks: inProgressTasks.length,
      contributionBreakdown,
      tasks: tasks || [],
      contributions: contributions || [],
      totalUnifiedHours: Math.round(totalUnifiedHours * 10) / 10,
      totalUnifiedContributions,
      estimatedHoursFromTasks: Math.round(estimatedHoursFromTasks * 10) / 10,
      completedTasksWithoutContributions: completedTasksWithoutContributions.length,
      unifiedParticipationScore,
    };
  } catch (error: any) {
    console.error('getUserAnalytics error:', error?.message || JSON.stringify(error, null, 2));
    throw error;
  }
}

/**
 * Get student performance data for instructors/TAs
 * Aggregates analytics for all students in a workspace
 * @param workspaceId - Workspace ID
 * @param userId - Optional User ID (unused but kept for signature compatibility)
 * @returns List of student performance records
 */
export async function getStudentPerformance(workspaceId: string, userId?: string) {
  try {
    // Get all workspace members (excluding instructors and TAs)
    const { data: members } = await supabase
      .from('workspace_members')
      .select(
        `
        user_id,
        role,
        user:profiles!user_id(id, full_name, avatar_url, institution, role)
      `
      )
      .eq('workspace_id', workspaceId);

    if (!members || members.length === 0) return [];

    // Normalize member data - handle arrays from Supabase joins
    const normalizedMembers = (members || []).map((member: any) => {
      let user = member.user;
      if (Array.isArray(user)) {
        user = user[0] || null;
      }
      return {
        ...member,
        user: user || null,
      };
    });

    // Filter out instructors and TAs - only include students
    const studentMembers = normalizedMembers.filter((member: any) => {
      const userRole = member.user?.role?.toLowerCase() || '';
      return userRole === 'student' || !userRole || userRole === 'member';
    });

    if (studentMembers.length === 0) return [];

    const performanceData: Array<{
      userId: string;
      name: string;
      avatar?: string;
      institution?: string;
      totalHours: number;
      contributions: number;
      tasksCompleted: number;
      tasksAssigned: number;
      participationScore: number;
      lastActive?: string;
    }> = [];

    // Get analytics for each student (not instructors)
    for (const member of studentMembers) {
      const userAnalytics = await getUserAnalytics(member.user_id, workspaceId);

      // Get last activity timestamp (from contributions or task completion)
      const { data: lastContrib } = await supabase
        .from('contributions')
        .select('created_at, project:projects!inner(workspace_id)')
        .eq('user_id', member.user_id)
        .eq('project.workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Get last task completion
      const { data: lastTask } = await supabase
        .from('tasks')
        .select('updated_at, project:projects!inner(workspace_id)')
        .eq('assigned_to', member.user_id)
        .eq('status', 'completed')
        .eq('project.workspace_id', workspaceId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      // Use most recent activity (contribution or task completion)
      const lastActive = lastContrib?.created_at || lastTask?.updated_at;

      const completionRate =
        userAnalytics.totalTasks > 0
          ? Math.round((userAnalytics.completedTasks / userAnalytics.totalTasks) * 100)
          : 0;

      // Use unified participation score that combines tasks + contributions
      const participationScore =
        userAnalytics.unifiedParticipationScore ||
        Math.round(
          userAnalytics.totalUnifiedHours * 0.4 +
            userAnalytics.totalUnifiedContributions * 2 +
            completionRate * 0.5 +
            userAnalytics.completedTasks * 1.0
        );

      performanceData.push({
        userId: member.user_id,
        name: member.user?.full_name || 'Unknown',
        avatar: member.user?.avatar_url,
        institution: member.user?.institution,
        totalHours: userAnalytics.totalUnifiedHours || userAnalytics.totalHours,
        contributions: userAnalytics.totalUnifiedContributions || userAnalytics.totalContributions,
        tasksCompleted: userAnalytics.completedTasks,
        tasksAssigned: userAnalytics.totalTasks,
        participationScore,
        lastActive: lastActive,
      });
    }

    // Sort by participation score
    return performanceData.sort((a, b) => b.participationScore - a.participationScore);
  } catch (error: any) {
    console.error('getStudentPerformance error:', error?.message || JSON.stringify(error, null, 2));
    return [];
  }
}
