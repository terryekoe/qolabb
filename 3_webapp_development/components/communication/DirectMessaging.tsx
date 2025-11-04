'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Search, Reply, X, MessageSquare, User } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';
import {
  getDirectMessageConversations,
  getDirectMessages,
  sendDirectMessage,
  markDirectMessagesAsRead,
  getUnreadDirectMessageCount,
  type Conversation,
  type DirectMessage,
} from '@/lib/db/queries';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from 'react-hot-toast';

interface DirectMessagingProps {
  userId: string;
}

export function DirectMessaging({ userId }: DirectMessagingProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<DirectMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadConversations();
    loadUnreadCount();
  }, [userId]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages();
    }
  }, [selectedConversation, userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!selectedConversation) return;

    // Subscribe to new messages in this conversation
    const channel = supabase
      .channel(`direct_messages_${selectedConversation}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'direct_messages',
          filter: `or(and(sender_id.eq.${userId},recipient_id.eq.${selectedConversation}),and(sender_id.eq.${selectedConversation},recipient_id.eq.${userId}))`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            loadMessages();
            loadConversations();
          } else if (payload.eventType === 'UPDATE') {
            loadMessages();
            loadConversations();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation, userId]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const fetchedConversations = await getDirectMessageConversations(userId);
      setConversations(fetchedConversations);
    } catch (error: any) {
      console.error('Error loading conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!selectedConversation) return;

    try {
      const fetchedMessages = await getDirectMessages(userId, selectedConversation, 100);
      setMessages(fetchedMessages);

      // Mark messages as read
      const unreadMessageIds = fetchedMessages
        .filter((m) => m.recipient_id === userId && !m.is_read)
        .map((m) => m.id);
      if (unreadMessageIds.length > 0) {
        await markDirectMessagesAsRead(unreadMessageIds, userId);
        await loadConversations(); // Refresh unread counts
      }
    } catch (error: any) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const loadUnreadCount = async () => {
    try {
      const count = await getUnreadDirectMessageCount(userId);
      // You could use this to show a badge in the UI
    } catch (error: any) {
      console.error('Error loading unread count:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    setSubmitting(true);
    try {
      await sendDirectMessage(userId, selectedConversation, newMessage, replyingTo?.id);
      setNewMessage('');
      setReplyingTo(null);
      await loadMessages();
      await loadConversations();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSubmitting(false);
      messageInputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
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

  const filteredConversations = conversations.filter((conv) =>
    conv.other_user.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedConv = conversations.find((c) => c.other_user.id === selectedConversation);

  return (
    <div className="flex h-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Conversations List */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare size={20} className="text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Messages</h3>
          </div>
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Loading conversations...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-8 px-4">
              <MessageSquare size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery ? 'No conversations found' : 'No messages yet'}
              </p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <motion.div
                key={conversation.other_user.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setSelectedConversation(conversation.other_user.id)}
                className={`p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                  selectedConversation === conversation.other_user.id
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <Avatar
                    userId={conversation.other_user.id}
                    name={conversation.other_user.full_name}
                    src={conversation.other_user.avatar_url}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {conversation.other_user.full_name}
                      </span>
                      {conversation.unread_count > 0 && (
                        <span className="flex-shrink-0 ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded-full">
                          {conversation.unread_count}
                        </span>
                      )}
                    </div>
                    {conversation.last_message && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {conversation.last_message.message}
                      </p>
                    )}
                    {conversation.last_message && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {formatTime(conversation.last_message.created_at)}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Messages View */}
      <div className="flex-1 flex flex-col">
        {selectedConversation && selectedConv ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Avatar
                  userId={selectedConv.other_user.id}
                  name={selectedConv.other_user.full_name}
                  src={selectedConv.other_user.avatar_url}
                  size="md"
                />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {selectedConv.other_user.full_name}
                  </h3>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((message) => {
                  const isOwnMessage = message.sender_id === userId;
                  const showAvatar = !isOwnMessage ||
                    (messages[messages.indexOf(message) - 1]?.sender_id !== message.sender_id);

                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex items-start gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                    >
                      {showAvatar ? (
                        <Avatar
                          userId={message.sender_id}
                          name={message.sender?.full_name || message.recipient?.full_name || 'Unknown'}
                          src={message.sender?.avatar_url || message.recipient?.avatar_url}
                          size="md"
                        />
                      ) : (
                        <div className="w-10" />
                      )}

                      <div className={`flex-1 ${isOwnMessage ? 'flex flex-col items-end' : ''}`}>
                        {showAvatar && (
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {message.sender?.full_name || message.recipient?.full_name || 'Unknown'}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatTime(message.created_at)}
                            </span>
                          </div>
                        )}

                        {message.reply_to && (
                          <div
                            className={`mb-1 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300 border-l-2 border-blue-500 ${
                              isOwnMessage ? 'text-right' : ''
                            }`}
                          >
                            <div className="font-medium">
                              {message.reply_to.sender?.full_name || 'Unknown'}
                            </div>
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
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {message.message}
                            </p>
                          </div>

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
                    Replying to <strong>{replyingTo.sender?.full_name || 'Unknown'}</strong>
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

            {/* Input */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-end gap-2">
                <textarea
                  ref={messageInputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={replyingTo ? 'Type a reply...' : 'Type a message...'}
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
                  <span>Send</span>
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Select a conversation
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Choose a conversation from the list to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
