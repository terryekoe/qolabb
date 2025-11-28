'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
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
  ListTodo,
  LayoutTemplate,
  ListChecks,
  FileText,
  Link as LinkIcon,
  MessageSquare,
} from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/Button';
import Avatar from '@/components/ui/Avatar';
import { TaskModal } from '@/components/projects/TaskModal';
import { getProjectTasks, updateTask, deleteTask, isTeamLeaderOrInstructor, submitProject, getProjectSubmission, getProject, getProjectDiscussions } from '@/lib/db/queries';
import { useAuth } from '@/lib/auth/AuthContext';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { Project, Task, ProjectResource, ProjectSubmission, TaskStatus } from '@/lib/types/database';
import { ProjectDiscussion } from '@/lib/db/queries'; // Import from queries as it's defined there
import { ProjectDiscussions } from '@/components/communication/ProjectDiscussions';
import { ProjectSubmissionModal } from '@/components/projects/ProjectSubmissionModal';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [activeTaskMenu, setActiveTaskMenu] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [projectSubmission, setProjectSubmission] = useState<ProjectSubmission | null>(null);
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);
  const [activeTab, setActiveTab] = useState<'tasks' | 'discussions'>('tasks');
  const [viewMode, setViewMode] = useState<'team' | 'focus'>('focus');
  const [canManageTasks, setCanManageTasks] = useState(false);

  const [discussions, setDiscussions] = useState<ProjectDiscussion[]>([]);

  const loadTasks = useCallback(async () => {
    if (!params.id) return;
    try {
      const data = await getProjectTasks(params.id as string);
      setTasks(data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  }, [params.id]);

  useEffect(() => {
    async function loadAllProjectData() {
      if (!params.id || !currentWorkspace?.id) return;

      try {
        setLoading(true);
        const [projectData, tasksData, discussionsData, submissionData] = await Promise.all([
          getProject(params.id as string, currentWorkspace.id), // Assuming getProject takes workspace_id
          getProjectTasks(params.id as string),
          getProjectDiscussions(params.id as string),
          getProjectSubmission(params.id as string)
        ]);

        if (projectData) {
          setProject(projectData);
          // Check permissions
          if (user) {
            const canManage = await isTeamLeaderOrInstructor(user.id, projectData.team_id, projectData.workspace_id);
            setCanManageTasks(canManage);
          }
        }
        if (tasksData) setTasks(tasksData);
        if (discussionsData) setDiscussions(discussionsData);
        if (submissionData) setProjectSubmission(submissionData);
      } catch (error) {
        console.error('Error loading project data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadAllProjectData();
  }, [params.id, currentWorkspace?.id, user]);

  // Real-time subscriptions
  useEffect(() => {
    if (!params.id) return;

    const tasksChannel = supabase
      .channel(`project_tasks:${params.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${params.id}`,
        },
        () => {
          loadTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
    };
  }, [params.id, loadTasks]);

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

  const tasksByStatus = {
    todo: tasks.filter(t => t.status === 'todo'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    completed: tasks.filter(t => t.status === 'completed'),
  };

  const completionPercentage = tasks.length > 0 
    ? Math.round((tasksByStatus.completed.length / tasks.length) * 100)
    : 0;

  if (loading || !project) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading assignment...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full overflow-hidden bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4 flex-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="flex items-center"
              >
                <ArrowLeft size={20} className="mr-2" />
                Back
              </Button>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{project.name}</h1>
                {project.description && (
                  <p className="text-gray-600 dark:text-gray-400">{project.description}</p>
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
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center gap-3">
              <div className="hidden md:flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
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
              </div>
              
              {/* Create Task Button (for group leaders/instructors) */}
              {canManageTasks && (
                <div className="flex gap-2">
                  {!projectSubmission ? (
                    <button
                      onClick={() => setShowSubmissionModal(true)}
                      className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium shadow-sm"
                    >
                      Submit Project
                    </button>
                  ) : (
                    <div className="flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium border border-green-200">
                      <CheckCircle2 size={16} className="mr-2" />
                      Submitted
                    </div>
                  )}
                  <button
                    onClick={() => setShowTaskModal(true)}
                    className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium shadow-sm"
                  >
                    <Plus size={16} className="mr-2" />
                    Create Task
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
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
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden" style={{ height: 'calc(100vh - 344px)' }}>
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
                {project.resources && project.resources.length > 0 ? (
                  project.resources.map((resource: any) => (
                    <a
                      key={resource.id}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="bg-blue-100 text-blue-600 p-2 rounded mr-3">
                        <LinkIcon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{resource.name}</div>
                        <div className="text-xs text-gray-500 truncate">{resource.url}</div>
                      </div>
                    </a>
                  ))
                ) : (
                  <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
                    No resources attached to this assignment
                  </div>
                )}
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

            {/* Column 3: Project Discussions */}
            <div className="w-full md:w-1/4 bg-white dark:bg-gray-800 flex flex-col h-full">
              {user?.id ? (
                <ProjectDiscussions 
                  projectId={project.id} 
                  userId={user.id}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-gray-500">
                  Log in to view discussions
                </div>
              )}
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
            <div className="flex-1 overflow-hidden flex flex-col bg-white dark:bg-gray-800">
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
                      {/* Kanban board columns - simplified for brevity, keeping the task card structure from modal */}
                      {(['todo', 'in_progress', 'completed'] as const).map((status) => (
                        <div key={status}>
                          <div className="flex items-center mb-4">
                            {status === 'todo' && <AlertCircle size={18} className="text-orange-600 mr-2" />}
                            {status === 'in_progress' && <Clock size={18} className="text-blue-600 mr-2" />}
                            {status === 'completed' && <CheckCircle2 size={18} className="text-green-600 mr-2" />}
                            <h4 className="font-semibold text-gray-900">
                              {status === 'todo' && 'To Do'}
                              {status === 'in_progress' && 'In Progress'}
                              {status === 'completed' && 'Completed'}
                            </h4>
                            <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-semibold ${
                              status === 'todo' ? 'bg-orange-100 text-orange-700' :
                              status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {tasksByStatus[status].length}
                            </span>
                          </div>
                          <div className="space-y-3">
                            {tasksByStatus[status].map((task: any) => (
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
                      ))}
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
      </div>

      {/* Task Creation Modal */}
      {showTaskModal && (
        <TaskModal
          isOpen={showTaskModal}
          onClose={() => setShowTaskModal(false)}
          projectId={project.id}
          teamId={project.team_id}
          onTaskCreated={loadTasks}
        />
      )}

      {/* Project Submission Modal */}
      {showSubmissionModal && user && (
        <ProjectSubmissionModal
          isOpen={showSubmissionModal}
          onClose={() => setShowSubmissionModal(false)}
          projectId={project.id}
          userId={user.id}
          onSubmissionComplete={(submission) => setProjectSubmission(submission)}
        />
      )}
    </DashboardLayout>
  );
}

// Task Card Component (same as in modal)
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
        <Flag size={14} className={
          task.priority === 'high' ? 'text-red-600' :
          task.priority === 'medium' ? 'text-yellow-600' :
          'text-gray-600'
        } />
        
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
