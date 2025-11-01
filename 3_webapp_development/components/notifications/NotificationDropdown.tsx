'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Check,
  X,
  Trash2,
  Settings,
  ExternalLink,
} from 'lucide-react';
import { Notification } from '@/lib/db/queries';
import { cn } from '@/lib/utils';
// Format date helper function
const formatDistanceToNow = (date: Date) => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)} weeks ago`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)} months ago`;
  return `${Math.floor(seconds / 31536000)} years ago`;
};
import { useRouter } from 'next/navigation';

interface NotificationDropdownProps {
  notifications: Notification[];
  onClose: () => void;
  onMarkAsRead?: (notificationId: string) => void;
  onMarkAllAsRead?: () => void;
  onDelete?: (notificationId: string) => void;
  unreadCount?: number;
}

export function NotificationDropdown({
  notifications,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  unreadCount = 0,
}: NotificationDropdownProps) {
  const router = useRouter();

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'team_assignment':
        return '👥';
      case 'team_invitation':
        return '📨';
      case 'join_request':
        return '🔔';
      case 'role_change':
        return '👑';
      case 'team_update':
        return '📝';
      case 'task_assignment':
        return '⚡';
      case 'task_completed':
        return '🎉';
      case 'task_status_changed':
        return '📝';
      case 'project_update':
        return '📋';
      case 'project_created':
        return '🚀';
      case 'project_completed':
        return '🎊';
      case 'contribution_logged':
        return '📊';
      case 'milestone_achieved':
        return '🏆';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'team_assignment':
        return 'bg-blue-100 text-blue-700';
      case 'team_invitation':
        return 'bg-green-100 text-green-700';
      case 'join_request':
        return 'bg-yellow-100 text-yellow-700';
      case 'role_change':
        return 'bg-purple-100 text-purple-700';
      case 'team_update':
        return 'bg-gray-100 text-gray-700';
      case 'task_assignment':
        return 'bg-qolabb-navy-100 text-qolabb-navy-700';
      case 'task_completed':
        return 'bg-green-100 text-green-700';
      case 'task_status_changed':
        return 'bg-blue-100 text-blue-700';
      case 'project_update':
        return 'bg-purple-100 text-purple-700';
      case 'project_created':
        return 'bg-pink-100 text-pink-700';
      case 'project_completed':
        return 'bg-yellow-100 text-yellow-700';
      case 'contribution_logged':
        return 'bg-indigo-100 text-indigo-700';
      case 'milestone_achieved':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
    
    // Navigate based on notification type
    if (notification.type === 'task_assignment' && notification.data?.task_id) {
      // Navigate to tasks page - the user can find their assigned task there
      router.push('/tasks');
    } else if (notification.data?.team_id || notification.data?.team_name) {
      router.push('/teams');
    } else if (notification.data?.project_id) {
      router.push('/projects');
    }
    
    onClose();
  };

  const handleMarkAllAsRead = () => {
    if (onMarkAllAsRead && unreadCount > 0) {
      onMarkAllAsRead();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden"
      style={{ maxHeight: '80vh' }}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-qolabb-navy-50 to-blue-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Bell className="text-qolabb-navy-600" size={20} />
            <h3 className="text-lg font-bold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => router.push('/settings?tab=notifications')}
              className="p-1.5 hover:bg-white rounded-lg transition-colors"
              title="Notification settings"
            >
              <Settings size={16} className="text-gray-600" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white rounded-lg transition-colors"
              title="Close"
            >
              <X size={16} className="text-gray-600" />
            </button>
          </div>
        </div>
        
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="text-xs text-qolabb-navy-600 hover:text-qolabb-navy-800 font-medium flex items-center space-x-1"
          >
            <Check size={14} />
            <span>Mark all as read</span>
          </button>
        )}
      </div>
      
      {/* Notifications List */}
      <div className="max-h-[500px] overflow-y-auto">
        <AnimatePresence>
          {notifications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-8 text-center"
            >
              <Bell size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No notifications</p>
              <p className="text-sm text-gray-400 mt-1">
                You're all caught up!
              </p>
            </motion.div>
          ) : (
            notifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer relative group',
                  !notification.read && 'bg-blue-50/50'
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start space-x-3">
                  {/* Icon */}
                  <div className={cn(
                    'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg',
                    getNotificationColor(notification.type)
                  )}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className={cn(
                          'text-sm font-semibold text-gray-900 mb-1',
                          !notification.read && 'font-bold'
                        )}>
                          {notification.title}
                        </h4>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      
                      {/* Unread indicator */}
                      {!notification.read && (
                        <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2" />
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex-shrink-0 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notification.read && onMarkAsRead && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAsRead(notification.id);
                        }}
                        className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Mark as read"
                      >
                        <Check size={14} className="text-blue-600" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(notification.id);
                        }}
                        className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} className="text-red-600" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
      
      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => {
              router.push('/settings?tab=notifications');
              onClose();
            }}
            className="w-full text-sm text-qolabb-navy-600 hover:text-qolabb-navy-800 font-medium flex items-center justify-center space-x-2 py-2 hover:bg-white rounded-lg transition-colors"
          >
            <Settings size={16} />
            <span>Manage notification settings</span>
            <ExternalLink size={14} />
          </button>
        </div>
      )}
    </motion.div>
  );
}
