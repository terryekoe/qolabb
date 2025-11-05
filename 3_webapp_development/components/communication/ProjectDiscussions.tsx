'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Plus,
  Pin,
  Lock,
  Edit2,
  Trash2,
  Reply,
  X,
  Tag,
  ChevronLeft,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';
import {
  getProjectDiscussions,
  getProjectDiscussion,
  createProjectDiscussion,
  addProjectDiscussionComment,
  updateProjectDiscussion,
  deleteProjectDiscussion,
  type ProjectDiscussion,
  type ProjectDiscussionComment,
} from '@/lib/db/queries';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from 'react-hot-toast';

interface ProjectDiscussionsProps {
  projectId: string;
  userId: string;
}

export function ProjectDiscussions({ projectId, userId }: ProjectDiscussionsProps) {
  const { user } = useAuth();
  const [discussions, setDiscussions] = useState<ProjectDiscussion[]>([]);
  const [selectedDiscussion, setSelectedDiscussion] = useState<ProjectDiscussion | null>(null);
  const [comments, setComments] = useState<ProjectDiscussionComment[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<ProjectDiscussionComment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Create discussion form state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState('');

  useEffect(() => {
    loadDiscussions();
  }, [projectId]);

  useEffect(() => {
    if (selectedDiscussion) {
      loadDiscussionDetails();
    }
  }, [selectedDiscussion?.id]);

  useEffect(() => {
    if (!projectId) return;

    // Subscribe to new discussions
    const channel = supabase
      .channel(`project_discussions_${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_discussions',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          loadDiscussions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const loadDiscussions = async () => {
    try {
      setLoading(true);
      const fetchedDiscussions = await getProjectDiscussions(projectId);
      setDiscussions(fetchedDiscussions);
    } catch (error: any) {
      console.error('Error loading discussions:', error);
      toast.error('Failed to load discussions');
    } finally {
      setLoading(false);
    }
  };

  const loadDiscussionDetails = async () => {
    if (!selectedDiscussion) return;

    try {
      const { discussion, comments: fetchedComments } = await getProjectDiscussion(
        selectedDiscussion.id
      );
      if (discussion) {
        setSelectedDiscussion(discussion);
        setComments(fetchedComments);
      }
    } catch (error: any) {
      console.error('Error loading discussion details:', error);
      toast.error('Failed to load discussion');
    }
  };

  const handleCreateDiscussion = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const tags = newTags.split(',').map((t) => t.trim()).filter(Boolean);
      await createProjectDiscussion(projectId, userId, newTitle, newContent, tags);
      toast.success('Discussion created');
      setShowCreateModal(false);
      setNewTitle('');
      setNewContent('');
      setNewTags('');
      await loadDiscussions();
    } catch (error: any) {
      console.error('Error creating discussion:', error);
      toast.error('Failed to create discussion');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedDiscussion) return;

    setSubmitting(true);
    try {
      await addProjectDiscussionComment(
        selectedDiscussion.id,
        userId,
        newComment,
        replyingTo?.id
      );
      toast.success('Comment added');
      setNewComment('');
      setReplyingTo(null);
      await loadDiscussionDetails();
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDiscussion = async (discussionId: string) => {
    if (!confirm('Are you sure you want to delete this discussion?')) return;

    try {
      await deleteProjectDiscussion(discussionId, userId);
      toast.success('Discussion deleted');
      if (selectedDiscussion?.id === discussionId) {
        setSelectedDiscussion(null);
      }
      await loadDiscussions();
    } catch (error: any) {
      console.error('Error deleting discussion:', error);
      toast.error('Failed to delete discussion');
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
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  if (selectedDiscussion) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {/* Discussion Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setSelectedDiscussion(null)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
                </button>
                {selectedDiscussion.is_pinned && (
                  <Pin size={16} className="text-blue-600 dark:text-blue-400" />
                )}
                {selectedDiscussion.is_locked && (
                  <Lock size={16} className="text-gray-600 dark:text-gray-400" />
                )}
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {selectedDiscussion.title}
                </h3>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <span>
                  by {selectedDiscussion.user?.full_name || 'Unknown'}
                </span>
                <span>{formatTime(selectedDiscussion.created_at)}</span>
                {selectedDiscussion.tags && selectedDiscussion.tags.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Tag size={14} />
                    {selectedDiscussion.tags.join(', ')}
                  </div>
                )}
              </div>
            </div>
            {selectedDiscussion.user_id === userId && (
              <button
                onClick={() => handleDeleteDiscussion(selectedDiscussion.id)}
                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                title="Delete"
              >
                <Trash2 size={18} className="text-red-600 dark:text-red-400" />
              </button>
            )}
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {selectedDiscussion.content}
            </p>
          </div>
        </div>

        {/* Comments */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No comments yet. Be the first to comment!
            </div>
          ) : (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                userId={userId}
                onReply={setReplyingTo}
                formatTime={formatTime}
              />
            ))
          )}
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

        {/* Add Comment */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={replyingTo ? 'Type a reply...' : 'Add a comment...'}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none mb-2"
            disabled={submitting}
          />
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={handleAddComment}
              disabled={!newComment.trim() || submitting}
              size="sm"
            >
              {submitting ? 'Posting...' : 'Post Comment'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <MessageSquare size={20} className="text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Project Discussions</h3>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2"
        >
          <Plus size={18} />
          <span>New Discussion</span>
        </Button>
      </div>

      {/* Discussions List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Loading discussions...
          </div>
        ) : discussions.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-gray-500 dark:text-gray-400">No discussions yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Start a discussion to collaborate with your team
            </p>
          </div>
        ) : (
          discussions.map((discussion) => (
            <motion.div
              key={discussion.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelectedDiscussion(discussion)}
              className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors border border-gray-200 dark:border-gray-600"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-1">
                  {discussion.is_pinned && (
                    <Pin size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  )}
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                    {discussion.title}
                  </h4>
                </div>
                {discussion.user_id === userId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDiscussion(discussion.id);
                    }}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                  >
                    <Trash2 size={16} className="text-red-600 dark:text-red-400" />
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                {discussion.content}
              </p>
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span>{discussion.user?.full_name || 'Unknown'}</span>
                <span>{formatTime(discussion.created_at)}</span>
                <span>{discussion.comment_count || 0} comments</span>
                {discussion.tags && discussion.tags.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Tag size={12} />
                    {discussion.tags.slice(0, 2).join(', ')}
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Create Discussion Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between z-10">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  New Discussion
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Discussion title"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Content *
                  </label>
                  <textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="What would you like to discuss?"
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    placeholder="question, bug, feature"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                </div>
              </div>

              <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleCreateDiscussion}
                  disabled={!newTitle.trim() || !newContent.trim() || submitting}
                >
                  {submitting ? 'Creating...' : 'Create Discussion'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CommentItem({
  comment,
  userId,
  onReply,
  formatTime,
}: {
  comment: ProjectDiscussionComment;
  userId: string;
  onReply: (comment: ProjectDiscussionComment) => void;
  formatTime: (date: string) => string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        <Avatar
          userId={comment.user_id}
          name={comment.user?.full_name || 'Unknown'}
          src={comment.user?.avatar_url}
          size="sm"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {comment.user?.full_name || 'Unknown'}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatTime(comment.created_at)}
            </span>
            {comment.is_edited && (
              <span className="text-xs text-gray-400 dark:text-gray-500 italic">(edited)</span>
            )}
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {comment.content}
          </p>
          <button
            onClick={() => onReply(comment)}
            className="mt-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Reply
          </button>
        </div>
      </div>
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-8 space-y-2 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              userId={userId}
              onReply={onReply}
              formatTime={formatTime}
            />
          ))}
        </div>
      )}
    </div>
  );
}

