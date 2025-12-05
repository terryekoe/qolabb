'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, User, Calendar, ChevronRight, AlertCircle, FolderKanban } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
// Helper function to format time distance
const formatDistanceToNow = (date: Date) => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

interface EvaluationCardProps {
  evaluationResponse: any; // EvaluationResponse with period and evaluatee info
  onClick: () => void;
}

export function EvaluationCard({ evaluationResponse, onClick }: EvaluationCardProps) {
  const period = evaluationResponse.evaluation_period;
  const evaluatee = evaluationResponse.evaluatee;
  const dueDate = new Date(period.due_date);
  const now = new Date();
  const isOverdue = dueDate < now;
  const isDueSoon = !isOverdue && dueDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000; // Within 24 hours

  const getStatusColor = () => {
    if (isOverdue) return 'border-red-500 bg-red-50 dark:bg-red-900/20';
    if (isDueSoon) return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
    return 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800';
  };

  const getStatusText = () => {
    if (isOverdue) return 'Overdue';
    if (isDueSoon) return 'Due Soon';
    return 'Pending';
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className={`rounded-lg border-2 p-4 cursor-pointer transition-all ${getStatusColor()}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Avatar */}
          <Avatar
            userId={evaluatee?.id || 'unknown'}
            name={evaluatee?.full_name || 'Unknown'}
            src={evaluatee?.avatar_url}
            size="md"
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                {evaluatee?.full_name ? (
                  <>Evaluate {evaluatee.full_name}</>
                ) : (
                  <>Evaluate Team Member</>
                )}
              </h4>
              {isOverdue && (
                <AlertCircle className="text-red-500 dark:text-red-400 flex-shrink-0" size={16} />
              )}
            </div>

            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                <span>{period.period_name}</span>
              </div>
              {period.project && (
                <div className="flex items-center gap-1">
                  <FolderKanban size={14} />
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {period.project.name}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>
                  Due{' '}
                  {isOverdue ? formatDistanceToNow(dueDate) + ' ago' : formatDistanceToNow(dueDate)}
                </span>
              </div>
              {!evaluatee?.full_name && (
                <div className="text-xs text-yellow-600 dark:text-yellow-400 italic">
                  Name not available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status & Arrow */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              isOverdue
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                : isDueSoon
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {getStatusText()}
          </span>
          <ChevronRight className="text-gray-400 dark:text-gray-500" size={20} />
        </div>
      </div>
    </motion.div>
  );
}
