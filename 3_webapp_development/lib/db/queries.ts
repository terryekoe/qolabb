// =====================================================
// Database Helper Functions
// Reusable functions for common database operations
// =====================================================

import { supabase } from '../supabase'
import type {
  Profile,
  Workspace,
  WorkspaceInsert,
  WorkspaceMember,
  Team,
  TeamInsert,
  Project,
  ProjectInsert,
  Task,
  TaskInsert,
  Contribution,
  ContributionInsert,
  ActivityLogInsert,
} from '../types/database'

// =====================================================
// PROFILE FUNCTIONS
// =====================================================

/**
 * Create a new user profile
 * @param profile - Profile data to insert
 * @returns The created profile
 */
export async function createProfile(profile: {
  id: string;
  full_name: string;
  role?: 'student' | 'instructor' | 'both';
  avatar_url?: string | null;
  institution?: string | null;
  goals?: string[] | null;
}) {
  try {
    const profileData = {
      id: profile.id,
      full_name: profile.full_name.trim(),
      role: profile.role || 'student',
      avatar_url: profile.avatar_url || null,
      institution: profile.institution || null,
      goals: profile.goals || null,
    };

    const { data, error } = await supabase
      .from('profiles')
      .insert(profileData as any)
      .select()
      .single();

    if (error) {
      console.error('createProfile error:', JSON.stringify(error, null, 2));
      throw new Error(`Failed to create profile: ${error.message}`);
    }

    return data as Profile;
  } catch (error: any) {
    console.error('createProfile catch:', error?.message || error);
    throw error;
  }
}

/**
 * Get user profile by ID
 * @param userId - User ID
 * @returns User profile or null if not found
 */
export async function getProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      console.error('getProfile error:', JSON.stringify(error, null, 2));
      throw new Error(`Failed to get profile: ${error.message}`);
    }

    return data as Profile;
  } catch (error: any) {
    console.error('getProfile catch:', error?.message || error);
    throw error;
  }
}

/**
 * Get or create profile - ensures profile exists
 * @param userId - User ID
 * @param defaultData - Default profile data if creating
 * @returns User profile
 */
export async function getOrCreateProfile(
  userId: string,
  defaultData?: { full_name?: string; email?: string }
) {
  try {
    // Try to get existing profile
    const existingProfile = await getProfile(userId);
    if (existingProfile) {
      return existingProfile;
    }

    // Profile doesn't exist, create it
    console.log('Profile not found, creating new profile for user:', userId);
    
    const fullName = defaultData?.full_name || defaultData?.email?.split('@')[0] || 'User';
    
    return await createProfile({
      id: userId,
      full_name: fullName,
      role: 'student',
    });
  } catch (error: any) {
    console.error('getOrCreateProfile error:', error?.message || error);
    throw error;
  }
}

/**
 * Update user profile
 * @param userId - User ID
 * @param updates - Profile fields to update
 * @returns Updated profile
 */
export async function updateProfile(userId: string, updates: Partial<Profile>) {
  try {
    // Sanitize updates
    const sanitizedUpdates: any = {};
    
    if (updates.full_name !== undefined) {
      sanitizedUpdates.full_name = updates.full_name.trim();
    }
    if (updates.avatar_url !== undefined) {
      sanitizedUpdates.avatar_url = updates.avatar_url;
    }
    if (updates.role !== undefined) {
      sanitizedUpdates.role = updates.role;
    }
    if (updates.institution !== undefined) {
      sanitizedUpdates.institution = updates.institution;
    }
    if (updates.goals !== undefined) {
      sanitizedUpdates.goals = updates.goals;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(sanitizedUpdates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('updateProfile error:', JSON.stringify(error, null, 2));
      throw new Error(`Failed to update profile: ${error.message}`);
    }

    return data as Profile;
  } catch (error: any) {
    console.error('updateProfile catch:', error?.message || error);
    throw error;
  }
}

// =====================================================
// WORKSPACE FUNCTIONS
// =====================================================

export async function createWorkspace(workspace: WorkspaceInsert, userId: string) {
  // Use RPC function to bypass RLS restrictions
  const { data: newWorkspace, error: workspaceError } = await supabase
    .rpc('create_workspace_with_owner', {
      workspace_name: workspace.name,
      owner_user_id: userId,
      workspace_description: workspace.description || null,
      workspace_settings: workspace.settings || {}
    })

  if (workspaceError) {
    console.error('Error creating workspace:', workspaceError)
    throw workspaceError
  }

  if (!newWorkspace || newWorkspace.length === 0) {
    throw new Error('Failed to create workspace')
  }

  return newWorkspace[0] as Workspace
}

export async function getWorkspace(workspaceId: string) {
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .single()

  if (error) throw error
  return data as Workspace
}

export async function getUserWorkspaces(userId: string) {
  console.log('🔍 getUserWorkspaces called with userId:', userId);
  
  try {
    const { data, error } = await supabase
      .from('workspace_members')
      .select(`
        *,
        workspace:workspaces(*)
      `)
      .eq('user_id', userId)

    console.log('📊 getUserWorkspaces query result:', { data, error });

    if (error) {
      console.error('❌ getUserWorkspaces error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }

    console.log('✅ getUserWorkspaces success, found', data?.length || 0, 'workspace memberships');
    return data;
  } catch (err) {
    console.error('💥 getUserWorkspaces caught exception:', err);
    throw err;
  }
}

// Alternative RPC-based function to get user workspaces (bypasses RLS)
export async function getUserWorkspacesRPC(userId: string) {
  console.log('🔍 getUserWorkspacesRPC called with userId:', userId);
  
  try {
    const { data, error } = await supabase
      .rpc('get_user_workspaces', {
        user_id_param: userId
      });

    console.log('📊 getUserWorkspacesRPC result:', { data, error });

    if (error) {
      console.error('❌ getUserWorkspacesRPC error:', error);
      throw error;
    }

    console.log('✅ getUserWorkspacesRPC success, found', data?.length || 0, 'workspace memberships');
    return data;
  } catch (err) {
    console.error('💥 getUserWorkspacesRPC exception:', err);
    throw err;
  }
}

export async function joinWorkspaceByCode(inviteCode: string, userId: string) {
  // Use RPC function to bypass RLS restrictions for joining
  const { data: workspace, error: joinError } = await supabase
    .rpc('join_workspace_by_invite_code', {
      invite_code_param: inviteCode.toUpperCase(),
      user_id_param: userId
    })

  if (joinError) {
    console.error('Error joining workspace:', joinError)
    
    // Handle specific error messages from the RPC function
    if (joinError.message.includes('Invalid invite code')) {
      throw new Error('Invalid invite code. Please check and try again.')
    }
    if (joinError.message.includes('already a member')) {
      throw new Error('You are already a member of this workspace.')
    }
    
    throw new Error('Failed to join workspace. Please try again.')
  }

  if (!workspace || workspace.length === 0) {
    throw new Error('Failed to join workspace. Please try again.')
  }

  return workspace[0] as Workspace
}

export async function getWorkspaceMembers(workspaceId: string) {
  const { data, error } = await supabase
    .from('workspace_members')
    .select(`
      *,
      user:profiles!user_id(*)
    `)
    .eq('workspace_id', workspaceId)

  if (error) throw error
  return data
}

// =====================================================
// TEAM FUNCTIONS
// =====================================================

export async function createTeam(team: TeamInsert, userId: string) {
  const { data, error } = await supabase
    .from('teams')
    .insert({ ...team, created_by: userId } as any)
    .select()
    .single()

  if (error) throw error

  // Add creator as team leader
  await supabase
    .from('team_members')
    .insert({
      team_id: (data as any).id,
      user_id: userId,
      role: 'leader',
    } as any)

  return data as Team
}

export async function getWorkspaceTeams(workspaceId: string) {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        members:team_members(
          *,
          user:profiles!user_id(*)
        )
      `)
      .eq('workspace_id', workspaceId)

    if (error) {
      console.error('getWorkspaceTeams error:', JSON.stringify(error, null, 2));
      throw error;
    }
    return data || [];
  } catch (error: any) {
    console.error('getWorkspaceTeams catch:', error?.message || error);
    return [];
  }
}

export async function getUserTeams(userId: string, workspaceId?: string) {
  let query = supabase
    .from('team_members')
    .select(`
      *,
      team:teams(*)
    `)
    .eq('user_id', userId)

  if (workspaceId) {
    query = query.eq('team.workspace_id', workspaceId)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

// =====================================================
// PROJECT FUNCTIONS
// =====================================================

export async function createProject(project: ProjectInsert, userId: string) {
  const { data, error} = await supabase
    .from('projects')
    .insert({ ...project, created_by: userId } as any)
    .select()
    .single()

  if (error) throw error

  // Log activity
  await logActivity({
    workspace_id: project.workspace_id,
    user_id: userId,
    action_type: 'created_project',
    entity_type: 'project',
    entity_id: (data as any).id,
    metadata: { project_name: project.name },
  })

  return data as Project
}

export async function getTeamProjects(teamId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      tasks(*),
      contributions(*)
    `)
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getWorkspaceProjects(workspaceId: string) {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        team:teams(*),
        tasks(*),
        contributions(*)
      `)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

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

export async function updateProject(projectId: string, updates: Partial<Project>) {
  const { data, error } = await supabase
    .from('projects')
    .update(updates as any)
    .eq('id', projectId)
    .select()
    .single()

  if (error) throw error
  return data as Project
}

// =====================================================
// TASK FUNCTIONS
// =====================================================

export async function createTask(task: TaskInsert, userId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...task, created_by: userId } as any)
    .select()
    .single()

  if (error) throw error

  // Log activity
  const { data: project } = await supabase
    .from('projects')
    .select('workspace_id')
    .eq('id', task.project_id)
    .single()

  if (project) {
    await logActivity({
      workspace_id: (project as any).workspace_id,
      user_id: userId,
      action_type: 'created_task',
      entity_type: 'task',
      entity_id: (data as any).id,
      metadata: { task_title: task.title, assigned_to: task.assigned_to },
    })
  }

  return data as Task
}

export async function getProjectTasks(projectId: string) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assignee:profiles!assigned_to(*),
        creator:profiles!created_by(*)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

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

export async function getUserTasks(userId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      project:projects(*),
      assignee:profiles!assigned_to(*)
    `)
    .eq('assigned_to', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function updateTask(taskId: string, updates: Partial<Task>) {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates as any)
    .eq('id', taskId)
    .select()
    .single()

  if (error) throw error
  return data as Task
}

export async function deleteTask(taskId: string) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)

  if (error) throw error
}

// =====================================================
// TEAM MEMBER ROLE FUNCTIONS
// =====================================================

export async function updateTeamMemberRole(teamId: string, userId: string, role: 'leader' | 'member') {
  const { data, error } = await supabase
    .from('team_members')
    .update({ role } as any)
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getTeamMembers(teamId: string) {
  const { data, error } = await supabase
    .from('team_members')
    .select(`
      *,
      user:profiles!user_id(*)
    `)
    .eq('team_id', teamId)

  if (error) throw error
  return data
}

export async function isTeamLeaderOrInstructor(userId: string, teamId: string, workspaceId: string) {
  // Check if user is workspace owner/instructor
  const { data: workspaceMember } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single()

  if (workspaceMember && (workspaceMember.role === 'owner' || workspaceMember.role === 'admin')) {
    return true
  }

  // Check if user is team leader
  const { data: teamMember } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single()

  return teamMember?.role === 'leader'
}

// =====================================================
// CONTRIBUTION FUNCTIONS
// =====================================================

export async function createContribution(contribution: ContributionInsert) {
  const { data, error } = await supabase
    .from('contributions')
    .insert(contribution as any)
    .select()
    .single()

  if (error) throw error

  // Log activity
  const { data: project } = await supabase
    .from('projects')
    .select('workspace_id')
    .eq('id', contribution.project_id)
    .single()

  if (project) {
    await logActivity({
      workspace_id: (project as any).workspace_id,
      user_id: contribution.user_id,
      action_type: 'added_contribution',
      entity_type: 'contribution',
      entity_id: (data as any).id,
      metadata: { contribution_type: contribution.contribution_type },
    })
  }

  return data as Contribution
}

export async function getUserContributions(userId: string, projectId?: string) {
  let query = supabase
    .from('contributions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) throw error
  return data as Contribution[]
}

export async function getProjectContributions(projectId: string) {
  const { data, error } = await supabase
    .from('contributions')
    .select(`
      *,
      user:profiles!user_id(*)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// =====================================================
// ACTIVITY LOG FUNCTIONS
// =====================================================

export async function logActivity(activity: ActivityLogInsert) {
  const { error } = await supabase
    .from('activity_log')
    .insert(activity as any)

  if (error) console.error('Failed to log activity:', error)
}

export async function getWorkspaceActivity(workspaceId: string, limit = 20) {
  try {
    const { data, error } = await supabase
      .from('activity_log')
      .select(`
        *,
        user:profiles!user_id(*)
      `)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('getWorkspaceActivity error:', JSON.stringify(error, null, 2));
      throw error;
    }
    return data || [];
  } catch (error: any) {
    console.error('getWorkspaceActivity catch:', error?.message || error);
    return [];
  }
}

// =====================================================
// ANALYTICS FUNCTIONS
// =====================================================

export async function getWorkspaceStats(workspaceId: string) {
  try {
    // Get active projects count
    const { count: projectCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')

    // Get total members
    const { count: memberCount } = await supabase
      .from('workspace_members')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)

    // Get completed tasks
    const { count: completedTasks } = await supabase
      .from('tasks')
      .select('*, project:projects!inner(*)', { count: 'exact', head: true })
      .eq('status', 'completed')
      .eq('project.workspace_id', workspaceId)

    return {
      activeProjects: projectCount || 0,
      totalMembers: memberCount || 0,
      tasksCompleted: completedTasks || 0,
      avgParticipation: 0, // Will calculate from contributions later
    }
  } catch (error: any) {
    console.error('getWorkspaceStats error:', error?.message || JSON.stringify(error, null, 2));
    return {
      activeProjects: 0,
      totalMembers: 0,
      tasksCompleted: 0,
      avgParticipation: 0,
    }
  }
}
