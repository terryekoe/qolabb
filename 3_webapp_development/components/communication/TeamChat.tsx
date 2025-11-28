'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Edit2, Trash2, Reply, X, MessageSquare, MoreVertical } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';
import {
  getTeamChatMessages,
  sendTeamChatMessage,
  updateTeamChatMessage,
  deleteTeamChatMessage,
  markTeamChatMessagesAsRead,
  getTeamChatChannels,
  getOrCreateDefaultChannel,
  type TeamChatMessage,
  type TeamChatChannel,
} from '@/lib/db/queries';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from 'react-hot-toast';

interface TeamChatProps {
  teamId: string;
  userId: string;
}

export function TeamChat({ teamId, userId }: TeamChatProps) {
  const { user } = useAuth();
  const [channels, setChannels] = useState<TeamChatChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TeamChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<TeamChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<TeamChatMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadChannels();
  }, [teamId]);

  useEffect(() => {
    if (selectedChannelId || channels.length > 0) {
      loadMessages();
    }
  }, [teamId, selectedChannelId, channels.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!teamId || !selectedChannelId) return;

    // Subscribe to new messages
    const channel = supabase
      .channel(`team_chat_${teamId}_${selectedChannelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_chat_messages',
          filter: selectedChannelId ? `channel_id=eq.${selectedChannelId}` : `team_id=eq.${teamId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            loadMessages();
          } else if (payload.eventType === 'UPDATE') {
            loadMessages();
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, selectedChannelId]);

  const loadChannels = async () => {
    try {
      const fetchedChannels = await getTeamChatChannels(teamId);
      setChannels(fetchedChannels);

      // Select default channel or first channel
      if (fetchedChannels.length > 0) {
        const defaultChannel = fetchedChannels.find(c => c.is_default) || fetchedChannels[0];
        setSelectedChannelId(defaultChannel.id);
      } else {
        // No channels exist, try to create default
        const defaultChannel = await getOrCreateDefaultChannel(teamId);
        if (defaultChannel) {
          setChannels([defaultChannel]);
          setSelectedChannelId(defaultChannel.id);
        }
      }
    } catch (error: any) {
      console.error('Error loading channels:', error);
      toast.error('Failed to load channels');
    }
  };

  const loadMessages = async () => {
    if (!selectedChannelId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const fetchedMessages = await getTeamChatMessages(teamId, selectedChannelId, 100);
      setMessages(fetchedMessages);

      // Mark messages as read
      const unreadMessageIds = fetchedMessages
        .filter((m) => m.user_id !== userId)
        .map((m) => m.id);
      if (unreadMessageIds.length > 0) {
        await markTeamChatMessagesAsRead(unreadMessageIds, userId);
      }
    } catch (error: any) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !replyingTo) return;
    if (!selectedChannelId) {
      toast.error('Please select a channel');
      return;
    }

    setSubmitting(true);
    try {
      if (editingMessage) {
        await updateTeamChatMessage(editingMessage.id, userId, newMessage);
        setEditingMessage(null);
        toast.success('Message updated');
      } else {
        await sendTeamChatMessage(teamId, userId, newMessage, selectedChannelId, replyingTo?.id);
        setReplyingTo(null);
      }
      setNewMessage('');
      await loadMessages();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.message || 'Failed to send message');
    } finally {
      setSubmitting(false);
      messageInputRef.current?.focus();
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      await deleteTeamChatMessage(messageId, userId);
      toast.success('Message deleted');
      await loadMessages();
    } catch (error: any) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  const handleEditMessage = (message: TeamChatMessage) => {
    setEditingMessage(message);
    setNewMessage(message.message);
    setReplyingTo(null);
    messageInputRef.current?.focus();
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setReplyingTo(null);
    setNewMessage('');
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <MessageSquare size={20} className="text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Team Chat</h3>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!selectedChannelId ? (
          <div className="text-center py-8">
            <MessageSquare size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-gray-500 dark:text-gray-400">No channel selected</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              {channels.length === 0 ? 'No channels available. Contact your group leader.' : 'Please select a channel above.'}
            </p>
          </div>
        ) : loading && messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-gray-500 dark:text-gray-400">No messages yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Start the conversation!
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.user_id === userId;
            const showAvatar = !isOwnMessage || 
              (messages[messages.indexOf(message) - 1]?.user_id !== message.user_id);

            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-start gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
              >
                {showAvatar ? (
                  <Avatar
                    userId={message.user_id}
                    name={message.user?.full_name || 'Unknown'}
                    src={message.user?.avatar_url}
                    size="md"
                  />
                ) : (
                  <div className="w-10" /> // Spacer
                )}

                <div className={`flex-1 ${isOwnMessage ? 'flex flex-col items-end' : ''}`}>
                  {showAvatar && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {message.user?.full_name || 'Unknown'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTime(message.created_at)}
                      </span>
                    </div>
                  )}

                  {message.reply_to && (
                    <div className={`mb-1 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300 border-l-2 border-blue-500 ${isOwnMessage ? 'text-right' : ''}`}>
                      <div className="font-medium">{message.reply_to.user?.full_name || 'Unknown'}</div>
                      <div className="truncate">{message.reply_to.message}</div>
                    </div>
                  )}

                  <div className="group relative">
                    <div
                      className={`inline-block px-4 py-2 rounded-lg max-w-md ${
                        isOwnMessage
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
                      {message.is_edited && (
                        <p className="text-xs mt-1 opacity-70 italic">(edited)</p>
                      )}
                    </div>

                    {isOwnMessage && (
                      <div className="absolute -right-2 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white dark:bg-gray-800 rounded shadow-lg border border-gray-200 dark:border-gray-700 p-1">
                        <button
                          onClick={() => handleEditMessage(message)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          title="Edit"
                        >
                          <Edit2 size={14} className="text-gray-600 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleDeleteMessage(message.id)}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                          title="Delete"
                        >
                          <Trash2 size={14} className="text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    )}

                    {!isOwnMessage && (
                      <button
                        onClick={() => setReplyingTo(message)}
                        className="absolute -right-2 top-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        title="Reply"
                      >
                        <Reply size={14} className="text-gray-600 dark:text-gray-400" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Indicator */}
      {replyingTo && (
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Reply size={16} className="text-blue-600 dark:text-blue-400" />
            <span className="text-gray-700 dark:text-gray-300">
              Replying to <strong>{replyingTo.user?.full_name || 'Unknown'}</strong>
            </span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded"
          >
            <X size={16} className="text-blue-600 dark:text-blue-400" />
          </button>
        </div>
      )}

      {/* Edit Indicator */}
      {editingMessage && (
        <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-200 dark:border-yellow-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Edit2 size={16} className="text-yellow-600 dark:text-yellow-400" />
            <span className="text-gray-700 dark:text-gray-300">Editing message</span>
          </div>
          <button
            onClick={handleCancelEdit}
            className="p-1 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 rounded"
          >
            <X size={16} className="text-yellow-600 dark:text-yellow-400" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        {selectedChannelId ? (
          <>
            <div className="flex items-end gap-2">
              <textarea
                ref={messageInputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={editingMessage ? 'Edit your message...' : replyingTo ? 'Type a reply...' : 'Type a message...'}
                rows={1}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none"
                disabled={submitting}
              />
              <Button
                variant="primary"
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || submitting}
                className="flex items-center gap-2"
              >
                <Send size={18} />
                <span>{editingMessage ? 'Update' : 'Send'}</span>
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </>
        ) : (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
            Select a channel to start messaging
          </div>
        )}
      </div>
    </div>
  );
}
