'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Calendar, Users, AlertCircle, FolderKanban } from 'lucide-react';
import { Button } from '@/components/Button';
import { createEvaluationPeriod, getTeamProjects } from '@/lib/db/queries';
import { toast } from 'react-hot-toast';

interface CreateEvaluationPeriodModalProps {
  teamId: string;
  workspaceId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function CreateEvaluationPeriodModal({
  teamId,
  workspaceId,
  onSuccess,
  onClose,
}: CreateEvaluationPeriodModalProps) {
  const [formData, setFormData] = useState({
    periodName: '',
    periodType: 'weekly' as 'weekly' | 'mid_term' | 'final' | 'custom',
    startDate: '',
    endDate: '',
    dueDate: '',
    isAnonymous: true,
    projectId: '' as string | undefined,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  useEffect(() => {
    loadProjects();
  }, [teamId]);

  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const teamProjects = await getTeamProjects(teamId);
      setProjects(teamProjects || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.periodName.trim()) {
      newErrors.periodName = 'Period name is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    }

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const due = new Date(formData.dueDate);

    if (end < start) {
      newErrors.endDate = 'End date must be after start date';
    }

    if (due < end) {
      newErrors.dueDate = 'Due date must be after end date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Please fix the form errors');
      return;
    }

    setLoading(true);
    try {
      await createEvaluationPeriod({
        teamId,
        workspaceId,
        periodName: formData.periodName,
        periodType: formData.periodType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        dueDate: formData.dueDate,
        isAnonymous: formData.isAnonymous,
        projectId: formData.projectId || undefined,
      });

      toast.success('Evaluation period created successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating evaluation period:', error);
      toast.error(error.message || 'Failed to create evaluation period');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Create Evaluation Period
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Period Name */}
          <div>
            <label htmlFor="periodName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Period Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="periodName"
              value={formData.periodName}
              onChange={(e) => setFormData({ ...formData, periodName: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              placeholder="e.g., Week 5 Evaluation, Mid-Term Review"
              disabled={loading}
            />
            {errors.periodName && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle size={14} />
                {errors.periodName}
              </p>
            )}
          </div>

          {/* Period Type */}
          <div>
            <label htmlFor="periodType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Period Type <span className="text-red-500">*</span>
            </label>
            <select
              id="periodType"
              value={formData.periodType}
              onChange={(e) =>
                setFormData({ ...formData, periodType: e.target.value as any })
              }
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              disabled={loading}
            >
              <option value="weekly">Weekly</option>
              <option value="mid_term">Mid-Term</option>
              <option value="final">Final</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="startDate"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                disabled={loading}
              />
              {errors.startDate && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.startDate}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="endDate"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                disabled={loading}
              />
              {errors.endDate && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.endDate}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Due Date <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                id="dueDate"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                disabled={loading}
              />
              {errors.dueDate && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors.dueDate}
                </p>
              )}
            </div>
          </div>

          {/* Anonymous */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isAnonymous"
              checked={formData.isAnonymous}
              onChange={(e) => setFormData({ ...formData, isAnonymous: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-400 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              disabled={loading}
            />
            <label htmlFor="isAnonymous" className="text-sm text-gray-700 dark:text-gray-300">
              Keep evaluations anonymous (evaluators will not be shown to evaluatees)
            </label>
          </div>

          {/* Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={18} />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-semibold mb-1">What happens next?</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>All team members will be asked to evaluate each other</li>
                  <li>Each member will receive pending evaluations for their teammates</li>
                  <li>Evaluations are due by the specified due date</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Evaluation Period'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
