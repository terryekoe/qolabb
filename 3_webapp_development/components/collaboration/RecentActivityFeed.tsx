'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, CheckCircle2, Clock, User } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';

interface ActivityItem {
  id: string;
  type: 'task_completed' | 'task_created' | 'task_updated' | 'project_submitted';
  user: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  task?: {
    title: string;
  };
  timestamp: string;
}

interface RecentActivityFeedProps {
  projectId: string;
  className?: string;
}

export function RecentActivityFeed({ projectId, className = '' }: RecentActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 172800) return 'yesterday';
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getActivityMessage = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'task_completed':
        return `completed "${activity.task?.title}"`;
      case 'task_created':
        return `created "${activity.task?.title}"`;
      case 'task_updated':
        return `updated "${activity.task?.title}"`;
      case 'project_submitted':
        return 'submitted the project';
      default:
        return 'performed an action';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task_completed':
        return <CheckCircle2 size={14} className="text-green-600 dark:text-green-400" />;
      default:
        return <Activity size={14} className="text-blue-600 dark:text-blue-400" />;
    }
  };

  // Mock data for now - in production, this would fetch from database
  useEffect(() => {
    // Simulated loading
    setTimeout(() => {
      setActivities([]);
      setLoading(false);
    }, 500);
  }, [projectId]);

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={`text-center py-6 ${className}`}>
        <Activity size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
        <p className="text-sm text-gray-500 dark:text-gray-400">No recent activity</p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <AnimatePresence mode="popLayout">
        {activities.map((activity) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-shadow"
          >
            <Avatar
              userId={activity.user.id}
              name={activity.user.full_name}
              src={activity.user.avatar_url}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {getActivityIcon(activity.type)}
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {activity.user.full_name}
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                {getActivityMessage(activity)}
              </p>
              <span className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1 mt-1">
                <Clock size={10} />
                {formatTime(activity.timestamp)}
              </span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
