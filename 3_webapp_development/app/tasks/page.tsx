'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  Flag,
  Clock,
  CheckCircle2,
  AlertCircle,
  FolderKanban,
  Users as UsersIcon,
  MoreVertical,
  Edit2,
  Trash2,
} from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/Button';
import { TaskModal } from '@/components/projects/TaskModal';
import { useAuth } from '@/lib/auth/AuthContext';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';
import { 
  getWorkspaceProjects,
  getProjectTasks,
  updateTask,
  deleteTask,
  isTeamLeaderOrInstructor,
} from '@/lib/db/queries';
import type { TaskStatus, TaskPriority } from '@/lib/types/database';

type FilterType = 'all' | 'my_tasks' | 'todo' | 'in_progress' | 'completed';

export default function TasksPage() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterType>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTaskProject, setSelectedTaskProject] = useState<any>(null);
  const [canManageTasks, setCanManageTasks] = useState(false);
  const [activeTaskMenu, setActiveTaskMenu] = useState<string | null>(null);

  useEffect(() => {
    if (currentWorkspace) {
      loadData();
    }
  }, [currentWorkspace]);

  async function loadData() {
    if (!currentWorkspace || !user) return;
    
    try {
      setLoading(true);
      // Load all projects
      const projectsData = await getWorkspaceProjects(currentWorkspace.id);
      setProjects(projectsData || []);
      
      // Load tasks from all projects
      const allTasks: any[] = [];
      for (const project of projectsData || []) {
        const projectTasks = await getProjectTasks(project.id);
        const tasksWithProject = projectTasks.map((task: any) => ({
          ...task,
          project_name: project.name,
          team_id: project.team_id,
        }));
        allTasks.push(...tasksWithProject);
      }
      
      setTasks(allTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateTaskStatus(taskId: string, newStatus: TaskStatus) {
    try {
      await updateTask(taskId, { status: newStatus });
      await loadData();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await deleteTask(taskId);
      await loadData();
      setActiveTaskMenu(null);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  }

  async function handleCreateTask(project: any) {
    if (!user || !currentWorkspace) return;
    
    // Check if user can manage tasks
    const canManage = await isTeamLeaderOrInstructor(user.id, project.team_id, currentWorkspace.id);
    setCanManageTasks(canManage);
    
    if (canManage) {
      setSelectedTaskProject(project);
      setShowTaskModal(true);
    } else {
      alert('Only team leaders and instructors can create tasks');
    }
  }

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesFilter = true;
    if (statusFilter === 'my_tasks') {
      matchesFilter = task.assigned_to === user?.id;
    } else if (statusFilter !== 'all') {
      matchesFilter = task.status === statusFilter;
    }
    
    const matchesProject = selectedProject === 'all' || task.project_id === selectedProject;
    
    return matchesSearch && matchesFilter && matchesProject;
  });

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

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const taskCounts = {
    all: tasks.length,
    my_tasks: tasks.filter(t => t.assigned_to === user?.id).length,
    todo: tasks.filter(t => t.status === 'todo').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  if (!currentWorkspace) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <CheckSquare size={64} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Workspace Selected</h2>
            <p className="text-gray-600">Select a workspace to view tasks</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">All Tasks</h1>
            <p className="text-gray-600 mt-1">
              View and manage tasks across all projects in {currentWorkspace.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {projects.length > 0 && (
              <div className="relative group">
                <Button
                  variant="primary"
                  onClick={() => {
                    if (projects.length === 1) {
                      handleCreateTask(projects[0]);
                    }
                  }}
                  className="flex items-center space-x-2"
                >
                  <Plus size={20} />
                  <span>New Task</span>
                </Button>
                
                {/* Dropdown for project selection when multiple projects */}
                {projects.length > 1 && (
                  <div className="absolute right-0 top-12 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-10 min-w-[200px] hidden group-hover:block">
                    <p className="px-4 py-2 text-xs text-gray-500 font-semibold">Select Project</p>
                    {projects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => handleCreateTask(project)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                      >
                        {project.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500 focus:border-transparent"
            />
          </div>

          {/* Status & Project Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Status Filter */}
            <div className="flex items-center space-x-2 overflow-x-auto flex-1">
              <Filter size={20} className="text-gray-400 flex-shrink-0" />
              {(['all', 'my_tasks', 'todo', 'in_progress', 'completed'] as FilterType[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                    statusFilter === status
                      ? 'bg-qolabb-navy-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status === 'my_tasks' ? 'My Tasks' : status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                  <span className="ml-2 opacity-75">({taskCounts[status]})</span>
                </button>
              ))}
            </div>

            {/* Project Filter */}
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500 focus:border-transparent"
            >
              <option value="all">All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tasks List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 border border-gray-200 animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-3"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-12 text-center border-2 border-dashed border-gray-300"
          >
            <CheckSquare size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery || statusFilter !== 'all' || selectedProject !== 'all' ? 'No tasks found' : 'No tasks yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || statusFilter !== 'all' || selectedProject !== 'all'
                ? 'Try adjusting your filters or search query'
                : projects.length === 0
                ? 'Create a project first, then add tasks to get started'
                : 'Create your first task to start tracking work'}
            </p>
            {projects.length === 0 ? (
              <Button
                variant="secondary"
                onClick={() => window.location.href = '/projects'}
                className="flex items-center space-x-2 mx-auto"
              >
                <FolderKanban size={20} />
                <span>Go to Projects</span>
              </Button>
            ) : !searchQuery && statusFilter === 'all' && selectedProject === 'all' && projects.length === 1 ? (
              <Button
                variant="primary"
                onClick={() => handleCreateTask(projects[0])}
                className="flex items-center space-x-2 mx-auto"
              >
                <Plus size={20} />
                <span>Create First Task</span>
              </Button>
            ) : null}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.map((task, index) => {
              const statusConfig = getStatusConfig(task.status);
              const isMyTask = task.assigned_to === user?.id;
              
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all group relative"
                >
                  {/* Task Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                        {task.title}
                      </h3>
                      <div className="flex items-center text-xs text-gray-500 space-x-2">
                        <FolderKanban size={12} />
                        <span className="truncate">{task.project_name}</span>
                      </div>
                    </div>
                    
                    {/* More menu */}
                    <div className="relative ml-2">
                      <button
                        onClick={() => setActiveTaskMenu(activeTaskMenu === task.id ? null : task.id)}
                        className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical size={16} className="text-gray-400" />
                      </button>
                      
                      {activeTaskMenu === task.id && (
                        <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[150px]">
                          <button
                            onClick={() => {
                              handleDeleteTask(task.id);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                          >
                            <Trash2 size={14} className="mr-2" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {task.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  {/* Status & Priority */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusConfig.color}`}>
                      {statusConfig.icon}
                      {statusConfig.label}
                    </span>
                    <Flag size={14} className={getPriorityColor(task.priority)} />
                  </div>

                  {/* Assignee & Due Date */}
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                    {task.assignee ? (
                      <div className="flex items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold mr-1.5 ${
                          isMyTask ? 'bg-gradient-to-br from-qolabb-navy-600 to-qolabb-navy-400' : 'bg-gradient-to-br from-gray-400 to-gray-300'
                        }`}>
                          {task.assignee.full_name?.charAt(0) || 'U'}
                        </div>
                        <span className="truncate max-w-[100px]">
                          {isMyTask ? 'You' : task.assignee.full_name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">Unassigned</span>
                    )}
                    
                    {task.due_date && (
                      <span className="flex items-center">
                        <Calendar size={12} className="mr-1" />
                        {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Task Creation Modal */}
      {showTaskModal && selectedTaskProject && (
        <TaskModal
          isOpen={showTaskModal}
          onClose={() => {
            setShowTaskModal(false);
            setSelectedTaskProject(null);
          }}
          projectId={selectedTaskProject.id}
          teamId={selectedTaskProject.team_id}
          onTaskCreated={() => {
            loadData();
            setShowTaskModal(false);
            setSelectedTaskProject(null);
          }}
        />
      )}
    </DashboardLayout>
  );
}
