// =====================================================
// Contribution Database Functions
// Functions for tracking user contributions to projects
// =====================================================

import { supabase } from '../supabase';
import type { Contribution, ContributionInsert } from '../types/database';
import { logActivity } from './activity';

/**
 * Create a new contribution
 * Logs activity and sends motivational message
 * @param contribution - Contribution data to insert
 * @returns The created contribution
 */
export async function createContribution(contribution: ContributionInsert) {
  const { data, error } = await supabase
    .from('contributions')
    .insert(contribution as any)
    .select()
    .single();

  if (error) throw error;

  // Log activity
  const { data: project } = await supabase
    .from('projects')
    .select('workspace_id, team_id')
    .eq('id', contribution.project_id)
    .single();

  if (project) {
    await logActivity({
      workspace_id: (project as any).workspace_id,
      user_id: contribution.user_id,
      action_type: 'added_contribution',
      entity_type: 'contribution',
      entity_id: (data as any).id,
      metadata: { contribution_type: contribution.contribution_type },
    });

    // Send motivational message
    try {
      const { checkContributionTriggers } = await import('../services/motivationalMessageTriggers');
      await checkContributionTriggers(
        {
          userId: contribution.user_id,
          workspaceId: (project as any).workspace_id,
          teamId: (project as any).team_id,
        },
        (data as any).id
      );
    } catch (error) {
      // Silently fail - motivational messages are nice-to-have
      console.error('Error sending motivational message:', error);
    }
  }

  return data as Contribution;
}

/**
 * Get contributions for a user
 * @param userId - User ID
 * @param projectId - Optional project ID to filter by
 * @returns List of contributions with project and task details
 */
export async function getUserContributions(userId: string, projectId?: string) {
  let query = supabase
    .from('contributions')
    .select(
      `
      *,
      project:projects!project_id(id, name, team_id),
      task:tasks!task_id(id, title, status)
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

/**
 * Get all contributions for a project
 * @param projectId - Project ID
 * @returns List of contributions with user profiles
 */
export async function getProjectContributions(projectId: string) {
  const { data, error } = await supabase
    .from('contributions')
    .select(
      `
      *,
      user:profiles!user_id(*)
    `
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Update a contribution
 * Logs activity
 * @param contributionId - Contribution ID
 * @param updates - Fields to update
 * @returns Updated contribution
 */
export async function updateContribution(contributionId: string, updates: Partial<Contribution>) {
  const { data, error } = await supabase
    .from('contributions')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', contributionId)
    .select()
    .single();

  if (error) throw error;

  // Log activity - get workspace_id from project
  const { data: projectData } = await supabase
    .from('projects')
    .select('workspace_id')
    .eq('id', (data as any).project_id)
    .single();

  if (projectData?.workspace_id) {
    await logActivity({
      workspace_id: projectData.workspace_id,
      user_id: (data as any).user_id,
      action_type: 'updated_contribution',
      entity_type: 'contribution',
      entity_id: contributionId,
      metadata: { contribution_type: (data as any).contribution_type },
    });
  }

  return data as Contribution;
}

/**
 * Delete a contribution
 * Logs activity before deletion
 * @param contributionId - Contribution ID
 * @returns True if successful
 */
export async function deleteContribution(contributionId: string) {
  // Get contribution info before deleting for activity log
  const { data: contribution } = await supabase
    .from('contributions')
    .select('*')
    .eq('id', contributionId)
    .single();

  if (!contribution) {
    throw new Error('Contribution not found');
  }

  // Get workspace_id from project
  const { data: projectData } = await supabase
    .from('projects')
    .select('workspace_id')
    .eq('id', (contribution as any).project_id)
    .single();

  const { error } = await supabase.from('contributions').delete().eq('id', contributionId);

  if (error) throw error;

  // Log activity
  if (projectData?.workspace_id) {
    await logActivity({
      workspace_id: projectData.workspace_id,
      user_id: (contribution as any).user_id,
      action_type: 'deleted_contribution',
      entity_type: 'contribution',
      entity_id: contributionId,
      metadata: { contribution_type: (contribution as any).contribution_type },
    });
  }

  return true;
}

/**
 * Get a contribution with full details
 * @param contributionId - Contribution ID
 * @returns Contribution with project, task, and user details
 */
export async function getContributionWithDetails(contributionId: string) {
  const { data, error } = await supabase
    .from('contributions')
    .select(
      `
      *,
      project:projects!project_id(id, name, team_id),
      task:tasks!task_id(id, title),
      user:profiles!user_id(id, full_name, avatar_url)
    `
    )
    .eq('id', contributionId)
    .single();

  if (error) throw error;
  return data;
}
