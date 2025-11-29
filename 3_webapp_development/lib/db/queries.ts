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
  ProjectResource,
  ProjectSubmission,
  TeamWithMembers
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
    if (updates.first_tour_completed !== undefined) {
      sanitizedUpdates.first_tour_completed = updates.first_tour_completed;
    }
    if (updates.onboarding_completed !== undefined) {
      sanitizedUpdates.onboarding_completed = updates.onboarding_completed;
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

/**
 * Create a new workspace with the current user as owner
 * Uses an RPC function to bypass RLS restrictions during creation
 * @param workspace - Workspace data to insert
 * @param userId - Owner's user ID
 * @returns The created workspace
 */
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

/**
 * Upload a workspace icon to storage and update the workspace record
 * @param workspaceId - Workspace ID
 * @param file - Image file to upload
 * @returns Public URL of the uploaded icon
 */
export async function uploadWorkspaceIcon(workspaceId: string, file: File): Promise<string> {
  try {
    // Create unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${workspaceId}-${Date.now()}.${fileExt}`
    const filePath = `${workspaceId}/${fileName}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('workspace-icons')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true // Allow overwriting
      })

    if (uploadError) throw uploadError

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('workspace-icons')
      .getPublicUrl(filePath)

    const iconUrl = urlData.publicUrl

    // Update workspace with icon URL
    const { error: updateError } = await supabase
      .from('workspaces')
      .update({ icon_url: iconUrl })
      .eq('id', workspaceId)

    if (updateError) throw updateError

    return iconUrl
  } catch (error: any) {
    console.error('uploadWorkspaceIcon error:', error?.message || JSON.stringify(error, null, 2))
    throw error
  }
}

/**
 * Remove a workspace icon from storage and update the workspace record
 * @param workspaceId - Workspace ID
 */
export async function removeWorkspaceIcon(workspaceId: string): Promise<void> {
  try {
    // Get current icon URL from workspace
    const { data: workspace, error: fetchError } = await supabase
      .from('workspaces')
      .select('icon_url')
      .eq('id', workspaceId)
      .single()

    if (fetchError) throw fetchError

    if (workspace?.icon_url) {
      // Extract file path from URL (workspace-icons/{workspaceId}/filename)
      const urlParts = workspace.icon_url.split('/')
      const filePathIndex = urlParts.indexOf('workspace-icons')
      if (filePathIndex !== -1 && filePathIndex < urlParts.length - 1) {
        const filePath = urlParts.slice(filePathIndex + 1).join('/')
        
        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from('workspace-icons')
          .remove([filePath])

        if (storageError) {
          console.warn('Storage delete error (file may not exist):', storageError)
          // Continue with DB update even if storage delete fails
        }
      }
    }

    // Update workspace to remove icon URL
    const { error: updateError } = await supabase
      .from('workspaces')
      .update({ icon_url: null })
      .eq('id', workspaceId)

    if (updateError) throw updateError
  } catch (error: any) {
    console.error('removeWorkspaceIcon error:', error?.message || JSON.stringify(error, null, 2))
    throw error
  }
}

/**
 * Get a workspace by ID
 * Uses RPC to bypass RLS issues and ensure access
 * @param workspaceId - Workspace ID
 * @returns Workspace data
 */
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

/**
 * Get all workspaces for a user
 * @param userId - User ID
 * @returns List of workspace memberships with workspace details
 */
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
/**
 * Get all workspaces for a user using RPC (bypasses RLS)
 * @param userId - User ID
 * @returns List of workspace memberships with workspace details
 */
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

/**
 * Join a workspace using an invite code
 * @param inviteCode - The invite code
 * @param userId - User ID
 * @returns The joined workspace
 */
export async function joinWorkspaceByCode(inviteCode: string, userId: string) {
  // Ensure profile exists before joining workspace
  // This is important because RLS policies require profiles for visibility
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // Try to get or create profile
      await getOrCreateProfile(userId, {
        full_name: user.user_metadata?.full_name,
        email: user.email || undefined
      })
    }
  } catch (profileError) {
    // Log but don't fail - profile might already exist
    console.warn('Profile check/creation warning:', profileError)
  }

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
/**
 * Get all members of a workspace
 * @param workspaceId - Workspace ID
 * @returns List of workspace members with profile data
 */
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
    // Normalize user data - handle cases where Supabase returns arrays from joins
    const transformedData = (data || []).map((member: any) => {
      let user = member.user;
      // Handle array response from Supabase join
      if (Array.isArray(user)) {
        user = user[0] || null;
      }
      
      return {
      id: member.id,
      workspace_id: member.workspace_id,
      user_id: member.user_id,
      role: member.role,
      joined_at: member.joined_at,
        user: user || null // Normalized user profile
      };
    });

    return transformedData;
  } catch (error) {
    console.error('❌ [CLIENT] Exception in getWorkspaceMembers:', error);
    return [];
  }
}

// Add a function to check if user can view workspace members
/**
 * Check if a user has permission to view workspace members
 * @param workspaceId - Workspace ID
 * @param userId - User ID
 * @returns True if user can view members, false otherwise
 */
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

/**
 * Create a new team in a workspace
 * Auto-adds the creator as a leader unless they are an instructor
 * @param team - Team data to insert
 * @param userId - Creator's user ID
 * @returns The created team
 */
export async function createTeam(team: TeamInsert, userId: string) {
  const { data, error } = await supabase
    .from('teams')
    .insert({ ...team, created_by: userId } as any)
    .select()
    .single()

  if (error) throw error

  // Check if creator is an instructor - if so, don't auto-add them to the team
  // Instructors should be able to join/leave teams on their own
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    const userRole = profile?.role?.toLowerCase()
    const isInstructor = userRole === 'instructor' || userRole === 'teaching_assistant' || userRole === 'admin'

    // Only auto-add creator as team leader if they're NOT an instructor
    // Instructors can manually join teams later if they want to participate
    if (!isInstructor) {
  await supabase
    .from('team_members')
    .insert({
      team_id: (data as any).id,
      user_id: userId,
      role: 'leader',
    } as any)
    }
  } catch (profileError) {
    // If we can't check the profile, default to adding them (backward compatibility)
    console.warn('Could not check user role for team creation, defaulting to auto-add:', profileError)
    await supabase
      .from('team_members')
      .insert({
        team_id: (data as any).id,
        user_id: userId,
        role: 'leader',
      } as any)
  }

  return data as Team
}

/**
 * Get all teams in a workspace
 * @param workspaceId - Workspace ID
 * @returns List of teams with members
 */
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

/**
 * Get teams a user belongs to
 * @param userId - User ID
 * @param workspaceId - Optional workspace ID to filter by
 * @returns List of team memberships with team details
 */
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

/**
 * Create a new project
 * Logs activity and notifies team members
 * @param project - Project data to insert
 * @param userId - Creator's user ID
 * @returns The created project
 */
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

  // Notify team members about new project
  if (project.team_id) {
    const { data: teamMembers } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', project.team_id)

    const teamMemberIds = teamMembers?.map(m => m.user_id).filter(id => id !== userId) || []

    if (teamMemberIds.length > 0) {
      await createProjectUpdateNotification(
        teamMemberIds,
        project.name,
        (data as any).id,
        'created',
        userId
      )
    }
  }

  return data as Project
}

/**
 * Get all projects for a team
 * @param teamId - Team ID
 * @returns List of projects with tasks and contributions
 */
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      uid = user.id;
    }

    const { data, error } = await supabase
      .rpc('get_workspace_projects_rpc', { 
        workspace_id_param: workspaceId,
        user_id_param: uid
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
    .single()

  const { data, error } = await supabase
    .from('projects')
    .update(updates as any)
    .eq('id', projectId)
    .select()
    .single()

  if (error) throw error

  // Get current user from auth
  const { data: { user: authUser } } = await supabase.auth.getUser()
  const userId = authUser?.id

  // Notify team members about project updates
  if (currentProject && userId && currentProject.team_id) {
    const { data: teamMembers } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', currentProject.team_id)

    const teamMemberIds = teamMembers?.map(m => m.user_id).filter(id => id !== userId) || []

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
          )
        } else {
          await createProjectUpdateNotification(
            teamMemberIds,
            currentProject.name,
            projectId,
            'updated',
            userId
          )
        }
      } else if (Object.keys(updates).length > 0) {
        // General project update
        await createProjectUpdateNotification(
          teamMemberIds,
          currentProject.name,
          projectId,
          'updated',
          userId
        )
      }
    }
  }

  return data as Project
}

// =====================================================
// TASK FUNCTIONS
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

    // Create notification if task is assigned during creation (old single assignee system)
    if (task.assigned_to && task.assigned_to !== userId) {
      const { data: projectData } = await supabase
        .from('projects')
        .select('name')
        .eq('id', task.project_id)
        .single()

      await createTaskAssignmentNotification(
        task.assigned_to,
        task.title,
        (data as any).id,
        userId,
        projectData?.name
      )
    }
  }

  return data as Task
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
      .select(`
        *,
        assignee:profiles!assigned_to(*),
        creator:profiles!created_by(*),
        assignees:task_assignees(
          id,
          user_id,
          assigned_at,
          user:profiles!user_id(id, full_name, avatar_url)
        )
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
    .select(`
      *,
      project:projects(*),
      assignee:profiles!assigned_to(*),
      assignees:task_assignees(
        id,
        user_id,
        assigned_at,
        user:profiles!user_id(id, full_name, avatar_url)
      )
    `)
    .eq('assigned_to', userId)

  const { data: tasksByNew, error: error2 } = await supabase
    .from('task_assignees')
    .select(`
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
    `)
    .eq('user_id', userId)

  if (error1 || error2) {
    throw error1 || error2
  }

  // Combine and deduplicate
  const allTasks = [
    ...(tasksByOld || []),
    ...(tasksByNew?.map((ta: any) => ta.task).filter(Boolean) || [])
  ]

  // Deduplicate by task id
  const uniqueTasks = Array.from(
    new Map(allTasks.map((task: any) => [task.id, task])).values()
  )

  return uniqueTasks.sort((a: any, b: any) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

/**
 * Get count of pending (non-completed) tasks assigned to a user
 */
export async function getUserPendingTasksCount(userId: string) {
  try {
    // Get tasks where user is assigned via old assigned_to field and status is not completed
    const { count: countOld, error: error1 } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to', userId)
      .neq('status', 'completed')

    // Get tasks where user is assigned via task_assignees and status is not completed
    const { count: countNew, error: error2 } = await supabase
      .from('task_assignees')
      .select('task:tasks!inner(id)', { count: 'exact', head: true })
      .eq('user_id', userId)
      .neq('task.status', 'completed')

    if (error1 || error2) {
      throw error1 || error2
    }

    // We need to get unique tasks since a user might be assigned via both methods
    // Get the actual tasks and deduplicate
    const { data: tasksByOld } = await supabase
      .from('tasks')
      .select('id')
      .eq('assigned_to', userId)
      .neq('status', 'completed')

    const { data: tasksByNew } = await supabase
      .from('task_assignees')
      .select('task:tasks!inner(id)')
      .eq('user_id', userId)
      .neq('task.status', 'completed')

    // Combine and deduplicate task IDs
    const allTaskIds = new Set<string>()
    tasksByOld?.forEach((task: any) => allTaskIds.add(task.id))
    tasksByNew?.forEach((ta: any) => {
      if (ta.task?.id) allTaskIds.add(ta.task.id)
    })

    return allTaskIds.size
  } catch (error: any) {
    console.error('getUserPendingTasksCount error:', error?.message || JSON.stringify(error, null, 2))
    return 0
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
      .select(`
        *,
        project:projects!project_id(id, workspace_id)
      `)
      .eq('id', taskId)
      .single()

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

    // Log activity for significant changes
    if (currentTask && (currentTask as any).project?.workspace_id) {
      const workspaceId = (currentTask as any).project.workspace_id;
      
      // Get current user from auth
      const { data: { user: authUser } } = await supabase.auth.getUser();
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
          .single()

        const projectName = project?.name

        // Create notification for task status change
        if (updates.status === 'completed' && currentTask.status !== 'completed') {
          // Notify task assignees and team members about completion
          const { data: assignees } = await supabase
            .from('task_assignees')
            .select('user_id')
            .eq('task_id', taskId)

          const assigneeIds = assignees?.map(a => a.user_id) || []
          // Include old assigned_to for backward compatibility
          if (currentTask.assigned_to) {
            assigneeIds.push(currentTask.assigned_to)
          }

          // Get team members if project has a team
          let teamMemberIds: string[] = []
          if (project?.team_id) {
            const { data: teamMembers } = await supabase
              .from('team_members')
              .select('user_id')
              .eq('team_id', project.team_id)
            teamMemberIds = teamMembers?.map(m => m.user_id) || []
          }

          // Combine unique IDs
          const uniqueIds = [...new Set([...assigneeIds, ...teamMemberIds])].filter(id => id !== userId)

          await Promise.all(
            uniqueIds.map(notifyUserId =>
              createTaskCompletedNotification(
                notifyUserId,
                data.title,
                taskId,
                userId,
                projectName
              )
            )
          )

          // Send motivational message to user who completed the task
          if (userId && project) {
            try {
              const { checkTaskCompletionTriggers } = await import('../services/motivationalMessageTriggers')
              await checkTaskCompletionTriggers(
                {
                  userId,
                  workspaceId: (project as any).workspace_id,
                  teamId: project.team_id,
                },
                taskId
              )
            } catch (error) {
              // Silently fail - motivational messages are nice-to-have
              console.error('Error sending motivational message:', error)
            }
          }
        } else if (updates.status && currentTask.assigned_to) {
          // Notify assignee about status change
          await createTaskStatusChangedNotification(
            currentTask.assigned_to,
            data.title,
            taskId,
            currentTask.status,
            updates.status,
            userId,
            projectName
          )
        }
      }
      
      // Log assignment change (old single assignee system)
      if (updates.assigned_to !== undefined && updates.assigned_to !== currentTask.assigned_to && userId) {
        const assigneeName = updates.assigned_to 
          ? (await supabase.from('profiles').select('full_name').eq('id', updates.assigned_to).single()).data?.full_name || 'someone'
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
            .single()
          
          await createTaskAssignmentNotification(
            updates.assigned_to,
            data.title,
            taskId,
            userId,
            project?.name
          )
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

/**
 * Delete a task
 * @param taskId - Task ID
 */
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

/**
 * Update a team member's role
 * @param teamId - Team ID
 * @param userId - User ID
 * @param role - New role ('leader' or 'member')
 * @returns Updated team member record
 */
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

/**
 * Get all members of a team
 * @param teamId - Team ID
 * @returns List of team members with profile data
 */
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

/**
 * Check if a user is a team leader or instructor/admin
 * @param userId - User ID
 * @param teamId - Team ID
 * @param workspaceId - Workspace ID
 * @returns True if user has elevated permissions
 */
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
/**
 * Add a member to a team
 * Ensures user is a workspace member first
 * Checks team capacity limits
 * @param teamId - Team ID
 * @param userId - User ID to add
 * @param role - Role in team (default: 'member')
 * @param assignedBy - ID of user performing the action (for notifications)
 * @returns The new team member record
 */
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

/**
 * Remove a member from a team
 * Logs activity
 * @param teamId - Team ID
 * @param userId - User ID to remove
 * @returns Deleted team member record
 */
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

/**
 * Get workspace members who are NOT in a specific team
 * @param workspaceId - Workspace ID
 * @param teamId - Team ID to exclude members from
 * @returns List of available workspace members
 */
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
/**
 * Debug function to get all workspace members
 * @param workspaceId - Workspace ID
 * @returns List of workspace members
 */
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

/**
 * Fix data consistency issues where team members are not workspace members
 * Adds missing workspace memberships or removes invalid team memberships
 * @param workspaceId - Workspace ID
 * @param teamId - Team ID
 * @returns Result object indicating if fixes were made
 */
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
    .single()

  if (error) throw error

  // Log activity
  const { data: project } = await supabase
    .from('projects')
    .select('workspace_id, team_id')
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

    // Send motivational message
    try {
      const { checkContributionTriggers } = await import('../services/motivationalMessageTriggers')
      await checkContributionTriggers(
        {
          userId: contribution.user_id,
          workspaceId: (project as any).workspace_id,
          teamId: (project as any).team_id,
        },
        (data as any).id
      )
    } catch (error) {
      // Silently fail - motivational messages are nice-to-have
      console.error('Error sending motivational message:', error)
    }
  }

  return data as Contribution
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
    .select(`
      *,
      project:projects!project_id(id, name, team_id),
      task:tasks!task_id(id, title, status)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

/**
 * Get all contributions for a project
 * @param projectId - Project ID
 * @returns List of contributions with user profiles
 */
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
    .single()

  if (error) throw error

  // Log activity - get workspace_id from project
  const { data: projectData } = await supabase
    .from('projects')
    .select('workspace_id')
    .eq('id', (data as any).project_id)
    .single()

  if (projectData?.workspace_id) {
    await logActivity({
      workspace_id: projectData.workspace_id,
      user_id: (data as any).user_id,
      action_type: 'updated_contribution',
      entity_type: 'contribution',
      entity_id: contributionId,
      metadata: { contribution_type: (data as any).contribution_type },
    })
  }

  return data as Contribution
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
    .single()

  if (!contribution) {
    throw new Error('Contribution not found')
  }

  // Get workspace_id from project
  const { data: projectData } = await supabase
    .from('projects')
    .select('workspace_id')
    .eq('id', (contribution as any).project_id)
    .single()

  const { error } = await supabase
    .from('contributions')
    .delete()
    .eq('id', contributionId)

  if (error) throw error

  // Log activity
  if (projectData?.workspace_id) {
    await logActivity({
      workspace_id: projectData.workspace_id,
      user_id: (contribution as any).user_id,
      action_type: 'deleted_contribution',
      entity_type: 'contribution',
      entity_id: contributionId,
      metadata: { contribution_type: (contribution as any).contribution_type },
    })
  }

  return true
}

/**
 * Get a contribution with full details
 * @param contributionId - Contribution ID
 * @returns Contribution with project, task, and user details
 */
export async function getContributionWithDetails(contributionId: string) {
  const { data, error } = await supabase
    .from('contributions')
    .select(`
      *,
      project:projects!project_id(id, name, team_id),
      task:tasks!task_id(id, title),
      user:profiles!user_id(id, full_name, avatar_url)
    `)
    .eq('id', contributionId)
    .single()

  if (error) throw error
  return data
}

// =====================================================
// ACTIVITY LOG FUNCTIONS
// =====================================================

/**
 * Log an activity in the workspace
 * @param activity - Activity data to insert
 */
export async function logActivity(activity: ActivityLogInsert) {
  const { error } = await supabase
    .from('activity_log')
    .insert(activity as any)

  if (error) console.error('Failed to log activity:', error)
}

/**
 * Get activity log for a workspace
 * @param workspaceId - Workspace ID
 * @param limit - Number of activities to return (default: 20)
 * @param userId - Optional User ID (if already known)
 * @returns List of activities with user profiles
 */
export async function getWorkspaceActivity(workspaceId: string, limit = 20, userId?: string) {
  try {
    // We don't strictly need the user ID for the query itself if RLS allows it,
    // but we might want to verify auth.
    // If userId is provided, we assume auth is handled by caller.
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
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
    // Ensure user is a single object, not an array
    const transformedData = (data || []).map((activity: any) => {
      // Handle case where user might be an array (Supabase sometimes returns arrays)
      let user = activity.user;
      if (Array.isArray(user)) {
        user = user[0] || null;
      }
      
      return {
        id: activity.id,
        workspace_id: activity.workspace_id,
        user_id: activity.user_id,
        action_type: activity.action_type,
        entity_type: activity.entity_type,
        entity_id: activity.entity_id,
        metadata: activity.metadata,
        created_at: activity.created_at,
        user: user || null,
      };
    });
    
    return transformedData;
  } catch (error: any) {
    console.error('getWorkspaceActivity catch:', error?.message || error);
    return [];
  }
}

// =====================================================
// TEAM JOIN REQUEST FUNCTIONS
// =====================================================

/**
 * Create a request to join a team
 * Handles both self-requests and owner invitations
 * Checks for existing memberships and pending requests
 * @param teamId - Team ID
 * @param userId - User ID
 * @param requestedBy - ID of user making the request
 * @param requestType - Type of request ('self_request' or 'owner_invitation')
 * @param message - Optional message
 * @returns The created join request
 */
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

/**
 * Get join requests for a team
 * @param teamId - Team ID
 * @param status - Optional status to filter by
 * @returns List of join requests with user profiles
 */
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

/**
 * Get join requests for a user
 * @param userId - User ID
 * @param status - Optional status to filter by
 * @returns List of join requests with team and profile details
 */
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

/**
 * Get all join requests in a workspace
 * @param workspaceId - Workspace ID
 * @param status - Optional status to filter by
 * @returns List of join requests with team and profile details
 */
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

/**
 * Respond to a join request (approve/reject)
 * Updates request status and adds user to team if approved
 * Logs activity
 * @param requestId - Request ID
 * @param status - New status ('approved' or 'rejected')
 * @param respondedBy - ID of user responding
 * @param responseMessage - Optional response message
 * @returns Updated request
 */
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

/**
 * Cancel a pending join request
 * Logs activity
 * @param requestId - Request ID
 * @param userId - User ID cancelling the request
 * @returns Cancelled request
 */
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

/**
 * Get public teams in a workspace that user can join
 * @param workspaceId - Workspace ID
 * @param userId - User ID
 * @returns List of discoverable teams with member counts and status
 */
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

/**
 * Bulk invite users to a team
 * Checks for existing memberships and pending requests
 * Verifies workspace membership
 * @param teamId - Team ID
 * @param userIds - List of user IDs to invite
 * @param invitedBy - ID of user sending invites
 * @param message - Optional invitation message
 * @returns Result object with successful and skipped counts
 */
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

/**
 * Bulk add team members directly (for instructors/admins)
 * This bypasses join requests and directly adds members to the team
 */
/**
 * Bulk add team members directly (for instructors/admins)
 * Bypasses join requests and directly adds members
 * @param teamId - Team ID
 * @param userIds - List of user IDs to add
 * @param role - Role in team (default: 'member')
 * @param assignedBy - ID of user performing the action
 * @returns Result object with successful and skipped counts
 */
export async function bulkAddTeamMembers(
  teamId: string,
  userIds: string[],
  role: 'leader' | 'member' = 'member',
  assignedBy: string
) {
  try {
    // Get team information
    const { data: team } = await supabase
      .from('teams')
      .select('workspace_id, name, settings')
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

    // Filter out users who are already members
    const validUserIds = userIds.filter(userId => {
      if (currentMemberIds.has(userId)) {
        console.warn(`User ${userId} is already a member of team ${teamId}`)
        return false
      }
      return true
    })

    if (validUserIds.length === 0) {
      throw new Error('No valid users to add - all users are already members')
    }

    // Check team capacity if max_members is set
    const teamSettings = (team as any).settings || {}
    if (teamSettings.max_members) {
      const currentMemberCount = currentMembers?.length || 0
      const totalAfterAdd = currentMemberCount + validUserIds.length

      if (totalAfterAdd > teamSettings.max_members) {
        throw new Error(`Team capacity exceeded. Current: ${currentMemberCount}, Max: ${teamSettings.max_members}, Trying to add: ${validUserIds.length}`)
      }
    }

    // Verify all users are workspace members
    const { data: workspaceMembers } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', team.workspace_id)
      .in('user_id', validUserIds)

    const workspaceMemberIds = new Set(workspaceMembers?.map(m => m.user_id) || [])
    const finalValidUserIds = validUserIds.filter(userId => {
      if (!workspaceMemberIds.has(userId)) {
        console.warn(`User ${userId} is not a member of workspace ${team.workspace_id}`)
        return false
      }
      return true
    })

    if (finalValidUserIds.length === 0) {
      throw new Error('No valid users to add - users must be workspace members')
    }

    // Directly add members to the team
    const membersToAdd = finalValidUserIds.map(userId => ({
      team_id: teamId,
      user_id: userId,
      role
    }))

    const { data: addedMembers, error } = await supabase
      .from('team_members')
      .insert(membersToAdd)
      .select(`
        *,
        user:profiles!user_id(id, full_name, avatar_url)
      `)

    if (error) throw error

    // Log activity and create notifications for all added members
    await Promise.all([
      ...(addedMembers || []).map(member =>
        logActivity({
          workspace_id: team.workspace_id,
          user_id: member.user_id,
          action_type: 'joined_team',
          entity_type: 'team',
          entity_id: teamId,
          metadata: { team_name: team.name, role },
        })
      ),
      ...(addedMembers || []).map(member =>
        createTeamAssignmentNotification(
          member.user_id,
          team.name,
          assignedBy,
          role
        )
      )
    ])

    return {
      successful: addedMembers || [],
      skipped: userIds.length - finalValidUserIds.length,
      total: userIds.length
    }
  } catch (error: any) {
    console.error('bulkAddTeamMembers error:', error?.message || JSON.stringify(error, null, 2))
    throw error
  }
}

// =====================================================
// TEAM ASSIGNMENT AUDIT FUNCTIONS
// =====================================================

/**
 * Log a team assignment audit event
 * @param teamId - Team ID
 * @param userId - User ID affected
 * @param action - Action type
 * @param performedBy - User ID performing the action
 * @param details - Additional details
 */
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

/**
 * Get audit log for a team
 * @param teamId - Team ID
 * @param limit - Number of records to return (default: 50)
 * @returns List of audit records with user profiles
 */
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

/**
 * Get audit log for a workspace
 * @param workspaceId - Workspace ID
 * @param limit - Number of records to return (default: 100)
 * @returns List of audit records with user profiles
 */
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

/**
 * Update team settings
 * @param teamId - Team ID
 * @param settings - Settings object (allow_self_join, require_approval, max_members)
 * @param isPublic - Whether team is discoverable
 * @returns Updated team record
 */
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

/**
 * Get team with settings and members
 * @param teamId - Team ID
 * @returns Team data with members and settings
 */
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
      .eq('status', 'active')

    // Get total members (excluding instructors)
    const { count: memberCount } = await supabase
      .from('workspace_members')
      .select('*, profiles!inner(role)', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .neq('profiles.role', 'instructor')

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
/**
 * Get detailed analytics for a workspace
 * Includes team data, contribution stats, and participation metrics
 * @param workspaceId - Workspace ID
 * @returns Comprehensive analytics object
 */
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
    const { data: contributionsData } = await supabase
      .from('contributions')
      .select(`
        id,
        user_id,
        task_id,
        hours_spent,
        contribution_type,
        created_at,
        project:projects!inner(id, workspace_id, team_id)
      `)
      .eq('project.workspace_id', workspaceId)

    // Get all tasks with status
    const { data: tasksData } = await supabase
      .from('tasks')
      .select(`
        id,
        status,
        assigned_to,
        project:projects!inner(id, workspace_id)
      `)
      .eq('project.workspace_id', workspaceId)

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
    const participationByUser: Record<string, { hours: number; contributions: number; tasksCompleted: number }> = {}
    
    // Initialize all users who have tasks
    tasks?.forEach(task => {
      if (task.assigned_to && !participationByUser[task.assigned_to]) {
        participationByUser[task.assigned_to] = { hours: 0, contributions: 0, tasksCompleted: 0 }
      }
    })
    
    // Aggregate contributions
    contributions?.forEach(contrib => {
      if (!participationByUser[contrib.user_id]) {
        participationByUser[contrib.user_id] = { hours: 0, contributions: 0, tasksCompleted: 0 }
      }
      participationByUser[contrib.user_id].hours += contrib.hours_spent || 0
      participationByUser[contrib.user_id].contributions += 1
    })

    // Enhance with completed tasks (estimate hours for tasks without contributions)
    const taskIdsWithContributions = new Set(
      contributions?.filter((c: any) => c.task_id).map((c: any) => c.task_id) || []
    )
    
    tasks?.forEach(task => {
      if (task.status === 'completed' && task.assigned_to) {
        if (!participationByUser[task.assigned_to]) {
          participationByUser[task.assigned_to] = { hours: 0, contributions: 0, tasksCompleted: 0 }
        }
        participationByUser[task.assigned_to].tasksCompleted += 1
        
        // If completed task has no contribution, estimate hours (1.5h per task)
        if (!taskIdsWithContributions.has(task.id)) {
          participationByUser[task.assigned_to].hours += 1.5
        }
      }
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
      .select('id, user_id, task_id, project_id, hours_spent, contribution_type, created_at')
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

    // Aggregate tasks and enhance hours with completed tasks
    const taskIdsWithContributions = new Set(
      contributions?.filter((c: any) => c.task_id).map((c: any) => c.task_id) || []
    )
    
    tasks?.forEach(task => {
      if (task.assigned_to && memberParticipation[task.assigned_to]) {
        memberParticipation[task.assigned_to].tasksAssigned += 1
        if (task.status === 'completed') {
          memberParticipation[task.assigned_to].tasksCompleted += 1
          
          // If completed task has no contribution, estimate hours (1.5h per task)
          if (!taskIdsWithContributions.has(task.id)) {
            memberParticipation[task.assigned_to].hours += 1.5
          }
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
      .select(`
        id,
        project_id,
        task_id,
        hours_spent,
        contribution_type,
        created_at,
        project:projects!inner(id, name, workspace_id, team_id)
      `)
      .eq('user_id', userId)

    if (workspaceId) {
      contributionsQuery = contributionsQuery.eq('project.workspace_id', workspaceId)
    }

    const { data: contributionsData } = await contributionsQuery

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

    const { data: tasksData } = await tasksQuery

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

    // Total hours from contributions
    const totalHours = contributions?.reduce((sum, c) => sum + (c.hours_spent || 0), 0) || 0

    // Calculate task completion participation
    const completedTasks = tasks?.filter(t => t.status === 'completed') || []
    const inProgressTasks = tasks?.filter(t => t.status === 'in_progress') || []
    
    // Find completed tasks without contributions (missing participation data)
    const completedTasksWithContributions = new Set(
      contributions?.filter((c: any) => c.task_id).map((c: any) => c.task_id) || []
    )
    const completedTasksWithoutContributions = completedTasks.filter(
      t => !completedTasksWithContributions.has(t.id)
    )

    // Estimate hours for completed tasks without contributions
    // Use average of 1-2 hours per completed task as default estimate
    const estimatedHoursFromTasks = completedTasksWithoutContributions.length * 1.5
    
    // Unified participation metrics
    const totalUnifiedHours = totalHours + estimatedHoursFromTasks
    const totalUnifiedContributions = (contributions?.length || 0) + completedTasksWithoutContributions.length

    // Calculate unified participation score (combines tasks + contributions)
    const taskCompletionWeight = completedTasks.length * 0.5 // Each completed task = 0.5 points
    const contributionWeight = (contributions?.length || 0) * 1.0 // Each contribution = 1.0 point
    const hoursWeight = totalUnifiedHours * 0.3 // Each hour = 0.3 points
    const unifiedParticipationScore = Math.round(
      taskCompletionWeight + contributionWeight + hoursWeight
    )

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
      // Unified participation metrics
      totalUnifiedHours: Math.round(totalUnifiedHours * 10) / 10,
      totalUnifiedContributions,
      estimatedHoursFromTasks: Math.round(estimatedHoursFromTasks * 10) / 10,
      completedTasksWithoutContributions: completedTasksWithoutContributions.length,
      unifiedParticipationScore,
    }
  } catch (error: any) {
    console.error('getUserAnalytics error:', error?.message || JSON.stringify(error, null, 2));
    throw error
  }
}

// Get student performance data for instructors/TAs
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
      .select(`
        user_id,
        role,
        user:profiles!user_id(id, full_name, avatar_url, institution, role)
      `)
      .eq('workspace_id', workspaceId)

    if (!members || members.length === 0) return []

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
      
      // Get last activity timestamp (from contributions or task completion)
      const { data: lastContrib } = await supabase
        .from('contributions')
        .select('created_at, project:projects!inner(workspace_id)')
        .eq('user_id', member.user_id)
        .eq('project.workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      // Get last task completion
      const { data: lastTask } = await supabase
        .from('tasks')
        .select('updated_at, project:projects!inner(workspace_id)')
        .eq('assigned_to', member.user_id)
        .eq('status', 'completed')
        .eq('project.workspace_id', workspaceId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

      // Use most recent activity (contribution or task completion)
      const lastActive = lastContrib?.created_at || lastTask?.updated_at

      const completionRate = userAnalytics.totalTasks > 0
        ? Math.round((userAnalytics.completedTasks / userAnalytics.totalTasks) * 100)
        : 0

      // Use unified participation score that combines tasks + contributions
      const participationScore = userAnalytics.unifiedParticipationScore || Math.round(
        (userAnalytics.totalUnifiedHours * 0.4) +
        (userAnalytics.totalUnifiedContributions * 2) +
        (completionRate * 0.5) +
        (userAnalytics.completedTasks * 1.0) // Give credit for completed tasks
      )

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
// TASK ASSIGNEE FUNCTIONS
// =====================================================

/**
 * Get assignees for a task
 * @param taskId - Task ID
 * @returns List of assignees with user profiles
 */
export async function getTaskAssignees(taskId: string) {
  try {
    const { data, error } = await supabase
      .from('task_assignees')
      .select(`
        id,
        user_id,
        assigned_at,
        assigned_by,
        user:profiles!user_id(id, full_name, avatar_url)
      `)
      .eq('task_id', taskId)
      .order('assigned_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error: any) {
    console.error('getTaskAssignees error:', error?.message || JSON.stringify(error, null, 2))
    throw error
  }
}

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
      .eq('task_id', taskId)

    const existingUserIds = new Set(existing?.map((a: any) => a.user_id) || [])
    const newUserIds = userIds.filter(id => !existingUserIds.has(id))

    if (newUserIds.length === 0) {
      return []
    }

    const { data, error } = await supabase
      .from('task_assignees')
      .insert(
        newUserIds.map(userId => ({
          task_id: taskId,
          user_id: userId,
          assigned_by: assignedBy,
        }))
      )
      .select(`
        id,
        user_id,
        assigned_at,
        assigned_by,
        user:profiles!user_id(id, full_name, avatar_url)
      `)

    if (error) throw error

    // Log activity
    const { data: task } = await supabase
      .from('tasks')
      .select('project:projects!inner(workspace_id), title')
      .eq('id', taskId)
      .single()

    if (task && (task as any).project?.workspace_id) {
      const { data: users } = await supabase
        .from('profiles')
        .select('full_name')
        .in('id', newUserIds)

      const userNames = users?.map((u: any) => u.full_name).join(', ') || 'users'

      // Get project name for notifications
      const { data: project } = await supabase
        .from('projects')
        .select('name')
        .eq('id', (task as any).project_id)
        .single()

      const projectName = project?.name

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
      })

      // Create notifications for newly assigned users
      await Promise.all(
        newUserIds.map(userId =>
          createTaskAssignmentNotification(
            userId,
            (task as any).title,
            taskId,
            assignedBy,
            projectName
          )
        )
      )
    }

    return data || []
  } catch (error: any) {
    console.error('addTaskAssignees error:', error?.message || JSON.stringify(error, null, 2))
    throw error
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
    const { data: attachment, error } = await supabase
      .from('task_assignees')
      .delete()
      .eq('task_id', taskId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error

    // Log activity
    const { data: task } = await supabase
      .from('tasks')
      .select('project:projects!inner(workspace_id), title')
      .eq('id', taskId)
      .single()

    if (task && (task as any).project?.workspace_id) {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single()

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
      })
    }

    return true
  } catch (error: any) {
    console.error('removeTaskAssignee error:', error?.message || JSON.stringify(error, null, 2))
    throw error
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
      .select(`
        *,
        user:profiles!user_id(id, full_name, avatar_url)
      `)
      .eq('task_id', taskId)
      .order('uploaded_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error: any) {
    console.error('getTaskAttachments error:', error?.message || JSON.stringify(error, null, 2))
    throw error
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
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${taskId}/${fileName}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('task-attachments')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) throw uploadError

    // Get file URL
    const { data: urlData } = supabase.storage
      .from('task-attachments')
      .getPublicUrl(filePath)

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
      .select(`
        *,
        user:profiles!user_id(id, full_name, avatar_url)
      `)
      .single()

    if (dbError) {
      // If DB insert fails, try to delete the uploaded file
      await supabase.storage.from('task-attachments').remove([filePath])
      throw dbError
    }

    // Log activity
    const { data: task } = await supabase
      .from('tasks')
      .select('project:projects!inner(workspace_id)')
      .eq('id', taskId)
      .single()

    if (task && (task as any).project?.workspace_id) {
      await logActivity({
        workspace_id: (task as any).project.workspace_id,
        user_id: userId,
        action_type: 'added_attachment',
        entity_type: 'task',
        entity_id: taskId,
        metadata: { file_name: file.name, file_size: file.size, type: 'upload' },
      })
    }

    return { ...attachment, url: urlData.publicUrl }
  } catch (error: any) {
    console.error('uploadTaskAttachment error:', error?.message || JSON.stringify(error, null, 2))
    throw error
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
      new URL(url)
    } catch {
      throw new Error('Invalid URL format')
    }

    // Extract filename from URL if not provided
    let attachmentName = fileName || 'External Link'
    if (!fileName) {
      try {
        const urlObj = new URL(url)
        const pathParts = urlObj.pathname.split('/').filter(Boolean)
        if (pathParts.length > 0) {
          attachmentName = pathParts[pathParts.length - 1]
          // Remove query params if they're in the filename
          attachmentName = attachmentName.split('?')[0]
        }
      } catch {
        // If URL parsing fails, use default
        attachmentName = 'External Link'
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
      .select(`
        *,
        user:profiles!user_id(id, full_name, avatar_url)
      `)
      .single()

    if (dbError) throw dbError

    // Log activity
    const { data: task } = await supabase
      .from('tasks')
      .select('project:projects!inner(workspace_id)')
      .eq('id', taskId)
      .single()

    if (task && (task as any).project?.workspace_id) {
      await logActivity({
        workspace_id: (task as any).project.workspace_id,
        user_id: userId,
        action_type: 'added_attachment',
        entity_type: 'task',
        entity_id: taskId,
        metadata: { file_name: attachmentName, type: 'link', url },
      })
    }

    return { ...attachment, url }
  } catch (error: any) {
    console.error('addTaskAttachmentLink error:', error?.message || JSON.stringify(error, null, 2))
    throw error
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
      .single()

    if (fetchError) throw fetchError
    if (!attachment) throw new Error('Attachment not found')

    // Check permission (user owns it or is team leader)
    if (attachment.user_id !== userId) {
      // Check if user is team leader
      const { data: task } = await supabase
        .from('tasks')
        .select('project:projects!inner(team_id)')
        .eq('id', attachment.task_id)
        .single()

      if (task && (task as any).project?.team_id) {
        const { data: teamMember } = await supabase
          .from('team_members')
          .select('role')
          .eq('team_id', (task as any).project.team_id)
          .eq('user_id', userId)
          .single()

        if (teamMember?.role !== 'leader') {
          throw new Error('You do not have permission to delete this attachment')
        }
      } else {
        throw new Error('You do not have permission to delete this attachment')
      }
    }

    // Delete from storage only if it's a file upload (not external URL)
    if (attachment.file_path) {
      const { error: storageError } = await supabase.storage
        .from('task-attachments')
        .remove([attachment.file_path])

      if (storageError) {
        console.warn('Storage delete error (file may not exist):', storageError)
        // Continue with DB deletion even if storage delete fails
      }
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('task_attachments')
      .delete()
      .eq('id', attachmentId)

    if (dbError) throw dbError

    // Log activity
    const { data: task } = await supabase
      .from('tasks')
      .select('project:projects!inner(workspace_id)')
      .eq('id', attachment.task_id)
      .single()

    if (task && (task as any).project?.workspace_id) {
      await logActivity({
        workspace_id: (task as any).project.workspace_id,
        user_id: userId,
        action_type: 'removed_attachment',
        entity_type: 'task',
        entity_id: attachment.task_id,
        metadata: { file_name: attachment.file_name },
      })
    }

    return true
  } catch (error: any) {
    console.error('deleteTaskAttachment error:', error?.message || JSON.stringify(error, null, 2))
    throw error
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
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error: any) {
    console.error('getTaskSubtasks error:', error?.message || JSON.stringify(error, null, 2))
    throw error
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
        .single()

      position = existing ? (existing as any).position + 1 : 0
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
      .single()

    if (error) throw error

    // Log activity
    const { data: task } = await supabase
      .from('tasks')
      .select('project:projects!inner(workspace_id), title')
      .eq('id', taskId)
      .single()

    if (task && (task as any).project?.workspace_id) {
      await logActivity({
        workspace_id: (task as any).project.workspace_id,
        user_id: userId,
        action_type: 'added_subtask',
        entity_type: 'task',
        entity_id: taskId,
        metadata: { subtask_title: title.trim(), task_title: (task as any).title },
      })
    }

    return data
  } catch (error: any) {
    console.error('createTaskSubtask error:', error?.message || JSON.stringify(error, null, 2))
    throw error
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
      .single()

    if (error) throw error

    // Log activity if completed status changed
    if (updates.completed !== undefined) {
      const { data: subtask } = await supabase
        .from('task_subtasks')
        .select('task_id')
        .eq('id', subtaskId)
        .single()

      if (subtask) {
        const { data: task } = await supabase
          .from('tasks')
          .select('project:projects!inner(workspace_id), title')
          .eq('id', subtask.task_id)
          .single()

        if (task && (task as any).project?.workspace_id) {
          const { data: { user: authUser } } = await supabase.auth.getUser()
          if (authUser) {
            await logActivity({
              workspace_id: (task as any).project.workspace_id,
              user_id: authUser.id,
              action_type: updates.completed ? 'completed_subtask' : 'uncompleted_subtask',
              entity_type: 'task',
              entity_id: subtask.task_id,
              metadata: { task_title: (task as any).title },
            })
          }
        }
      }
    }

    return data
  } catch (error: any) {
    console.error('updateTaskSubtask error:', error?.message || JSON.stringify(error, null, 2))
    throw error
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
      .single()

    if (!subtask) throw new Error('Subtask not found')

    const { error } = await supabase
      .from('task_subtasks')
      .delete()
      .eq('id', subtaskId)

    if (error) throw error

    // Log activity
    const { data: task } = await supabase
      .from('tasks')
      .select('project:projects!inner(workspace_id), title')
      .eq('id', (subtask as any).task_id)
      .single()

    if (task && (task as any).project?.workspace_id) {
      const { data: { user: authUser } } = await supabase.auth.getUser()
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
        })
      }
    }

    return true
  } catch (error: any) {
    console.error('deleteTaskSubtask error:', error?.message || JSON.stringify(error, null, 2))
    throw error
  }
}

// =====================================================
// NOTIFICATION FUNCTIONS
// =====================================================

export interface Notification {
  id: string
  user_id: string
  type: 'team_assignment' | 'team_invitation' | 'join_request' | 'role_change' | 'team_update' | 'task_assignment' | 'task_completed' | 'task_status_changed' | 'project_update' | 'project_created' | 'project_completed' | 'contribution_logged' | 'milestone_achieved'
  title: string
  message: string
  data?: Record<string, any>
  read: boolean
  created_at: string
  updated_at: string
}

/**
 * Create a new notification
 * Uses the SQL function create_notification which has SECURITY DEFINER and bypasses RLS
 */
/**
 * Create a new notification
 * Uses the SQL function create_notification which has SECURITY DEFINER and bypasses RLS
 * @param notification - Notification data
 * @returns Created notification object or null if disabled
 */
export async function createNotification(notification: {
  user_id: string
  type: Notification['type']
  title: string
  message: string
  data?: Record<string, any>
}) {
  try {
    console.log('Creating notification:', {
        user_id: notification.user_id,
        type: notification.type,
        title: notification.title,
    })
    
    // Use the SQL function instead of direct insert - it has SECURITY DEFINER and bypasses RLS
    const { data, error } = await supabase.rpc('create_notification', {
      p_user_id: notification.user_id,
      p_type: notification.type,
      p_title: notification.title,
      p_message: notification.message,
      p_data: notification.data || {}
    })

    if (error) {
      console.error('Notification insert error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
    throw error
    }
    
    // If the function returns NULL (notification disabled), return null
    if (!data) {
      console.log('Notification creation skipped (user preference disabled)')
      return null
    }
    
    // The SQL function returns the notification ID
    // We can't fetch the full notification here because RLS only allows users to see their own notifications
    // But the notification was successfully created, so we return a minimal object with the ID
    console.log('Notification created successfully with ID:', data)
    return {
      id: data,
      user_id: notification.user_id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data || {},
      read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as any
  } catch (error: any) {
    console.error('createNotification error:', {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      fullError: JSON.stringify(error, null, 2)
    })
    // Don't throw - just log the error so task assignment doesn't fail
    // This way tasks can still be assigned even if notifications fail
    return null
  }
}

/**
 * Get user notifications with pagination and filtering
 */
/**
 * Get user notifications with pagination and filtering
 * @param userId - User ID
 * @param options - Pagination and filtering options
 * @returns List of notifications
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
/**
 * Mark a notification as read
 * @param notificationId - Notification ID
 * @param userId - User ID
 * @returns Updated notification
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
/**
 * Mark all notifications as read for a user
 * @param userId - User ID
 * @returns List of updated notifications
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
/**
 * Delete a notification
 * @param notificationId - Notification ID
 * @param userId - User ID
 * @returns True if successful
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
/**
 * Get unread notification count for a user
 * @param userId - User ID
 * @returns Count of unread notifications
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
/**
 * Create team assignment notification
 * @param userId - User ID to notify
 * @param teamName - Name of the team
 * @param assignedBy - ID of user who assigned
 * @param role - Role assigned (default: 'member')
 * @returns Created notification
 */
export async function createTeamAssignmentNotification(
  userId: string,
  teamName: string,
  assignedBy: string,
  role: string = 'member'
) {
  try {
    // Get assigned by user name
    const { data: assignedByUser } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', assignedBy)
      .single()

    const assignedByName = assignedByUser?.full_name || 'someone'

    return await createNotification({
    user_id: userId,
    type: 'team_assignment',
    title: 'Team Assignment',
      message: `You have been assigned to team "${teamName}" as a ${role} by ${assignedByName}`,
    data: {
      team_name: teamName,
      assigned_by: assignedBy,
        assigned_by_name: assignedByName,
      role: role
    }
  })
  } catch (error: any) {
    console.error('createTeamAssignmentNotification error:', error)
    // Fallback: create notification with user ID if name fetch fails
    return await createNotification({
      user_id: userId,
      type: 'team_assignment',
      title: 'Team Assignment',
      message: `You have been assigned to team "${teamName}" as a ${role}`,
      data: {
        team_name: teamName,
        assigned_by: assignedBy,
        role: role
      }
    })
  }
}

/**
 * Create team invitation notification
 */
/**
 * Create team invitation notification
 * @param userId - User ID to notify
 * @param teamName - Name of the team
 * @param invitedBy - ID of user who invited
 * @returns Created notification
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
 * Create task assignment notification
 */
/**
 * Create task assignment notification
 * @param userId - User ID to notify
 * @param taskTitle - Title of the task
 * @param taskId - Task ID
 * @param assignedBy - ID of user who assigned
 * @param projectName - Optional project name
 * @returns Created notification
 */
export async function createTaskAssignmentNotification(
  userId: string,
  taskTitle: string,
  taskId: string,
  assignedBy: string,
  projectName?: string
) {
  try {
    console.log('createTaskAssignmentNotification called:', {
      userId,
      taskTitle,
      taskId,
      assignedBy,
      projectName
    })
    
    // Get assigned by user name
    const { data: assignedByUser } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', assignedBy)
      .single()

    const assignedByName = assignedByUser?.full_name || 'someone'

    const result = await createNotification({
      user_id: userId,
      type: 'task_assignment',
      title: 'New Task Assignment',
      message: projectName
        ? `${assignedByName} assigned you to "${taskTitle}" in ${projectName}`
        : `${assignedByName} assigned you to "${taskTitle}"`,
      data: {
        task_id: taskId,
        task_title: taskTitle,
        assigned_by: assignedBy,
        assigned_by_name: assignedByName,
        project_name: projectName
      }
    })
    
    console.log('Task assignment notification result:', result)
    return result
  } catch (error: any) {
    console.error('createTaskAssignmentNotification error:', error)
    return null
  }
}

/**
 * Create join request notification
 */
/**
 * Create join request notification
 * @param userId - User ID to notify
 * @param teamName - Name of the team
 * @param requesterName - Name of the user requesting to join
 * @param status - Status of the request
 * @returns Created notification
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

/**
 * Create task completion notification
 */
/**
 * Create task completion notification
 * @param userId - User ID to notify
 * @param taskTitle - Title of the task
 * @param taskId - Task ID
 * @param completedBy - ID of user who completed the task
 * @param projectName - Optional project name
 * @returns Created notification
 */
export async function createTaskCompletedNotification(
  userId: string,
  taskTitle: string,
  taskId: string,
  completedBy: string,
  projectName?: string
) {
  const { data: completedByUser } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', completedBy)
    .single()

  const completedByName = completedByUser?.full_name || 'someone'

  return createNotification({
    user_id: userId,
    type: 'task_completed',
    title: 'Task Completed! 🎉',
    message: projectName
      ? `"${taskTitle}" in ${projectName} has been completed by ${completedByName}`
      : `"${taskTitle}" has been completed by ${completedByName}`,
    data: {
      task_id: taskId,
      task_title: taskTitle,
      completed_by: completedBy,
      completed_by_name: completedByName,
      project_name: projectName
    }
  })
}

/**
 * Create project update notification
 */
/**
 * Create project update notification
 * @param userIds - List of user IDs to notify
 * @param projectName - Name of the project
 * @param projectId - Project ID
 * @param updateType - Type of update
 * @param updatedBy - ID of user who updated
 * @param message - Optional custom message
 * @returns List of created notifications
 */
/**
 * Create project update notification
 * @param userIds - List of user IDs to notify
 * @param projectName - Name of the project
 * @param projectId - Project ID
 * @param updateType - Type of update
 * @param updatedBy - ID of user who updated
 * @param message - Optional custom message
 * @returns List of created notifications
 */
export async function createProjectUpdateNotification(
  userIds: string[],
  projectName: string,
  projectId: string,
  updateType: 'created' | 'updated' | 'completed' | 'milestone',
  updatedBy: string,
  message?: string
) {
  const { data: updatedByUser } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', updatedBy)
    .single()

  const updatedByName = updatedByUser?.full_name || 'someone'

  const titles = {
    created: 'New Project Created 🚀',
    updated: 'Project Updated 📝',
    completed: 'Project Completed! 🎊',
    milestone: 'Project Milestone Achieved! 🏆'
  }

  const defaultMessages = {
    created: `${updatedByName} created a new project "${projectName}"`,
    updated: `${updatedByName} updated project "${projectName}"`,
    completed: `Project "${projectName}" has been completed!`,
    milestone: `Project "${projectName}" reached a new milestone!`
  }

  const notificationType = updateType === 'created' ? 'project_created' :
                          updateType === 'completed' ? 'project_completed' :
                          updateType === 'milestone' ? 'milestone_achieved' : 'project_update'

  return Promise.all(
    userIds.map(userId =>
      createNotification({
        user_id: userId,
        type: notificationType,
        title: titles[updateType],
        message: message || defaultMessages[updateType],
        data: {
          project_id: projectId,
          project_name: projectName,
          update_type: updateType,
          updated_by: updatedBy,
          updated_by_name: updatedByName
        }
      })
    )
  )
}

/**
 * Create contribution logged notification
 */
/**
 * Create contribution logged notification
 * @param userId - User ID to notify
 * @param contributionType - Type of contribution
 * @param hours - Hours spent
 * @param loggedBy - ID of user who logged (usually self)
 * @returns Created notification
 */
/**
 * Create contribution logged notification
 * @param userId - User ID to notify
 * @param contributionType - Type of contribution
 * @param hours - Hours spent
 * @param loggedBy - ID of user who logged (usually self)
 * @returns Created notification
 */
export async function createContributionLoggedNotification(
  userId: string,
  contributionType: string,
  hours: number,
  loggedBy: string
) {
  const { data: loggedByUser } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', loggedBy)
    .single()

  const loggedByName = loggedByUser?.full_name || 'someone'

  return createNotification({
    user_id: userId,
    type: 'contribution_logged',
    title: 'Contribution Logged 📊',
    message: `${loggedByName} logged ${hours} hour${hours !== 1 ? 's' : ''} of ${contributionType} contribution`,
    data: {
      contribution_type: contributionType,
      hours: hours,
      logged_by: loggedBy,
      logged_by_name: loggedByName
    }
  })
}

/**
 * Create task status changed notification
 */
/**
 * Create task status changed notification
 * @param userId - User ID to notify
 * @param taskTitle - Title of the task
 * @param taskId - Task ID
 * @param oldStatus - Previous status
 * @param newStatus - New status
 * @param changedBy - ID of user who changed status
 * @param projectName - Optional project name
 * @returns Created notification
 */
export async function createTaskStatusChangedNotification(
  userId: string,
  taskTitle: string,
  taskId: string,
  oldStatus: string,
  newStatus: string,
  changedBy: string,
  projectName?: string
) {
  const { data: changedByUser } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', changedBy)
    .single()

  const changedByName = changedByUser?.full_name || 'someone'
  const statusEmojis: Record<string, string> = {
    todo: '📋',
    in_progress: '⚡',
    completed: '✅'
  }

  return createNotification({
    user_id: userId,
    type: 'task_status_changed',
    title: `Task Status Changed ${statusEmojis[newStatus] || '📝'}`,
    message: projectName
      ? `${changedByName} changed "${taskTitle}" from ${oldStatus} to ${newStatus} in ${projectName}`
      : `${changedByName} changed "${taskTitle}" from ${oldStatus} to ${newStatus}`,
    data: {
      task_id: taskId,
      task_title: taskTitle,
      old_status: oldStatus,
      new_status: newStatus,
      changed_by: changedBy,
      changed_by_name: changedByName,
      project_name: projectName
    }
  })
}

// =====================================================
// GLOBAL SEARCH FUNCTIONS
// =====================================================

export interface SearchResult {
  type: 'task' | 'project' | 'team' | 'member'
  id: string
  title: string
  description?: string
  metadata?: Record<string, any>
  url?: string
}

/**
 * Search across all workspace entities (tasks, projects, teams, members)
 * @param workspaceId - Workspace ID to search within
 * @param query - Search query string
 * @param limit - Maximum number of results per category (default: 5)
 * @returns Search results grouped by type
 */
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
  tasks: SearchResult[]
  projects: SearchResult[]
  teams: SearchResult[]
  members: SearchResult[]
}> {
  if (!query || query.trim().length < 2) {
    return { tasks: [], projects: [], teams: [], members: [] }
  }

  const searchTerm = query.trim().toLowerCase()

  try {
    // Search Tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        status,
        project:projects!inner(
          id,
          name,
          workspace_id
        )
      `)
      .eq('project.workspace_id', workspaceId)
      .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .limit(limit)
      .order('created_at', { ascending: false })

    if (tasksError) {
      console.error('Search tasks error:', tasksError)
    }

    // Search Projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        description,
        status,
        workspace_id
      `)
      .eq('workspace_id', workspaceId)
      .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .limit(limit)
      .order('created_at', { ascending: false })

    if (projectsError) {
      console.error('Search projects error:', projectsError)
    }

    // Search Teams
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        description,
        workspace_id
      `)
      .eq('workspace_id', workspaceId)
      .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .limit(limit)
      .order('created_at', { ascending: false })

    if (teamsError) {
      console.error('Search teams error:', teamsError)
    }

    // Search Members (workspace members)
    // Note: We need to search profiles separately and then join, as direct ilike on joined table may not work
    let members: any[] = []
    let membersError: any = null
    
    const { data: allProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role, institution')
      .ilike('full_name', `%${searchTerm}%`)
      .limit(50) // Get more profiles to filter by workspace membership
    
    if (!profilesError && allProfiles && allProfiles.length > 0) {
      const profileIds = allProfiles.map(p => p.id)
      
      const { data: workspaceMembers, error: membersErrorData } = await supabase
        .from('workspace_members')
        .select(`
          user_id,
          profile:profiles!user_id(
            id,
            full_name,
            avatar_url,
            role,
            institution
          )
        `)
        .eq('workspace_id', workspaceId)
        .in('user_id', profileIds)
        .limit(limit)

      members = workspaceMembers || []
      membersError = membersErrorData
    } else if (profilesError) {
      membersError = profilesError
    }

    if (membersError) {
      console.error('Search members error:', membersError)
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
    }))

    const formattedProjects: SearchResult[] = (projects || []).map((project: any) => ({
      type: 'project' as const,
      id: project.id,
      title: project.name,
      description: project.description,
      metadata: {
        status: project.status,
      },
      url: `/projects?project=${project.id}`,
    }))

    const formattedTeams: SearchResult[] = (teams || []).map((team: any) => ({
      type: 'team' as const,
      id: team.id,
      title: team.name,
      description: team.description,
      metadata: {},
      url: `/teams?team=${team.id}`,
    }))

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
    }))

    return {
      tasks: formattedTasks,
      projects: formattedProjects,
      teams: formattedTeams,
      members: formattedMembers,
    }
  } catch (error: any) {
    console.error('Global search error:', error?.message || JSON.stringify(error, null, 2))
    return { tasks: [], projects: [], teams: [], members: [] }
  }
}

// =====================================================
// MOTIVATIONAL MESSAGES FUNCTIONS
// =====================================================

export interface MotivationalMessage {
  id: string
  user_id: string
  workspace_id?: string
  team_id?: string
  message_type: 'achievement' | 'milestone' | 'encouragement' | 'participation' | 'teamwork' | 'improvement' | 'consistency' | 'leadership' | 'support'
  title: string
  message: string
  emoji?: string
  trigger_event?: string
  trigger_data?: Record<string, any>
  delivery_method: 'in_app' | 'notification' | 'email' | 'all'
  sent_at: string
  read_at?: string
  is_read: boolean
  priority: 'low' | 'medium' | 'high'
  created_at: string
}

/**
 * Send a motivational message to a user
 */
/**
 * Send a motivational message to a user
 * Uses RPC function send_motivational_message
 * @param params - Message parameters including type, content, and triggers
 * @returns Message ID or null
 */
export async function sendMotivationalMessage(params: {
  userId: string
  messageType: MotivationalMessage['message_type']
  title: string
  message: string
  emoji?: string
  triggerEvent?: string
  triggerData?: Record<string, any>
  priority?: 'low' | 'medium' | 'high'
  workspaceId?: string
  teamId?: string
}): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('send_motivational_message', {
      p_user_id: params.userId,
      p_message_type: params.messageType,
      p_title: params.title,
      p_message: params.message,
      p_emoji: params.emoji || null,
      p_trigger_event: params.triggerEvent || null,
      p_trigger_data: params.triggerData || {},
      p_priority: params.priority || 'medium',
      p_workspace_id: params.workspaceId || null,
      p_team_id: params.teamId || null,
    })

    if (error) throw error
    return data
  } catch (error: any) {
    console.error('sendMotivationalMessage error:', error?.message || JSON.stringify(error, null, 2))
    return null
  }
}

/**
 * Get motivational messages for a user
 */
/**
 * Get motivational messages for a user
 * @param userId - User ID
 * @param options - Filtering and pagination options
 * @returns List of motivational messages
 */
export async function getMotivationalMessages(
  userId: string,
  options?: {
    unreadOnly?: boolean
    limit?: number
    messageType?: MotivationalMessage['message_type']
  }
) {
  try {
    let query = supabase
      .from('motivational_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (options?.unreadOnly) {
      query = query.eq('is_read', false)
    }

    if (options?.messageType) {
      query = query.eq('message_type', options.messageType)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) {
      // If table doesn't exist yet (migration not run), return empty array
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('Motivational messages table not found. Migration may not have been run.')
        return []
      }
      throw error
    }
    return data as MotivationalMessage[]
  } catch (error: any) {
    // Handle network errors gracefully
    if (error?.message?.includes('Failed to fetch') || error?.name === 'TypeError') {
      console.warn('Network error fetching motivational messages:', error)
      return []
    }
    console.error('getMotivationalMessages error:', error?.message || JSON.stringify(error, null, 2))
    return []
  }
}

/**
 * Get unread message count
 */
/**
 * Get unread message count
 * @param userId - User ID
 * @returns Count of unread messages
 */
export async function getUnreadMotivationalMessageCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('motivational_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) {
      // If table doesn't exist yet (migration not run), return 0
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('Motivational messages table not found. Migration may not have been run.')
        return 0
      }
      throw error
    }
    return count || 0
  } catch (error: any) {
    // Handle network errors gracefully
    if (error?.message?.includes('Failed to fetch') || error?.name === 'TypeError') {
      console.warn('Network error fetching motivational message count:', error)
      return 0
    }
    console.error('getUnreadMotivationalMessageCount error:', error?.message || JSON.stringify(error, null, 2))
    return 0
  }
}

/**
 * Mark motivational message as read
 */
/**
 * Mark motivational message as read
 * @param messageId - Message ID
 * @param userId - User ID
 * @returns True if successful
 */
export async function markMotivationalMessageAsRead(messageId: string, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('mark_motivational_message_read', {
      p_message_id: messageId,
      p_user_id: userId,
    })

    if (error) throw error
    return data || false
  } catch (error: any) {
    console.error('markMotivationalMessageAsRead error:', error?.message || JSON.stringify(error, null, 2))
    return false
  }
}

/**
 * Mark all motivational messages as read for a user
 */
/**
 * Mark all motivational messages as read for a user
 * @param userId - User ID
 */
export async function markAllMotivationalMessagesAsRead(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('motivational_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) throw error
  } catch (error: any) {
    console.error('markAllMotivationalMessagesAsRead error:', error?.message || JSON.stringify(error, null, 2))
  }
}

// =====================================================
// PEER EVALUATION FUNCTIONS
// =====================================================

export interface EvaluationPeriod {
  id: string
  team_id: string
  workspace_id: string
  period_name: string
  period_type: 'weekly' | 'mid_term' | 'final' | 'custom'
  start_date: string
  end_date: string
  due_date: string
  status: 'scheduled' | 'active' | 'closed' | 'cancelled'
  is_anonymous: boolean
  allow_self_evaluation: boolean
  require_all_members: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export interface PeerEvaluation {
  id: string
  evaluator_id: string
  evaluatee_id: string
  team_id: string
  project_id?: string
  evaluation_period_id: string
  contribution_score?: number
  communication_score?: number
  collaboration_score?: number
  reliability_score?: number
  overall_score?: number
  strengths?: string
  areas_for_improvement?: string
  additional_comments?: string
  is_anonymous: boolean
  submitted_at: string
  created_at: string
  updated_at: string
}

export interface EvaluationResponse {
  id: string
  evaluation_period_id: string
  evaluator_id: string
  evaluatee_id: string
  peer_evaluation_id?: string
  status: 'pending' | 'in_progress' | 'submitted' | 'reminded'
  reminder_sent_at?: string
  submitted_at?: string
  created_at: string
}

/**
 * Create an evaluation period for a team
 */
/**
 * Create an evaluation period for a team
 * @param params - Period parameters (dates, type, settings)
 * @returns Created evaluation period
 */
export async function createEvaluationPeriod(params: {
  teamId: string
  workspaceId: string
  periodName: string
  periodType: 'weekly' | 'mid_term' | 'final' | 'custom'
  startDate: string
  endDate: string
  dueDate: string
  isAnonymous?: boolean
  allowSelfEvaluation?: boolean
  requireAllMembers?: boolean
  projectId?: string
}): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('create_evaluation_period_with_responses', {
      p_team_id: params.teamId,
      p_workspace_id: params.workspaceId,
      p_period_name: params.periodName,
      p_period_type: params.periodType,
      p_start_date: params.startDate,
      p_end_date: params.endDate,
      p_due_date: params.dueDate,
      p_is_anonymous: params.isAnonymous ?? true,
      p_created_by: null, // Will use auth.uid() in function
      p_project_id: params.projectId || null,
    })

    if (error) throw error
    return data
  } catch (error: any) {
    console.error('createEvaluationPeriod error:', error?.message || JSON.stringify(error, null, 2))
    throw error
  }
}

/**
 * Submit a peer evaluation
 */
/**
 * Submit a peer evaluation
 * @param params - Evaluation data (scores, comments)
 * @returns Submitted evaluation
 */
export async function submitPeerEvaluation(params: {
  evaluationPeriodId: string
  evaluateeId: string
  teamId: string
  projectId?: string
  contributionScore: number
  communicationScore: number
  collaborationScore: number
  reliabilityScore: number
  strengths?: string
  areasForImprovement?: string
  additionalComments?: string
}): Promise<PeerEvaluation> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Insert evaluation
    const { data: evaluation, error: evalError } = await supabase
      .from('peer_evaluations')
      .insert({
        evaluator_id: user.id,
        evaluatee_id: params.evaluateeId,
        team_id: params.teamId,
        project_id: params.projectId || null,
        evaluation_period_id: params.evaluationPeriodId,
        contribution_score: params.contributionScore,
        communication_score: params.communicationScore,
        collaboration_score: params.collaborationScore,
        reliability_score: params.reliabilityScore,
        strengths: params.strengths || null,
        areas_for_improvement: params.areasForImprovement || null,
        additional_comments: params.additionalComments || null,
      })
      .select()
      .single()

    if (evalError) throw evalError

    // Update evaluation response status
    const { error: responseError } = await supabase
      .from('evaluation_responses')
      .update({
        status: 'submitted',
        peer_evaluation_id: evaluation.id,
        submitted_at: new Date().toISOString(),
      })
      .eq('evaluation_period_id', params.evaluationPeriodId)
      .eq('evaluator_id', user.id)
      .eq('evaluatee_id', params.evaluateeId)

    if (responseError) throw responseError

    return evaluation as PeerEvaluation
  } catch (error: any) {
    console.error('submitPeerEvaluation error:', error?.message || JSON.stringify(error, null, 2))
    throw error
  }
}

export interface PendingEvaluationWithDetails extends EvaluationResponse {
  evaluation_period: {
    id: string
    period_name: string
    period_type: string
    due_date: string
    status: string
    is_anonymous: boolean
    project_id?: string
    team: {
      id: string
      name: string
    }
    project?: {
      id: string
      name: string
    }
  }
  evaluatee?: {
    id: string
    full_name: string
    avatar_url?: string
  }
}

/**
 * Get pending evaluations for a user (optionally filtered by workspace)
 */
/**
 * Get pending evaluations for a user (optionally filtered by workspace)
 * @param userId - User ID
 * @param workspaceId - Optional workspace ID to filter by
 * @returns List of pending evaluations with details
 */
export async function getPendingEvaluations(userId: string, workspaceId?: string): Promise<PendingEvaluationWithDetails[]> {
  try {
    // First, get evaluation responses with period and team info
    let query = supabase
      .from('evaluation_responses')
      .select(`
        *,
        evaluation_period:evaluation_periods!inner(
          id,
          period_name,
          period_type,
          due_date,
          status,
          is_anonymous,
          project_id,
          workspace_id,
          team:teams!inner(id, name),
          project:projects(id, name)
        )
      `)
      .eq('evaluator_id', userId)
      .eq('status', 'pending')

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    let responses = (data || []) as any[]
    
    // Filter by workspace if provided (after fetching since we can't filter nested fields directly)
    if (workspaceId) {
      responses = responses.filter((r: any) => 
        r.evaluation_period?.workspace_id === workspaceId
      )
    }
    
    // Filter out evaluations for instructors/owners/admins - they shouldn't see student evaluations
    // unless they're actually participating as students
    if (workspaceId) {
      try {
        // Check workspace role
        const { data: workspaceMember } = await supabase
          .from('workspace_members')
          .select('role')
          .eq('workspace_id', workspaceId)
          .eq('user_id', userId)
          .single()

        // Also check user profile role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', userId)
          .single()

        const userRole = profile?.role?.toLowerCase()
        const workspaceRole = workspaceMember?.role

        // If user is owner/admin in workspace OR is instructor/TA by profile role,
        // they shouldn't see pending evaluations (they're managing, not participating)
        const isInstructorOrAdmin = 
          workspaceRole === 'owner' || 
          workspaceRole === 'admin' ||
          userRole === 'instructor' ||
          userRole === 'teaching_assistant' ||
          userRole === 'admin'

        if (isInstructorOrAdmin) {
          return []
        }
      } catch (err) {
        // If we can't check role, continue (don't block)
        console.warn('Could not check role for evaluation filtering:', err)
      }
    }
    
    if (responses.length === 0) {
      return []
    }

    // Get unique evaluatee IDs for profile lookups
    const evaluateeIds = [...new Set(responses.map(r => r.evaluatee_id).filter(Boolean))]
    
    // Get team IDs from the evaluation periods
    const teamIds = [...new Set(responses.map(r => r.evaluation_period?.team?.id).filter(Boolean))]

    // Fetch profiles for evaluatees - use team_members approach which has better RLS access
    let profileMap = new Map()
    if (evaluateeIds.length > 0 && teamIds.length > 0) {
      // Fetch team members for all teams, then filter for evaluatees
      // This approach works better with RLS since team members can see each other
      try {
        const teamMembersPromises = teamIds.map(teamId => getTeamMembers(teamId))
        const teamMembersArrays = await Promise.all(teamMembersPromises)
        
        // Flatten and filter for evaluatees
        const allTeamMembers = teamMembersArrays.flat()
        allTeamMembers.forEach((member: any) => {
          if (member.user_id && evaluateeIds.includes(member.user_id)) {
            // member.user or member.profile should have the profile info
            const profile = member.user || member.profile
            if (profile) {
              profileMap.set(member.user_id, {
                id: profile.id,
                full_name: profile.full_name,
                avatar_url: profile.avatar_url,
                user_id: member.user_id,
              })
            }
          }
        })
      } catch (err) {
        console.warn('Error fetching team members for profiles:', err)
      }
    }

    // Enrich responses with profile data
    const enrichedResponses = responses.map(response => {
      const evaluateeProfile = response.evaluatee_id 
        ? profileMap.get(response.evaluatee_id) 
        : null
      
      if (!evaluateeProfile && response.evaluatee_id) {
        console.warn('Profile not found for evaluatee_id:', response.evaluatee_id)
      }
      
      return {
        ...response,
        evaluatee: evaluateeProfile || null,
      }
    })

    return enrichedResponses as PendingEvaluationWithDetails[]
  } catch (error: any) {
    console.error('getPendingEvaluations error:', error?.message || JSON.stringify(error, null, 2))
    return []
  }
}

/**
 * Get evaluation results for a user (aggregated, optionally filtered by workspace)
 */
/**
 * Get evaluation results for a user (aggregated, optionally filtered by workspace)
 * @param userId - User ID
 * @param workspaceId - Optional workspace ID to filter by
 * @param evaluationPeriodId - Optional period ID to filter by
 * @returns Aggregated evaluation results
 */
export async function getEvaluationResults(
  userId: string,
  workspaceId?: string,
  evaluationPeriodId?: string
): Promise<any> {
  try {
    // First, get evaluations with period info only
    let query = supabase
      .from('peer_evaluations')
      .select(`
        *,
        evaluation_period:evaluation_periods!inner(id, period_name, period_type, due_date, workspace_id)
      `)
      .eq('evaluatee_id', userId)

    if (evaluationPeriodId) {
      query = query.eq('evaluation_period_id', evaluationPeriodId)
    }

    const { data, error } = await query.order('submitted_at', { ascending: false })

    if (error) throw error

    let evaluations = (data || []) as any[]
    
    // Filter by workspace if provided (after fetching since we can't filter nested fields directly)
    if (workspaceId) {
      evaluations = evaluations.filter((e: any) => 
        e.evaluation_period?.workspace_id === workspaceId
      )
    }
    
    if (evaluations.length === 0) {
      return {
        averageScores: {
          contribution: 0,
          communication: 0,
          collaboration: 0,
          reliability: 0,
          overall: 0,
        },
        totalEvaluations: 0,
        evaluations: [],
      }
    }

    // Get unique user IDs for profile lookups
    const evaluatorIds = [...new Set(evaluations.map(e => e.evaluator_id))]
    const evaluateeIds = [...new Set(evaluations.map(e => e.evaluatee_id))]

    // Check if evaluation period is anonymous
    const isAnonymous = evaluations[0]?.evaluation_period?.is_anonymous ?? true

    // Fetch profiles for evaluators and evaluatees
    // Only fetch evaluator profiles if not anonymous
    const userIdsToFetch = isAnonymous 
      ? evaluateeIds  // Only fetch evaluatee profiles
      : [...evaluatorIds, ...evaluateeIds]  // Fetch both if not anonymous

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, user_id')
      .in('user_id', userIdsToFetch)

    // Create a map of user_id -> profile
    const profileMap = new Map()
    if (profiles) {
      profiles.forEach(profile => {
        profileMap.set(profile.user_id, profile)
      })
    }

    // Enrich evaluations with profile data
    // Hide evaluator info if anonymous
    const enrichedEvaluations = evaluations.map(evaluation => ({
      ...evaluation,
      evaluator: isAnonymous 
        ? null  // Don't show evaluator if anonymous
        : (profileMap.get(evaluation.evaluator_id) || null),
      evaluatee: profileMap.get(evaluation.evaluatee_id) || null,
    }))

    const totalEvaluations = enrichedEvaluations.length
    const sumScores = enrichedEvaluations.reduce(
      (acc, evaluation) => ({
        contribution: acc.contribution + (evaluation.contribution_score || 0),
        communication: acc.communication + (evaluation.communication_score || 0),
        collaboration: acc.collaboration + (evaluation.collaboration_score || 0),
        reliability: acc.reliability + (evaluation.reliability_score || 0),
        overall: acc.overall + (evaluation.overall_score || 0),
      }),
      { contribution: 0, communication: 0, collaboration: 0, reliability: 0, overall: 0 }
    )

    return {
      averageScores: {
        contribution: sumScores.contribution / totalEvaluations,
        communication: sumScores.communication / totalEvaluations,
        collaboration: sumScores.collaboration / totalEvaluations,
        reliability: sumScores.reliability / totalEvaluations,
        overall: sumScores.overall / totalEvaluations,
      },
      totalEvaluations,
      evaluations: enrichedEvaluations,
    }
  } catch (error: any) {
    console.error('getEvaluationResults error:', error?.message || JSON.stringify(error, null, 2))
    return {
      averageScores: {
        contribution: 0,
        communication: 0,
        collaboration: 0,
        reliability: 0,
        overall: 0,
      },
      totalEvaluations: 0,
      evaluations: [],
    }
  }
}

/**
 * Get evaluation statistics for a team
 */
/**
 * Get evaluation statistics for a team
 * @param teamId - Team ID
 * @param evaluationPeriodId - Optional period ID to filter by
 * @returns Evaluation statistics
 */
export async function getEvaluationStats(teamId: string, evaluationPeriodId?: string): Promise<any> {
  try {
    let query = supabase
      .from('evaluation_periods')
      .select(`
        *,
        responses:evaluation_responses(count),
        submitted:evaluation_responses!inner(count),
        team:teams!inner(id, name)
      `)
      .eq('team_id', teamId)

    if (evaluationPeriodId) {
      query = query.eq('id', evaluationPeriodId)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  } catch (error: any) {
    console.error('getEvaluationStats error:', error?.message || JSON.stringify(error, null, 2))
    return []
  }
}

/**
 * Get evaluation periods for a team
 */
/**
 * Get evaluation periods for a team
 * @param teamId - Team ID
 * @returns List of evaluation periods
 */
export async function getTeamEvaluationPeriods(teamId: string): Promise<EvaluationPeriod[]> {
  try {
    const { data, error } = await supabase
      .from('evaluation_periods')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []) as EvaluationPeriod[]
  } catch (error: any) {
    console.error('getTeamEvaluationPeriods error:', error?.message || JSON.stringify(error, null, 2))
    return []
  }
}

/**
 * Get all peer evaluations for teams managed by an instructor/team leader
 * This allows instructors to view student comments and feedback
 */
/**
 * Get all peer evaluations for teams managed by an instructor/team leader
 * This allows instructors to view student comments and feedback
 * @param userId - Instructor/Leader User ID
 * @param workspaceId - Workspace ID
 * @param teamId - Optional Team ID to filter by
 * @param evaluationPeriodId - Optional Period ID to filter by
 * @returns List of evaluations with details
 */
export async function getTeamEvaluationsForInstructor(
  userId: string,
  workspaceId: string,
  teamId?: string,
  evaluationPeriodId?: string
): Promise<any[]> {
  try {
    // First, get all teams where the user is a leader or instructor
    const { data: userTeams } = await supabase
      .from('team_members')
      .select('team_id, role')
      .eq('user_id', userId)
      .in('role', ['leader'])

    if (!userTeams || userTeams.length === 0) {
      return []
    }

    const managedTeamIds = teamId 
      ? [teamId] 
      : userTeams.map(t => t.team_id)

    // Also check if user is workspace owner/admin
    const { data: workspaceMember } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single()

    // If user is workspace owner/admin, they can see all teams in the workspace
    let allTeamIds = managedTeamIds
    if (workspaceMember && (workspaceMember.role === 'owner' || workspaceMember.role === 'admin')) {
      const { data: allWorkspaceTeams } = await supabase
        .from('teams')
        .select('id')
        .eq('workspace_id', workspaceId)
      
      if (allWorkspaceTeams) {
        allTeamIds = [...new Set([...managedTeamIds, ...allWorkspaceTeams.map(t => t.id)])]
      }
    }

    if (allTeamIds.length === 0) {
      return []
    }

    // Get all peer evaluations for these teams
    let query = supabase
      .from('peer_evaluations')
      .select(`
        *,
        evaluation_period:evaluation_periods!inner(
          id,
          period_name,
          period_type,
          due_date,
          is_anonymous,
          workspace_id,
          team:teams!inner(id, name),
          project:projects(id, name)
        )
      `)
      .in('team_id', allTeamIds)

    if (evaluationPeriodId) {
      query = query.eq('evaluation_period_id', evaluationPeriodId)
    }

    const { data, error } = await query
      .eq('evaluation_period.workspace_id', workspaceId)
      .order('submitted_at', { ascending: false })

    if (error) throw error

    let evaluations = (data || []) as any[]

    if (evaluations.length === 0) {
      return []
    }

    // Get profiles for evaluators and evaluatees
    // Use team_members approach for better RLS access (similar to getPendingEvaluations)
    const evaluatorIds = [...new Set(evaluations.map(e => e.evaluator_id))]
    const evaluateeIds = [...new Set(evaluations.map(e => e.evaluatee_id))]
    const allUserIds = [...new Set([...evaluatorIds, ...evaluateeIds])]

    let profileMap = new Map()
    
    // Use team_members approach first (better RLS access for instructors)
    // This is the same approach used in getPendingEvaluations
    if (allUserIds.length > 0 && allTeamIds.length > 0) {
      try {
        const teamMembersPromises = allTeamIds.map(teamId => getTeamMembers(teamId))
        const teamMembersArrays = await Promise.all(teamMembersPromises)
        
        const allTeamMembers = teamMembersArrays.flat()
        allTeamMembers.forEach((member: any) => {
          if (member.user_id && allUserIds.includes(member.user_id)) {
            const profile = member.user || member.profile
            if (profile) {
              profileMap.set(member.user_id, {
                id: profile.id || profile.user_id,
                full_name: profile.full_name,
                avatar_url: profile.avatar_url,
                user_id: member.user_id,
              })
            }
          }
        })
      } catch (err) {
        console.warn('Error fetching team members for profiles:', err)
      }
    }

    // Fallback: try fetching profiles directly if we're still missing some
    const missingUserIds = allUserIds.filter(id => !profileMap.has(id))
    if (missingUserIds.length > 0) {
      try {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, user_id')
          .in('user_id', missingUserIds)

        if (profiles) {
          profiles.forEach(profile => {
            if (!profileMap.has(profile.user_id)) {
              profileMap.set(profile.user_id, {
                id: profile.id,
                full_name: profile.full_name,
                avatar_url: profile.avatar_url,
                user_id: profile.user_id,
              })
            }
          })
        }
      } catch (err) {
        console.warn('Error fetching profiles directly:', err)
      }
    }

    // Enrich evaluations with profile data
    // Respect anonymity: if anonymous, don't show evaluator info to students, but instructors can see it
    const enrichedEvaluations = evaluations.map(evaluation => {
      const isAnonymous = evaluation.evaluation_period?.is_anonymous ?? true
      
      const evaluatorProfile = profileMap.get(evaluation.evaluator_id)
      const evaluateeProfile = profileMap.get(evaluation.evaluatee_id)
      
      // Debug logging to help diagnose missing profiles
      if (!evaluatorProfile && evaluation.evaluator_id) {
        console.warn('Profile not found for evaluator_id:', evaluation.evaluator_id)
      }
      if (!evaluateeProfile && evaluation.evaluatee_id) {
        console.warn('Profile not found for evaluatee_id:', evaluation.evaluatee_id, 'Available profile keys:', Array.from(profileMap.keys()))
      }
      
      return {
        ...evaluation,
        evaluator: evaluatorProfile || null,
        evaluatee: evaluateeProfile || null,
        // For instructors, we can show evaluator info even if anonymous (for their own viewing)
        isAnonymous,
      }
    })

    return enrichedEvaluations
  } catch (error: any) {
    console.error('getTeamEvaluationsForInstructor error:', error?.message || JSON.stringify(error, null, 2))
    return []
  }
}

// =====================================================
// COMMUNICATION CHANNELS - Team Chat
// =====================================================

export interface TeamChatChannel {
  id: string
  team_id: string
  name: string
  description?: string
  is_default: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export interface TeamChatMessage {
  id: string
  channel_id?: string
  team_id: string
  user_id: string
  message: string
  created_at: string
  updated_at: string
  edited_at?: string
  is_edited?: boolean
  reply_to_id?: string
  attachments?: any[]
  metadata?: Record<string, any>
  user?: {
    id: string
    full_name: string
    avatar_url?: string
  }
  reply_to?: TeamChatMessage
}

/**
 * Get team chat channels
 */
/**
 * Get team chat channels
 * @param teamId - Team ID
 * @returns List of chat channels
 */
export async function getTeamChatChannels(teamId: string): Promise<TeamChatChannel[]> {
  try {
    const { data, error } = await supabase
      .from('team_chat_channels')
      .select('*')
      .eq('team_id', teamId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) throw error
    return (data || []) as TeamChatChannel[]
  } catch (error: any) {
    console.error('getTeamChatChannels error:', error?.message || JSON.stringify(error, null, 2))
    return []
  }
}

/**
 * Get default channel for a team (or create it if it doesn't exist)
 */
/**
 * Get default channel for a team (or create it if it doesn't exist)
 * @param teamId - Team ID
 * @returns Default channel or null
 */
export async function getOrCreateDefaultChannel(teamId: string): Promise<TeamChatChannel | null> {
  try {
    // Try to get default channel
    const { data: existing, error: fetchError } = await supabase
      .from('team_chat_channels')
      .select('*')
      .eq('team_id', teamId)
      .eq('is_default', true)
      .maybeSingle()

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError

    if (existing) {
      return existing as TeamChatChannel
    }

    // Default channel doesn't exist, try to create it
    // Note: This might fail if user doesn't have permission, that's okay
    const { data: created, error: createError } = await supabase
      .from('team_chat_channels')
      .insert({
        team_id: teamId,
        name: 'general',
        description: 'General team discussion',
        is_default: true,
      })
      .select('*')
      .single()

    if (createError) {
      // If creation fails, just return null - the user might need a leader to create channels
      console.warn('Could not create default channel:', createError.message)
      return null
    }

    return created as TeamChatChannel
  } catch (error: any) {
    console.error('getOrCreateDefaultChannel error:', error?.message || JSON.stringify(error, null, 2))
    return null
  }
}

/**
 * Get team chat messages for a channel
 */
/**
 * Get team chat messages for a channel
 * @param teamId - Team ID
 * @param channelId - Optional Channel ID
 * @param limit - Max messages to retrieve (default: 50)
 * @param before - Timestamp to fetch messages before (for pagination)
 * @returns List of chat messages with user details
 */
export async function getTeamChatMessages(
  teamId: string,
  channelId?: string,
  limit: number = 50,
  before?: string
): Promise<TeamChatMessage[]> {
  try {
    // Fetch messages without profile joins
    let query = supabase
      .from('team_chat_messages')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(limit)

    // If channel_id exists in the table, filter by it
    if (channelId) {
      query = query.eq('channel_id', channelId)
    }

    if (before) {
      query = query.lt('created_at', before)
    }

    const { data, error } = await query

    if (error) {
      // If error is about channel_id column not existing, try without channel filter
      if (error.message?.includes('column') && error.message?.includes('channel_id')) {
        // Fall back to team_id only
        let fallbackQuery = supabase
          .from('team_chat_messages')
          .select('*')
          .eq('team_id', teamId)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (before) {
          fallbackQuery = fallbackQuery.lt('created_at', before)
        }

        const { data: fallbackData, error: fallbackError } = await fallbackQuery
        if (fallbackError) throw fallbackError

        // Enrich fallback data with profiles
        return await enrichTeamChatMessages(fallbackData || [])
      }
      throw error
    }

    // Enrich messages with profiles
    return await enrichTeamChatMessages(data || [])
  } catch (error: any) {
    console.error('getTeamChatMessages error:', error?.message || JSON.stringify(error, null, 2))
    return []
  }
}

// Helper function to enrich team chat messages with profile data
async function enrichTeamChatMessages(messages: any[]): Promise<TeamChatMessage[]> {
  if (!messages || messages.length === 0) {
    return []
  }

  // Get unique user IDs (from messages and reply_to messages)
  const userIds = new Set<string>()
  messages.forEach((msg: any) => {
    if (msg.user_id) userIds.add(msg.user_id)
    if (msg.reply_to_id) {
      // Find the reply_to message in the array to get its user_id
      const replyToMsg = messages.find((m: any) => m.id === msg.reply_to_id)
      if (replyToMsg?.user_id) userIds.add(replyToMsg.user_id)
    }
  })

  // Fetch profiles separately
  const profilesMap = new Map<string, any>()
  if (userIds.size > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', Array.from(userIds))

    if (profiles) {
      profiles.forEach((profile: any) => {
        profilesMap.set(profile.id, profile)
      })
    }
  }

  // Enrich messages with profile data
  return messages.map((msg: any) => {
    const profile = profilesMap.get(msg.user_id)
    const enrichedMsg: any = {
      ...msg,
      user: profile ? {
        id: profile.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
      } : null,
    }

    // If there's a reply_to, enrich it too
    if (msg.reply_to_id) {
      const replyToMsg = messages.find((m: any) => m.id === msg.reply_to_id)
      if (replyToMsg) {
        const replyToProfile = profilesMap.get(replyToMsg.user_id)
        enrichedMsg.reply_to = {
          id: replyToMsg.id,
          message: replyToMsg.message,
          user_id: replyToMsg.user_id,
          user: replyToProfile ? {
            id: replyToProfile.id,
            full_name: replyToProfile.full_name,
            avatar_url: replyToProfile.avatar_url,
          } : null,
        }
      }
    }

    return enrichedMsg
  }).reverse() as TeamChatMessage[] // Reverse to show oldest first
}

/**
 * Send a team chat message
 */
/**
 * Send a team chat message
 * @param teamId - Team ID
 * @param userId - Sender User ID
 * @param message - Message content
 * @param channelId - Optional Channel ID
 * @param replyToId - Optional ID of message being replied to
 * @param attachments - Optional attachments
 * @returns Sent message with user details
 */
export async function sendTeamChatMessage(
  teamId: string,
  userId: string,
  message: string,
  channelId?: string,
  replyToId?: string,
  attachments?: any[]
): Promise<TeamChatMessage | null> {
  try {
    // Build insert object - don't include channel_id by default
    // The schema doesn't have channel_id column in the new version
    const insertData: any = {
      team_id: teamId,
      user_id: userId,
      message: message.trim(),
      reply_to_id: replyToId || null,
    }

    // Add optional fields if they exist in schema
    if (attachments) {
      insertData.attachments = attachments
    }

    // Try to insert without channel_id first
    let { data, error } = await supabase
      .from('team_chat_messages')
      .insert(insertData)
      .select('*')
      .single()

    // If error mentions channel_id, it means the old schema exists and channel_id is required
    if (error && error.message?.includes('channel_id')) {
      // Try with channel_id if provided
      if (channelId) {
        insertData.channel_id = channelId
      } else {
        // Try to get or create default channel
        const defaultChannel = await getOrCreateDefaultChannel(teamId)
        if (defaultChannel) {
          insertData.channel_id = defaultChannel.id
        } else {
          throw new Error('No channel available. Please contact your group leader to create a channel.')
        }
      }

      // Retry insert with channel_id
      const retryResult = await supabase
        .from('team_chat_messages')
        .insert(insertData)
        .select('*')
        .single()
      
      if (retryResult.error) throw retryResult.error
      data = retryResult.data
    } else if (error) {
      // Some other error occurred
      throw error
    }

    if (!data) return null

    // Enrich with profile data
    const enriched = await enrichTeamChatMessages([data])
    return enriched[0] || null
  } catch (error: any) {
    console.error('sendTeamChatMessage error:', error?.message || JSON.stringify(error, null, 2))
    throw error
  }
}

/**
 * Update a team chat message
 */
/**
 * Update a team chat message
 * @param messageId - Message ID
 * @param userId - User ID (must match sender)
 * @param newMessage - New message content
 * @returns Updated message
 */
export async function updateTeamChatMessage(
  messageId: string,
  userId: string,
  newMessage: string
): Promise<TeamChatMessage | null> {
  try {
    // Update without profile join
    const { data, error } = await supabase
      .from('team_chat_messages')
      .update({
        message: newMessage.trim(),
      })
      .eq('id', messageId)
      .eq('user_id', userId)
      .select('*')
      .single()

    if (error) throw error
    if (!data) return null

    // Enrich with profile data
    const enriched = await enrichTeamChatMessages([data])
    return enriched[0] || null
  } catch (error: any) {
    console.error('updateTeamChatMessage error:', error?.message || JSON.stringify(error, null, 2))
    throw error
  }
}

/**
 * Delete a team chat message
 */
/**
 * Delete a team chat message
 * @param messageId - Message ID
 * @param userId - User ID (must match sender)
 * @returns True if successful
 */
export async function deleteTeamChatMessage(messageId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('team_chat_messages')
      .delete()
      .eq('id', messageId)
      .eq('user_id', userId)

    if (error) throw error
    return true
  } catch (error: any) {
    console.error('deleteTeamChatMessage error:', error?.message || JSON.stringify(error, null, 2))
    throw error
  }
}

/**
 * Mark team chat messages as read
 */
/**
 * Mark team chat messages as read
 * @param messageIds - List of message IDs
 * @param userId - User ID
 */
export async function markTeamChatMessagesAsRead(
  messageIds: string[],
  userId: string
): Promise<void> {
  try {
    if (messageIds.length === 0) return

    const readStatuses = messageIds.map(messageId => ({
      message_id: messageId,
      user_id: userId,
    }))

    const { error } = await supabase
      .from('team_chat_read_status')
      .upsert(readStatuses, { onConflict: 'message_id,user_id' })

    if (error) throw error
  } catch (error: any) {
    console.error('markTeamChatMessagesAsRead error:', error?.message || JSON.stringify(error, null, 2))
  }
}

// =====================================================
// COMMUNICATION CHANNELS - Project Discussions
// =====================================================

export interface ProjectDiscussion {
  id: string
  project_id: string
  user_id: string
  title: string
  content: string
  is_pinned: boolean
  is_locked: boolean
  created_at: string
  updated_at: string
  last_activity_at: string
  tags?: string[]
  metadata?: Record<string, any>
  user?: {
    id: string
    full_name: string
    avatar_url?: string
  }
  comment_count?: number
}

export interface ProjectDiscussionComment {
  id: string
  discussion_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  edited_at?: string
  is_edited: boolean
  parent_comment_id?: string
  metadata?: Record<string, any>
  user?: {
    id: string
    full_name: string
    avatar_url?: string
  }
  replies?: ProjectDiscussionComment[]
}

/**
 * Get project discussions
 */
/**
 * Get project discussions
 * @param projectId - Project ID
 * @param limit - Max discussions to retrieve (default: 20)
 * @returns List of discussions with user details and comment counts
 */
export async function getProjectDiscussions(
  projectId: string,
  limit: number = 20
): Promise<ProjectDiscussion[]> {
  try {
    // Get discussions without profile join
    const { data: discussions, error: discussionsError } = await supabase
      .from('project_discussions')
      .select('*')
      .eq('project_id', projectId)
      .order('is_pinned', { ascending: false })
      .order('last_activity_at', { ascending: false })
      .limit(limit)

    if (discussionsError) throw discussionsError

    if (!discussions || discussions.length === 0) {
      return []
    }

    // Get unique user IDs
    const userIds = [...new Set(discussions.map((d: any) => d.user_id).filter(Boolean))]

    // Fetch profiles separately
    const profilesMap = new Map<string, any>()
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds)

      if (profiles) {
        profiles.forEach((profile: any) => {
          profilesMap.set(profile.id, profile)
        })
      }
    }

    // Get comment counts for each discussion
    const discussionIds = discussions.map((d: any) => d.id)
    const { data: commentCounts } = await supabase
      .from('project_discussion_comments')
      .select('discussion_id')
      .in('discussion_id', discussionIds)

    const countsMap = new Map<string, number>()
    if (commentCounts) {
      commentCounts.forEach((cc: any) => {
        countsMap.set(cc.discussion_id, (countsMap.get(cc.discussion_id) || 0) + 1)
      })
    }

    // Enrich discussions with profile data
    return discussions.map((discussion: any) => {
      const profile = profilesMap.get(discussion.user_id)
      return {
        ...discussion,
        user: profile ? {
          id: profile.id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
        } : null,
        comment_count: countsMap.get(discussion.id) || 0,
      }
    }) as ProjectDiscussion[]
  } catch (error: any) {
    console.error('getProjectDiscussions error:', error?.message || JSON.stringify(error, null, 2))
    return []
  }
}

/**
 * Get a single project discussion with comments
 */
/**
 * Get a single project discussion with comments
 * @param discussionId - Discussion ID
 * @returns Discussion object and list of comments (threaded)
 */
export async function getProjectDiscussion(
  discussionId: string
): Promise<{ discussion: ProjectDiscussion | null; comments: ProjectDiscussionComment[] }> {
  try {
    // Get discussion without profile join
    const { data: discussion, error: discussionError } = await supabase
      .from('project_discussions')
      .select('*')
      .eq('id', discussionId)
      .single()

    if (discussionError) throw discussionError

    // Get comments without profile join
    const { data: comments, error: commentsError } = await supabase
      .from('project_discussion_comments')
      .select('*')
      .eq('discussion_id', discussionId)
      .order('created_at', { ascending: true })

    if (commentsError) throw commentsError

    // Get unique user IDs from discussion and comments
    const userIds = new Set<string>()
    if (discussion?.user_id) userIds.add(discussion.user_id)
    if (comments) {
      comments.forEach((c: any) => {
        if (c.user_id) userIds.add(c.user_id)
      })
    }

    // Fetch profiles separately
    const profilesMap = new Map<string, any>()
    if (userIds.size > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', Array.from(userIds))

      if (profiles) {
        profiles.forEach((profile: any) => {
          profilesMap.set(profile.id, profile)
        })
      }
    }

    // Enrich discussion with profile
    const enrichedDiscussion = discussion ? {
      ...discussion,
      user: (() => {
        const profile = profilesMap.get(discussion.user_id)
        return profile ? {
          id: profile.id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
        } : null
      })(),
    } : null

    // Enrich comments with profiles and organize into threads
    const commentsMap = new Map<string, ProjectDiscussionComment>()
    const rootComments: ProjectDiscussionComment[] = []

    ;(comments || []).forEach((comment: any) => {
      const profile = profilesMap.get(comment.user_id)
      const commentObj = {
        ...comment,
        user: profile ? {
          id: profile.id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
        } : null,
        replies: [],
      } as ProjectDiscussionComment
      commentsMap.set(comment.id, commentObj)

      if (comment.parent_comment_id) {
        const parent = commentsMap.get(comment.parent_comment_id)
        if (parent) {
          if (!parent.replies) parent.replies = []
          parent.replies.push(commentObj)
        }
      } else {
        rootComments.push(commentObj)
      }
    })

    return {
      discussion: enrichedDiscussion as ProjectDiscussion | null,
      comments: rootComments,
    }
  } catch (error: any) {
    console.error('getProjectDiscussion error:', error?.message || JSON.stringify(error, null, 2))
    return { discussion: null, comments: [] }
  }
}

/**
 * Create a project discussion
 */
/**
 * Create a project discussion
 * @param projectId - Project ID
 * @param userId - Creator User ID
 * @param title - Discussion title
 * @param content - Discussion content
 * @param tags - Optional tags
 * @returns Created discussion
 */
export async function createProjectDiscussion(
  projectId: string,
  userId: string,
  title: string,
  content: string,
  tags?: string[]
): Promise<ProjectDiscussion | null> {
  try {
    // Insert without profile join
    const { data, error } = await supabase
      .from('project_discussions')
      .insert({
        project_id: projectId,
        user_id: userId,
        title: title.trim(),
        content: content.trim(),
        tags: tags || [],
      })
      .select('*')
      .single()

    if (error) throw error
    if (!data) return null

    // Fetch profile separately
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', userId)
      .single()

    // Enrich with profile data
    return {
      ...data,
      user: profile ? {
        id: profile.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
      } : null,
      comment_count: 0,
    } as ProjectDiscussion
  } catch (error: any) {
    console.error('createProjectDiscussion error:', error?.message || JSON.stringify(error, null, 2))
    throw error
  }
}

/**
 * Add a comment to a project discussion
 */
/**
 * Add a comment to a project discussion
 * @param discussionId - Discussion ID
 * @param userId - Commenter User ID
 * @param content - Comment content
 * @param parentCommentId - Optional parent comment ID (for replies)
 * @returns Created comment
 */
export async function addProjectDiscussionComment(
  discussionId: string,
  userId: string,
  content: string,
  parentCommentId?: string
): Promise<ProjectDiscussionComment | null> {
  try {
    // Insert without profile join
    const { data, error } = await supabase
      .from('project_discussion_comments')
      .insert({
        discussion_id: discussionId,
        user_id: userId,
        content: content.trim(),
        parent_comment_id: parentCommentId || null,
      })
      .select('*')
      .single()

    if (error) throw error
    if (!data) return null

    // Fetch profile separately
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', userId)
      .single()

    // Enrich with profile data
    return {
      ...data,
      user: profile ? {
        id: profile.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
      } : null,
      replies: [],
    } as ProjectDiscussionComment
  } catch (error: any) {
    console.error('addProjectDiscussionComment error:', error?.message || JSON.stringify(error, null, 2))
    throw error
  }
}

/**
 * Update a project discussion
 */
/**
 * Update a project discussion
 * @param discussionId - Discussion ID
 * @param userId - User ID (must match creator)
 * @param updates - Fields to update
 * @returns Updated discussion
 */
export async function updateProjectDiscussion(
  discussionId: string,
  userId: string,
  updates: { title?: string; content?: string; tags?: string[]; is_pinned?: boolean; is_locked?: boolean }
): Promise<ProjectDiscussion | null> {
  try {
    // Update without profile join
    const { data, error } = await supabase
      .from('project_discussions')
      .update(updates)
      .eq('id', discussionId)
      .eq('user_id', userId)
      .select('*')
      .single()

    if (error) throw error
    if (!data) return null

    // Fetch profile separately
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', userId)
      .single()

    // Get comment count
    const { data: comments } = await supabase
      .from('project_discussion_comments')
      .select('id')
      .eq('discussion_id', discussionId)

    // Enrich with profile data
    return {
      ...data,
      user: profile ? {
        id: profile.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
      } : null,
      comment_count: comments?.length || 0,
    } as ProjectDiscussion
  } catch (error: any) {
    console.error('updateProjectDiscussion error:', error?.message || JSON.stringify(error, null, 2))
    throw error
  }
}

/**
 * Delete a project discussion
 */
/**
 * Delete a project discussion
 * @param discussionId - Discussion ID
 * @param userId - User ID (must match creator)
 * @returns True if successful
 */
export async function deleteProjectDiscussion(discussionId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('project_discussions')
      .delete()
      .eq('id', discussionId)
      .eq('user_id', userId)

    if (error) throw error
    return true
  } catch (error: any) {
    console.error('deleteProjectDiscussion error:', error?.message || JSON.stringify(error, null, 2))
    throw error
  }
}

// =====================================================
// COMMUNICATION CHANNELS - Direct Messaging
// =====================================================

export interface DirectMessage {
  id: string
  sender_id: string
  recipient_id: string
  message: string
  is_read: boolean
  read_at?: string
  created_at: string
  updated_at: string
  reply_to_id?: string
  attachments?: any[]
  metadata?: Record<string, any>
  sender?: {
    id: string
    full_name: string
    avatar_url?: string
  }
  recipient?: {
    id: string
    full_name: string
    avatar_url?: string
  }
  reply_to?: DirectMessage
}

export interface Conversation {
  other_user: {
    id: string
    full_name: string
    avatar_url?: string
  }
  last_message?: DirectMessage
  unread_count: number
}

/**
 * Get conversations for a user (list of people they've messaged or been messaged by)
 */
/**
 * Get conversations for a user (list of people they've messaged or been messaged by)
 * @param userId - User ID
 * @returns List of conversations sorted by latest message
 */
export async function getDirectMessageConversations(userId: string): Promise<Conversation[]> {
  try {
    // Get all messages where user is sender or recipient
    const { data: messages, error } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    if (error) throw error

    if (!messages || messages.length === 0) return []

    // Get unique user IDs for profile lookups
    const userIds = new Set<string>()
    messages.forEach((message: any) => {
      userIds.add(message.sender_id)
      userIds.add(message.recipient_id)
    })

    // Fetch profiles for all users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', Array.from(userIds))

    if (profilesError) throw profilesError

    // Create a map for quick profile lookups
    const profileMap = new Map<string, any>()
    profiles?.forEach(profile => {
      profileMap.set(profile.id, profile)
    })

    // Group messages by conversation partner
    const conversationsMap = new Map<string, Conversation>()

    messages.forEach((message: any) => {
      const otherUserId = message.sender_id === userId ? message.recipient_id : message.sender_id
      const otherUser = profileMap.get(otherUserId) || null

      if (!conversationsMap.has(otherUserId)) {
        conversationsMap.set(otherUserId, {
          other_user: otherUser,
          unread_count: 0,
        })
      }

      const conversation = conversationsMap.get(otherUserId)!
      if (!conversation.last_message) {
        conversation.last_message = {
          ...message,
          sender: profileMap.get(message.sender_id) || null,
          recipient: profileMap.get(message.recipient_id) || null,
        } as DirectMessage
      }
      if (message.recipient_id === userId && !message.is_read) {
        conversation.unread_count++
      }
    })

    return Array.from(conversationsMap.values()).sort((a, b) => {
      const aTime = a.last_message?.created_at || ''
      const bTime = b.last_message?.created_at || ''
      return bTime.localeCompare(aTime)
    })
  } catch (error: any) {
    console.error('getDirectMessageConversations error:', error?.message || JSON.stringify(error, null, 2))
    return []
  }
}

/**
 * Get messages between two users
 */
/**
 * Get messages between two users
 * @param userId - Current User ID
 * @param otherUserId - Other User ID
 * @param limit - Max messages to retrieve (default: 50)
 * @param before - Timestamp to fetch messages before (for pagination)
 * @returns List of messages
 */
export async function getDirectMessages(
  userId: string,
  otherUserId: string,
  limit: number = 50,
  before?: string
): Promise<DirectMessage[]> {
  try {
    let query = supabase
      .from('direct_messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (before) {
      query = query.lt('created_at', before)
    }

    const { data: messages, error } = await query

    if (error) throw error

    if (!messages || messages.length === 0) return []

    // Get unique user IDs for profile lookups (including reply_to sender IDs)
    const userIds = new Set<string>()
    messages.forEach((message: any) => {
      userIds.add(message.sender_id)
      userIds.add(message.recipient_id)
      if (message.reply_to_id) {
        // We'll fetch reply_to messages separately if needed
      }
    })

    // Fetch profiles for all users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', Array.from(userIds))

    if (profilesError) throw profilesError

    // Create a map for quick profile lookups
    const profileMap = new Map<string, any>()
    profiles?.forEach(profile => {
      profileMap.set(profile.id, profile)
    })

    // Fetch reply_to messages if any exist
    const replyToIds = messages.filter(m => m.reply_to_id).map(m => m.reply_to_id)
    let replyToMessages: any[] = []
    if (replyToIds.length > 0) {
      const { data: replyMessages, error: replyError } = await supabase
        .from('direct_messages')
        .select('*')
        .in('id', replyToIds)

      if (!replyError && replyMessages) {
        replyToMessages = replyMessages
        // Add reply message sender IDs to userIds set
        replyMessages.forEach((reply: any) => {
          userIds.add(reply.sender_id)
        })

        // Fetch additional profiles for any new user IDs we found
        const existingProfileIds = new Set(profiles?.map(p => p.id) || [])
        const additionalUserIds = Array.from(userIds).filter(id => !existingProfileIds.has(id))
        if (additionalUserIds.length > 0) {
          const { data: additionalProfiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', additionalUserIds)

          additionalProfiles?.forEach(profile => {
            profileMap.set(profile.id, profile)
          })
        }
      }
    }

    // Enrich messages with profile data
    const enrichedMessages = messages.map((message: any) => {
      const replyTo = replyToMessages.find(r => r.id === message.reply_to_id)
      return {
        ...message,
        sender: profileMap.get(message.sender_id) || null,
        recipient: profileMap.get(message.recipient_id) || null,
        reply_to: replyTo ? {
          ...replyTo,
          sender: profileMap.get(replyTo.sender_id) || null,
        } : null,
      } as DirectMessage
    })

    return enrichedMessages.reverse() as DirectMessage[] // Reverse to show oldest first
  } catch (error: any) {
    console.error('getDirectMessages error:', error?.message || JSON.stringify(error, null, 2))
    return []
  }
}

/**
 * Send a direct message
 */
/**
 * Send a direct message
 * @param senderId - Sender User ID
 * @param recipientId - Recipient User ID
 * @param message - Message content
 * @param replyToId - Optional ID of message being replied to
 * @param attachments - Optional attachments
 * @returns Sent message with user details
 */
export async function sendDirectMessage(
  senderId: string,
  recipientId: string,
  message: string,
  replyToId?: string,
  attachments?: any[]
): Promise<DirectMessage | null> {
  try {
    const { data, error } = await supabase
      .from('direct_messages')
      .insert({
        sender_id: senderId,
        recipient_id: recipientId,
        message: message.trim(),
        reply_to_id: replyToId || null,
        attachments: attachments || [],
      })
      .select(`
        *,
        sender:profiles!sender_id(id, full_name, avatar_url),
        recipient:profiles!recipient_id(id, full_name, avatar_url),
        reply_to:direct_messages!reply_to_id(id, message, sender_id, sender:profiles!sender_id(id, full_name, avatar_url))
      `)
      .single()

    if (error) throw error
    return data as DirectMessage
  } catch (error: any) {
    console.error('sendDirectMessage error:', error?.message || JSON.stringify(error, null, 2))
    throw error
  }
}

/**
 * Mark direct messages as read
 */
/**
 * Mark direct messages as read
 * @param messageIds - List of message IDs
 * @param userId - User ID (recipient)
 */
export async function markDirectMessagesAsRead(
  messageIds: string[],
  userId: string
): Promise<void> {
  try {
    if (messageIds.length === 0) return

    const { error } = await supabase
      .from('direct_messages')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .in('id', messageIds)
      .eq('recipient_id', userId)
      .eq('is_read', false)

    if (error) throw error
  } catch (error: any) {
    console.error('markDirectMessagesAsRead error:', error?.message || JSON.stringify(error, null, 2))
  }
}

/**
 * Get unread direct message count
 */
/**
 * Get unread direct message count
 * @param userId - User ID
 * @returns Count of unread messages
 */
export async function getUnreadDirectMessageCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('direct_messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('is_read', false)

    if (error) throw error
    return count || 0
  } catch (error: any) {
    console.error('getUnreadDirectMessageCount error:', error?.message || JSON.stringify(error, null, 2))
    return 0
  }
}

// =====================================================
// PROJECT SUBMISSIONS (Final Assignment Submission)
// =====================================================

/**
 * Upload a project submission file
 * @param projectId - Project ID
 * @param file - File to upload
 * @returns Public URL of the uploaded file
 */
export async function uploadProjectFile(projectId: string, file: File): Promise<string> {
  try {
    // Create unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${projectId}-${Date.now()}.${fileExt}`
    const filePath = `${projectId}/${fileName}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('project-submissions')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('project-submissions')
      .getPublicUrl(filePath)

    return urlData.publicUrl
  } catch (error: any) {
    console.error('uploadProjectFile error:', error?.message || JSON.stringify(error, null, 2))
    throw error
  }
}

/**
 * Submit a project (Final Assignment)
 * Only group leaders or instructors can submit
 * @param projectId - Project ID
 * @param userId - User ID submitting
 * @param content - Submission content/notes
 * @param resources - List of resources/files
 * @returns Submission record
 */
export async function submitProject(
  projectId: string,
  userId: string,
  content: string | null,
  resources: ProjectResource[] = []
): Promise<ProjectSubmission | null> {
  try {
    // Check if user is group leader
    const isLeader = await isTeamLeaderOrInstructor(userId, projectId, ''); // We might need teamId, but let's check permissions inside RLS or here
    // Actually isTeamLeaderOrInstructor takes (userId, teamId, workspaceId). 
    // We need to fetch project details first to get teamId and workspaceId if we want to check here.
    // But RLS policies handle security. Let's trust RLS or fetch if needed.
    
    // Let's fetch project to get team_id
    const { data: project } = await supabase
      .from('projects')
      .select('team_id, workspace_id')
      .eq('id', projectId)
      .single();
      
    if (!project) throw new Error('Project not found');
    
    const canSubmit = await isTeamLeaderOrInstructor(userId, project.team_id, project.workspace_id);
    if (!canSubmit) {
      throw new Error('Only group leaders can submit the project');
    }

    // Fetch completed tasks to generate a contribution report
    const { data: completedTasks } = await supabase
      .from('tasks')
      .select(`
        title,
        status,
        assignees:task_assignees(
          user:profiles(full_name)
        )
      `)
      .eq('project_id', projectId)
      .eq('status', 'completed');

    let contributionReport = '';
    if (completedTasks && completedTasks.length > 0) {
      contributionReport = '\n\n--- Team Contribution Report ---\n';
      completedTasks.forEach((task: any) => {
        const assignees = task.assignees?.map((a: any) => a.user?.full_name).join(', ') || 'Unassigned';
        contributionReport += `- ${task.title} (Completed by: ${assignees})\n`;
      });
      contributionReport += `Total Completed Tasks: ${completedTasks.length}\n----------------------------------`;
    }

    const finalContent = content ? content + contributionReport : contributionReport;

    const { data, error } = await supabase
      .from('project_submissions')
      .insert({
        project_id: projectId,
        submitted_by: userId,
        content: finalContent,
        resources,
        status: 'submitted'
      })
      .select('*')
      .single();

    if (error) throw error;
    return data as ProjectSubmission;
  } catch (error: any) {
    console.error('submitProject error:', error?.message || JSON.stringify(error, null, 2));
    throw error;
  }
}

/**
 * Get all teams and their submissions for a project (Instructor View)
 * @param projectId - Project ID
 * @returns List of teams with members and submission details
 */
export async function getProjectTeamsAndSubmissions(projectId: string) {
  try {
    // 1. Get the project to find the workspace
    const { data: project } = await supabase
      .from('projects')
      .select('workspace_id, team_id')
      .eq('id', projectId)
      .single();

    if (!project) throw new Error('Project not found');

    // 2. Get all teams in the workspace (or just the assigned team if it's a single-team project)
    // For now, assuming projects are assigned to a specific team, but in a class setting, 
    // an "Assignment" might be a template project copied to multiple teams.
    // However, the current schema links a project to a SINGLE team.
    // If the user wants to view "All Teams working on this Assignment", we might need to rethink the schema 
    // or assume "Assignment" is a parent concept.
    
    // Based on current schema: One Project = One Team.
    // BUT, the user request implies an "Instructor View" for *multiple* teams.
    // This suggests we might be moving towards a "Class Assignment" model where multiple teams have their own "Project" instance.
    // OR, we are just viewing the one team for this specific project.
    
    // Let's assume for now we are viewing the ONE team assigned to this project, 
    // but I'll structure the return to be a list, so it's future-proof if we add multi-team assignments.

    const { data: team } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        members:team_members(
          user:profiles(
            id,
            full_name,
            avatar_url
          )
        )
      `)
      .eq('id', project.team_id)
      .single();

    if (!team) return [];

    // 3. Get the submission for this project
    const { data: submission, error: submissionError } = await supabase
      .from('project_submissions')
      .select('*')
      .eq('project_id', projectId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (submissionError) {
      console.error('Error fetching submission:', submissionError);
    }

    // Return as a list (even if just one for now)
    return [{
      team,
      project,
      submission
    }];

  } catch (error) {
    console.error('Error fetching project teams:', error);
    return [];
  }
}

/**
 * Get project submission details
 * @param projectId - Project ID
 * @returns Submission record or null
 */
export async function getProjectSubmission(projectId: string): Promise<ProjectSubmission | null> {
  try {
    const { data, error } = await supabase
      .from('project_submissions')
      .select('*')
      .eq('project_id', projectId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
    return data as ProjectSubmission;
  } catch (error: any) {
    console.error('getProjectSubmission error:', error?.message || JSON.stringify(error, null, 2));
    return null;
  }
}

/**
 * Get project details with team info
 * @param projectId - Project ID
 * @param workspaceId - Optional Workspace ID (unused but kept for signature compatibility)
 * @returns Project with team details
 */
export async function getProject(projectId: string, workspaceId?: string) {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        team:teams(
          *,
          members:team_members(
            *,
            user:profiles(*)
          )
        )
      `)
      .eq('id', projectId)
      .single();

    if (error) throw error;
    
    // Transform to match TeamWithMembers (add member_count if missing, though we might not use it)
    const project = data as any;
    if (project && project.team) {
      project.team.member_count = project.team.members?.length || 0;
      // Map members to match the structure if needed, but Supabase returns nested objects
      // TeamWithMembers expects members: (TeamMember & { profile: Profile })[]
      // The query returns members with nested user: Profile.
      // We might need to map user to profile if the type expects 'profile' property, 
      // but TeamWithMembers definition says: members: (TeamMember & { profile: Profile })[]
      // Let's check TeamWithMembers definition again.
      // It says: members: (WorkspaceMember & { profile: Profile })[] for WorkspaceWithMembers
      // For TeamWithMembers: members: (TeamMember & { profile: Profile })[]
      
      // The query returns members with 'user' property (alias for profiles).
      // So we should map 'user' to 'profile' or update the type.
      // But wait, the UI uses `m.user.id`.
      // Let's check the UI usage in app/projects/[id]/page.tsx
      // line 227: users={project?.team?.members?.map((m: any) => ({ userId: m.user.id ...
      // So the UI expects `m.user`.
      
      // So TeamWithMembers type might be wrong or I misread it?
      // Let's check lib/types/database.ts again.
      // line 357: members: (TeamMember & { profile: Profile })[]
      
      // If the type says 'profile' but UI uses 'user', then there is a mismatch.
      // However, I am casting `as TeamWithMembers`.
      // If I cast it, TS thinks it has `profile`.
      // But at runtime it has `user`.
      // The UI uses `m.user`.
      // So the UI is actually using `any` for `m` in the map: `map((m: any) => ...`
      // So the UI is bypassing the type check for the member structure.
      
      // So I just need to make sure `project.team` satisfies `TeamWithMembers` for the `setProject` call.
      // And `TeamWithMembers` requires `members` and `member_count`.
    }

    return project as Project & { team: TeamWithMembers };
  } catch (error: any) {
    console.error('getProject error:', error?.message || JSON.stringify(error, null, 2));
    return null;
  }
}
