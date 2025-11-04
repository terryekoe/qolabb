'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { getUnreadMotivationalMessageCount, getMotivationalMessages, markMotivationalMessageAsRead } from '@/lib/db/queries';
import { MotivationalMessageCard } from './MotivationalMessageCard';
import type { MotivationalMessage } from '@/lib/db/queries';

interface MotivationalMessageBannerProps {
  userId: string;
  sidebarCollapsed?: boolean;
}

export function MotivationalMessageBanner({ userId, sidebarCollapsed = false }: MotivationalMessageBannerProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [topMessage, setTopMessage] = useState<MotivationalMessage | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadMessages, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  const loadMessages = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    try {
      const [count, messages] = await Promise.all([
        getUnreadMotivationalMessageCount(userId).catch(() => 0),
        getMotivationalMessages(userId, { unreadOnly: true, limit: 1 }).catch(() => []),
      ]);

      setUnreadCount(count || 0);
      setTopMessage(messages[0] || null);
    } catch (error) {
      console.error('Error loading motivational messages:', error);
      // Set defaults on error
      setUnreadCount(0);
      setTopMessage(null);
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

  if (loading || !topMessage || unreadCount === 0) {
    return null;
  }

  return (
    <div 
      className="fixed top-16 right-0 z-40 px-4 sm:px-6 lg:px-8 pointer-events-none transition-all duration-300"
      style={{ 
        left: sidebarCollapsed ? '0' : '16rem',
      }}
    >
      <div className="max-w-7xl mx-auto">
        <AnimatePresence>
          {topMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="pointer-events-auto"
            >
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-4 mb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <Sparkles className="text-white mt-0.5 flex-shrink-0" size={20} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-white">
                          {topMessage.title}
                        </h4>
                        {unreadCount > 1 && (
                          <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs text-white">
                            +{unreadCount - 1} more
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-white/90 leading-relaxed">
                        {topMessage.message}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDismiss(topMessage.id)}
                    className="flex-shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors text-white"
                    aria-label="Dismiss"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
