// =====================================================
// Communication Database Functions
// Team Chat, Project Discussions, Direct Messaging
// =====================================================

import { supabase } from '../supabase';

// =====================================================
// TYPES - Team Chat
// =====================================================

export interface TeamChatChannel {
  id: string;
  team_id: string;
  name: string;
  description?: string;
  is_default: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface TeamChatMessage {
  id: string;
  channel_id?: string;
  team_id: string;
  user_id: string;
  message: string;
  created_at: string;
  updated_at: string;
  edited_at?: string;
  is_edited?: boolean;
  reply_to_id?: string;
  attachments?: any[];
  metadata?: Record<string, any>;
  user?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  reply_to?: TeamChatMessage;
}

// =====================================================
// TYPES - Project Discussions
// =====================================================

export interface ProjectDiscussion {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
  tags?: string[];
  metadata?: Record<string, any>;
  user?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  comment_count?: number;
}

export interface ProjectDiscussionComment {
  id: string;
  discussion_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  edited_at?: string;
  is_edited: boolean;
  parent_comment_id?: string;
  metadata?: Record<string, any>;
  user?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  replies?: ProjectDiscussionComment[];
}

// =====================================================
// TYPES - Direct Messaging
// =====================================================

export interface DirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  updated_at: string;
  reply_to_id?: string;
  attachments?: any[];
  metadata?: Record<string, any>;
  sender?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  recipient?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  reply_to?: DirectMessage;
}

export interface Conversation {
  other_user: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  last_message?: DirectMessage;
  unread_count: number;
}

// =====================================================
// TEAM CHAT FUNCTIONS
// =====================================================

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
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as TeamChatChannel[];
  } catch (error: any) {
    console.error('getTeamChatChannels error:', error?.message || JSON.stringify(error, null, 2));
    return [];
  }
}

/**
 * Get default channel for a team (or create it if it doesn't exist)
 * @param teamId - Team ID
 * @returns Default channel or null
 */
export async function getOrCreateDefaultChannel(teamId: string): Promise<TeamChatChannel | null> {
  try {
    const { data: existing, error: fetchError } = await supabase
      .from('team_chat_channels')
      .select('*')
      .eq('team_id', teamId)
      .eq('is_default', true)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

    if (existing) {
      return existing as TeamChatChannel;
    }

    const { data: created, error: createError } = await supabase
      .from('team_chat_channels')
      .insert({
        team_id: teamId,
        name: 'general',
        description: 'General team discussion',
        is_default: true,
      })
      .select('*')
      .single();

    if (createError) {
      console.warn('Could not create default channel:', createError.message);
      return null;
    }

    return created as TeamChatChannel;
  } catch (error: any) {
    console.error(
      'getOrCreateDefaultChannel error:',
      error?.message || JSON.stringify(error, null, 2)
    );
    return null;
  }
}

// Helper function to enrich team chat messages with profile data
async function enrichTeamChatMessages(messages: any[]): Promise<TeamChatMessage[]> {
  if (!messages || messages.length === 0) {
    return [];
  }

  const userIds = new Set<string>();
  messages.forEach((msg: any) => {
    if (msg.user_id) userIds.add(msg.user_id);
    if (msg.reply_to_id) {
      const replyToMsg = messages.find((m: any) => m.id === msg.reply_to_id);
      if (replyToMsg?.user_id) userIds.add(replyToMsg.user_id);
    }
  });

  const profilesMap = new Map<string, any>();
  if (userIds.size > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', Array.from(userIds));

    if (profiles) {
      profiles.forEach((profile: any) => {
        profilesMap.set(profile.id, profile);
      });
    }
  }

  return messages
    .map((msg: any) => {
      const profile = profilesMap.get(msg.user_id);
      const enrichedMsg: any = {
        ...msg,
        user: profile
          ? {
              id: profile.id,
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
            }
          : null,
      };

      if (msg.reply_to_id) {
        const replyToMsg = messages.find((m: any) => m.id === msg.reply_to_id);
        if (replyToMsg) {
          const replyToProfile = profilesMap.get(replyToMsg.user_id);
          enrichedMsg.reply_to = {
            id: replyToMsg.id,
            message: replyToMsg.message,
            user_id: replyToMsg.user_id,
            user: replyToProfile
              ? {
                  id: replyToProfile.id,
                  full_name: replyToProfile.full_name,
                  avatar_url: replyToProfile.avatar_url,
                }
              : null,
          };
        }
      }

      return enrichedMsg;
    })
    .reverse() as TeamChatMessage[];
}

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
    let query = supabase
      .from('team_chat_messages')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (channelId) {
      query = query.eq('channel_id', channelId);
    }

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data, error } = await query;

    if (error) {
      if (error.message?.includes('column') && error.message?.includes('channel_id')) {
        let fallbackQuery = supabase
          .from('team_chat_messages')
          .select('*')
          .eq('team_id', teamId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (before) {
          fallbackQuery = fallbackQuery.lt('created_at', before);
        }

        const { data: fallbackData, error: fallbackError } = await fallbackQuery;
        if (fallbackError) throw fallbackError;

        return await enrichTeamChatMessages(fallbackData || []);
      }
      throw error;
    }

    return await enrichTeamChatMessages(data || []);
  } catch (error: any) {
    console.error('getTeamChatMessages error:', error?.message || JSON.stringify(error, null, 2));
    return [];
  }
}

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
    const insertData: any = {
      team_id: teamId,
      user_id: userId,
      message: message.trim(),
      reply_to_id: replyToId || null,
    };

    if (attachments) {
      insertData.attachments = attachments;
    }

    let { data, error } = await supabase
      .from('team_chat_messages')
      .insert(insertData)
      .select('*')
      .single();

    if (error && error.message?.includes('channel_id')) {
      if (channelId) {
        insertData.channel_id = channelId;
      } else {
        const defaultChannel = await getOrCreateDefaultChannel(teamId);
        if (defaultChannel) {
          insertData.channel_id = defaultChannel.id;
        } else {
          throw new Error(
            'No channel available. Please contact your group leader to create a channel.'
          );
        }
      }

      const retryResult = await supabase
        .from('team_chat_messages')
        .insert(insertData)
        .select('*')
        .single();

      if (retryResult.error) throw retryResult.error;
      data = retryResult.data;
    } else if (error) {
      throw error;
    }

    if (!data) return null;

    const enriched = await enrichTeamChatMessages([data]);
    return enriched[0] || null;
  } catch (error: any) {
    console.error('sendTeamChatMessage error:', error?.message || JSON.stringify(error, null, 2));
    throw error;
  }
}

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
    const { data, error } = await supabase
      .from('team_chat_messages')
      .update({
        message: newMessage.trim(),
      })
      .eq('id', messageId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) throw error;
    if (!data) return null;

    const enriched = await enrichTeamChatMessages([data]);
    return enriched[0] || null;
  } catch (error: any) {
    console.error('updateTeamChatMessage error:', error?.message || JSON.stringify(error, null, 2));
    throw error;
  }
}

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
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error: any) {
    console.error('deleteTeamChatMessage error:', error?.message || JSON.stringify(error, null, 2));
    throw error;
  }
}

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
    if (messageIds.length === 0) return;

    const readStatuses = messageIds.map((messageId) => ({
      message_id: messageId,
      user_id: userId,
    }));

    const { error } = await supabase
      .from('team_chat_read_status')
      .upsert(readStatuses, { onConflict: 'message_id,user_id' });

    if (error) throw error;
  } catch (error: any) {
    console.error(
      'markTeamChatMessagesAsRead error:',
      error?.message || JSON.stringify(error, null, 2)
    );
  }
}

// =====================================================
// PROJECT DISCUSSION FUNCTIONS
// =====================================================

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
    const { data: discussions, error: discussionsError } = await supabase
      .from('project_discussions')
      .select('*')
      .eq('project_id', projectId)
      .order('is_pinned', { ascending: false })
      .order('last_activity_at', { ascending: false })
      .limit(limit);

    if (discussionsError) throw discussionsError;

    if (!discussions || discussions.length === 0) {
      return [];
    }

    const userIds = [...new Set(discussions.map((d: any) => d.user_id).filter(Boolean))];

    const profilesMap = new Map<string, any>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profiles) {
        profiles.forEach((profile: any) => {
          profilesMap.set(profile.id, profile);
        });
      }
    }

    const discussionIds = discussions.map((d: any) => d.id);
    const { data: commentCounts } = await supabase
      .from('project_discussion_comments')
      .select('discussion_id')
      .in('discussion_id', discussionIds);

    const countsMap = new Map<string, number>();
    if (commentCounts) {
      commentCounts.forEach((cc: any) => {
        countsMap.set(cc.discussion_id, (countsMap.get(cc.discussion_id) || 0) + 1);
      });
    }

    return discussions.map((discussion: any) => {
      const profile = profilesMap.get(discussion.user_id);
      return {
        ...discussion,
        user: profile
          ? {
              id: profile.id,
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
            }
          : null,
        comment_count: countsMap.get(discussion.id) || 0,
      };
    }) as ProjectDiscussion[];
  } catch (error: any) {
    console.error('getProjectDiscussions error:', error?.message || JSON.stringify(error, null, 2));
    return [];
  }
}

/**
 * Get a single project discussion with comments
 * @param discussionId - Discussion ID
 * @returns Discussion object and list of comments (threaded)
 */
export async function getProjectDiscussion(
  discussionId: string
): Promise<{ discussion: ProjectDiscussion | null; comments: ProjectDiscussionComment[] }> {
  try {
    const { data: discussion, error: discussionError } = await supabase
      .from('project_discussions')
      .select('*')
      .eq('id', discussionId)
      .single();

    if (discussionError) throw discussionError;

    const { data: comments, error: commentsError } = await supabase
      .from('project_discussion_comments')
      .select('*')
      .eq('discussion_id', discussionId)
      .order('created_at', { ascending: true });

    if (commentsError) throw commentsError;

    const userIds = new Set<string>();
    if (discussion?.user_id) userIds.add(discussion.user_id);
    if (comments) {
      comments.forEach((c: any) => {
        if (c.user_id) userIds.add(c.user_id);
      });
    }

    const profilesMap = new Map<string, any>();
    if (userIds.size > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', Array.from(userIds));

      if (profiles) {
        profiles.forEach((profile: any) => {
          profilesMap.set(profile.id, profile);
        });
      }
    }

    const enrichedDiscussion = discussion
      ? {
          ...discussion,
          user: (() => {
            const profile = profilesMap.get(discussion.user_id);
            return profile
              ? {
                  id: profile.id,
                  full_name: profile.full_name,
                  avatar_url: profile.avatar_url,
                }
              : null;
          })(),
        }
      : null;

    const commentsMap = new Map<string, ProjectDiscussionComment>();
    const rootComments: ProjectDiscussionComment[] = [];

    (comments || []).forEach((comment: any) => {
      const profile = profilesMap.get(comment.user_id);
      const commentObj = {
        ...comment,
        user: profile
          ? {
              id: profile.id,
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
            }
          : null,
        replies: [],
      } as ProjectDiscussionComment;
      commentsMap.set(comment.id, commentObj);

      if (comment.parent_comment_id) {
        const parent = commentsMap.get(comment.parent_comment_id);
        if (parent) {
          if (!parent.replies) parent.replies = [];
          parent.replies.push(commentObj);
        }
      } else {
        rootComments.push(commentObj);
      }
    });

    return {
      discussion: enrichedDiscussion as ProjectDiscussion | null,
      comments: rootComments,
    };
  } catch (error: any) {
    console.error('getProjectDiscussion error:', error?.message || JSON.stringify(error, null, 2));
    return { discussion: null, comments: [] };
  }
}

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
      .single();

    if (error) throw error;
    if (!data) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', userId)
      .single();

    return {
      ...data,
      user: profile
        ? {
            id: profile.id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
          }
        : null,
      comment_count: 0,
    } as ProjectDiscussion;
  } catch (error: any) {
    console.error(
      'createProjectDiscussion error:',
      error?.message || JSON.stringify(error, null, 2)
    );
    throw error;
  }
}

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
    const { data, error } = await supabase
      .from('project_discussion_comments')
      .insert({
        discussion_id: discussionId,
        user_id: userId,
        content: content.trim(),
        parent_comment_id: parentCommentId || null,
      })
      .select('*')
      .single();

    if (error) throw error;
    if (!data) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', userId)
      .single();

    return {
      ...data,
      user: profile
        ? {
            id: profile.id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
          }
        : null,
      replies: [],
    } as ProjectDiscussionComment;
  } catch (error: any) {
    console.error(
      'addProjectDiscussionComment error:',
      error?.message || JSON.stringify(error, null, 2)
    );
    throw error;
  }
}

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
  updates: {
    title?: string;
    content?: string;
    tags?: string[];
    is_pinned?: boolean;
    is_locked?: boolean;
  }
): Promise<ProjectDiscussion | null> {
  try {
    const { data, error } = await supabase
      .from('project_discussions')
      .update(updates)
      .eq('id', discussionId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) throw error;
    if (!data) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', userId)
      .single();

    const { data: comments } = await supabase
      .from('project_discussion_comments')
      .select('id')
      .eq('discussion_id', discussionId);

    return {
      ...data,
      user: profile
        ? {
            id: profile.id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
          }
        : null,
      comment_count: comments?.length || 0,
    } as ProjectDiscussion;
  } catch (error: any) {
    console.error(
      'updateProjectDiscussion error:',
      error?.message || JSON.stringify(error, null, 2)
    );
    throw error;
  }
}

/**
 * Delete a project discussion
 * @param discussionId - Discussion ID
 * @param userId - User ID (must match creator)
 * @returns True if successful
 */
export async function deleteProjectDiscussion(
  discussionId: string,
  userId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('project_discussions')
      .delete()
      .eq('id', discussionId)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error: any) {
    console.error(
      'deleteProjectDiscussion error:',
      error?.message || JSON.stringify(error, null, 2)
    );
    throw error;
  }
}

// =====================================================
// DIRECT MESSAGING FUNCTIONS
// =====================================================

/**
 * Get conversations for a user (list of people they've messaged or been messaged by)
 * @param userId - User ID
 * @returns List of conversations sorted by latest message
 */
export async function getDirectMessageConversations(userId: string): Promise<Conversation[]> {
  try {
    const { data: messages, error } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!messages || messages.length === 0) return [];

    const userIds = new Set<string>();
    messages.forEach((message: any) => {
      userIds.add(message.sender_id);
      userIds.add(message.recipient_id);
    });

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', Array.from(userIds));

    if (profilesError) throw profilesError;

    const profileMap = new Map<string, any>();
    profiles?.forEach((profile) => {
      profileMap.set(profile.id, profile);
    });

    const conversationsMap = new Map<string, Conversation>();

    messages.forEach((message: any) => {
      const otherUserId = message.sender_id === userId ? message.recipient_id : message.sender_id;
      const otherUser = profileMap.get(otherUserId) || null;

      if (!conversationsMap.has(otherUserId)) {
        conversationsMap.set(otherUserId, {
          other_user: otherUser,
          unread_count: 0,
        });
      }

      const conversation = conversationsMap.get(otherUserId)!;
      if (!conversation.last_message) {
        conversation.last_message = {
          ...message,
          sender: profileMap.get(message.sender_id) || null,
          recipient: profileMap.get(message.recipient_id) || null,
        } as DirectMessage;
      }
      if (message.recipient_id === userId && !message.is_read) {
        conversation.unread_count++;
      }
    });

    return Array.from(conversationsMap.values()).sort((a, b) => {
      const aTime = a.last_message?.created_at || '';
      const bTime = b.last_message?.created_at || '';
      return bTime.localeCompare(aTime);
    });
  } catch (error: any) {
    console.error(
      'getDirectMessageConversations error:',
      error?.message || JSON.stringify(error, null, 2)
    );
    return [];
  }
}

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
      .or(
        `and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: messages, error } = await query;

    if (error) throw error;

    if (!messages || messages.length === 0) return [];

    const userIds = new Set<string>();
    messages.forEach((message: any) => {
      userIds.add(message.sender_id);
      userIds.add(message.recipient_id);
    });

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', Array.from(userIds));

    if (profilesError) throw profilesError;

    const profileMap = new Map<string, any>();
    profiles?.forEach((profile) => {
      profileMap.set(profile.id, profile);
    });

    const replyToIds = messages.filter((m) => m.reply_to_id).map((m) => m.reply_to_id);
    let replyToMessages: any[] = [];
    if (replyToIds.length > 0) {
      const { data: replyMessages, error: replyError } = await supabase
        .from('direct_messages')
        .select('*')
        .in('id', replyToIds);

      if (!replyError && replyMessages) {
        replyToMessages = replyMessages;
        replyMessages.forEach((reply: any) => {
          userIds.add(reply.sender_id);
        });

        const existingProfileIds = new Set(profiles?.map((p) => p.id) || []);
        const additionalUserIds = Array.from(userIds).filter((id) => !existingProfileIds.has(id));
        if (additionalUserIds.length > 0) {
          const { data: additionalProfiles } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', additionalUserIds);

          additionalProfiles?.forEach((profile) => {
            profileMap.set(profile.id, profile);
          });
        }
      }
    }

    const enrichedMessages = messages.map((message: any) => {
      const replyTo = replyToMessages.find((r) => r.id === message.reply_to_id);
      return {
        ...message,
        sender: profileMap.get(message.sender_id) || null,
        recipient: profileMap.get(message.recipient_id) || null,
        reply_to: replyTo
          ? {
              ...replyTo,
              sender: profileMap.get(replyTo.sender_id) || null,
            }
          : null,
      } as DirectMessage;
    });

    return enrichedMessages.reverse() as DirectMessage[];
  } catch (error: any) {
    console.error('getDirectMessages error:', error?.message || JSON.stringify(error, null, 2));
    return [];
  }
}

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
      .select(
        `
        *,
        sender:profiles!sender_id(id, full_name, avatar_url),
        recipient:profiles!recipient_id(id, full_name, avatar_url),
        reply_to:direct_messages!reply_to_id(id, message, sender_id, sender:profiles!sender_id(id, full_name, avatar_url))
      `
      )
      .single();

    if (error) throw error;
    return data as DirectMessage;
  } catch (error: any) {
    console.error('sendDirectMessage error:', error?.message || JSON.stringify(error, null, 2));
    throw error;
  }
}

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
    if (messageIds.length === 0) return;

    const { error } = await supabase
      .from('direct_messages')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .in('id', messageIds)
      .eq('recipient_id', userId)
      .eq('is_read', false);

    if (error) throw error;
  } catch (error: any) {
    console.error(
      'markDirectMessagesAsRead error:',
      error?.message || JSON.stringify(error, null, 2)
    );
  }
}

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
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  } catch (error: any) {
    console.error(
      'getUnreadDirectMessageCount error:',
      error?.message || JSON.stringify(error, null, 2)
    );
    return 0;
  }
}
