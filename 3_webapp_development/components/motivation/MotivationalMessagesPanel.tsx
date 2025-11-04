'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Filter, CheckCircle2 } from 'lucide-react';
import {
  getMotivationalMessages,
  markAllMotivationalMessagesAsRead,
  markMotivationalMessageAsRead,
} from '@/lib/db/queries';
import { MotivationalMessageCard } from './MotivationalMessageCard';
import type { MotivationalMessage } from '@/lib/db/queries';
import { Button } from '@/components/Button';

interface MotivationalMessagesPanelProps {
  userId: string;
  onClose: () => void;
}

export function MotivationalMessagesPanel({ userId, onClose }: MotivationalMessagesPanelProps) {
  const [messages, setMessages] = useState<MotivationalMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | MotivationalMessage['message_type']>('all');

  useEffect(() => {
    loadMessages();
  }, [userId, filter]);

  const loadMessages = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const options: any = {};
      if (filter === 'unread') {
        options.unreadOnly = true;
      } else if (filter !== 'all') {
        options.messageType = filter;
      }
      const data = await getMotivationalMessages(userId, options);
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading motivational messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (messageId: string) => {
    await markMotivationalMessageAsRead(messageId, userId);
    await loadMessages();
  };

  const handleRead = async (messageId: string) => {
    await loadMessages();
  };

  const handleMarkAllAsRead = async () => {
    await markAllMotivationalMessagesAsRead(userId);
    await loadMessages();
  };

  const unreadCount = messages.filter((m) => !m.is_read).length;

  const messageTypes: Array<{ value: typeof filter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'unread', label: 'Unread' },
    { value: 'achievement', label: 'Achievements' },
    { value: 'encouragement', label: 'Encouragement' },
    { value: 'teamwork', label: 'Teamwork' },
    { value: 'improvement', label: 'Improvement' },
    { value: 'consistency', label: 'Consistency' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-gray-200 dark:border-gray-700"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Sparkles className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Motivational Messages
              </h2>
              {unreadCount > 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {unreadCount} unread {unreadCount === 1 ? 'message' : 'messages'}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-sm"
              >
                <CheckCircle2 size={16} className="mr-1" />
                Mark all read
              </Button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 pt-4 pb-2 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <Filter size={16} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
            {messageTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setFilter(type.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  filter === type.value
                    ? 'bg-blue-500 text-white dark:bg-blue-600'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="text-gray-300 dark:text-gray-600 mx-auto mb-4" size={48} />
              <p className="text-gray-500 dark:text-gray-400">
                {filter === 'unread'
                  ? 'No unread messages'
                  : filter !== 'all'
                    ? `No ${filter} messages`
                    : 'No motivational messages yet'}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Keep working to receive encouraging messages!
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {messages.map((message) => (
                <MotivationalMessageCard
                  key={message.id}
                  message={message}
                  onDismiss={handleDismiss}
                  onRead={handleRead}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </div>
  );
}
