'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Clock,
  Search,
  Filter,
  Calendar,
  Edit2,
  Trash2,
  Code,
  FileText,
  Search as SearchIcon,
  Palette,
  Users,
  PlusCircle,
  FolderKanban,
  CheckSquare,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/Button';
import { useAuth } from '@/lib/auth/AuthContext';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';
import {
  getUserContributions,
  getWorkspaceProjects,
  createContribution,
  updateContribution,
  deleteContribution,
} from '@/lib/db/queries';
// ContributionFormModal is defined in this file below
import type { ContributionType } from '@/lib/types/database';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

const CONTRIBUTION_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  code: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  documentation: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800' },
  research: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  design: { bg: 'bg-pink-50 dark:bg-pink-900/20', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-200 dark:border-pink-800' },
  meeting: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800' },
  other: { bg: 'bg-gray-50 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700' },
};

const CONTRIBUTION_TYPE_ICONS: Record<string, any> = {
  code: Code,
  documentation: FileText,
  research: SearchIcon,
  design: Palette,
  meeting: Users,
  other: PlusCircle,
};

export default function ContributionsPage() {
  const { user, profile } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [contributions, setContributions] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterType, setFilterType] = useState<ContributionType | 'all'>('all');
  const [filterDate, setFilterDate] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingContribution, setEditingContribution] = useState<any | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState({
    totalContributions: 0,
    totalHours: 0,
    thisWeek: 0,
    thisMonth: 0,
  });

  const loadData = useCallback(async () => {
    if (!user?.id || !currentWorkspace) return;

    try {
      setLoading(true);
      
      // Load projects
      const projectsData = await getWorkspaceProjects(currentWorkspace.id);
      setProjects(projectsData || []);

      // Load contributions
      const contributionsData = await getUserContributions(user.id);
      setContributions(contributionsData || []);

      // Calculate stats
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const totalHours = (contributionsData || []).reduce((sum, c) => sum + (c.hours_spent || 0), 0);
      const thisWeek = (contributionsData || []).filter(c => new Date(c.created_at) >= weekAgo).length;
      const thisMonth = (contributionsData || []).filter(c => new Date(c.created_at) >= monthAgo).length;

      setStats({
        totalContributions: contributionsData?.length || 0,
        totalHours,
        thisWeek,
        thisMonth,
      });
    } catch (error: any) {
      console.error('Error loading contributions:', error);
      // Show user-friendly error message for RLS errors
      if (error?.message?.includes('row-level security') || error?.code === '42501') {
        toast.error('Permission denied. Please ensure you have access to view contributions.');
      } else {
        toast.error('Failed to load contributions. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id, currentWorkspace]);

  useEffect(() => {
    loadData();

    // Real-time subscription
    if (user?.id && currentWorkspace) {
      const channel = supabase
        .channel(`contributions:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'contributions',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            loadData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [loadData, user?.id, currentWorkspace]);

  const filteredContributions = contributions.filter((contrib) => {
    // Search filter
    const matchesSearch =
      searchQuery === '' ||
      contrib.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contrib.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contrib.project?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    // Project filter
    const matchesProject = filterProject === 'all' || contrib.project_id === filterProject;

    // Type filter
    const matchesType = filterType === 'all' || contrib.contribution_type === filterType;

    // Date filter
    const contribDate = new Date(contrib.created_at);
    const now = new Date();
    let matchesDate = true;
    if (filterDate === 'today') {
      matchesDate = contribDate.toDateString() === now.toDateString();
    } else if (filterDate === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      matchesDate = contribDate >= weekAgo;
    } else if (filterDate === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      matchesDate = contribDate >= monthAgo;
    }

    return matchesSearch && matchesProject && matchesType && matchesDate;
  });

  const handleDelete = async (contributionId: string) => {
    if (!confirm('Are you sure you want to delete this contribution? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteContribution(contributionId);
      await loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to delete contribution');
    }
  };

  const handleEdit = (contribution: any) => {
    setEditingContribution(contribution);
    setShowCreateModal(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (!currentWorkspace) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <FolderKanban size={64} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">No Workspace Selected</h2>
            <p className="text-gray-600 dark:text-gray-400">Select a workspace to view your contributions</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">My Contributions</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
              Track and manage your project contributions and activities
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              setEditingContribution(null);
              setShowCreateModal(true);
            }}
            className="flex items-center space-x-2 w-full sm:w-auto"
          >
            <Plus size={20} />
            <span>Log Contribution</span>
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Contributions</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {stats.totalContributions}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileText className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Hours</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {stats.totalHours.toFixed(1)}h
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Clock className="text-green-600 dark:text-green-400" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">This Week</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {stats.thisWeek}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Calendar className="text-purple-600 dark:text-purple-400" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">This Month</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {stats.thisMonth}
                </p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Calendar className="text-orange-600 dark:text-orange-400" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
              <input
                type="text"
                placeholder="Search contributions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              />
            </div>

            {/* Filter Toggle */}
            <Button
              variant="ghost"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2"
            >
              <Filter size={18} />
              <span>Filters</span>
              {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </Button>
          </div>

          {/* Filter Options */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-3 gap-4"
              >
                {/* Project Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Project
                  </label>
                  <select
                    value={filterProject}
                    onChange={(e) => setFilterProject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                  >
                    <option value="all">All Projects</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Type
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as ContributionType | 'all')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                  >
                    <option value="all">All Types</option>
                    <option value="code">Code</option>
                    <option value="documentation">Documentation</option>
                    <option value="research">Research</option>
                    <option value="design">Design</option>
                    <option value="meeting">Meeting</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Date Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date Range
                  </label>
                  <select
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                  </select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Contributions List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-3 w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
              </div>
            ))}
          </div>
        ) : filteredContributions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border-2 border-dashed border-gray-300 dark:border-gray-600"
          >
            <FileText size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {searchQuery || filterProject !== 'all' || filterType !== 'all' || filterDate !== 'all'
                ? 'No contributions found'
                : 'No contributions yet'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchQuery || filterProject !== 'all' || filterType !== 'all' || filterDate !== 'all'
                ? 'Try adjusting your filters'
                : 'Start logging your contributions to track your participation'}
            </p>
            {!searchQuery && filterProject === 'all' && filterType === 'all' && filterDate === 'all' && (
              <Button
                variant="primary"
                onClick={() => {
                  setEditingContribution(null);
                  setShowCreateModal(true);
                }}
                className="flex items-center space-x-2 mx-auto"
              >
                <Plus size={20} />
                <span>Log Your First Contribution</span>
              </Button>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContributions.map((contrib) => {
              const typeConfig = CONTRIBUTION_TYPE_COLORS[contrib.contribution_type || 'other'] || CONTRIBUTION_TYPE_COLORS.other;
              const TypeIcon = CONTRIBUTION_TYPE_ICONS[contrib.contribution_type || 'other'] || PlusCircle;

              return (
                <motion.div
                  key={contrib.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 hover:shadow-lg transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className={`p-2 rounded-lg ${typeConfig.bg}`}>
                          <TypeIcon size={16} className={typeConfig.text} />
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${typeConfig.bg} ${typeConfig.text} ${typeConfig.border}`}>
                          {contrib.contribution_type || 'other'}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {contrib.title}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-1 ml-2">
                      <button
                        onClick={() => handleEdit(contrib)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={16} className="text-gray-500 dark:text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleDelete(contrib.id)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} className="text-red-500 dark:text-red-400" />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  {contrib.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                      {contrib.description}
                    </p>
                  )}

                  {/* Metadata */}
                  <div className="space-y-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                    {/* Project */}
                    {contrib.project && (
                      <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                        <FolderKanban size={14} className="mr-2" />
                        <span className="truncate">{contrib.project.name}</span>
                      </div>
                    )}

                    {/* Task */}
                    {contrib.task && (
                      <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                        <CheckSquare size={14} className="mr-2" />
                        <span className="truncate">{contrib.task.title}</span>
                      </div>
                    )}

                    {/* Hours and Date */}
                    <div className="flex items-center justify-between text-xs">
                      {contrib.hours_spent ? (
                        <div className="flex items-center text-gray-600 dark:text-gray-400">
                          <Clock size={14} className="mr-1" />
                          <span className="font-medium">{contrib.hours_spent}h</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">No time logged</span>
                      )}
                      <span className="text-gray-500 dark:text-gray-400">{formatDate(contrib.created_at)}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Create/Edit Contribution Modal */}
        {showCreateModal && user && (
          <ContributionFormModal
            isOpen={showCreateModal}
            onClose={() => {
              setShowCreateModal(false);
              setEditingContribution(null);
            }}
            onSuccess={loadData}
            contribution={editingContribution}
            userId={user.id}
            projects={projects}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

// Contribution Form Modal Component
interface ContributionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  contribution?: any;
  userId: string;
  projects: any[];
}

function ContributionFormModal({
  isOpen,
  onClose,
  onSuccess,
  contribution,
  userId,
  projects,
}: ContributionFormModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contributionType, setContributionType] = useState<ContributionType>('other');
  const [hoursSpent, setHoursSpent] = useState('');
  const [projectId, setProjectId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableTasks, setAvailableTasks] = useState<any[]>([]);

  useEffect(() => {
    if (contribution) {
      setTitle(contribution.title || '');
      setDescription(contribution.description || '');
      setContributionType(contribution.contribution_type || 'other');
      setHoursSpent(contribution.hours_spent?.toString() || '');
      setProjectId(contribution.project_id || '');
      setTaskId(contribution.task_id || '');
    } else {
      setTitle('');
      setDescription('');
      setContributionType('other');
      setHoursSpent('');
      setProjectId('');
      setTaskId('');
    }
  }, [contribution, isOpen]);

  // Load tasks when project is selected
  useEffect(() => {
    if (projectId && isOpen) {
      loadTasksForProject(projectId);
    } else {
      setAvailableTasks([]);
      setTaskId('');
    }
  }, [projectId, isOpen]);

  const loadTasksForProject = async (projId: string) => {
    try {
      const { getProjectTasks } = await import('@/lib/db/queries');
      const tasks = await getProjectTasks(projId);
      setAvailableTasks(tasks || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
      setAvailableTasks([]);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!projectId) {
      setError('Please select a project');
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
      const contributionData = {
        project_id: projectId,
        user_id: userId,
        task_id: taskId || null,
        title: title.trim(),
        description: description.trim() || null,
        contribution_type: contributionType,
        hours_spent: hours,
      };

      if (contribution) {
        await updateContribution(contribution.id, contributionData);
      } else {
        await createContribution(contributionData);
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving contribution:', error);
      setError(error?.message || 'Failed to save contribution. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {contribution ? 'Edit Contribution' : 'Log New Contribution'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-800 dark:text-red-200">
                {error}
              </div>
            )}

            {/* Project Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Project <span className="text-red-500">*</span>
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                required
              >
                <option value="">Select a project...</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Task Selection (Optional) */}
            {projectId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Task (Optional)
                </label>
                <select
                  value={taskId}
                  onChange={(e) => setTaskId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                >
                  <option value="">No specific task</option>
                  {availableTasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What did you work on?"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details about your contribution..."
                rows={4}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none"
              />
            </div>

            {/* Contribution Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Contribution Type
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { value: 'code', label: 'Code', icon: Code },
                  { value: 'documentation', label: 'Documentation', icon: FileText },
                  { value: 'research', label: 'Research', icon: SearchIcon },
                  { value: 'design', label: 'Design', icon: Palette },
                  { value: 'meeting', label: 'Meeting', icon: Users },
                  { value: 'other', label: 'Other', icon: PlusCircle },
                ].map((type) => {
                  const Icon = type.icon;
                  const isSelected = contributionType === type.value;
                  const typeConfig = CONTRIBUTION_TYPE_COLORS[type.value] || CONTRIBUTION_TYPE_COLORS.other;

                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setContributionType(type.value as ContributionType)}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        isSelected
                          ? `border-blue-500 ${typeConfig.bg}`
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <Icon
                          size={16}
                          className={isSelected ? typeConfig.text : 'text-gray-400 dark:text-gray-500'}
                        />
                        <span
                          className={`text-sm font-medium ${
                            isSelected ? typeConfig.text : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {type.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hours Spent */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
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
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Track time spent on this contribution for better analytics
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-end space-x-3">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={loading || !title.trim() || !projectId}
              className="flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{contribution ? 'Saving...' : 'Logging...'}</span>
                </>
              ) : (
                <>
                  <Plus size={16} />
                  <span>{contribution ? 'Save Changes' : 'Log Contribution'}</span>
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
