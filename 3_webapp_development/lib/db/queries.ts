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
  email?: string | null;
}) {
  try {
    const profileData = {
      id: profile.id,
      full_name: profile.full_name.trim(),
      role: profile.role || 'student',
      avatar_url: profile.avatar_url || null,
      institution: profile.institution || null,
      goals: profile.goals || null,
      email: profile.email || null,
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
      // Check if the profile has a generic name and we have a better name available
      if (existingProfile.full_name === 'User' && defaultData?.full_name && defaultData.full_name !== 'User') {
        console.log('Updating profile with correct full name:', defaultData.full_name);
        const updatedProfile = await updateProfile(userId, { full_name: defaultData.full_name });
        return updatedProfile;
      }
      return existingProfile;
    }

    // Profile doesn't exist, use the safe_create_profile function
    console.log('Profile not found, creating new profile for user:', userId);
    
    const fullName = defaultData?.full_name || defaultData?.email?.split('@')[0] || 'User';
    
    try {
      // Use the safe_create_profile database function which handles race conditions
      const { data, error } = await supabase
        .rpc('safe_create_profile', {
          user_id: userId,
          user_full_name: fullName,
          user_role: 'student',
          user_email: defaultData?.email || null,
        });

      if (error) {
        console.error('safe_create_profile error:', JSON.stringify(error, null, 2));
        throw new Error(`Failed to create profile: ${error.message}`);
      }

      if (data && data.length > 0) {
        return data[0] as Profile;
      }

      // Fallback: try to get the profile if the function didn't return data
      const profile = await getProfile(userId);
      if (profile) {
        return profile;
      }

      throw new Error('Failed to create or retrieve profile');
    } catch (createError: any) {
      // If the safe function fails, fall back to the original method
      console.log('safe_create_profile failed, falling back to createProfile:', createError.message);
      
      try {
        return await createProfile({
          id: userId,
          full_name: fullName,
          role: 'student',
          email: defaultData?.email || null,
        });
      } catch (fallbackError: any) {
        // If we get a duplicate key error, it means the profile was created by another process
        if (fallbackError.message?.includes('duplicate key value violates unique constraint')) {
          console.log('Profile already exists (created by another process), fetching existing profile');
          const existingProfile = await getProfile(userId);
          if (existingProfile) {
            return existingProfile;
          }
        }
        // Re-throw other errors
        throw fallbackError;
      }
    }
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

// Add type definition for RPC response
interface WorkspaceRPCResponse {
  workspace_id: string;
  workspace_name: string;
  workspace_description: string | null;
  workspace_invite_code: string;
  workspace_owner_id: string;
  workspace_settings: any;
  workspace_created_at: string;
  workspace_updated_at: string;
}

export async function getWorkspace(workspaceId: string) {
  console.log('🔍 getWorkspace called with workspaceId:', workspaceId);
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  console.log('👤 User ID:', user.id);
  console.log('🏢 Workspace ID:', workspaceId);

  // First call debug function to check access
  const { data: debugData, error: debugError } = await supabase
    .rpc('debug_workspace_access', {
      workspace_id_param: workspaceId,
      user_id_param: user.id
    });

  if (debugError) {
    console.error('❌ Debug RPC error:', {
      message: debugError.message,
      details: debugError.details,
      hint: debugError.hint,
      code: debugError.code,
      fullError: debugError
    });
  } else {
    console.log('🔍 Debug workspace access result:', debugData);
  }

  // Use RPC function to bypass RLS issues
  const { data, error } = await supabase
    .rpc('get_workspace_rpc', {
      workspace_id_param: workspaceId,
      user_id_param: user.id
    })
    .single();

  if (error) {
    console.error('❌ RPC get_workspace_rpc error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      fullError: error
    });
    
    // Check if the function doesn't exist
    if (error.code === '42883' || error.message?.includes('function') || error.message?.includes('does not exist')) {
      console.warn('⚠️ RPC function does not exist, using fallback query');
    }
    
    // Fallback to direct query if RPC fails
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single();
    
    if (fallbackError) {
      console.error('❌ Fallback query also failed:', {
        message: fallbackError.message,
        details: fallbackError.details,
        hint: fallbackError.hint,
        code: fallbackError.code,
        fullError: fallbackError
      });
      throw fallbackError;
    }
    console.log('✅ Fallback query succeeded:', fallbackData);
    return fallbackData as Workspace;
  }
  
  console.log('✅ RPC query succeeded:', data);
  
  // Transform RPC result back to standard workspace format
  if (data) {
    // Type assertion for the RPC response
    const rpcData = data as WorkspaceRPCResponse;
    
    const workspace = {
      id: rpcData.workspace_id,
      name: rpcData.workspace_name,
      description: rpcData.workspace_description,
      invite_code: rpcData.workspace_invite_code,
      owner_id: rpcData.workspace_owner_id,
      settings: rpcData.workspace_settings,
      created_at: rpcData.workspace_created_at,
      updated_at: rpcData.workspace_updated_at
    };
    console.log('✅ Transformed workspace data:', workspace);
    return workspace as Workspace;
  }
  
  throw new Error('No workspace data returned from RPC');
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

// Updated getWorkspaceMembers function to fetch with profile data
export async function getWorkspaceMembers(workspaceId: string) {
  console.log('🔍 [CLIENT] getWorkspaceMembers called with workspaceId:', workspaceId)
  
  try {
    // Fetch workspace members with profile data using direct query
    const { data, error } = await supabase
      .from('workspace_members')
      .select(`
        id,
        workspace_id,
        user_id,
        role,
        joined_at,
        user:profiles!user_id(
          id,
          full_name,
          avatar_url,
          institution,
          role,
          email
        )
      `)
      .eq('workspace_id', workspaceId)
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('❌ [CLIENT] Error fetching workspace members:', error);
      throw error;
    }

    console.log('✅ [CLIENT] Workspace members returned:', data);
    console.log('📊 [CLIENT] Number of members:', data?.length || 0);

    // Transform the data to match the expected format (user profile is already nested)
    const transformedData = (data || []).map((member: any) => ({
      id: member.id,
      workspace_id: member.workspace_id,
      user_id: member.user_id,
      role: member.role,
      joined_at: member.joined_at,
      user: member.user || null // Already nested from the select
    }));

    return transformedData;
  } catch (error) {
    console.error('❌ [CLIENT] Exception in getWorkspaceMembers:', error);
    return [];
  }
}

// Add a function to check if user can view workspace members
export async function canViewWorkspaceMembers(workspaceId: string, userId: string) {
  try {
    const { data, error } = await supabase
      .rpc('can_view_workspace_members', {
        workspace_id_param: workspaceId,
        user_id_param: userId
      });

    if (error) {
      console.error('Error checking workspace member permissions:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Exception checking workspace member permissions:', error);
    return false;
  }
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .rpc('get_workspace_projects_rpc', { 
        workspace_id_param: workspaceId,
        user_id_param: user.id
      })

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
  try {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates as any)
      .eq('id', taskId)
      .select()
      .single()

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
    
    return data as Task
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
      id,
      team_id,
      user_id,
      role,
      joined_at,
      user:profiles!user_id(
        id,
        full_name,
        avatar_url,
        institution,
        role,
        email
      )
    `)
    .eq('team_id', teamId)

  if (error) throw error
  
  // Transform data to include both user and profile for compatibility
  // Some components use `user`, others use `profile`
  return (data || []).map((member: any) => ({
    ...member,
    // Set both user and profile fields for backward compatibility
    user: member.user || null,
    profile: member.user || null
  }))
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

// Update the addTeamMember function to ensure workspace membership
export async function addTeamMember(
  teamId: string,
  userId: string,
  role: 'leader' | 'member' = 'member',
  assignedBy?: string
) {
  try {
    // First, get the team's workspace
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('workspace_id, name, settings')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      throw new Error('Team not found');
    }

    // Check if the user is a member of the workspace
    const { data: workspaceMember, error: memberError } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', team.workspace_id)
      .eq('user_id', userId)
      .single();

    // Check user's role - instructors should not be added to teams
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (userProfile) {
      const userRole = userProfile.role?.toLowerCase() || '';
      if (userRole === 'instructor') {
        throw new Error('Instructors cannot be added as team members. They can only manage teams.');
      }
    }

    if (memberError || !workspaceMember) {
      // User is not a workspace member, add them first
      console.log('User is not a workspace member, adding them first...');
      
      const { error: addMemberError } = await supabase
        .rpc('add_workspace_member', {
          workspace_id_param: team.workspace_id,
          user_id_param: userId,
          role_param: 'member',
          added_by_param: assignedBy || undefined
        });

      if (addMemberError) {
        console.error('Failed to add user to workspace:', addMemberError);
        throw new Error('Failed to add user to workspace. Please try again.');
      }
    }

    // Check if user is already a team member
    const { data: existingTeamMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single();

    if (existingTeamMember) {
      throw new Error('User is already a member of this team');
    }

    // Check team capacity if max_members is set
    const teamSettings = team.settings || {};
    if (teamSettings.max_members) {
      const { count: currentMemberCount } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId);

      if (currentMemberCount && currentMemberCount >= teamSettings.max_members) {
        throw new Error(`Team has reached maximum member capacity (${teamSettings.max_members} members)`);
      }
    }

    // Add the user to the team
    const { data, error } = await supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: userId,
        role
      })
      .select(`
        *,
        user:profiles!user_id(*)
      `)
      .single();

    if (error) throw error;

    // Log activity and create notification
    await Promise.all([
      logActivity({
        workspace_id: team.workspace_id,
        user_id: userId,
        action_type: 'joined_team',
        entity_type: 'team',
        entity_id: teamId,
        metadata: { team_name: team.name, role },
      }),
      assignedBy && assignedBy !== userId ? 
        createTeamAssignmentNotification(
          userId,
          team.name,
          assignedBy,
          role
        ) : Promise.resolve()
    ]);

    return data;
  } catch (error: any) {
    console.error('addTeamMember error:', error?.message || error);
    throw error;
  }
}

export async function removeTeamMember(teamId: string, userId: string) {
  const { data, error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error

  // Log activity
  const { data: team } = await supabase
    .from('teams')
    .select('workspace_id, name')
    .eq('id', teamId)
    .single()

  if (team) {
    await logActivity({
      workspace_id: (team as any).workspace_id,
      user_id: userId,
      action_type: 'left_team',
      entity_type: 'team',
      entity_id: teamId,
      metadata: { team_name: (team as any).name },
    })
  }

  return data
}

export async function getAvailableWorkspaceMembers(workspaceId: string, teamId: string) {
  try {
    console.log('🔍 getAvailableWorkspaceMembers called with:', { workspaceId, teamId })
    
    // First, get ALL workspace members to see if there are any
    const { data: allWorkspaceMembers, error: workspaceError } = await supabase
      .from('workspace_members')
      .select(`
        user_id,
        user:profiles!user_id(*)
      `)
      .eq('workspace_id', workspaceId)

    if (workspaceError) {
      console.error('❌ Error fetching workspace members:', workspaceError)
      throw workspaceError
    }

    console.log('🏢 ALL workspace members found:', allWorkspaceMembers)
    console.log('📊 Total workspace members count:', allWorkspaceMembers?.length || 0)
    console.log('🔍 WORKSPACE MEMBER USER IDs:', allWorkspaceMembers?.map(m => m.user_id))

    if (!allWorkspaceMembers || allWorkspaceMembers.length === 0) {
      console.log('⚠️ No workspace members found at all!')
      return []
    }

    // Now get team members for this team
    const { data: teamMembers, error: teamError } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId)

    if (teamError) {
      console.error('❌ Error fetching team members:', teamError)
      throw teamError
    }

    console.log('👥 Current team members:', teamMembers)

    // Extract user IDs who are already in the team
    const teamMemberIds = teamMembers?.map(member => member.user_id) || []
    console.log('🚫 Team member IDs to exclude:', teamMemberIds)
    console.log('🔍 TEAM MEMBER USER IDs:', teamMemberIds)

    // Filter out team members from workspace members
    const availableMembers = allWorkspaceMembers.filter(member => 
      !teamMemberIds.includes(member.user_id)
    )

    console.log('✅ Available workspace members after filtering:', availableMembers)
    console.log('📊 Available members count:', availableMembers?.length || 0)
    
    // Debug: Show what users we're returning
    if (availableMembers && availableMembers.length > 0) {
      console.log('🔍 DETAILED: Available members user IDs:', availableMembers.map(m => m.user_id))
      console.log('🔍 DETAILED: Team member IDs that were excluded:', teamMemberIds)
    } else {
      console.log('🔍 DETAILED: No available members after filtering (all may be in team already)')
    }

    return availableMembers || []
  } catch (error) {
    console.error('❌ getAvailableWorkspaceMembers error:', error)
    throw error
  }
}

// Debug function to check all workspace members
export async function debugWorkspaceMembers(workspaceId: string) {
  try {
    console.log('🔍 DEBUG: Checking all workspace members for workspace:', workspaceId)
    
    const { data, error } = await supabase
      .from('workspace_members')
      .select(`
        user_id,
        role,
        user:profiles!user_id(*)
      `)
      .eq('workspace_id', workspaceId)

    if (error) {
      console.error('❌ DEBUG: Error fetching workspace members:', error)
      throw error
    }

    console.log('📋 DEBUG: All workspace members:', data)
    console.log('📊 DEBUG: Total workspace members count:', data?.length || 0)
    
    return data || []
  } catch (error) {
    console.error('❌ DEBUG: debugWorkspaceMembers error:', error)
    throw error
  }
}

export async function fixTeamMemberDataConsistency(workspaceId: string, teamId: string) {
  try {
    console.log('🔧 FIXING: Checking data consistency for team:', teamId, 'in workspace:', workspaceId)
    
    // Get all team members
    const { data: teamMembers, error: teamError } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId)

    if (teamError) throw teamError

    // Get all workspace members
    const { data: workspaceMembers, error: workspaceError } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)

    if (workspaceError) throw workspaceError

    const teamMemberIds = teamMembers?.map(m => m.user_id) || []
    const workspaceMemberIds = workspaceMembers?.map(m => m.user_id) || []

    console.log('🔍 Team member IDs:', teamMemberIds)
    console.log('🔍 Workspace member IDs:', workspaceMemberIds)

    // Find team members who are NOT workspace members
    const invalidTeamMembers = teamMemberIds.filter(id => !workspaceMemberIds.includes(id))
    
    if (invalidTeamMembers.length > 0) {
      console.log('⚠️ Found invalid team members (not in workspace):', invalidTeamMembers)
      
      // Check if these users exist in profiles
      for (const userId of invalidTeamMembers) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('id', userId)
          .single()

        if (profile) {
          console.log(`👤 User ${userId} (${profile.full_name}) exists but is not in workspace`)
          console.log(`🔧 Adding user ${userId} to workspace as member`)
          
          // Add user to workspace
          await supabase
            .from('workspace_members')
            .insert({
              workspace_id: workspaceId,
              user_id: userId,
              role: 'member'
            })
          
          console.log(`✅ Added user ${userId} to workspace`)
        } else {
          console.log(`❌ User ${userId} does not exist in profiles - removing from team`)
          
          // Remove from team
          await supabase
            .from('team_members')
            .delete()
            .eq('team_id', teamId)
            .eq('user_id', userId)
          
          console.log(`✅ Removed invalid user ${userId} from team`)
        }
      }
      
      return { fixed: true, invalidMembers: invalidTeamMembers }
    } else {
      console.log('✅ No data consistency issues found')
      return { fixed: false, invalidMembers: [] }
    }
    
  } catch (error) {
    console.error('❌ Error fixing data consistency:', error)
    throw error
  }
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Fetch activity log with user profile data using direct query
    const { data, error } = await supabase
      .from('activity_log')
      .select(`
        id,
        workspace_id,
        user_id,
        action_type,
        entity_type,
        entity_id,
        metadata,
        created_at,
        user:profiles!user_id(
          id,
          full_name,
          avatar_url,
          institution
        )
      `)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('getWorkspaceActivity error:', JSON.stringify(error, null, 2));
      throw error;
    }
    
    // Transform data to match expected format
    const transformedData = (data || []).map((activity: any) => ({
      id: activity.id,
      workspace_id: activity.workspace_id,
      user_id: activity.user_id,
      action_type: activity.action_type,
      entity_type: activity.entity_type,
      entity_id: activity.entity_id,
      metadata: activity.metadata,
      created_at: activity.created_at,
      user: activity.user || null // Already nested from the select
    }));
    
    return transformedData;
  } catch (error: any) {
    console.error('getWorkspaceActivity catch:', error?.message || error);
    return [];
  }
}

// =====================================================
// TEAM JOIN REQUEST FUNCTIONS
// =====================================================

export async function createJoinRequest(
  teamId: string, 
  userId: string, 
  requestedBy: string,
  requestType: 'self_request' | 'owner_invitation',
  message?: string
) {
  try {
    // First, get the team's workspace and settings
    const { data: team } = await supabase
      .from('teams')
      .select('workspace_id, name, settings, is_public')
      .eq('id', teamId)
      .single()

    if (!team) {
      throw new Error('Team not found')
    }

    // Check if the user is a member of the workspace
    const { data: workspaceMember } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', (team as any).workspace_id)
      .eq('user_id', userId)
      .single()

    if (!workspaceMember) {
      throw new Error('User must be a workspace member before joining a team')
    }

    // Check if the user is already a member of this team
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single()

    if (existingMember) {
      throw new Error('User is already a member of this team')
    }

    // Check if there's already a pending request for this user and team
    const { data: existingRequest } = await supabase
      .from('team_join_requests')
      .select('id, status')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .single()

    if (existingRequest) {
      throw new Error('A join request for this user and team is already pending')
    }

    // Check team capacity if max_members is set
    const teamSettings = (team as any).settings || {}
    if (teamSettings.max_members) {
      const { count: currentMemberCount } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)

      if (currentMemberCount && currentMemberCount >= teamSettings.max_members) {
        throw new Error('Team has reached maximum member capacity')
      }
    }

    const { data, error } = await supabase
      .from('team_join_requests')
      .insert({
        team_id: teamId,
        user_id: userId,
        requested_by: requestedBy,
        request_type: requestType,
        message: message || null
      })
      .select(`
        *,
        team:teams(name, workspace_id),
        user:profiles!user_id(full_name, avatar_url),
        requester:profiles!requested_by(full_name, avatar_url)
      `)
      .single()

    if (error) throw error

    // Log the action
    await logTeamAssignmentAudit(
      teamId,
      userId,
      requestType === 'self_request' ? 'join_request' : 'invitation_sent',
      requestedBy,
      { request_id: data.id, message }
    )

    return data
  } catch (error: any) {
    console.error('createJoinRequest error:', error?.message || JSON.stringify(error, null, 2))
    throw error
  }
}

export async function getTeamJoinRequests(teamId: string, status?: string) {
  try {
    // First, get the join requests with team data
    let query = supabase
      .from('team_join_requests')
      .select(`
        *,
        team:teams(name, workspace_id)
      `)
      .eq('team_id', teamId)
      .order('requested_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: joinRequests, error } = await query

    if (error) throw error
    if (!joinRequests || joinRequests.length === 0) return []

    // Get all unique user IDs involved in these requests
    const userIds = new Set<string>()
    joinRequests.forEach(request => {
      if (request.user_id) userIds.add(request.user_id)
      if (request.requested_by) userIds.add(request.requested_by)
      if (request.responded_by) userIds.add(request.responded_by)
    })

    // Fetch all profiles at once
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, institution')
      .in('id', Array.from(userIds))

    if (profilesError) throw profilesError

    // Create a map for quick profile lookup
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

    // Map the join requests with profile data
    return joinRequests.map(request => ({
      ...request,
      user: request.user_id ? profileMap.get(request.user_id) || null : null,
      requester: request.requested_by ? profileMap.get(request.requested_by) || null : null,
      responder: request.responded_by ? profileMap.get(request.responded_by) || null : null
    }))
  } catch (error: any) {
    console.error('getTeamJoinRequests error:', error?.message || JSON.stringify(error, null, 2))
    return []
  }
}

export async function getUserJoinRequests(userId: string, status?: string) {
  try {
    // First get the join requests
    let query = supabase
      .from('team_join_requests')
      .select(`
        *,
        team:teams(name, workspace_id, avatar_color)
      `)
      .eq('user_id', userId)
      .order('requested_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: joinRequests, error } = await query

    if (error) throw error
    if (!joinRequests || joinRequests.length === 0) return []

    // Get unique user IDs for profile lookups
    const userIds = new Set<string>()
    joinRequests.forEach(request => {
      userIds.add(request.user_id)
      userIds.add(request.requested_by)
      if (request.responded_by) userIds.add(request.responded_by)
    })

    // Get profiles for all users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', Array.from(userIds))

    if (profilesError) throw profilesError

    // Create a map for quick profile lookups
    const profileMap = new Map()
    profiles?.forEach(profile => {
      profileMap.set(profile.id, profile)
    })

    // Combine the data
    const enrichedRequests = joinRequests.map(request => ({
      ...request,
      user: profileMap.get(request.user_id) || null,
      requester: profileMap.get(request.requested_by) || null,
      responder: request.responded_by ? profileMap.get(request.responded_by) || null : null
    }))

    return enrichedRequests
  } catch (error: any) {
    console.error('getUserJoinRequests error:', error?.message || JSON.stringify(error, null, 2))
    return []
  }
}

export async function getWorkspaceJoinRequests(workspaceId: string, status?: string) {
  try {
    // First get the join requests with team info
    let query = supabase
      .from('team_join_requests')
      .select(`
        *,
        team:teams!inner(name, workspace_id, avatar_color)
      `)
      .eq('team.workspace_id', workspaceId)
      .order('requested_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: joinRequests, error } = await query

    if (error) throw error
    if (!joinRequests || joinRequests.length === 0) return []

    // Get unique user IDs for profile lookups
    const userIds = new Set<string>()
    joinRequests.forEach(request => {
      userIds.add(request.user_id)
      userIds.add(request.requested_by)
      if (request.responded_by) userIds.add(request.responded_by)
    })

    // Get profiles for all users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, institution')
      .in('id', Array.from(userIds))

    if (profilesError) throw profilesError

    // Create a map for quick profile lookups
    const profileMap = new Map()
    profiles?.forEach(profile => {
      profileMap.set(profile.id, profile)
    })

    // Combine the data
    const enrichedRequests = joinRequests.map(request => ({
      ...request,
      user: profileMap.get(request.user_id) || null,
      requester: profileMap.get(request.requested_by) || null,
      responder: request.responded_by ? profileMap.get(request.responded_by) || null : null
    }))

    return enrichedRequests
  } catch (error: any) {
    console.error('getWorkspaceJoinRequests error:', error?.message || JSON.stringify(error, null, 2))
    return []
  }
}

export async function respondToJoinRequest(
  requestId: string,
  status: 'approved' | 'rejected',
  respondedBy: string,
  responseMessage?: string
) {
  try {
    const { data, error } = await supabase
      .from('team_join_requests')
      .update({
        status,
        responded_at: new Date().toISOString(),
        responded_by: respondedBy,
        response_message: responseMessage || null
      })
      .eq('id', requestId)
      .select(`
        *,
        team:teams(name, workspace_id),
        user:profiles!user_id(full_name, avatar_url)
      `)
      .single()

    if (error) throw error

    // Log the action and create notification
    await Promise.all([
      // Log audit event
      logTeamAssignmentAudit(
        data.team_id,
        data.user_id,
        status,
        respondedBy,
        { request_id: requestId, response_message: responseMessage }
      ),
      // Create notification for the user
      createJoinRequestNotification(
        data.user_id,
        (data as any).team?.name || 'Unknown Team',
        respondedBy,
        status
      )
    ])

    return data
  } catch (error: any) {
    console.error('respondToJoinRequest error:', error?.message || JSON.stringify(error, null, 2))
    throw error
  }
}

export async function cancelJoinRequest(requestId: string, userId: string) {
  try {
    const { data, error } = await supabase
      .from('team_join_requests')
      .update({
        status: 'cancelled',
        responded_at: new Date().toISOString(),
        responded_by: userId,
        response_message: 'Cancelled by user'
      })
      .eq('id', requestId)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .select(`
        *,
        team:teams(name, workspace_id)
      `)
      .single()

    if (error) throw error

    // Log the action
    await logTeamAssignmentAudit(
      data.team_id,
      data.user_id,
      'cancelled',
      userId,
      { request_id: requestId }
    )

    return data
  } catch (error: any) {
    console.error('cancelJoinRequest error:', error?.message || JSON.stringify(error, null, 2))
    throw error
  }
}

export async function getDiscoverableTeams(workspaceId: string, userId: string) {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        team_members(
          id,
          user_id,
          role,
          profile:profiles(full_name, avatar_url)
        )
      `)
      .eq('workspace_id', workspaceId)
      .eq('is_public', true)

    if (error) throw error

    // Filter out teams the user is already a member of
    const availableTeams = (data || []).filter(team => 
      !team.team_members.some((member: any) => member.user_id === userId)
    )

    // Add additional info for each team
    const teamsWithInfo = await Promise.all(
      availableTeams.map(async (team) => {
        // Check if user has pending request
        const { data: pendingRequest } = await supabase
          .from('team_join_requests')
          .select('id, status, request_type')
          .eq('team_id', team.id)
          .eq('user_id', userId)
          .eq('status', 'pending')
          .single()

        return {
          ...team,
          member_count: team.team_members.length,
          has_pending_request: !!pendingRequest,
          pending_request: pendingRequest,
          settings: team.settings || { allow_self_join: true, require_approval: true }
        }
      })
    )

    return teamsWithInfo
  } catch (error: any) {
    console.error('getDiscoverableTeams error:', error?.message || JSON.stringify(error, null, 2))
    return []
  }
}

export async function bulkInviteToTeam(
  teamId: string,
  userIds: string[],
  invitedBy: string,
  message?: string
) {
  try {
    // Get team information and settings
    const { data: team } = await supabase
      .from('teams')
      .select('workspace_id, name, settings, is_public')
      .eq('id', teamId)
      .single()

    if (!team) {
      throw new Error('Team not found')
    }

    // Get current team members to check for duplicates
    const { data: currentMembers } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId)

    const currentMemberIds = new Set(currentMembers?.map(m => m.user_id) || [])

    // Get pending requests to check for duplicates
    const { data: pendingRequests } = await supabase
      .from('team_join_requests')
      .select('user_id')
      .eq('team_id', teamId)
      .eq('status', 'pending')

    const pendingRequestIds = new Set(pendingRequests?.map(r => r.user_id) || [])

    // Filter out users who are already members or have pending requests
    const validUserIds = userIds.filter(userId => {
      if (currentMemberIds.has(userId)) {
        console.warn(`User ${userId} is already a member of team ${teamId}`)
        return false
      }
      if (pendingRequestIds.has(userId)) {
        console.warn(`User ${userId} already has a pending request for team ${teamId}`)
        return false
      }
      return true
    })

    if (validUserIds.length === 0) {
      throw new Error('No valid users to invite - all users are already members or have pending requests')
    }

    // Check team capacity if max_members is set
    const teamSettings = (team as any).settings || {}
    if (teamSettings.max_members) {
      const currentMemberCount = currentMembers?.length || 0
      const totalAfterInvites = currentMemberCount + validUserIds.length

      if (totalAfterInvites > teamSettings.max_members) {
        throw new Error(`Team capacity exceeded. Current: ${currentMemberCount}, Max: ${teamSettings.max_members}, Trying to add: ${validUserIds.length}`)
      }
    }

    // Verify all users are workspace members
    const { data: workspaceMembers } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', (team as any).workspace_id)
      .in('user_id', validUserIds)

    const workspaceMemberIds = new Set(workspaceMembers?.map(m => m.user_id) || [])
    const finalValidUserIds = validUserIds.filter(userId => {
      if (!workspaceMemberIds.has(userId)) {
        console.warn(`User ${userId} is not a member of workspace ${(team as any).workspace_id}`)
        return false
      }
      return true
    })

    if (finalValidUserIds.length === 0) {
      throw new Error('No valid users to invite - users must be workspace members')
    }

    const invitations = finalValidUserIds.map(userId => ({
      team_id: teamId,
      user_id: userId,
      requested_by: invitedBy,
      request_type: 'owner_invitation' as const,
      message: message || null
    }))

    const { data, error } = await supabase
      .from('team_join_requests')
      .insert(invitations)
      .select(`
        *,
        team:teams(name, workspace_id),
        user:profiles!user_id(full_name, avatar_url)
      `)

    if (error) throw error

    // Log all invitations and create notifications
    await Promise.all([
      // Log audit events
      ...(data || []).map(invitation =>
        logTeamAssignmentAudit(
          invitation.team_id,
          invitation.user_id,
          'invitation_sent',
          invitedBy,
          { request_id: invitation.id, message, bulk_invite: true }
        )
      ),
      // Create notifications for invited users
      ...(data || []).map(invitation => {
        const teamName = (invitation as any).team?.name || 'Unknown Team'
        return createTeamInvitationNotification(
          invitation.user_id,
          teamName,
          invitedBy
        )
      })
    ])

    return {
      successful: data || [],
      skipped: userIds.length - finalValidUserIds.length,
      total: userIds.length
    }
  } catch (error: any) {
    console.error('bulkInviteToTeam error:', error?.message || JSON.stringify(error, null, 2))
    throw error
  }
}

// =====================================================
// TEAM ASSIGNMENT AUDIT FUNCTIONS
// =====================================================

export async function logTeamAssignmentAudit(
  teamId: string,
  userId: string,
  action: string,
  performedBy: string,
  details: Record<string, any> = {}
) {
  try {
    const { error } = await supabase
      .from('team_assignment_audit')
      .insert({
        team_id: teamId,
        user_id: userId,
        action,
        performed_by: performedBy,
        details
      })

    if (error) throw error
  } catch (error: any) {
    console.error('logTeamAssignmentAudit error:', error?.message || JSON.stringify(error, null, 2))
    // Don't throw - audit logging shouldn't break main functionality
  }
}

export async function getTeamAssignmentAudit(teamId: string, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('team_assignment_audit')
      .select(`
        *,
        user:profiles!user_id(full_name, avatar_url),
        performer:profiles!performed_by(full_name, avatar_url),
        team:teams(name)
      `)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error: any) {
    console.error('getTeamAssignmentAudit error:', error?.message || JSON.stringify(error, null, 2))
    return []
  }
}

export async function getWorkspaceAssignmentAudit(workspaceId: string, limit = 100) {
  try {
    const { data, error } = await supabase
      .from('team_assignment_audit')
      .select(`
        *,
        user:profiles!user_id(full_name, avatar_url),
        performer:profiles!performed_by(full_name, avatar_url),
        team:teams!inner(name, workspace_id)
      `)
      .eq('team.workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error: any) {
    console.error('getWorkspaceAssignmentAudit error:', error?.message || JSON.stringify(error, null, 2))
    return []
  }
}

// =====================================================
// ENHANCED TEAM MANAGEMENT FUNCTIONS
// =====================================================

export async function updateTeamSettings(
  teamId: string,
  settings: {
    allow_self_join?: boolean
    require_approval?: boolean
    max_members?: number | null
  },
  isPublic?: boolean
) {
  try {
    const updates: any = {}
    
    if (settings) {
      updates.settings = settings
    }
    
    if (typeof isPublic === 'boolean') {
      updates.is_public = isPublic
    }

    const { data, error } = await supabase
      .from('teams')
      .update(updates)
      .eq('id', teamId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error: any) {
    console.error('updateTeamSettings error:', error?.message || JSON.stringify(error, null, 2))
    throw error
  }
}

export async function getTeamWithSettings(teamId: string) {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        team_members(
          id,
          user_id,
          role,
          joined_at,
          profile:profiles(full_name, avatar_url, institution)
        )
      `)
      .eq('id', teamId)
      .single()

    if (error) throw error

    return {
      ...data,
      member_count: data.team_members.length,
      settings: data.settings || { allow_self_join: true, require_approval: true, max_members: null }
    }
  } catch (error: any) {
    console.error('getTeamWithSettings error:', error?.message || JSON.stringify(error, null, 2))
    throw error
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

    // Calculate average participation from contributions
    const { data: contributions } = await supabase
      .from('contributions')
      .select('hours_spent, project:projects!inner(workspace_id)')
      .eq('project.workspace_id', workspaceId)

    const totalHours = contributions?.reduce((sum, c) => sum + (c.hours_spent || 0), 0) || 0
    const avgParticipation = memberCount && memberCount > 0 ? Math.round((totalHours / memberCount) * 10) / 10 : 0

    return {
      activeProjects: projectCount || 0,
      totalMembers: memberCount || 0,
      tasksCompleted: completedTasks || 0,
      avgParticipation,
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

// Get detailed analytics for a workspace
export async function getWorkspaceAnalytics(workspaceId: string) {
  try {
    const stats = await getWorkspaceStats(workspaceId)
    
    // Get all teams with member counts
    const { data: teams } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        team_members(count)
      `)
      .eq('workspace_id', workspaceId)

    // Get all contributions with user info
    const { data: contributions } = await supabase
      .from('contributions')
      .select(`
        id,
        user_id,
        hours_spent,
        contribution_type,
        created_at,
        project:projects!inner(id, workspace_id, team_id)
      `)
      .eq('project.workspace_id', workspaceId)

    // Get all tasks with status
    const { data: tasks } = await supabase
      .from('tasks')
      .select(`
        id,
        status,
        assigned_to,
        project:projects!inner(id, workspace_id)
      `)
      .eq('project.workspace_id', workspaceId)

    // Calculate participation metrics
    const participationByUser: Record<string, { hours: number; contributions: number }> = {}
    contributions?.forEach(contrib => {
      if (!participationByUser[contrib.user_id]) {
        participationByUser[contrib.user_id] = { hours: 0, contributions: 0 }
      }
      participationByUser[contrib.user_id].hours += contrib.hours_spent || 0
      participationByUser[contrib.user_id].contributions += 1
    })

    const participationScores = Object.values(participationByUser).map(p => p.hours)
    const avgParticipation = participationScores.length > 0
      ? participationScores.reduce((a, b) => a + b, 0) / participationScores.length
      : 0

    // Task completion rate
    const totalTasks = tasks?.length || 0
    const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    return {
      ...stats,
      teams: teams || [],
      totalTeams: teams?.length || 0,
      totalContributions: contributions?.length || 0,
      totalHours: contributions?.reduce((sum, c) => sum + (c.hours_spent || 0), 0) || 0,
      participationByUser,
      completionRate,
      avgParticipation: Math.round(avgParticipation * 10) / 10,
    }
  } catch (error: any) {
    console.error('getWorkspaceAnalytics error:', error?.message || JSON.stringify(error, null, 2));
    throw error
  }
}

// Get team analytics
export async function getTeamAnalytics(teamId: string) {
  try {
    // Get team with members (excluding instructors)
    const { data: team } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        workspace_id,
        team_members(
          id,
          user_id,
          role,
          user:profiles!user_id(id, full_name, avatar_url, role)
        )
      `)
      .eq('id', teamId)
      .single()

    if (!team) throw new Error('Team not found')

    // Get team projects
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, status')
      .eq('team_id', teamId)

    // Get contributions for team projects
    const projectIds = projects?.map(p => p.id) || []
    const { data: contributions } = projectIds.length > 0 ? await supabase
      .from('contributions')
      .select('*')
      .in('project_id', projectIds) : { data: [] }

    // Get tasks for team projects
    const { data: tasks } = projectIds.length > 0 ? await supabase
      .from('tasks')
      .select('*')
      .in('project_id', projectIds) : { data: [] }

    // Calculate participation by member (excluding instructors)
    const memberParticipation: Record<string, {
      userId: string
      name: string
      hours: number
      contributions: number
      tasksCompleted: number
      tasksAssigned: number
    }> = {}

    // Filter out instructors from team members
    const studentMembers = team.team_members?.filter((member: any) => {
      const userRole = member.user?.role?.toLowerCase() || '';
      return userRole !== 'instructor' && userRole !== 'teaching_assistant';
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
      }
    })

    // Aggregate contributions
    contributions?.forEach(contrib => {
      if (memberParticipation[contrib.user_id]) {
        memberParticipation[contrib.user_id].hours += contrib.hours_spent || 0
        memberParticipation[contrib.user_id].contributions += 1
      }
    })

    // Aggregate tasks
    tasks?.forEach(task => {
      if (task.assigned_to && memberParticipation[task.assigned_to]) {
        memberParticipation[task.assigned_to].tasksAssigned += 1
        if (task.status === 'completed') {
          memberParticipation[task.assigned_to].tasksCompleted += 1
        }
      }
    })

    const participationData = Object.values(memberParticipation)
    const totalHours = participationData.reduce((sum, m) => sum + m.hours, 0)
    const avgHours = participationData.length > 0 ? totalHours / participationData.length : 0

    // Calculate fairness score (how balanced participation is)
    // Lower variance = more fair
    const hoursArray = participationData.map(m => m.hours)
    const mean = avgHours
    const variance = hoursArray.length > 0
      ? hoursArray.reduce((sum, h) => sum + Math.pow(h - mean, 2), 0) / hoursArray.length
      : 0
    const fairnessScore = mean > 0 ? Math.max(0, Math.min(100, Math.round(100 - (variance / mean) * 10))) : 0

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
      completedTasks: tasks?.filter(t => t.status === 'completed').length || 0,
      fairnessScore,
    }
  } catch (error: any) {
    console.error('getTeamAnalytics error:', error?.message || JSON.stringify(error, null, 2));
    throw error
  }
}

// Get user's personal analytics
export async function getUserAnalytics(userId: string, workspaceId?: string) {
  try {
    // Get user's contributions
    let contributionsQuery = supabase
      .from('contributions')
      .select(`
        id,
        project_id,
        hours_spent,
        contribution_type,
        created_at,
        project:projects!inner(id, name, workspace_id, team_id)
      `)
      .eq('user_id', userId)

    if (workspaceId) {
      contributionsQuery = contributionsQuery.eq('project.workspace_id', workspaceId)
    }

    const { data: contributions } = await contributionsQuery

    // Get user's tasks
    let tasksQuery = supabase
      .from('tasks')
      .select(`
        id,
        title,
        status,
        priority,
        project_id,
        project:projects!inner(id, name, workspace_id)
      `)
      .eq('assigned_to', userId)

    if (workspaceId) {
      tasksQuery = tasksQuery.eq('project.workspace_id', workspaceId)
    }

    const { data: tasks } = await tasksQuery

    // Calculate breakdown by contribution type
    const contributionBreakdown: Record<string, number> = {
      code: 0,
      documentation: 0,
      research: 0,
      design: 0,
      meeting: 0,
      other: 0,
    }

    contributions?.forEach(contrib => {
      const type = contrib.contribution_type || 'other'
      contributionBreakdown[type] = (contributionBreakdown[type] || 0) + 1
    })

    // Calculate weekly hours
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const weekContributions = contributions?.filter(c => {
      const created = new Date(c.created_at)
      return created >= weekAgo
    }) || []
    const weekHours = weekContributions.reduce((sum, c) => sum + (c.hours_spent || 0), 0)

    // Total hours
    const totalHours = contributions?.reduce((sum, c) => sum + (c.hours_spent || 0), 0) || 0

    return {
      totalContributions: contributions?.length || 0,
      totalHours: Math.round(totalHours * 10) / 10,
      weekHours: Math.round(weekHours * 10) / 10,
      totalTasks: tasks?.length || 0,
      completedTasks: tasks?.filter(t => t.status === 'completed').length || 0,
      inProgressTasks: tasks?.filter(t => t.status === 'in_progress').length || 0,
      contributionBreakdown,
      tasks: tasks || [],
      contributions: contributions || [],
    }
  } catch (error: any) {
    console.error('getUserAnalytics error:', error?.message || JSON.stringify(error, null, 2));
    throw error
  }
}

// Get student performance data for instructors/TAs
export async function getStudentPerformance(workspaceId: string, userId?: string) {
  try {
    // Get all workspace members (excluding instructors and TAs)
    const { data: members } = await supabase
      .from('workspace_members')
      .select(`
        user_id,
        role,
        user:profiles!user_id(id, full_name, avatar_url, institution, role)
      `)
      .eq('workspace_id', workspaceId)

    if (!members || members.length === 0) return []

    // Filter out instructors and TAs - only include students
    const studentMembers = members.filter((member: any) => {
      const userRole = member.user?.role?.toLowerCase() || '';
      return userRole === 'student' || !userRole || userRole === 'member';
    });

    if (studentMembers.length === 0) return [];

    const userIds = studentMembers.map(m => m.user_id)
    const performanceData: Array<{
      userId: string
      name: string
      avatar?: string
      institution?: string
      totalHours: number
      contributions: number
      tasksCompleted: number
      tasksAssigned: number
      participationScore: number
      lastActive?: string
    }> = []

    // Get analytics for each student (not instructors)
    for (const member of studentMembers) {
      const userAnalytics = await getUserAnalytics(member.user_id, workspaceId)
      
      // Get last contribution timestamp
      const { data: lastContrib } = await supabase
        .from('contributions')
        .select('created_at, project:projects!inner(workspace_id)')
        .eq('user_id', member.user_id)
        .eq('project.workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const completionRate = userAnalytics.totalTasks > 0
        ? Math.round((userAnalytics.completedTasks / userAnalytics.totalTasks) * 100)
        : 0

      // Calculate participation score (combination of hours, contributions, and completion)
      const participationScore = Math.round(
        (userAnalytics.totalHours * 0.4) +
        (userAnalytics.totalContributions * 2) +
        (completionRate * 0.5)
      )

      performanceData.push({
        userId: member.user_id,
        name: member.user?.full_name || 'Unknown',
        avatar: member.user?.avatar_url,
        institution: member.user?.institution,
        totalHours: userAnalytics.totalHours,
        contributions: userAnalytics.totalContributions,
        tasksCompleted: userAnalytics.completedTasks,
        tasksAssigned: userAnalytics.totalTasks,
        participationScore,
        lastActive: lastContrib?.created_at,
      })
    }

    // Sort by participation score
    return performanceData.sort((a, b) => b.participationScore - a.participationScore)
  } catch (error: any) {
    console.error('getStudentPerformance error:', error?.message || JSON.stringify(error, null, 2));
    return []
  }
}

// =====================================================
// NOTIFICATION FUNCTIONS
// =====================================================

export interface Notification {
  id: string
  user_id: string
  type: 'team_assignment' | 'team_invitation' | 'join_request' | 'role_change' | 'team_update'
  title: string
  message: string
  data?: Record<string, any>
  read: boolean
  created_at: string
  updated_at: string
}

/**
 * Create a new notification
 */
export async function createNotification(notification: {
  user_id: string
  type: Notification['type']
  title: string
  message: string
  data?: Record<string, any>
}) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: notification.user_id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data || {},
        read: false
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error: any) {
    console.error('createNotification error:', error?.message || JSON.stringify(error, null, 2))
    throw error
  }
}

/**
 * Get user notifications with pagination and filtering
 */
export async function getUserNotifications(
  userId: string,
  options: {
    limit?: number
    offset?: number
    unreadOnly?: boolean
    type?: Notification['type']
  } = {}
) {
  try {
    const { limit = 20, offset = 0, unreadOnly = false, type } = options

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (unreadOnly) {
      query = query.eq('read', false)
    }

    if (type) {
      query = query.eq('type', type)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  } catch (error: any) {
    console.error('getUserNotifications error:', error?.message || JSON.stringify(error, null, 2))
    return []
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string, userId: string) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error: any) {
    console.error('markNotificationAsRead error:', error?.message || JSON.stringify(error, null, 2))
    throw error
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('read', false)

    if (error) throw error
    return data
  } catch (error: any) {
    console.error('markAllNotificationsAsRead error:', error?.message || JSON.stringify(error, null, 2))
    throw error
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string, userId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId)

    if (error) throw error
    return true
  } catch (error: any) {
    console.error('deleteNotification error:', error?.message || JSON.stringify(error, null, 2))
    throw error
  }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(userId: string) {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false)

    if (error) throw error
    return count || 0
  } catch (error: any) {
    console.error('getUnreadNotificationCount error:', error?.message || JSON.stringify(error, null, 2))
    return 0
  }
}

/**
 * Create team assignment notification
 */
export async function createTeamAssignmentNotification(
  userId: string,
  teamName: string,
  assignedBy: string,
  role: string = 'member'
) {
  return createNotification({
    user_id: userId,
    type: 'team_assignment',
    title: 'Team Assignment',
    message: `You have been assigned to team "${teamName}" as a ${role} by ${assignedBy}`,
    data: {
      team_name: teamName,
      assigned_by: assignedBy,
      role: role
    }
  })
}

/**
 * Create team invitation notification
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
      invited_by: invitedBy
    }
  })
}

/**
 * Create join request notification
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
    rejected: `Your request to join team "${teamName}" has been rejected`
  }

  return createNotification({
    user_id: userId,
    type: 'join_request',
    title: 'Join Request Update',
    message: messages[status],
    data: {
      team_name: teamName,
      requester_name: requesterName,
      status: status
    }
  })
}
