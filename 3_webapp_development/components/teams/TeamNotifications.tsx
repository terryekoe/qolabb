'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  BellRing,
  Check,
  X,
  Users,
  UserPlus,
  UserMinus,
  Crown,
  Clock,
  Trash2,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/Button';
import Avatar from '@/components/ui/Avatar';
import { useAuth } from '@/lib/auth/AuthContext';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';
// Note: These notification functions would need to be implemented in the database queries
// For now, using placeholder implementations
import { toast } from 'react-hot-toast';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  Notification,
} from '@/lib/db';

interface TeamNotificationsProps {
  onNotificationUpdate?: () => void;
}

export default function TeamNotifications({ onNotificationUpdate }: TeamNotificationsProps) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [showSettings, setShowSettings] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const userNotifications = await getUserNotifications(user.id);
      setNotifications(userNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadNotifications();
    }
  }, [user?.id, loadNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    if (!user?.id) return;

    try {
      await markNotificationAsRead(notificationId, user.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      if (onNotificationUpdate) {
        onNotificationUpdate();
      }
      toast.success('Notification marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;

    const unreadCount = notifications.filter((n) => !n.read).length;
    if (unreadCount === 0) {
      toast('No unread notifications');
      return;
    }

    try {
      await markAllNotificationsAsRead(user.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
      if (onNotificationUpdate) {
        onNotificationUpdate();
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    if (!user?.id) return;

    try {
      await deleteNotification(notificationId, user.id);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      toast.success('Notification deleted');
      if (onNotificationUpdate) {
        onNotificationUpdate();
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'team_assignment':
        return <UserPlus className="w-5 h-5 text-green-600" />;
      case 'team_removal':
        return <UserMinus className="w-5 h-5 text-red-600" />;
      case 'role_change':
        return <Crown className="w-5 h-5 text-yellow-600" />;
      case 'join_request_approved':
        return <Check className="w-5 h-5 text-green-600" />;
      case 'join_request_rejected':
        return <X className="w-5 h-5 text-red-600" />;
      default:
        return <Bell className="w-5 h-5 text-blue-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'team_assignment':
      case 'join_request_approved':
        return 'border-l-green-500 bg-green-50';
      case 'team_removal':
      case 'join_request_rejected':
        return 'border-l-red-500 bg-red-50';
      case 'role_change':
        return 'border-l-yellow-500 bg-yellow-50';
      default:
        return 'border-l-blue-500 bg-blue-50';
    }
  };

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === 'unread') return !notification.read;
    if (filter === 'read') return notification.read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell size={24} className="text-gray-700" />
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Group Notifications</h2>
            <p className="text-gray-600">
              {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="secondary"
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2"
            >
              <Check size={16} />
              Mark All Read
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2"
          >
            <Settings size={16} />
            Settings
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-xl border border-gray-200 p-4"
          >
            <h3 className="font-semibold text-gray-900 mb-3">Notification Settings</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Group assignment notifications</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Role change notifications</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Join request updates</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Email notifications</span>
              </label>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['all', 'unread', 'read'] as const).map((filterOption) => (
          <button
            key={filterOption}
            onClick={() => setFilter(filterOption)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === filterOption
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {filterOption === 'all' && 'All'}
            {filterOption === 'unread' && `Unread (${unreadCount})`}
            {filterOption === 'read' && 'Read'}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-gray-200 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
                <div className="w-6 h-6 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-12 text-center border-2 border-dashed border-gray-300"
        >
          <Bell size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {filter === 'unread'
              ? 'No Unread Notifications'
              : filter === 'read'
                ? 'No Read Notifications'
                : 'No Notifications'}
          </h3>
          <p className="text-gray-600">
            {filter === 'unread'
              ? "You're all caught up! No new notifications to review."
              : filter === 'read'
                ? 'No notifications have been read yet.'
                : "You'll see group assignment notifications here when they arrive."}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification, index) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-white rounded-xl border-l-4 p-4 shadow-sm transition-all duration-200 hover:shadow-md ${getNotificationColor(
                notification.type
              )} ${!notification.read ? 'border-r-4 border-r-blue-200' : ''}`}
            >
              <div className="flex items-start gap-4">
                {/* Notification Icon */}
                <div className="flex-shrink-0 mt-1">{getNotificationIcon(notification.type)}</div>

                {/* Notification Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4
                        className={`font-semibold mb-1 ${
                          !notification.read ? 'text-gray-900' : 'text-gray-700'
                        }`}
                      >
                        {notification.title}
                      </h4>
                      <p className="text-gray-600 text-sm mb-2">{notification.message}</p>

                      {/* Actor Info */}
                      {notification.data?.actor_name && (
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar
                            userId={notification.data.actor_id || ''}
                            name={notification.data.actor_name}
                            size="xs"
                          />
                          <span className="text-xs text-gray-500">
                            by {notification.data.actor_name}
                          </span>
                        </div>
                      )}

                      {/* Timestamp */}
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock size={12} />
                        <span>{new Date(notification.created_at).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Mark as read"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteNotification(notification.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete notification"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Unread Indicator */}
                {!notification.read && (
                  <div className="flex-shrink-0 mt-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// Hook for creating team assignment notifications
export const useTeamNotifications = () => {
  const createNotification = async (
    userId: string,
    type:
      | 'team_assignment'
      | 'team_removal'
      | 'role_change'
      | 'join_request_approved'
      | 'join_request_rejected',
    title: string,
    message: string,
    data?: any
  ) => {
    try {
      // This would typically call a backend API to create the notification
      // For now, we'll use a placeholder implementation
      console.log('Creating notification:', { userId, type, title, message, data });

      // In a real implementation, this would:
      // 1. Insert into notifications table
      // 2. Send real-time update via WebSocket
      // 3. Send email notification if enabled
      // 4. Send push notification if enabled

      return true;
    } catch (error) {
      console.error('Error creating notification:', error);
      return false;
    }
  };

  const notifyTeamAssignment = async (
    userId: string,
    teamName: string,
    role: string,
    actorName: string,
    actorId: string
  ) => {
    return createNotification(
      userId,
      'team_assignment',
      'Added to Group',
      `You have been added to ${teamName} as a ${role}.`,
      { team_name: teamName, role, actor_name: actorName, actor_id: actorId }
    );
  };

  const notifyTeamRemoval = async (
    userId: string,
    teamName: string,
    actorName: string,
    actorId: string
  ) => {
    return createNotification(
      userId,
      'team_removal',
      'Removed from Group',
      `You have been removed from ${teamName}.`,
      { team_name: teamName, actor_name: actorName, actor_id: actorId }
    );
  };

  const notifyRoleChange = async (
    userId: string,
    teamName: string,
    newRole: string,
    actorName: string,
    actorId: string
  ) => {
    return createNotification(
      userId,
      'role_change',
      'Role Updated',
      `Your role in ${teamName} has been changed to ${newRole}.`,
      { team_name: teamName, role: newRole, actor_name: actorName, actor_id: actorId }
    );
  };

  const notifyJoinRequestApproved = async (userId: string, teamName: string, role: string) => {
    return createNotification(
      userId,
      'join_request_approved',
      'Join Request Approved',
      `Your request to join ${teamName} has been approved. You are now a ${role}.`,
      { team_name: teamName, role }
    );
  };

  const notifyJoinRequestRejected = async (userId: string, teamName: string) => {
    return createNotification(
      userId,
      'join_request_rejected',
      'Join Request Declined',
      `Your request to join ${teamName} has been declined.`,
      { team_name: teamName }
    );
  };

  return {
    notifyTeamAssignment,
    notifyTeamRemoval,
    notifyRoleChange,
    notifyJoinRequestApproved,
    notifyJoinRequestRejected,
  };
};
