'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Edit,
  User,
  Flag,
  Calendar,
  CheckCircle2,
  MessageSquare,
  Clock,
  UserPlus,
  X as XIcon,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { supabase } from '@/lib/supabase';

interface TaskActivityTimelineProps {
  taskId: string;
  projectId: string;
}

interface Activity {
  id: string;
  action_type: string;
  user_id: string;
  created_at: string;
  metadata: any;
  user?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export function TaskActivityTimeline({ taskId, projectId }: TaskActivityTimelineProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();

    // Subscribe to new activities
    const subscription = supabase
      .channel(`task_activity_${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activity_log',
          filter: `entity_type=eq.task AND entity_id=eq.${taskId}`,
        },
        () => {
          loadActivities();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [taskId]);

  async function loadActivities() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('activity_log')
        .select(
          `
          id,
          action_type,
          user_id,
          created_at,
          metadata,
          user:profiles!user_id(id, full_name, avatar_url)
        `
        )
        .eq('entity_type', 'task')
        .eq('entity_id', taskId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Handle case where user might be an array (Supabase sometimes returns arrays)
      const formattedActivities = (data || []).map((activity: any) => {
        let user = activity.user;
        if (Array.isArray(user)) {
          user = user[0] || null;
        }
        return {
          ...activity,
          user: user || null,
        };
      });

      setActivities(formattedActivities);
    } catch (err: any) {
      console.error('Error loading activities:', err);
    } finally {
      setLoading(false);
    }
  }

  function getActivityIcon(actionType: string) {
    switch (actionType) {
      case 'created_task':
        return <Plus size={14} className="text-blue-500" />;
      case 'updated_task':
      case 'status_changed':
        return <Edit size={14} className="text-orange-500" />;
      case 'assigned_task':
        return <UserPlus size={14} className="text-green-500" />;
      case 'completed_task':
        return <CheckCircle2 size={14} className="text-green-500" />;
      case 'comment':
        return <MessageSquare size={14} className="text-gray-500" />;
      default:
        return <Clock size={14} className="text-gray-400" />;
    }
  }

  function getActivityMessage(activity: Activity): string {
    const userName = activity.user?.full_name || 'Someone';
    const metadata = activity.metadata || {};

    switch (activity.action_type) {
      case 'created_task':
        return `${userName} created this task`;
      case 'updated_task':
        return `${userName} updated the task`;
      case 'status_changed':
        const newStatus = metadata.new_status || metadata.status;
        const statusLabels: Record<string, string> = {
          todo: 'To Do',
          in_progress: 'In Progress',
          completed: 'Completed',
        };
        return `${userName} changed status to ${statusLabels[newStatus] || newStatus}`;
      case 'assigned_task':
        const assigneeName = metadata.assignee_name || 'someone';
        return `${userName} assigned the task to ${assigneeName}`;
      case 'completed_task':
        return `${userName} marked the task as completed`;
      case 'comment':
        return `${userName} added a comment`;
      default:
        return `${userName} performed an action`;
    }
  }

  function formatTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }

  if (loading && activities.length === 0) {
    return <div className="text-center py-8 text-sm text-gray-500">Loading activity...</div>;
  }

  if (activities.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <Clock size={24} className="mx-auto text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">No activity yet</p>
        <p className="text-xs text-gray-400 mt-1">Task activity and updates will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-900 mb-3">Activity Timeline</h4>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

        <div className="space-y-4">
          {activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative flex items-start space-x-3 pl-2"
            >
              {/* Icon */}
              <div className="relative z-10 flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                  {getActivityIcon(activity.action_type)}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <Avatar
                      userId={activity.user_id}
                      name={activity.user?.full_name || 'Unknown'}
                      src={activity.user?.avatar_url}
                      size="xs"
                    />
                    <p className="text-sm text-gray-900 truncate">{getActivityMessage(activity)}</p>
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                    {formatTimeAgo(activity.created_at)}
                  </span>
                </div>

                {/* Additional details for specific actions */}
                {activity.action_type === 'status_changed' && activity.metadata?.old_status && (
                  <p className="text-xs text-gray-500 ml-10">
                    Changed from {activity.metadata.old_status} to {activity.metadata.new_status}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
