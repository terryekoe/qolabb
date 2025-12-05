// =====================================================
// Activity Log Database Functions
// Functions for logging and retrieving workspace activity
// =====================================================

import { supabase } from '../supabase';
import type { ActivityLogInsert } from '../types/database';

/**
 * Log an activity in the workspace
 * @param activity - Activity data to insert
 */
export async function logActivity(activity: ActivityLogInsert) {
  const { error } = await supabase.from('activity_log').insert(activity as any);

  if (error) console.error('Failed to log activity:', error);
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
    }

    // Fetch activity log with user profile data using direct query
    let query = supabase
      .from('activity_log')
      .select(
        `
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
      `
      )
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit);

    // If userId is provided, check if we need to filter by team visibility
    if (userId) {
      // Check if user is instructor/admin
      const { data: member } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .single();

      const isInstructor = member?.role === 'instructor' || member?.role === 'admin';

      if (!isInstructor) {
        // For students, only show activity from their teammates (and themselves)
        // 1. Get user's team IDs in this workspace
        const { data: myTeams } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', userId);

        const teamIds = myTeams?.map((t) => t.team_id) || [];

        if (teamIds.length > 0) {
          // 2. Get all members of these teams
          const { data: teammates } = await supabase
            .from('team_members')
            .select('user_id')
            .in('team_id', teamIds);

          const teammateIds = teammates?.map((t) => t.user_id) || [];
          // Ensure user sees their own activity too
          if (!teammateIds.includes(userId)) teammateIds.push(userId);

          // Filter activity by these users
          query = query.in('user_id', teammateIds);
        } else {
          // User has no teams, only show their own activity
          query = query.eq('user_id', userId);
        }
      }
    }

    const { data, error } = await query;

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
