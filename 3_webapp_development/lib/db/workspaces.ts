// =====================================================
// Workspace Database Functions
// Functions for workspace CRUD, membership, and access management
// =====================================================

import { supabase } from '../supabase';
import type { Workspace, WorkspaceInsert } from '../types/database';
import { getOrCreateProfile } from './profiles';

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
 * Create a new workspace with the current user as owner
 * Uses an RPC function to bypass RLS restrictions during creation
 * @param workspace - Workspace data to insert
 * @param userId - Owner's user ID
 * @returns The created workspace
 */
export async function createWorkspace(workspace: WorkspaceInsert, userId: string) {
  // Use RPC function to bypass RLS restrictions
  const { data: newWorkspace, error: workspaceError } = await supabase.rpc(
    'create_workspace_with_owner',
    {
      workspace_name: workspace.name,
      owner_user_id: userId,
      workspace_description: workspace.description || null,
      workspace_settings: workspace.settings || {},
    }
  );

  if (workspaceError) {
    console.error('Error creating workspace:', workspaceError);
    throw workspaceError;
  }

  if (!newWorkspace || newWorkspace.length === 0) {
    throw new Error('Failed to create workspace');
  }

  return newWorkspace[0] as Workspace;
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
    const fileExt = file.name.split('.').pop();
    const fileName = `${workspaceId}-${Date.now()}.${fileExt}`;
    const filePath = `${workspaceId}/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('workspace-icons')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true, // Allow overwriting
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage.from('workspace-icons').getPublicUrl(filePath);

    const iconUrl = urlData.publicUrl;

    // Update workspace with icon URL
    const { error: updateError } = await supabase
      .from('workspaces')
      .update({ icon_url: iconUrl })
      .eq('id', workspaceId);

    if (updateError) throw updateError;

    return iconUrl;
  } catch (error: any) {
    console.error('uploadWorkspaceIcon error:', error?.message || JSON.stringify(error, null, 2));
    throw error;
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
      .single();

    if (fetchError) throw fetchError;

    if (workspace?.icon_url) {
      // Extract file path from URL (workspace-icons/{workspaceId}/filename)
      const urlParts = workspace.icon_url.split('/');
      const filePathIndex = urlParts.indexOf('workspace-icons');
      if (filePathIndex !== -1 && filePathIndex < urlParts.length - 1) {
        const filePath = urlParts.slice(filePathIndex + 1).join('/');

        // Delete from storage
        const { error: storageError } = await supabase.storage
          .from('workspace-icons')
          .remove([filePath]);

        if (storageError) {
          console.warn('Storage delete error (file may not exist):', storageError);
          // Continue with DB update even if storage delete fails
        }
      }
    }

    // Update workspace to remove icon URL
    const { error: updateError } = await supabase
      .from('workspaces')
      .update({ icon_url: null })
      .eq('id', workspaceId);

    if (updateError) throw updateError;
  } catch (error: any) {
    console.error('removeWorkspaceIcon error:', error?.message || JSON.stringify(error, null, 2));
    throw error;
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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  console.log('👤 User ID:', user.id);
  console.log('🏢 Workspace ID:', workspaceId);

  // First call debug function to check access
  const { data: debugData, error: debugError } = await supabase.rpc('debug_workspace_access', {
    workspace_id_param: workspaceId,
    user_id_param: user.id,
  });

  if (debugError) {
    console.error('❌ Debug RPC error:', {
      message: debugError.message,
      details: debugError.details,
      hint: debugError.hint,
      code: debugError.code,
      fullError: debugError,
    });
  } else {
    console.log('🔍 Debug workspace access result:', debugData);
  }

  // Use RPC function to bypass RLS issues
  const { data, error } = await supabase
    .rpc('get_workspace_rpc', {
      workspace_id_param: workspaceId,
      user_id_param: user.id,
    })
    .single();

  if (error) {
    console.error('❌ RPC get_workspace_rpc error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      fullError: error,
    });

    // Check if the function doesn't exist
    if (
      error.code === '42883' ||
      error.message?.includes('function') ||
      error.message?.includes('does not exist')
    ) {
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
        fullError: fallbackError,
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
      updated_at: rpcData.workspace_updated_at,
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
      .select(
        `
        *,
        workspace:workspaces(*)
      `
      )
      .eq('user_id', userId);

    console.log('📊 getUserWorkspaces query result:', { data, error });

    if (error) {
      console.error('❌ getUserWorkspaces error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
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

/**
 * Get all workspaces for a user using RPC (bypasses RLS)
 * @param userId - User ID
 * @returns List of workspace memberships with workspace details
 */
export async function getUserWorkspacesRPC(userId: string) {
  console.log('🔍 getUserWorkspacesRPC called with userId:', userId);

  try {
    const { data, error } = await supabase.rpc('get_user_workspaces', {
      user_id_param: userId,
    });

    console.log('📊 getUserWorkspacesRPC result:', { data, error });

    if (error) {
      console.error('❌ getUserWorkspacesRPC error:', error);
      throw error;
    }

    console.log(
      '✅ getUserWorkspacesRPC success, found',
      data?.length || 0,
      'workspace memberships'
    );
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      // Try to get or create profile
      await getOrCreateProfile(userId, {
        full_name: user.user_metadata?.full_name,
        email: user.email || undefined,
      });
    }
  } catch (profileError) {
    // Log but don't fail - profile might already exist
    console.warn('Profile check/creation warning:', profileError);
  }

  // Use RPC function to bypass RLS restrictions for joining
  const { data: workspace, error: joinError } = await supabase.rpc(
    'join_workspace_by_invite_code',
    {
      invite_code_param: inviteCode.toUpperCase(),
      user_id_param: userId,
    }
  );

  if (joinError) {
    console.error('Error joining workspace:', joinError);

    // Handle specific error messages from the RPC function
    if (joinError.message.includes('Invalid invite code')) {
      throw new Error('Invalid invite code. Please check and try again.');
    }
    if (joinError.message.includes('already a member')) {
      throw new Error('You are already a member of this workspace.');
    }

    throw new Error('Failed to join workspace. Please try again.');
  }

  if (!workspace || workspace.length === 0) {
    throw new Error('Failed to join workspace. Please try again.');
  }

  return workspace[0] as Workspace;
}

/**
 * Get all members of a workspace
 * @param workspaceId - Workspace ID
 * @returns List of workspace members with profile data
 */
export async function getWorkspaceMembers(workspaceId: string) {
  console.log('🔍 [CLIENT] getWorkspaceMembers called with workspaceId:', workspaceId);

  try {
    // Fetch workspace members with profile data using direct query
    const { data, error } = await supabase
      .from('workspace_members')
      .select(
        `
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
      `
      )
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
        user: user || null, // Normalized user profile
      };
    });

    return transformedData;
  } catch (error) {
    console.error('❌ [CLIENT] Exception in getWorkspaceMembers:', error);
    return [];
  }
}

/**
 * Check if a user has permission to view workspace members
 * @param workspaceId - Workspace ID
 * @param userId - User ID
 * @returns True if user can view members, false otherwise
 */
export async function canViewWorkspaceMembers(workspaceId: string, userId: string) {
  try {
    const { data, error } = await supabase.rpc('can_view_workspace_members', {
      workspace_id_param: workspaceId,
      user_id_param: userId,
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
