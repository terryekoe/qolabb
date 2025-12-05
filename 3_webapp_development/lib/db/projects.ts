// =====================================================
// Project Database Functions
// Functions for project CRUD and management
// =====================================================

import { supabase } from '../supabase';
import type { Project, ProjectInsert } from '../types/database';
import { logActivity } from './activity';
import { createProjectUpdateNotification } from './notifications';

/**
 * Create a new project
 * Logs activity and notifies team members
 * @param project - Project data to insert
 * @param userId - Creator's user ID
 * @returns The created project
 */
export async function createProject(project: ProjectInsert, userId: string) {
  const { data, error } = await supabase
    .from('projects')
    .insert({ ...project, created_by: userId } as any)
    .select()
    .single();

  if (error) throw error;

  // Log activity
  await logActivity({
    workspace_id: project.workspace_id,
    user_id: userId,
    action_type: 'created_project',
    entity_type: 'project',
    entity_id: (data as any).id,
    metadata: { project_name: project.name },
  });

  // Notify team members about new project
  if (project.team_id) {
    const { data: teamMembers } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', project.team_id);

    const teamMemberIds = teamMembers?.map((m) => m.user_id).filter((id) => id !== userId) || [];

    if (teamMemberIds.length > 0) {
      await createProjectUpdateNotification(
        teamMemberIds,
        project.name,
        (data as any).id,
        'created',
        userId
      );
    }
  }

  return data as Project;
}

/**
 * Get all projects for a team
 * @param teamId - Team ID
 * @returns List of projects with tasks and contributions
 */
export async function getTeamProjects(teamId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select(
      `
      *,
      tasks(*),
      contributions(*)
    `
    )
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get all projects in a workspace
 * Uses RPC to ensure access
 * @param workspaceId - Workspace ID
 * @param userId - Optional User ID (if already known)
 * @returns List of projects
 */
export async function getWorkspaceProjects(workspaceId: string, userId?: string) {
  try {
    let uid = userId;
    if (!uid) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      uid = user.id;
    }

    // Check if user is instructor/admin
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', uid)
      .single();

    const isInstructor =
      member?.role === 'instructor' || member?.role === 'admin' || member?.role === 'owner';

    let query = supabase
      .from('projects')
      .select(
        `
        *,
        team:teams(name)
      `
      )
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (!isInstructor) {
      // For students, only show projects assigned to their teams
      const { data: myTeams } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', uid);

      const teamIds = myTeams?.map((t) => t.team_id) || [];

      if (teamIds.length > 0) {
        query = query.in('team_id', teamIds);
      } else {
        // User has no teams, so no projects to show
        return [];
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('getWorkspaceProjects error:', JSON.stringify(error, null, 2));
      throw error;
    }
    return data || [];
  } catch (error: any) {
    console.error('getWorkspaceProjects catch:', error?.message || error);
    return [];
  }
}

/**
 * Update a project
 * Notifications are sent to team members based on changes
 * @param projectId - Project ID
 * @param updates - Fields to update
 * @returns Updated project
 */
export async function updateProject(projectId: string, updates: Partial<Project>) {
  // Get current project to check for status changes
  const { data: currentProject } = await supabase
    .from('projects')
    .select('name, team_id, status')
    .eq('id', projectId)
    .single();

  const { data, error } = await supabase
    .from('projects')
    .update(updates as any)
    .eq('id', projectId)
    .select()
    .single();

  if (error) throw error;

  // Get current user from auth
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  const userId = authUser?.id;

  // Notify team members about project updates
  if (currentProject && userId && currentProject.team_id) {
    const { data: teamMembers } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', currentProject.team_id);

    const teamMemberIds = teamMembers?.map((m) => m.user_id).filter((id) => id !== userId) || [];

    if (teamMemberIds.length > 0) {
      // Check what changed
      if (updates.status && updates.status !== currentProject.status) {
        if (updates.status === 'completed') {
          await createProjectUpdateNotification(
            teamMemberIds,
            currentProject.name,
            projectId,
            'completed',
            userId
          );
        } else {
          await createProjectUpdateNotification(
            teamMemberIds,
            currentProject.name,
            projectId,
            'updated',
            userId
          );
        }
      } else if (Object.keys(updates).length > 0) {
        // General project update
        await createProjectUpdateNotification(
          teamMemberIds,
          currentProject.name,
          projectId,
          'updated',
          userId
        );
      }
    }
  }

  return data as Project;
}

/**
 * Get a single project by ID with full team details
 * @param projectId - Project ID
 * @param workspaceId - Optional workspace ID for additional filtering
 * @returns Project with team and members details
 */
export async function getProject(projectId: string, workspaceId?: string) {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select(
        `
        *,
        team:teams(
          *,
          members:team_members(
            *,
            user:profiles(*)
          )
        )
      `
      )
      .eq('id', projectId)
      .single();

    if (error) throw error;

    // Transform to include member_count
    const project = data as any;
    if (project && project.team) {
      project.team.member_count = project.team.members?.length || 0;
    }

    return project;
  } catch (error: any) {
    console.error('getProject error:', error?.message || JSON.stringify(error, null, 2));
    return null;
  }
}
