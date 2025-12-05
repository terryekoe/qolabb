'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Send, User, Clock, X } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { logActivity } from '@/lib/db/queries';

interface TaskCommentsProps {
  taskId: string;
  projectId: string;
  workspaceId: string;
  userId: string;
  userProfile?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

interface Comment {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  user?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export function TaskComments({
  taskId,
  projectId,
  workspaceId,
  userId,
  userProfile,
}: TaskCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadComments();

    // Subscribe to new comments
    const subscription = supabase
      .channel(`task_comments_${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_log',
          filter: `entity_type=eq.task AND entity_id=eq.${taskId} AND action_type=eq.comment`,
        },
        (payload) => {
          loadComments();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [taskId]);

  async function loadComments() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('activity_log')
        .select(
          `
          id,
          user_id,
          created_at,
          metadata,
          user:profiles!user_id(id, full_name, avatar_url)
        `
        )
        .eq('entity_type', 'task')
        .eq('entity_id', taskId)
        .eq('action_type', 'comment')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedComments: Comment[] = (data || []).map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        message: item.metadata?.message || '',
        created_at: item.created_at,
        user: item.user,
      }));

      setComments(formattedComments);
    } catch (err: any) {
      console.error('Error loading comments:', err);
      setError(err.message || 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitComment() {
    if (!newComment.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      await logActivity({
        workspace_id: workspaceId,
        user_id: userId,
        action_type: 'comment',
        entity_type: 'task',
        entity_id: taskId,
        metadata: {
          message: newComment.trim(),
          project_id: projectId,
        },
      });

      setNewComment('');
      await loadComments();
    } catch (err: any) {
      console.error('Error posting comment:', err);
      setError(err.message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center">
          <MessageSquare size={16} className="mr-2" />
          Comments ({comments.length})
        </h4>
      </div>

      {/* Comments List */}
      {loading && comments.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-500">Loading comments...</div>
      ) : comments.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <MessageSquare size={24} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No comments yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Start the conversation by adding a comment below
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {comments.map((comment) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Avatar
                userId={comment.user_id}
                name={comment.user?.full_name || 'Unknown'}
                src={comment.user?.avatar_url}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    {comment.user?.full_name || 'Unknown User'}
                  </span>
                  <span className="text-xs text-gray-500 flex items-center">
                    <Clock size={12} className="mr-1" />
                    {formatTimeAgo(comment.created_at)}
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                  {comment.message}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Add Comment Form */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-start space-x-3">
          <Avatar
            userId={userId}
            name={userProfile?.full_name || 'You'}
            src={userProfile?.avatar_url}
            size="sm"
          />
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={submitting}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSubmitComment();
                }
              }}
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-500">Press Cmd/Ctrl + Enter to post</p>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || submitting}
                className="flex items-center space-x-2"
              >
                <Send size={14} />
                <span>{submitting ? 'Posting...' : 'Post'}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
