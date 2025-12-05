// =====================================================
// Search Database Functions
// Global search across workspace entities
// =====================================================

import { supabase } from '../supabase';

// =====================================================
// TYPES
// =====================================================

export interface SearchResult {
  type: 'task' | 'project' | 'team' | 'member';
  id: string;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  url?: string;
}

// =====================================================
// FUNCTIONS
// =====================================================

/**
 * Search across all workspace entities (tasks, projects, teams, members)
 * @param workspaceId - Workspace ID to search within
 * @param query - Search query string
 * @param limit - Maximum number of results per category (default: 5)
 * @returns Search results grouped by type
 */
export async function globalSearch(
  workspaceId: string,
  query: string,
  limit: number = 5
): Promise<{
  tasks: SearchResult[];
  projects: SearchResult[];
  teams: SearchResult[];
  members: SearchResult[];
}> {
  if (!query || query.trim().length < 2) {
    return { tasks: [], projects: [], teams: [], members: [] };
  }

  const searchTerm = query.trim().toLowerCase();

  try {
    // Search Tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(
        `
        id,
        title,
        description,
        status,
        project:projects!inner(
          id,
          name,
          workspace_id
        )
      `
      )
      .eq('project.workspace_id', workspaceId)
      .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .limit(limit)
      .order('created_at', { ascending: false });

    if (tasksError) {
      console.error('Search tasks error:', tasksError);
    }

    // Search Projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(
        `
        id,
        name,
        description,
        status,
        workspace_id
      `
      )
      .eq('workspace_id', workspaceId)
      .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .limit(limit)
      .order('created_at', { ascending: false });

    if (projectsError) {
      console.error('Search projects error:', projectsError);
    }

    // Search Teams
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select(
        `
        id,
        name,
        description,
        workspace_id
      `
      )
      .eq('workspace_id', workspaceId)
      .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .limit(limit)
      .order('created_at', { ascending: false });

    if (teamsError) {
      console.error('Search teams error:', teamsError);
    }

    // Search Members (workspace members)
    let members: any[] = [];
    let membersError: any = null;

    const { data: allProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role, institution')
      .ilike('full_name', `%${searchTerm}%`)
      .limit(50);

    if (!profilesError && allProfiles && allProfiles.length > 0) {
      const profileIds = allProfiles.map((p) => p.id);

      const { data: workspaceMembers, error: membersErrorData } = await supabase
        .from('workspace_members')
        .select(
          `
          user_id,
          profile:profiles!user_id(
            id,
            full_name,
            avatar_url,
            role,
            institution
          )
        `
        )
        .eq('workspace_id', workspaceId)
        .in('user_id', profileIds)
        .limit(limit);

      members = workspaceMembers || [];
      membersError = membersErrorData;
    } else if (profilesError) {
      membersError = profilesError;
    }

    if (membersError) {
      console.error('Search members error:', membersError);
    }

    // Format results
    const formattedTasks: SearchResult[] = (tasks || []).map((task: any) => ({
      type: 'task' as const,
      id: task.id,
      title: task.title,
      description: task.description,
      metadata: {
        status: task.status,
        projectName: task.project?.name,
        projectId: task.project?.id,
      },
      url: `/tasks?task=${task.id}`,
    }));

    const formattedProjects: SearchResult[] = (projects || []).map((project: any) => ({
      type: 'project' as const,
      id: project.id,
      title: project.name,
      description: project.description,
      metadata: {
        status: project.status,
      },
      url: `/projects?project=${project.id}`,
    }));

    const formattedTeams: SearchResult[] = (teams || []).map((team: any) => ({
      type: 'team' as const,
      id: team.id,
      title: team.name,
      description: team.description,
      metadata: {},
      url: `/teams?team=${team.id}`,
    }));

    const formattedMembers: SearchResult[] = (members || []).map((member: any) => ({
      type: 'member' as const,
      id: member.user_id,
      title: member.profile?.full_name || 'Unknown User',
      description: member.profile?.institution || member.profile?.role || '',
      metadata: {
        avatarUrl: member.profile?.avatar_url,
        role: member.profile?.role,
      },
      url: `/teams?member=${member.user_id}`,
    }));

    return {
      tasks: formattedTasks,
      projects: formattedProjects,
      teams: formattedTeams,
      members: formattedMembers,
    };
  } catch (error: any) {
    console.error('Global search error:', error?.message || JSON.stringify(error, null, 2));
    return { tasks: [], projects: [], teams: [], members: [] };
  }
}
