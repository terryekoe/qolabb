// =====================================================
// Team Database Functions
// Functions for team CRUD, member management, join requests, and auditing
// =====================================================

import { supabase } from '../supabase';
import type { Team, TeamInsert, ActivityLogInsert } from '../types/database';
import { logActivity } from './activity';
import {
  createTeamAssignmentNotification,
  createTeamInvitationNotification,
  createJoinRequestNotification,
} from './notifications';

// =====================================================
// BASIC TEAM FUNCTIONS
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
    .single();

  if (error) throw error;

  // Check if creator is an instructor - if so, don't auto-add them to the team
  // Instructors should be able to join/leave teams on their own
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    const userRole = profile?.role?.toLowerCase();
    const isInstructor =
      userRole === 'instructor' || userRole === 'teaching_assistant' || userRole === 'admin';

    // Only auto-add creator as team leader if they're NOT an instructor
    // Instructors can manually join teams later if they want to participate
    if (!isInstructor) {
      await supabase.from('team_members').insert({
        team_id: (data as any).id,
        user_id: userId,
        role: 'leader',
      } as any);
    }
  } catch (profileError) {
    // If we can't check the profile, default to adding them (backward compatibility)
    console.warn(
      'Could not check user role for team creation, defaulting to auto-add:',
      profileError
    );
    await supabase.from('team_members').insert({
      team_id: (data as any).id,
      user_id: userId,
      role: 'leader',
    } as any);
  }

  return data as Team;
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
      .select(
        `
        *,
        members:team_members(
          *,
          user:profiles!user_id(*)
        )
      `
      )
      .eq('workspace_id', workspaceId);

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
    .select(
      `
      *,
      team:teams(*)
    `
    )
    .eq('user_id', userId);

  if (workspaceId) {
    query = query.eq('team.workspace_id', workspaceId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
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
export async function updateTeamMemberRole(
  teamId: string,
  userId: string,
  role: 'leader' | 'member'
) {
  const { data, error } = await supabase
    .from('team_members')
    .update({ role } as any)
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all members of a team
 * @param teamId - Team ID
 * @returns List of team members with profile data
 */
export async function getTeamMembers(teamId: string) {
  const { data, error } = await supabase
    .from('team_members')
    .select(
      `
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
    `
    )
    .eq('team_id', teamId);

  if (error) throw error;

  // Transform data to include both user and profile for compatibility
  // Some components use `user`, others use `profile`
  return (data || []).map((member: any) => ({
    ...member,
    // Set both user and profile fields for backward compatibility
    user: member.user || null,
    profile: member.user || null,
  }));
}

/**
 * Check if a user is a team leader or instructor/admin
 * @param userId - User ID
 * @param teamId - Team ID
 * @param workspaceId - Workspace ID
 * @returns True if user has elevated permissions
 */
export async function isTeamLeaderOrInstructor(
  userId: string,
  teamId: string,
  workspaceId: string
) {
  // Check if user is workspace owner/instructor
  const { data: workspaceMember } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single();

  if (workspaceMember && (workspaceMember.role === 'owner' || workspaceMember.role === 'admin')) {
    return true;
  }

  // Check if user is team leader
  const { data: teamMember } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single();

  return teamMember?.role === 'leader';
}

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

      const { error: addMemberError } = await supabase.rpc('add_workspace_member', {
        workspace_id_param: team.workspace_id,
        user_id_param: userId,
        role_param: 'member',
        added_by_param: assignedBy || undefined,
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
        throw new Error(
          `Team has reached maximum member capacity (${teamSettings.max_members} members)`
        );
      }
    }

    // Add the user to the team
    const { data, error } = await supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: userId,
        role,
      })
      .select(
        `
        *,
        user:profiles!user_id(*)
      `
      )
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
      assignedBy && assignedBy !== userId
        ? createTeamAssignmentNotification(userId, team.name, assignedBy, role)
        : Promise.resolve(),
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
    .single();

  if (error) throw error;

  // Log activity
  const { data: team } = await supabase
    .from('teams')
    .select('workspace_id, name')
    .eq('id', teamId)
    .single();

  if (team) {
    await logActivity({
      workspace_id: (team as any).workspace_id,
      user_id: userId,
      action_type: 'left_team',
      entity_type: 'team',
      entity_id: teamId,
      metadata: { team_name: (team as any).name },
    });
  }

  return data;
}

/**
 * Get workspace members who are NOT in a specific team
 * @param workspaceId - Workspace ID
 * @param teamId - Team ID to exclude members from
 * @returns List of available workspace members
 */
export async function getAvailableWorkspaceMembers(workspaceId: string, teamId: string) {
  try {
    console.log('🔍 getAvailableWorkspaceMembers called with:', { workspaceId, teamId });

    // First, get ALL workspace members to see if there are any
    const { data: allWorkspaceMembers, error: workspaceError } = await supabase
      .from('workspace_members')
      .select(
        `
        user_id,
        user:profiles!user_id(*)
      `
      )
      .eq('workspace_id', workspaceId);

    if (workspaceError) {
      console.error('❌ Error fetching workspace members:', workspaceError);
      throw workspaceError;
    }

    console.log('🏢 ALL workspace members found:', allWorkspaceMembers);
    console.log('📊 Total workspace members count:', allWorkspaceMembers?.length || 0);
    console.log(
      '🔍 WORKSPACE MEMBER USER IDs:',
      allWorkspaceMembers?.map((m) => m.user_id)
    );

    if (!allWorkspaceMembers || allWorkspaceMembers.length === 0) {
      console.log('⚠️ No workspace members found at all!');
      return [];
    }

    // Now get team members for this team
    const { data: teamMembers, error: teamError } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId);

    if (teamError) {
      console.error('❌ Error fetching team members:', teamError);
      throw teamError;
    }

    console.log('👥 Current team members:', teamMembers);

    // Extract user IDs who are already in the team
    const teamMemberIds = teamMembers?.map((member) => member.user_id) || [];
    console.log('🚫 Team member IDs to exclude:', teamMemberIds);
    console.log('🔍 TEAM MEMBER USER IDs:', teamMemberIds);

    // Filter out team members from workspace members
    const availableMembers = allWorkspaceMembers.filter(
      (member) => !teamMemberIds.includes(member.user_id)
    );

    console.log('✅ Available workspace members after filtering:', availableMembers);
    console.log('📊 Available members count:', availableMembers?.length || 0);

    // Debug: Show what users we're returning
    if (availableMembers && availableMembers.length > 0) {
      console.log(
        '🔍 DETAILED: Available members user IDs:',
        availableMembers.map((m) => m.user_id)
      );
      console.log('🔍 DETAILED: Team member IDs that were excluded:', teamMemberIds);
    } else {
      console.log('🔍 DETAILED: No available members after filtering (all may be in team already)');
    }

    return availableMembers || [];
  } catch (error) {
    console.error('❌ getAvailableWorkspaceMembers error:', error);
    throw error;
  }
}

/**
 * Debug function to get all workspace members
 * @param workspaceId - Workspace ID
 * @returns List of workspace members
 */
export async function debugWorkspaceMembers(workspaceId: string) {
  try {
    console.log('🔍 DEBUG: Checking all workspace members for workspace:', workspaceId);

    const { data, error } = await supabase
      .from('workspace_members')
      .select(
        `
        user_id,
        role,
        user:profiles!user_id(*)
      `
      )
      .eq('workspace_id', workspaceId);

    if (error) {
      console.error('❌ DEBUG: Error fetching workspace members:', error);
      throw error;
    }

    console.log('📋 DEBUG: All workspace members:', data);
    console.log('📊 DEBUG: Total workspace members count:', data?.length || 0);

    return data || [];
  } catch (error) {
    console.error('❌ DEBUG: debugWorkspaceMembers error:', error);
    throw error;
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
    console.log(
      '🔧 FIXING: Checking data consistency for team:',
      teamId,
      'in workspace:',
      workspaceId
    );

    // Get all team members
    const { data: teamMembers, error: teamError } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId);

    if (teamError) throw teamError;

    // Get all workspace members
    const { data: workspaceMembers, error: workspaceError } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId);

    if (workspaceError) throw workspaceError;

    const teamMemberIds = teamMembers?.map((m) => m.user_id) || [];
    const workspaceMemberIds = workspaceMembers?.map((m) => m.user_id) || [];

    console.log('🔍 Team member IDs:', teamMemberIds);
    console.log('🔍 Workspace member IDs:', workspaceMemberIds);

    // Find team members who are NOT workspace members
    const invalidTeamMembers = teamMemberIds.filter((id) => !workspaceMemberIds.includes(id));

    if (invalidTeamMembers.length > 0) {
      console.log('⚠️ Found invalid team members (not in workspace):', invalidTeamMembers);

      // Check if these users exist in profiles
      for (const userId of invalidTeamMembers) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('id', userId)
          .single();

        if (profile) {
          console.log(`👤 User ${userId} (${profile.full_name}) exists but is not in workspace`);
          console.log(`🔧 Adding user ${userId} to workspace as member`);

          // Add user to workspace
          await supabase.from('workspace_members').insert({
            workspace_id: workspaceId,
            user_id: userId,
            role: 'member',
          });

          console.log(`✅ Added user ${userId} to workspace`);
        } else {
          console.log(`❌ User ${userId} does not exist in profiles - removing from team`);

          // Remove from team
          await supabase.from('team_members').delete().eq('team_id', teamId).eq('user_id', userId);

          console.log(`✅ Removed invalid user ${userId} from team`);
        }
      }

      return { fixed: true, invalidMembers: invalidTeamMembers };
    } else {
      console.log('✅ No data consistency issues found');
      return { fixed: false, invalidMembers: [] };
    }
  } catch (error) {
    console.error('❌ Error fixing data consistency:', error);
    throw error;
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
      .single();

    if (!team) {
      throw new Error('Team not found');
    }

    // Check if the user is a member of the workspace
    const { data: workspaceMember } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', (team as any).workspace_id)
      .eq('user_id', userId)
      .single();

    if (!workspaceMember) {
      throw new Error('User must be a workspace member before joining a team');
    }

    // Check if the user is already a member of this team
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single();

    if (existingMember) {
      throw new Error('User is already a member of this team');
    }

    // Check if there's already a pending request for this user and team
    const { data: existingRequest } = await supabase
      .from('team_join_requests')
      .select('id, status')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      throw new Error('A join request for this user and team is already pending');
    }

    // Check team capacity if max_members is set
    const teamSettings = (team as any).settings || {};
    if (teamSettings.max_members) {
      const { count: currentMemberCount } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId);

      if (currentMemberCount && currentMemberCount >= teamSettings.max_members) {
        throw new Error('Team has reached maximum member capacity');
      }
    }

    const { data, error } = await supabase
      .from('team_join_requests')
      .insert({
        team_id: teamId,
        user_id: userId,
        requested_by: requestedBy,
        request_type: requestType,
        message: message || null,
      })
      .select(
        `
        *,
        team:teams(name, workspace_id),
        user:profiles!user_id(full_name, avatar_url),
        requester:profiles!requested_by(full_name, avatar_url)
      `
      )
      .single();

    if (error) throw error;

    // Log the action
    await logTeamAssignmentAudit(
      teamId,
      userId,
      requestType === 'self_request' ? 'join_request' : 'invitation_sent',
      requestedBy,
      { request_id: data.id, message }
    );

    return data;
  } catch (error: any) {
    console.error('createJoinRequest error:', error?.message || JSON.stringify(error, null, 2));
    throw error;
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
      .select(
        `
        *,
        team:teams(name, workspace_id)
      `
      )
      .eq('team_id', teamId)
      .order('requested_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: joinRequests, error } = await query;

    if (error) throw error;
    if (!joinRequests || joinRequests.length === 0) return [];

    // Get all unique user IDs involved in these requests
    const userIds = new Set<string>();
    joinRequests.forEach((request) => {
      if (request.user_id) userIds.add(request.user_id);
      if (request.requested_by) userIds.add(request.requested_by);
      if (request.responded_by) userIds.add(request.responded_by);
    });

    // Fetch all profiles at once
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, institution')
      .in('id', Array.from(userIds));

    if (profilesError) throw profilesError;

    // Create a map for quick profile lookup
    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    // Map the join requests with profile data
    return joinRequests.map((request) => ({
      ...request,
      user: request.user_id ? profileMap.get(request.user_id) || null : null,
      requester: request.requested_by ? profileMap.get(request.requested_by) || null : null,
      responder: request.responded_by ? profileMap.get(request.responded_by) || null : null,
    }));
  } catch (error: any) {
    console.error('getTeamJoinRequests error:', error?.message || JSON.stringify(error, null, 2));
    return [];
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
      .select(
        `
        *,
        team:teams(name, workspace_id, avatar_color)
      `
      )
      .eq('user_id', userId)
      .order('requested_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: joinRequests, error } = await query;

    if (error) throw error;
    if (!joinRequests || joinRequests.length === 0) return [];

    // Get unique user IDs for profile lookups
    const userIds = new Set<string>();
    joinRequests.forEach((request) => {
      userIds.add(request.user_id);
      userIds.add(request.requested_by);
      if (request.responded_by) userIds.add(request.responded_by);
    });

    // Get profiles for all users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', Array.from(userIds));

    if (profilesError) throw profilesError;

    // Create a map for quick profile lookups
    const profileMap = new Map();
    profiles?.forEach((profile) => {
      profileMap.set(profile.id, profile);
    });

    // Combine the data
    const enrichedRequests = joinRequests.map((request) => ({
      ...request,
      user: profileMap.get(request.user_id) || null,
      requester: profileMap.get(request.requested_by) || null,
      responder: request.responded_by ? profileMap.get(request.responded_by) || null : null,
    }));

    return enrichedRequests;
  } catch (error: any) {
    console.error('getUserJoinRequests error:', error?.message || JSON.stringify(error, null, 2));
    return [];
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
      .select(
        `
        *,
        team:teams!inner(name, workspace_id, avatar_color)
      `
      )
      .eq('team.workspace_id', workspaceId)
      .order('requested_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: joinRequests, error } = await query;

    if (error) throw error;
    if (!joinRequests || joinRequests.length === 0) return [];

    // Get unique user IDs for profile lookups
    const userIds = new Set<string>();
    joinRequests.forEach((request) => {
      userIds.add(request.user_id);
      userIds.add(request.requested_by);
      if (request.responded_by) userIds.add(request.responded_by);
    });

    // Get profiles for all users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, institution')
      .in('id', Array.from(userIds));

    if (profilesError) throw profilesError;

    // Create a map for quick profile lookups
    const profileMap = new Map();
    profiles?.forEach((profile) => {
      profileMap.set(profile.id, profile);
    });

    // Combine the data
    const enrichedRequests = joinRequests.map((request) => ({
      ...request,
      user: profileMap.get(request.user_id) || null,
      requester: profileMap.get(request.requested_by) || null,
      responder: request.responded_by ? profileMap.get(request.responded_by) || null : null,
    }));

    return enrichedRequests;
  } catch (error: any) {
    console.error(
      'getWorkspaceJoinRequests error:',
      error?.message || JSON.stringify(error, null, 2)
    );
    return [];
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
        response_message: responseMessage || null,
      })
      .eq('id', requestId)
      .select(
        `
        *,
        team:teams(name, workspace_id),
        user:profiles!user_id(full_name, avatar_url)
      `
      )
      .single();

    if (error) throw error;

    // Log the action and create notification
    await Promise.all([
      // Log audit event
      logTeamAssignmentAudit(data.team_id, data.user_id, status, respondedBy, {
        request_id: requestId,
        response_message: responseMessage,
      }),
      // Create notification for the user
      createJoinRequestNotification(
        data.user_id,
        (data as any).team?.name || 'Unknown Team',
        respondedBy,
        status
      ),
    ]);

    return data;
  } catch (error: any) {
    console.error('respondToJoinRequest error:', error?.message || JSON.stringify(error, null, 2));
    throw error;
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
        response_message: 'Cancelled by user',
      })
      .eq('id', requestId)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .select(
        `
        *,
        team:teams(name, workspace_id)
      `
      )
      .single();

    if (error) throw error;

    // Log the action
    await logTeamAssignmentAudit(data.team_id, data.user_id, 'cancelled', userId, {
      request_id: requestId,
    });

    return data;
  } catch (error: any) {
    console.error('cancelJoinRequest error:', error?.message || JSON.stringify(error, null, 2));
    throw error;
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
      .select(
        `
        *,
        team_members(
          id,
          user_id,
          role,
          profile:profiles(full_name, avatar_url)
        )
      `
      )
      .eq('workspace_id', workspaceId)
      .eq('is_public', true);

    if (error) throw error;

    // Filter out teams the user is already a member of
    const availableTeams = (data || []).filter(
      (team) => !team.team_members.some((member: any) => member.user_id === userId)
    );

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
          .single();

        return {
          ...team,
          member_count: team.team_members.length,
          has_pending_request: !!pendingRequest,
          pending_request: pendingRequest,
          settings: team.settings || { allow_self_join: true, require_approval: true },
        };
      })
    );

    return teamsWithInfo;
  } catch (error: any) {
    console.error('getDiscoverableTeams error:', error?.message || JSON.stringify(error, null, 2));
    return [];
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
      .single();

    if (!team) {
      throw new Error('Team not found');
    }

    // Get current team members to check for duplicates
    const { data: currentMembers } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId);

    const currentMemberIds = new Set(currentMembers?.map((m) => m.user_id) || []);

    // Get pending requests to check for duplicates
    const { data: pendingRequests } = await supabase
      .from('team_join_requests')
      .select('user_id')
      .eq('team_id', teamId)
      .eq('status', 'pending');

    const pendingRequestIds = new Set(pendingRequests?.map((r) => r.user_id) || []);

    // Filter out users who are already members or have pending requests
    const validUserIds = userIds.filter((userId) => {
      if (currentMemberIds.has(userId)) {
        console.warn(`User ${userId} is already a member of team ${teamId}`);
        return false;
      }
      if (pendingRequestIds.has(userId)) {
        console.warn(`User ${userId} already has a pending request for team ${teamId}`);
        return false;
      }
      return true;
    });

    if (validUserIds.length === 0) {
      throw new Error(
        'No valid users to invite - all users are already members or have pending requests'
      );
    }

    // Check team capacity if max_members is set
    const teamSettings = (team as any).settings || {};
    if (teamSettings.max_members) {
      const currentMemberCount = currentMembers?.length || 0;
      const totalAfterInvites = currentMemberCount + validUserIds.length;

      if (totalAfterInvites > teamSettings.max_members) {
        throw new Error(
          `Team capacity exceeded. Current: ${currentMemberCount}, Max: ${teamSettings.max_members}, Trying to add: ${validUserIds.length}`
        );
      }
    }

    // Verify all users are workspace members
    const { data: workspaceMembers } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', (team as any).workspace_id)
      .in('user_id', validUserIds);

    const workspaceMemberIds = new Set(workspaceMembers?.map((m) => m.user_id) || []);
    const finalValidUserIds = validUserIds.filter((userId) => {
      if (!workspaceMemberIds.has(userId)) {
        console.warn(`User ${userId} is not a member of workspace ${(team as any).workspace_id}`);
        return false;
      }
      return true;
    });

    if (finalValidUserIds.length === 0) {
      throw new Error('No valid users to invite - users must be workspace members');
    }

    const invitations = finalValidUserIds.map((userId) => ({
      team_id: teamId,
      user_id: userId,
      requested_by: invitedBy,
      request_type: 'owner_invitation' as const,
      message: message || null,
    }));

    const { data, error } = await supabase.from('team_join_requests').insert(invitations).select(`
        *,
        team:teams(name, workspace_id),
        user:profiles!user_id(full_name, avatar_url)
      `);

    if (error) throw error;

    // Log all invitations and create notifications
    await Promise.all([
      // Log audit events
      ...(data || []).map((invitation) =>
        logTeamAssignmentAudit(
          invitation.team_id,
          invitation.user_id,
          'invitation_sent',
          invitedBy,
          { request_id: invitation.id, message, bulk_invite: true }
        )
      ),
      // Create notifications for invited users
      ...(data || []).map((invitation) => {
        const teamName = (invitation as any).team?.name || 'Unknown Team';
        return createTeamInvitationNotification(invitation.user_id, teamName, invitedBy);
      }),
    ]);

    return {
      successful: data || [],
      skipped: userIds.length - finalValidUserIds.length,
      total: userIds.length,
    };
  } catch (error: any) {
    console.error('bulkInviteToTeam error:', error?.message || JSON.stringify(error, null, 2));
    throw error;
  }
}

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
      .single();

    if (!team) {
      throw new Error('Team not found');
    }

    // Get current team members to check for duplicates
    const { data: currentMembers } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId);

    const currentMemberIds = new Set(currentMembers?.map((m) => m.user_id) || []);

    // Filter out users who are already members
    const validUserIds = userIds.filter((userId) => {
      if (currentMemberIds.has(userId)) {
        console.warn(`User ${userId} is already a member of team ${teamId}`);
        return false;
      }
      return true;
    });

    if (validUserIds.length === 0) {
      throw new Error('No valid users to add - all users are already members');
    }

    // Check team capacity if max_members is set
    const teamSettings = (team as any).settings || {};
    if (teamSettings.max_members) {
      const currentMemberCount = currentMembers?.length || 0;
      const totalAfterAdd = currentMemberCount + validUserIds.length;

      if (totalAfterAdd > teamSettings.max_members) {
        throw new Error(
          `Team capacity exceeded. Current: ${currentMemberCount}, Max: ${teamSettings.max_members}, Trying to add: ${validUserIds.length}`
        );
      }
    }

    // Verify all users are workspace members
    const { data: workspaceMembers } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', team.workspace_id)
      .in('user_id', validUserIds);

    const workspaceMemberIds = new Set(workspaceMembers?.map((m) => m.user_id) || []);
    const finalValidUserIds = validUserIds.filter((userId) => {
      if (!workspaceMemberIds.has(userId)) {
        console.warn(`User ${userId} is not a member of workspace ${team.workspace_id}`);
        return false;
      }
      return true;
    });

    if (finalValidUserIds.length === 0) {
      throw new Error('No valid users to add - users must be workspace members');
    }

    // Directly add members to the team
    const membersToAdd = finalValidUserIds.map((userId) => ({
      team_id: teamId,
      user_id: userId,
      role,
    }));

    const { data: addedMembers, error } = await supabase.from('team_members').insert(membersToAdd)
      .select(`
        *,
        user:profiles!user_id(id, full_name, avatar_url)
      `);

    if (error) throw error;

    // Log activity and create notifications for all added members
    await Promise.all([
      ...(addedMembers || []).map((member) =>
        logActivity({
          workspace_id: team.workspace_id,
          user_id: member.user_id,
          action_type: 'joined_team',
          entity_type: 'team',
          entity_id: teamId,
          metadata: { team_name: team.name, role },
        })
      ),
      ...(addedMembers || []).map((member) =>
        createTeamAssignmentNotification(member.user_id, team.name, assignedBy, role)
      ),
    ]);

    return {
      successful: addedMembers || [],
      skipped: userIds.length - finalValidUserIds.length,
      total: userIds.length,
    };
  } catch (error: any) {
    console.error('bulkAddTeamMembers error:', error?.message || JSON.stringify(error, null, 2));
    throw error;
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
    const { error } = await supabase.from('team_assignment_audit').insert({
      team_id: teamId,
      user_id: userId,
      action,
      performed_by: performedBy,
      details,
    });

    if (error) throw error;
  } catch (error: any) {
    console.error(
      'logTeamAssignmentAudit error:',
      error?.message || JSON.stringify(error, null, 2)
    );
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
      .select(
        `
        *,
        user:profiles!user_id(full_name, avatar_url),
        performer:profiles!performed_by(full_name, avatar_url),
        team:teams(name)
      `
      )
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error(
      'getTeamAssignmentAudit error:',
      error?.message || JSON.stringify(error, null, 2)
    );
    return [];
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
      .select(
        `
        *,
        user:profiles!user_id(full_name, avatar_url),
        performer:profiles!performed_by(full_name, avatar_url),
        team:teams!inner(name, workspace_id)
      `
      )
      .eq('team.workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error(
      'getWorkspaceAssignmentAudit error:',
      error?.message || JSON.stringify(error, null, 2)
    );
    return [];
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
    allow_self_join?: boolean;
    require_approval?: boolean;
    max_members?: number | null;
  },
  isPublic?: boolean
) {
  try {
    const updates: any = {};

    if (settings) {
      updates.settings = settings;
    }

    if (typeof isPublic === 'boolean') {
      updates.is_public = isPublic;
    }

    const { data, error } = await supabase
      .from('teams')
      .update(updates)
      .eq('id', teamId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('updateTeamSettings error:', error?.message || JSON.stringify(error, null, 2));
    throw error;
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
      .select(
        `
        *,
        team_members(
          id,
          user_id,
          role,
          joined_at,
          profile:profiles(full_name, avatar_url, institution)
        )
      `
      )
      .eq('id', teamId)
      .single();

    if (error) throw error;

    return {
      ...data,
      member_count: data.team_members.length,
      settings: data.settings || {
        allow_self_join: true,
        require_approval: true,
        max_members: null,
      },
    };
  } catch (error: any) {
    console.error('getTeamWithSettings error:', error?.message || JSON.stringify(error, null, 2));
    throw error;
  }
}
