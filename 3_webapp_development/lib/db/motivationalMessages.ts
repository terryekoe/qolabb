// =====================================================
// Motivational Messages Database Functions
// Functions for sending and managing motivational messages
// =====================================================

import { supabase } from '../supabase';

// =====================================================
// TYPES
// =====================================================

export interface MotivationalMessage {
  id: string;
  user_id: string;
  workspace_id?: string;
  team_id?: string;
  message_type:
    | 'achievement'
    | 'milestone'
    | 'encouragement'
    | 'participation'
    | 'teamwork'
    | 'improvement'
    | 'consistency'
    | 'leadership'
    | 'support';
  title: string;
  message: string;
  emoji?: string;
  trigger_event?: string;
  trigger_data?: Record<string, any>;
  delivery_method: 'in_app' | 'notification' | 'email' | 'all';
  sent_at: string;
  read_at?: string;
  is_read: boolean;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
}

// =====================================================
// FUNCTIONS
// =====================================================

/**
 * Send a motivational message to a user
 * Uses RPC function send_motivational_message
 * @param params - Message parameters including type, content, and triggers
 * @returns Message ID or null
 */
export async function sendMotivationalMessage(params: {
  userId: string;
  messageType: MotivationalMessage['message_type'];
  title: string;
  message: string;
  emoji?: string;
  triggerEvent?: string;
  triggerData?: Record<string, any>;
  priority?: 'low' | 'medium' | 'high';
  workspaceId?: string;
  teamId?: string;
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
    });

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error(
      'sendMotivationalMessage error:',
      error?.message || JSON.stringify(error, null, 2)
    );
    return null;
  }
}

/**
 * Get motivational messages for a user
 * @param userId - User ID
 * @param options - Filtering and pagination options
 * @returns List of motivational messages
 */
export async function getMotivationalMessages(
  userId: string,
  options?: {
    unreadOnly?: boolean;
    limit?: number;
    messageType?: MotivationalMessage['message_type'];
  }
) {
  try {
    let query = supabase
      .from('motivational_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (options?.unreadOnly) {
      query = query.eq('is_read', false);
    }

    if (options?.messageType) {
      query = query.eq('message_type', options.messageType);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      // If table doesn't exist yet (migration not run), return empty array
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('Motivational messages table not found. Migration may not have been run.');
        return [];
      }
      throw error;
    }
    return data as MotivationalMessage[];
  } catch (error: any) {
    // Handle network errors gracefully
    if (error?.message?.includes('Failed to fetch') || error?.name === 'TypeError') {
      console.warn('Network error fetching motivational messages:', error);
      return [];
    }
    console.error(
      'getMotivationalMessages error:',
      error?.message || JSON.stringify(error, null, 2)
    );
    return [];
  }
}

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
      .eq('is_read', false);

    if (error) {
      // If table doesn't exist yet (migration not run), return 0
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('Motivational messages table not found. Migration may not have been run.');
        return 0;
      }
      throw error;
    }
    return count || 0;
  } catch (error: any) {
    // Handle network errors gracefully
    if (error?.message?.includes('Failed to fetch') || error?.name === 'TypeError') {
      console.warn('Network error fetching motivational message count:', error);
      return 0;
    }
    console.error(
      'getUnreadMotivationalMessageCount error:',
      error?.message || JSON.stringify(error, null, 2)
    );
    return 0;
  }
}

/**
 * Mark motivational message as read
 * @param messageId - Message ID
 * @param userId - User ID
 * @returns True if successful
 */
export async function markMotivationalMessageAsRead(
  messageId: string,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('mark_motivational_message_read', {
      p_message_id: messageId,
      p_user_id: userId,
    });

    if (error) throw error;
    return data || false;
  } catch (error: any) {
    console.error(
      'markMotivationalMessageAsRead error:',
      error?.message || JSON.stringify(error, null, 2)
    );
    return false;
  }
}

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
      .eq('is_read', false);

    if (error) throw error;
  } catch (error: any) {
    console.error(
      'markAllMotivationalMessagesAsRead error:',
      error?.message || JSON.stringify(error, null, 2)
    );
  }
}
