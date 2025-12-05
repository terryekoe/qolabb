'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Clock,
  FileText,
  Code,
  Search,
  Palette,
  Users,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/Button';
import { createContribution } from '@/lib/db/queries';
import type { ContributionType } from '@/lib/types/database';

interface ContributionLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  task: {
    id: string;
    title: string;
    description?: string | null;
    project_id: string;
  };
  userId: string;
}

const CONTRIBUTION_TYPES: {
  value: ContributionType;
  label: string;
  icon: any;
  description: string;
}[] = [
  { value: 'code', label: 'Code', icon: Code, description: 'Programming and development work' },
  {
    value: 'documentation',
    label: 'Documentation',
    icon: FileText,
    description: 'Writing and documentation',
  },
  { value: 'research', label: 'Research', icon: Search, description: 'Research and analysis' },
  { value: 'design', label: 'Design', icon: Palette, description: 'Design and UI/UX work' },
  { value: 'meeting', label: 'Meeting', icon: Users, description: 'Team meetings and discussions' },
  { value: 'other', label: 'Other', icon: PlusCircle, description: 'Other contributions' },
];

export function ContributionLogModal({
  isOpen,
  onClose,
  onSuccess,
  task,
  userId,
}: ContributionLogModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contributionType, setContributionType] = useState<ContributionType>('other');
  const [hoursSpent, setHoursSpent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill form when task changes
  useEffect(() => {
    if (task && isOpen) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setHoursSpent('');
      setContributionType('other');
      setError('');
    }
  }, [task, isOpen]);

  async function handleSubmit() {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    const hours = hoursSpent ? parseFloat(hoursSpent) : null;
    if (hours !== null && (isNaN(hours) || hours < 0)) {
      setError('Hours must be a positive number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createContribution({
        project_id: task.project_id,
        user_id: userId,
        task_id: task.id,
        title: title.trim(),
        description: description.trim() || null,
        contribution_type: contributionType,
        hours_spent: hours,
      });

      onSuccess();
      onClose();

      // Reset form
      setTitle('');
      setDescription('');
      setHoursSpent('');
      setContributionType('other');
    } catch (error: any) {
      console.error('Error creating contribution:', error);
      setError(error?.message || 'Failed to log contribution. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleSkip() {
    onClose();
    // Reset form
    setTitle('');
    setDescription('');
    setHoursSpent('');
    setContributionType('other');
    setError('');
  }

  if (!isOpen || !task) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Log Contribution
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Track your work for this completed task to improve participation analytics.
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ml-4"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800 mb-4 flex items-start space-x-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Task Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-1">
                    Completed Task
                  </p>
                  <p className="text-sm font-semibold text-blue-900">{task.title}</p>
                  {task.description && (
                    <p className="text-xs text-blue-700 mt-1 line-clamp-2">{task.description}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contribution Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What did you accomplish?"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add details about your contribution..."
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  disabled={loading}
                />
              </div>

              {/* Contribution Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Contribution Type
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {CONTRIBUTION_TYPES.map((type) => {
                    const Icon = type.icon;
                    const isSelected = contributionType === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setContributionType(type.value)}
                        disabled={loading}
                        className={`
                          p-3 rounded-lg border-2 transition-all text-left
                          ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }
                        `}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <Icon
                            size={16}
                            className={isSelected ? 'text-blue-600' : 'text-gray-400'}
                          />
                          <span
                            className={`text-sm font-medium ${
                              isSelected ? 'text-blue-900' : 'text-gray-700'
                            }`}
                          >
                            {type.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">{type.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hours Spent */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Clock size={16} className="mr-2 text-gray-500" />
                  Hours Spent (Optional)
                </label>
                <input
                  type="number"
                  value={hoursSpent}
                  onChange={(e) => setHoursSpent(e.target.value)}
                  placeholder="e.g., 2.5"
                  min="0"
                  step="0.25"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Track time spent on this contribution for better analytics
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <button
              onClick={handleSkip}
              disabled={loading}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors disabled:opacity-50"
            >
              Skip for now
            </button>
            <div className="flex items-center space-x-3">
              <Button variant="ghost" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={loading || !title.trim()}
                className="flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Logging...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Log Contribution</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
