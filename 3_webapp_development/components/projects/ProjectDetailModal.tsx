'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  Flag,
  Calendar,
  MoreVertical,
  Edit2,
  Trash2,
  UserPlus,
  MessageSquare,
  ListTodo,
  LayoutTemplate,
  ListChecks,
  FileText,
  Link as LinkIcon,
} from 'lucide-react';
import { Button } from '@/components/Button';
import Avatar from '@/components/ui/Avatar';
import { TaskModal } from './TaskModal';
import { getProjectTasks, updateTask, deleteTask, isTeamLeaderOrInstructor } from '@/lib/db/queries';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Task, TaskStatus } from '@/lib/types/database';
import { ProjectDiscussions } from '@/components/communication/ProjectDiscussions';

interface ProjectDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: any;
  workspaceId: string;
  canManageTasks: boolean;
}

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  isOpen,
  onClose,
  project,
  workspaceId,
  canManageTasks,
}) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [activeTaskMenu, setActiveTaskMenu] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'discussions'>('tasks');
  const [viewMode, setViewMode] = useState<'team' | 'focus'>('team');

  const loadTasks = useCallback(async () => {
    if (!project) return;
    
    try {
      setLoading(true);
      const data = await getProjectTasks(project.id);
      setTasks(data || []);
    } catch (error: any) {
      console.error('Error loading tasks:', JSON.stringify(error, null, 2));
      console.error('Error loading tasks details:', error?.message || error);
    } finally {
      setLoading(false);
    }
  }, [project]);

  useEffect(() => {
    if (isOpen && project) {
      loadTasks();
    }
  }, [isOpen, project, loadTasks]);

  // Real-time subscription for tasks in this project
  useEffect(() => {
    if (!isOpen || !project?.id) return;

    const tasksChannel = supabase
      .channel(`project_tasks:${project.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${project.id}`,
        },
        () => {
          loadTasks();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_assignees',
        },
        () => {
          // Reload tasks when assignees change
          loadTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
    };
  }, [isOpen, project?.id, loadTasks]);

  async function handleUpdateTaskStatus(taskId: string, newStatus: TaskStatus) {
    try {
      await updateTask(taskId, { status: newStatus });
      await loadTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await deleteTask(taskId);
      await loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  }

  const getStatusConfig = (status: TaskStatus) => {
    switch (status) {
      case 'todo':
        return {
          color: 'text-orange-600 bg-orange-50 border-orange-200',
          icon: <AlertCircle size={14} />,
          label: 'To Do'
        };
      case 'in_progress':
        return {
          color: 'text-blue-600 bg-blue-50 border-blue-200',
          icon: <Clock size={14} />,
          label: 'In Progress'
        };
      case 'completed':
        return {
          color: 'text-green-600 bg-green-50 border-green-200',
          icon: <CheckCircle2 size={14} />,
          label: 'Completed'
        };
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const tasksByStatus = {
    todo: tasks.filter(t => t.status === 'todo'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    completed: tasks.filter(t => t.status === 'completed'),
  };

  const completionPercentage = tasks.length > 0 
    ? Math.round((tasksByStatus.completed.length / tasks.length) * 100)
    : 0;

  if (!isOpen || !project) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="project-detail-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl max-w-6xl w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-8 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">{project.name}</h2>
                {project.description && (
                  <p className="text-gray-600">{project.description}</p>
                )}
                <div className="flex items-center space-x-4 mt-4">
                  {project.team && (
                    <span className="text-sm text-gray-500 flex items-center">
                      <User size={16} className="mr-1" />
                      {project.team.name}
                    </span>
                  )}
                  {project.due_date && (
                    <span className="text-sm text-gray-500 flex items-center">
                      <Calendar size={16} className="mr-1" />
                      Due: {new Date(project.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center">
                {/* View Toggle */}
                <div className="hidden md:flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg mr-4">
                  <button
                    onClick={() => setViewMode('team')}
                    className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      viewMode === 'team'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    <LayoutTemplate size={16} className="mr-2" />
                    Team Board
                  </button>
                  <button
                    onClick={() => setViewMode('focus')}
                    className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      viewMode === 'focus'
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    <ListChecks size={16} className="mr-2" />
                    My Focus
                  </button>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={24} className="text-gray-500" />
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Overall Progress</span>
                <span className="font-semibold">{completionPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-blue-600 to-blue-400 h-3 rounded-full transition-all"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>{tasksByStatus.completed.length} completed</span>
                <span>{tasksByStatus.in_progress.length} in progress</span>
                <span>{tasksByStatus.todo.length} to do</span>
              </div>
            </div>
          </div>

          {/* Content Area */}
          {viewMode === 'focus' ? (
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-gray-50 dark:bg-gray-900">
              {/* Column 1: Instructions & Resources */}
              <div className="w-full md:w-1/4 p-6 border-r border-gray-200 dark:border-gray-700 overflow-y-auto bg-white dark:bg-gray-800">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                  <FileText size={18} className="mr-2 text-blue-600" />
                  Instructions
                </h3>
                <div className="prose dark:prose-invert text-sm text-gray-600 dark:text-gray-400 mb-8">
                  {project.description || "No instructions provided for this assignment."}
                </div>

                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                  <LinkIcon size={18} className="mr-2 text-blue-600" />
                  Resources
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                    <div className="bg-red-100 text-red-600 p-2 rounded mr-3">
                      <FileText size={16} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Project Guidelines.pdf</div>
                      <div className="text-xs text-gray-500">PDF • 2.4 MB</div>
                    </div>
                  </div>
                  <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                    <div className="bg-blue-100 text-blue-600 p-2 rounded mr-3">
                      <LinkIcon size={16} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Reference Materials</div>
                      <div className="text-xs text-gray-500">External Link</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 2: My Checklist */}
              <div className="w-full md:w-1/2 p-6 overflow-y-auto border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <div className="max-w-2xl mx-auto">
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
                    <ListChecks size={18} className="mr-2 text-blue-600" />
                    My Checklist
                  </h3>

                  {loading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 bg-gray-200 rounded-xl animate-pulse"></div>
                      ))}
                    </div>
                  ) : tasks.filter(t => t.assigned_to === user?.id).length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                      <CheckCircle2 size={48} className="mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-600 dark:text-gray-400 mb-4">You have no tasks assigned yet.</p>
                      {canManageTasks && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setShowTaskModal(true)}
                        >
                          Create Task
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tasks.filter(t => t.assigned_to === user?.id).map((task) => (
                        <div 
                          key={task.id}
                          className={`bg-white dark:bg-gray-800 p-4 rounded-xl border transition-all ${
                            task.status === 'completed' 
                              ? 'border-gray-200 dark:border-gray-700 opacity-75' 
                              : 'border-blue-200 dark:border-blue-800 shadow-sm'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => handleUpdateTaskStatus(task.id, task.status === 'completed' ? 'todo' : 'completed')}
                              className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                task.status === 'completed'
                                  ? 'bg-green-500 border-green-500 text-white'
                                  : 'border-gray-300 hover:border-blue-500'
                              }`}
                            >
                              {task.status === 'completed' && <CheckCircle2 size={12} />}
                            </button>
                            <div className="flex-1">
                              <div className={`text-sm font-medium mb-1 ${
                                task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-gray-100'
                              }`}>
                                {task.title}
                              </div>
                              {task.description && (
                                <p className="text-xs text-gray-500 mb-2 line-clamp-2">{task.description}</p>
                              )}
                              <div className="flex items-center gap-3">
                                {task.due_date && (
                                  <span className={`text-xs flex items-center ${
                                    new Date(task.due_date) < new Date() && task.status !== 'completed'
                                      ? 'text-red-600'
                                      : 'text-gray-500'
                                  }`}>
                                    <Clock size={12} className="mr-1" />
                                    {new Date(task.due_date).toLocaleDateString()}
                                  </span>
                                )}
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  task.priority === 'high' ? 'bg-red-100 text-red-700' :
                                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Column 3: Team Chat */}
              <div className="w-full md:w-1/4 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center">
                    <MessageSquare size={18} className="mr-2 text-blue-600" />
                    Team Chat
                  </h3>
                </div>
                <div className="flex-1 overflow-hidden">
                  {user?.id ? (
                    <ProjectDiscussions 
                      projectId={project.id} 
                      userId={user.id}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-sm text-gray-500">
                      Log in to chat
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <button
                  onClick={() => setActiveTab('tasks')}
                  className={`flex-1 px-4 py-3 font-medium text-sm transition-colors ${
                    activeTab === 'tasks'
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <ListTodo size={18} />
                    <span>Tasks ({tasks.length})</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('discussions')}
                  className={`flex-1 px-4 py-3 font-medium text-sm transition-colors ${
                    activeTab === 'discussions'
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <MessageSquare size={18} />
                    <span>Discussions</span>
                  </div>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {activeTab === 'tasks' ? (
                  <div className="flex-1 overflow-y-auto p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        Tasks ({tasks.length})
                      </h3>
                  {canManageTasks && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setShowTaskModal(true)}
                      className="flex items-center"
                    >
                      <Plus size={18} className="mr-2" />
                      Add Task
                    </Button>
                  )}
                </div>

                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-4 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle2 size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-600 mb-4">No tasks yet</p>
                    {canManageTasks && (
                      <Button
                        variant="primary"
                        onClick={() => setShowTaskModal(true)}
                        className="flex items-center mx-auto"
                      >
                        <Plus size={18} className="mr-2" />
                        Create First Task
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* To Do Column */}
                    <div>
                      <div className="flex items-center mb-4">
                        <AlertCircle size={18} className="text-orange-600 mr-2" />
                        <h4 className="font-semibold text-gray-900">To Do</h4>
                        <span className="ml-auto bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                          {tasksByStatus.todo.length}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {tasksByStatus.todo.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onUpdateStatus={handleUpdateTaskStatus}
                            onDelete={handleDeleteTask}
                            canManage={canManageTasks}
                            activeMenu={activeTaskMenu}
                            setActiveMenu={setActiveTaskMenu}
                          />
                        ))}
                      </div>
                    </div>

                    {/* In Progress Column */}
                    <div>
                      <div className="flex items-center mb-4">
                        <Clock size={18} className="text-blue-600 mr-2" />
                        <h4 className="font-semibold text-gray-900">In Progress</h4>
                        <span className="ml-auto bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                          {tasksByStatus.in_progress.length}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {tasksByStatus.in_progress.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onUpdateStatus={handleUpdateTaskStatus}
                            onDelete={handleDeleteTask}
                            canManage={canManageTasks}
                            activeMenu={activeTaskMenu}
                            setActiveMenu={setActiveTaskMenu}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Completed Column */}
                    <div>
                      <div className="flex items-center mb-4">
                        <CheckCircle2 size={18} className="text-green-600 mr-2" />
                        <h4 className="font-semibold text-gray-900">Completed</h4>
                        <span className="ml-auto bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                          {tasksByStatus.completed.length}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {tasksByStatus.completed.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            onUpdateStatus={handleUpdateTaskStatus}
                            onDelete={handleDeleteTask}
                            canManage={canManageTasks}
                            activeMenu={activeTaskMenu}
                            setActiveMenu={setActiveTaskMenu}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                  </div>
                ) : (
                  <div className="flex-1 overflow-hidden">
                    {user?.id ? (
                      <ProjectDiscussions 
                        projectId={project.id} 
                        userId={user.id}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-gray-600 dark:text-gray-400">Please log in to view discussions</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
      )}

      {/* Task Creation Modal */}
      {showTaskModal && (
        <TaskModal
          key="task-creation-modal"
          isOpen={showTaskModal}
          onClose={() => setShowTaskModal(false)}
          projectId={project.id}
          teamId={project.team_id}
          onTaskCreated={loadTasks}
        />
      )}
    </AnimatePresence>
  );
};

// Task Card Component
interface TaskCardProps {
  task: any;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  onDelete: (taskId: string) => void;
  canManage: boolean;
  activeMenu: string | null;
  setActiveMenu: (id: string | null) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onUpdateStatus,
  onDelete,
  canManage,
  activeMenu,
  setActiveMenu,
}) => {
  const getStatusConfig = (status: TaskStatus) => {
    switch (status) {
      case 'todo':
        return { color: 'text-orange-600 bg-orange-50 border-orange-200', label: 'To Do' };
      case 'in_progress':
        return { color: 'text-blue-600 bg-blue-50 border-blue-200', label: 'In Progress' };
      case 'completed':
        return { color: 'text-green-600 bg-green-50 border-green-200', label: 'Completed' };
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all group relative"
    >
      <div className="flex items-start justify-between mb-2">
        <h5 className="font-semibold text-gray-900 text-sm flex-1 pr-2">{task.title}</h5>
        {canManage && (
          <div className="relative">
            <button
              onClick={() => setActiveMenu(activeMenu === task.id ? null : task.id)}
              className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical size={16} className="text-gray-400" />
            </button>
            
            {activeMenu === task.id && (
              <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[150px]">
                <button
                  onClick={() => {
                    onDelete(task.id);
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                >
                  <Trash2 size={14} className="mr-2" />
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {task.description && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
        {task.assignee && (
          <div className="flex items-center">
            <Avatar
              userId={task.assignee.id}
              name={task.assignee.full_name || 'User'}
              src={task.assignee.avatar_url}
              size="xs"
              className="mr-1"
            />
            <span className="truncate max-w-[100px]">{task.assignee.full_name}</span>
          </div>
        )}
        {task.due_date && (
          <span className="flex items-center">
            <Calendar size={12} className="mr-1" />
            {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Flag size={14} className={getPriorityColor(task.priority)} />
        
        <select
          value={task.status}
          onChange={(e) => onUpdateStatus(task.id, e.target.value as TaskStatus)}
          disabled={!canManage}
          className="text-xs px-2 py-1 rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>
    </motion.div>
  );
};
