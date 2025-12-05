'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle2 } from 'lucide-react';
import type { MotivationalMessage } from '@/lib/db';
import { markMotivationalMessageAsRead } from '@/lib/db';

interface MotivationalMessageCardProps {
  message: MotivationalMessage;
  onDismiss?: (messageId: string) => void;
  onRead?: (messageId: string) => void;
  showDismiss?: boolean;
}

export function MotivationalMessageCard({
  message,
  onDismiss,
  onRead,
  showDismiss = true,
}: MotivationalMessageCardProps) {
  const getPriorityColor = () => {
    switch (message.priority) {
      case 'high':
        return 'border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'medium':
        return 'border-l-4 border-l-green-500 bg-green-50 dark:bg-green-900/20';
      case 'low':
        return 'border-l-4 border-l-gray-400 bg-gray-50 dark:bg-gray-800';
      default:
        return 'border-l-4 border-l-gray-400 bg-white dark:bg-gray-800';
    }
  };

  const getTypeIcon = () => {
    switch (message.message_type) {
      case 'achievement':
        return '🏆';
      case 'encouragement':
        return '💙';
      case 'teamwork':
        return '🤝';
      case 'improvement':
        return '📈';
      case 'consistency':
        return '💪';
      case 'leadership':
        return '👑';
      default:
        return message.emoji || '✨';
    }
  };

  const handleRead = async () => {
    if (!message.is_read) {
      await markMotivationalMessageAsRead(message.id, message.user_id);
      onRead?.(message.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`rounded-lg p-4 shadow-sm hover:shadow-md transition-all ${
        message.is_read ? 'bg-gray-50 dark:bg-gray-800/50 opacity-75' : getPriorityColor()
      } border border-gray-200 dark:border-gray-700`}
      onClick={handleRead}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          {/* Emoji/Icon */}
          <div className="text-2xl flex-shrink-0">{getTypeIcon()}</div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4
              className={`font-semibold text-gray-900 dark:text-gray-100 mb-1 ${
                message.is_read ? 'line-through' : ''
              }`}
            >
              {message.title}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {message.message}
            </p>

            {/* Metadata */}
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-500">
              <span className="capitalize">{message.message_type}</span>
              <span>•</span>
              <span>{new Date(message.sent_at).toLocaleDateString()}</span>
              {message.is_read && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <CheckCircle2 size={12} />
                    Read
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Dismiss Button */}
        {showDismiss && onDismiss && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(message.id);
            }}
            className="flex-shrink-0 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Dismiss message"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
