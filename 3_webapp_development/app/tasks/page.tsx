'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  GripVertical,
  BarChart3,
  Sun,
  Sparkles,
  HelpCircle,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/Button';
import { TaskModal } from '@/components/projects/TaskModal';
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal';
import { TeamWorkloadWidget } from '@/components/tasks/TeamWorkloadWidget';
import { ContributionLogModal } from '@/components/tasks/ContributionLogModal';
import { useAuth } from '@/lib/auth/AuthContext';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  getWorkspaceProjects,
  getProjectTasks,
  updateTask,
  deleteTask,
  isTeamLeaderOrInstructor,
} from '@/lib/db/queries';
import type { TaskStatus, TaskPriority } from '@/lib/types/database';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type FilterType = 'all' | 'my_tasks' | 'todo' | 'in_progress' | 'completed';

// Draggable Task Card Component
interface DraggableTaskCardProps {
  task: any;
  user: any;
  getStatusConfig: (status: TaskStatus) => any;
  getPriorityColor: (priority: TaskPriority) => string;
  activeTaskMenu: string | null;
  setActiveTaskMenu: (id: string | null) => void;
  handleDeleteTask: (id: string) => void;
  onTaskClick: (task: any) => void;
}

function DraggableTaskCard({
  task,
  user,
  getStatusConfig,
  getPriorityColor,
  activeTaskMenu,
  setActiveTaskMenu,
  handleDeleteTask,
  onTaskClick,
}: DraggableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Check if task is assigned to current user (either via old assigned_to or new assignees)
  const isMyTask = task.assigned_to === user?.id || 
    (task.assignees && task.assignees.some((a: any) => {
      const assignee = a.user || a;
      return assignee?.id === user?.id || a?.user_id === user?.id;
    }));
  const statusConfig = getStatusConfig(task.status);

  // Use a ref to track if we're dragging to prevent onClick interference
  const dragStartRef = React.useRef<boolean>(false);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all group relative cursor-pointer"
      onClick={(e) => {
        // Only trigger task click if not dragging (activation distance will prevent this for drags)
        if (!dragStartRef.current && !isDragging) {
          onTaskClick(task);
        }
        dragStartRef.current = false;
      }}
    >
      <div className="flex items-start gap-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onMouseDown={() => {
            // Mark that we started a drag
            dragStartRef.current = true;
          }}
        >
          <GripVertical size={16} className="text-gray-400" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0 pr-2">
              <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
                {task.title}
              </h3>
              <div className="flex items-center text-xs text-gray-500 space-x-1.5">
                <FolderKanban size={10} />
                <span className="truncate">{task.project_name}</span>
              </div>
            </div>
            
            <div className="relative">
              <button
                onClick={() => setActiveTaskMenu(activeTaskMenu === task.id ? null : task.id)}
                className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical size={14} className="text-gray-400" />
              </button>
              
              {activeTaskMenu === task.id && (
                <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 flex items-center"
                  >
                    <Trash2 size={12} className="mr-2" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          {task.description && (
            <p className="text-xs text-gray-600 mb-2 line-clamp-2">
              {task.description}
            </p>
          )}

          <div className="flex items-center justify-between mb-2">
            <Flag size={12} className={getPriorityColor(task.priority)} />
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
            {(task.assignees && task.assignees.length > 0) ? (
              <div className="flex items-center">
                {task.assignees.slice(0, 1).map((assigneeItem: any) => {
                  const assignee = assigneeItem.user || assigneeItem;
                  const assigneeIsMe = assignee?.id === user?.id || assigneeItem?.user_id === user?.id;
                  return (
                    <div key={assigneeItem.id || assigneeItem.user_id} className="flex items-center">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold mr-1 ${
                          assigneeIsMe
                            ? 'bg-gradient-to-br from-blue-600 to-blue-400'
                            : 'bg-gradient-to-br from-gray-400 to-gray-300'
                        }`}
                      >
                        {assignee?.full_name?.charAt(0) || 'U'}
                      </div>
                      <span className="truncate max-w-[80px]">
                        {assigneeIsMe ? 'You' : assignee?.full_name || 'Unknown User'}
                      </span>
                      {task.assignees.length > 1 && (
                        <span className="ml-1 text-gray-400">+{task.assignees.length - 1}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : task.assignee ? (
              <div className="flex items-center">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold mr-1 ${
                    isMyTask
                      ? 'bg-gradient-to-br from-blue-600 to-blue-400'
                      : 'bg-gradient-to-br from-gray-400 to-gray-300'
                  }`}
                >
                  {task.assignee.full_name?.charAt(0) || 'U'}
                </div>
                <span className="truncate max-w-[80px]">
                  {isMyTask ? 'You' : task.assignee.full_name}
                </span>
              </div>
            ) : (
              <span className="text-gray-400">Unassigned</span>
            )}

            {task.due_date && (
              <span className="flex items-center">
                <Calendar size={10} className="mr-1" />
                {new Date(task.due_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Kanban Column Component
interface KanbanColumnProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  count: number;
  color: string;
  tasks: any[];
  user: any;
  getStatusConfig: (status: TaskStatus) => any;
  getPriorityColor: (priority: TaskPriority) => string;
  activeTaskMenu: string | null;
  setActiveTaskMenu: (id: string | null) => void;
  handleDeleteTask: (id: string) => void;
  onTaskClick: (task: any) => void;
}

function KanbanColumn({
  id,
  title,
  icon,
  count,
  color,
  tasks,
  user,
  getStatusConfig,
  getPriorityColor,
  activeTaskMenu,
  setActiveTaskMenu,
  handleDeleteTask,
  onTaskClick,
}: KanbanColumnProps) {
  const colorClasses = {
    orange: 'bg-qolabb-orange-100 text-qolabb-orange-700',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-qolabb-green-100 text-qolabb-green-700',
  };

  // Make the column a droppable area
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div 
      ref={setNodeRef}
      className={`bg-gray-50 rounded-xl p-4 transition-colors ${
        isOver ? 'bg-gray-100 ring-2 ring-blue-400 ring-offset-2' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="font-semibold text-gray-900">{title}</h4>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            colorClasses[color as keyof typeof colorClasses]
          }`}
        >
          {count}
        </span>
      </div>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 min-h-[200px]">
          {tasks.map((task) => (
            <DraggableTaskCard
              key={task.id}
              task={task}
              user={user}
              getStatusConfig={getStatusConfig}
              getPriorityColor={getPriorityColor}
              activeTaskMenu={activeTaskMenu}
              setActiveTaskMenu={setActiveTaskMenu}
              handleDeleteTask={handleDeleteTask}
              onTaskClick={onTaskClick}
            />
          ))}
          {tasks.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-400 border-2 border-dashed border-gray-300 rounded-lg">
              Drop tasks here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export default function TasksPage() {
  const { user, profile } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const router = useRouter();
  
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'focus' | 'board' | 'all' | 'team'>('focus');
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Task detail modal
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  
  // Contribution log modal
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [taskForContribution, setTaskForContribution] = useState<any>(null);
  
  // Advanced filtering
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<'all' | 'me' | 'unassigned'>('all');
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'created' | 'due_date' | 'priority' | 'title'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Bulk actions
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // Quick edit
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  
  // Keyboard shortcuts
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadData = useCallback(async () => {
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
  }, [currentWorkspace, user]);

  useEffect(() => {
    if (currentWorkspace) {
      loadData();
    }
  }, [currentWorkspace, loadData]);

  // Real-time subscriptions for tasks and task_assignees
  useEffect(() => {
    if (!currentWorkspace?.id) return;

    // Subscribe to tasks changes - listen to all tasks in workspace's projects
    const tasksChannel = supabase
      .channel(`tasks:workspace:${currentWorkspace.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          // Only reload if task belongs to a project in our workspace
          // We'll check this by reloading (loadData fetches all workspace projects and their tasks)
          loadData();
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
          loadData();
        }
      )
      .subscribe();

    // Subscribe to projects changes (new projects might have tasks)
    const projectsChannel = supabase
      .channel(`projects:workspace:${currentWorkspace.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `workspace_id=eq.${currentWorkspace.id}`,
        },
        () => {
          // Reload data when projects change
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(projectsChannel);
    };
  }, [currentWorkspace?.id, loadData]);
  
  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyPress(e: KeyboardEvent) {
      // CMD/CTRL + K = Search focus
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('task-search')?.focus();
      }
      
      // CMD/CTRL + N = New task
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        if (projects.length === 1) {
          handleCreateTask(projects[0]);
        }
      }
      
      // ESC = Clear selection and close expandable panels
      if (e.key === 'Escape') {
        setSelectedTasks(new Set());
        setEditingTask(null);
        setActiveTaskMenu(null);
        setShowFilters(false);
      }
      
      // CMD/CTRL + A = Select all
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && tasks.length > 0) {
        e.preventDefault();
        const filtered = tasks.filter(task => {
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
        setSelectedTasks(new Set(filtered.map(t => t.id)));
      }
      
      // ? = Show shortcuts
      if (e.key === '?' && !editingTask) {
        setShowShortcuts(!showShortcuts);
      }
    }
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showShortcuts, projects, tasks, searchQuery, statusFilter, selectedProject, user, editingTask]);

  async function handleUpdateTaskStatus(taskId: string, newStatus: TaskStatus) {
    try {
      // Check if user is instructor - instructors cannot complete tasks
      const userRole = profile?.role?.toLowerCase() || '';
      if ((userRole === 'instructor' || userRole === 'teaching_assistant') && newStatus === 'completed') {
        alert('Instructors and TAs cannot complete tasks. Please assign tasks to students.');
        await loadData(); // Reload to revert any optimistic update
        return;
      }
      
      // IMPORTANT: Capture task info BEFORE updating, so we can show modal after
      const taskBeforeUpdate = tasks.find(t => t.id === taskId);
      const oldStatus = taskBeforeUpdate?.status;
      const wasJustCompleted = oldStatus !== 'completed' && newStatus === 'completed';
      const isMyTask = taskBeforeUpdate?.assigned_to === user?.id;
      
      console.log('Task status update:', {
        taskId,
        oldStatus,
        newStatus,
        wasJustCompleted,
        isMyTask,
        assignedTo: taskBeforeUpdate?.assigned_to,
        userId: user?.id,
        task: taskBeforeUpdate
      });
      
      // Optimistic update
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );
      
      await updateTask(taskId, { status: newStatus });
      
      // Show contribution modal BEFORE reloading data (so we have the task info)
      if (wasJustCompleted && isMyTask && taskBeforeUpdate) {
        console.log('Showing contribution modal for task:', taskBeforeUpdate.id);
        setTaskForContribution({
          id: taskBeforeUpdate.id,
          title: taskBeforeUpdate.title,
          description: taskBeforeUpdate.description,
          project_id: taskBeforeUpdate.project_id,
        });
        setShowContributionModal(true);
      } else {
        console.log('Not showing modal:', {
          wasJustCompleted,
          isMyTask,
          hasTask: !!taskBeforeUpdate
        });
      }
      
      // Reload data after showing modal (or if modal shouldn't show)
      await loadData();
    } catch (error: any) {
      // Better error handling
      const errorMessage = error?.message || error?.error_description || JSON.stringify(error, null, 2) || 'Unknown error';
      const errorDetails = error?.details || error?.hint || '';
      
      console.error('Error updating task:', {
        message: errorMessage,
        details: errorDetails,
        code: error?.code,
        taskId,
        newStatus,
        error,
      });
      
      // Revert on error by reloading data
      try {
      await loadData();
      } catch (reloadError) {
        console.error('Error reloading data after task update failure:', reloadError);
      }
      
      // Show user-friendly error message
      alert(`Failed to update task status: ${errorMessage}`);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    
    setActiveId(null);
    
    if (!over) return;
    
    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;
    
    // Validate that the new status is a valid TaskStatus
    const validStatuses: TaskStatus[] = ['todo', 'in_progress', 'completed'];
    if (!validStatuses.includes(newStatus)) {
      console.warn('Invalid task status:', newStatus);
      return;
    }
    
    // Find the task to check if status actually changed
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      console.warn('Task not found:', taskId);
      return;
    }
    
    if (task.status === newStatus) {
      // No change needed
      return;
    }
    
    await handleUpdateTaskStatus(taskId, newStatus);
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
  
  // Task detail modal
  async function openTaskDetail(task: any) {
    if (!task || !user || !currentWorkspace) return;
    
    // Check if user can manage this task
    const canManage = await isTeamLeaderOrInstructor(user.id, task.team_id, currentWorkspace.id);
    setCanManageTasks(canManage);
    
    setSelectedTask(task);
    setShowTaskDetail(true);
  }
  
  function closeTaskDetail() {
    setShowTaskDetail(false);
    setSelectedTask(null);
  }
  
  async function handleTaskUpdated() {
    await loadData();
    closeTaskDetail();
  }
  
  async function handleTaskDeleted() {
    await loadData();
    closeTaskDetail();
  }
  
  // Bulk actions
  function toggleTaskSelection(taskId: string) {
    const newSelection = new Set(selectedTasks);
    if (newSelection.has(taskId)) {
      newSelection.delete(taskId);
    } else {
      newSelection.add(taskId);
    }
    setSelectedTasks(newSelection);
  }
  
  function selectAllTasks() {
    const filtered = tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           task.description?.toLowerCase().includes(searchQuery.toLowerCase());
      let matchesFilter = true;
      if (statusFilter === 'my_tasks') {
        matchesFilter = isTaskAssignedToUser(task);
      } else if (statusFilter !== 'all') {
        matchesFilter = task.status === statusFilter;
      }
      const matchesProject = selectedProject === 'all' || task.project_id === selectedProject;
      return matchesSearch && matchesFilter && matchesProject;
    });
    setSelectedTasks(new Set(filtered.map(t => t.id)));
  }
  
  function clearSelection() {
    setSelectedTasks(new Set());
  }
  
  async function bulkUpdateStatus(newStatus: TaskStatus) {
    try {
      const updates = Array.from(selectedTasks).map(taskId =>
        updateTask(taskId, { status: newStatus })
      );
      await Promise.all(updates);
      await loadData();
      clearSelection();
    } catch (error) {
      console.error('Bulk update error:', error);
    }
  }
  
  async function bulkDeleteTasks() {
    if (!confirm(`Delete ${selectedTasks.size} tasks? This cannot be undone.`)) return;
    
    try {
      const deletes = Array.from(selectedTasks).map(taskId => deleteTask(taskId));
      await Promise.all(deletes);
      await loadData();
      clearSelection();
    } catch (error) {
      console.error('Bulk delete error:', error);
    }
  }
  
  // Quick edit
  function startEditingTask(task: any) {
    setEditingTask(task.id);
    setEditTitle(task.title);
  }
  
  async function saveTaskEdit(taskId: string) {
    if (!editTitle.trim()) return;
    
    try {
      await updateTask(taskId, { title: editTitle.trim() });
      await loadData();
      setEditingTask(null);
    } catch (error) {
      console.error('Edit task error:', error);
    }
  }
  
  function cancelEdit() {
    setEditingTask(null);
    setEditTitle('');
  }

  // Advanced filter tasks
  const filteredTasks = tasks.filter(task => {
    // Search filter
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status filter
    let matchesStatus = true;
    if (statusFilter === 'my_tasks') {
      matchesStatus = isTaskAssignedToUser(task);
    } else if (statusFilter !== 'all') {
      matchesStatus = task.status === statusFilter;
    }
    
    // Project filter
    const matchesProject = selectedProject === 'all' || task.project_id === selectedProject;
    
    // Priority filter
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    
    // Assignee filter
    let matchesAssignee = true;
    if (assigneeFilter === 'me') {
      matchesAssignee = isTaskAssignedToUser(task);
    } else if (assigneeFilter === 'unassigned') {
      // Check both old assigned_to and new assignees array
      matchesAssignee = !task.assigned_to && (!task.assignees || task.assignees.length === 0);
    }
    
    // Overdue filter
    let matchesOverdue = true;
    if (showOverdueOnly && task.due_date) {
      const dueDate = new Date(task.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      matchesOverdue = dueDate < today && task.status !== 'completed';
    } else if (showOverdueOnly) {
      matchesOverdue = false; // Tasks without due dates can't be overdue
    }
    
    return matchesSearch && matchesStatus && matchesProject && matchesPriority && matchesAssignee && matchesOverdue;
  });
  
  // Sort tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'due_date':
        if (!a.due_date && !b.due_date) comparison = 0;
        else if (!a.due_date) comparison = 1;
        else if (!b.due_date) comparison = -1;
        else comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        break;
      case 'priority':
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        comparison = (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
                     (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
        break;
      case 'created':
      default:
        comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const getStatusConfig = (status: TaskStatus) => {
    switch (status) {
      case 'todo':
        return {
          color: 'text-qolabb-orange-700 bg-qolabb-orange-50 border-qolabb-orange-200',
          icon: <AlertCircle size={14} />,
          label: 'To Start',
        };
      case 'in_progress':
        return {
          color: 'text-blue-700 bg-blue-50 border-blue-200',
          icon: <Clock size={14} />,
          label: 'Doing',
        };
      case 'completed':
      default:
        return {
          color: 'text-qolabb-green-700 bg-qolabb-green-50 border-qolabb-green-200',
          icon: <CheckCircle2 size={14} />,
          label: 'Done',
        };
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'high': return 'text-qolabb-orange-600';
      case 'medium': return 'text-qolabb-yellow-600';
      case 'low': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  // Helper function to check if a task is assigned to the current user
  const isTaskAssignedToUser = (task: any) => {
    if (!user?.id) return false;
    // Check old single assignee field
    if (task.assigned_to === user.id) return true;
    // Check new multiple assignees
    if (task.assignees && Array.isArray(task.assignees)) {
      return task.assignees.some((a: any) => {
        const assignee = a.user || a;
        return assignee?.id === user.id || a?.user_id === user.id;
      });
    }
    return false;
  };

  // Group tasks by status for Kanban view
  const tasksByStatus = {
    todo: sortedTasks.filter(t => t.status === 'todo'),
    in_progress: sortedTasks.filter(t => t.status === 'in_progress'),
    completed: sortedTasks.filter(t => t.status === 'completed'),
  };

  const taskCounts = {
    all: tasks.length,
    my_tasks: tasks.filter(isTaskAssignedToUser).length,
    todo: tasks.filter(t => t.status === 'todo').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };
  
  // Count overdue tasks
  const overdueCount = tasks.filter((t) => {
    if (!t.due_date || t.status === 'completed') return false;
    const dueDate = new Date(t.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  }).length;

  const userFirstName = React.useMemo(() => {
    if (!profile?.full_name) return 'there';
    const firstPiece = profile.full_name.trim().split(' ')[0];
    return firstPiece.length > 0 ? firstPiece : profile.full_name;
  }, [profile?.full_name]);

  const friendlyStatusLabel = React.useCallback((status: TaskStatus) => {
    switch (status) {
      case 'todo':
        return 'To Start';
      case 'in_progress':
        return 'Doing';
      case 'completed':
      default:
        return 'Done';
    }
  }, []);

  const sortByUrgency = React.useCallback((a: any, b: any) => {
    const aDue = a.due_date ? new Date(a.due_date).getTime() : Infinity;
    const bDue = b.due_date ? new Date(b.due_date).getTime() : Infinity;
    if (aDue !== bDue) {
      return aDue - bDue;
    }
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  }, []);

  const isSupportRole = React.useMemo(() => {
    const role = profile?.role?.toLowerCase();
    if (!role) return false;
    return ['instructor', 'teaching_assistant', 'admin'].includes(role);
  }, [profile?.role]);

  const myTasksAll = React.useMemo(() => tasks.filter(isTaskAssignedToUser), [tasks, isTaskAssignedToUser]);
  const myActiveTasks = React.useMemo(
    () => myTasksAll.filter((task: any) => task.status !== 'completed'),
    [myTasksAll]
  );
  const upcomingTasks = React.useMemo(
    () => [...myActiveTasks].sort(sortByUrgency).slice(0, 5),
    [myActiveTasks, sortByUrgency]
  );
  const overdueMyTasks = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return myActiveTasks
      .filter((task: any) => {
        if (!task.due_date) return false;
        const dueDate = new Date(task.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today;
      })
      .sort(sortByUrgency);
  }, [myActiveTasks, sortByUrgency]);
  const recentWins = React.useMemo(() => {
    return myTasksAll
      .filter((task: any) => task.status === 'completed')
      .sort((a: any, b: any) => {
        const aDate = new Date(a.updated_at || a.completed_at || a.created_at).getTime();
        const bDate = new Date(b.updated_at || b.completed_at || b.created_at).getTime();
        return bDate - aDate;
      })
      .slice(0, 4);
  }, [myTasksAll]);
  const unassignedTeamTasks = React.useMemo(
    () =>
      tasks.filter(
        (task) =>
          task.status !== 'completed' &&
          !task.assigned_to &&
          (!task.assignees || task.assignees.length === 0)
      ),
    [tasks]
  );

  const formatDueDate = React.useCallback((due: string | null | undefined) => {
    if (!due) return 'No due date';
    return new Date(due).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const resetFilters = React.useCallback(() => {
    setStatusFilter('all');
    setSelectedProject('all');
    setPriorityFilter('all');
    setAssigneeFilter('all');
    setShowOverdueOnly(false);
    setSortBy('created');
    setSortOrder('desc');
    setSearchQuery('');
  }, []);

  const viewTabs = [
    { id: 'focus', label: 'My Day', description: 'Start with what matters', icon: Sun },
    { id: 'board', label: 'Team Board', description: 'See work by stage', icon: FolderKanban },
    { id: 'all', label: 'Task Library', description: 'Browse every task', icon: CheckSquare },
    { id: 'team', label: 'Team Workload', description: 'Balance work fairly', icon: UsersIcon },
  ] as const;

  const renderFocusView = () => {
    const hasMyTasks = upcomingTasks.length > 0;

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/70">
                <Sun size={16} />
                Today's focus
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold">Hi {userFirstName}, let's move one task forward.</h1>
              <p className="text-sm sm:text-base text-white/80">
                Pick the next step from the list. Status words stay simple: <strong>To Start</strong>, <strong>Doing</strong>, <strong>Done</strong>.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="secondary"
                onClick={() => setViewMode('board')}
                className="flex items-center gap-2 !bg-white !text-blue-600 hover:!bg-white/90"
              >
                <FolderKanban size={18} />
                Open team board
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowAdvancedTools(true)}
                className="!text-white !border !border-white/40 hover:!bg-white/10"
              >
                Show task options
              </Button>
            </div>
          </div>
        </div>

        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles size={18} className="text-blue-500" />
                Your next steps
              </h2>
              <p className="text-sm text-gray-600">Choose one task to start. You can always come back for more.</p>
            </div>
            {hasMyTasks && (
              <span className="text-xs text-gray-500">
                Showing up to {Math.min(upcomingTasks.length, 5)} task{upcomingTasks.length === 1 ? '' : 's'} needing attention
              </span>
            )}
          </div>

          {hasMyTasks ? (
            <div className="space-y-3">
              {upcomingTasks.map((task: any) => {
                const dueDate = task.due_date ? new Date(task.due_date) : null;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const isOverdue = !!dueDate && dueDate < today;
                const isDueSoon = !!dueDate && !isOverdue && dueDate.getTime() - today.getTime() <= 1000 * 60 * 60 * 48;
                const statusConfig = getStatusConfig(task.status);

                const nextAction: { label: string; status: TaskStatus } | null =
                  task.status === 'todo'
                    ? { label: 'Start task', status: 'in_progress' }
                    : task.status === 'in_progress'
                    ? { label: 'Mark done', status: 'completed' }
                    : null;

                return (
                  <div
                    key={task.id}
                    className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm transition-all hover:border-blue-200 hover:shadow-md cursor-pointer"
                    onClick={() => openTaskDetail(task)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm sm:text-base line-clamp-2">{task.title}</p>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <FolderKanban size={12} />
                          <span className="truncate">{task.project_name}</span>
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                          isOverdue
                            ? 'bg-qolabb-orange-100 text-qolabb-orange-700'
                            : isDueSoon
                            ? 'bg-qolabb-yellow-100 text-qolabb-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        <Calendar size={12} />
                        {formatDueDate(task.due_date)}
                      </span>
                    </div>

                    {task.description && (
                      <p className="mt-3 text-sm text-gray-600 line-clamp-2">{task.description}</p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${statusConfig.color}`}>
                        {statusConfig.icon}
                        {statusConfig.label}
                      </span>
                      {task.priority && (
                        <span className="inline-flex items-center gap-1">
                          <Flag size={12} className={getPriorityColor(task.priority)} />
                          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} priority
                        </span>
                      )}
                      {task.assignees && task.assignees.length > 1 && (
                        <span className="inline-flex items-center gap-1 text-gray-500">
                          <UsersIcon size={12} />
                          {task.assignees.length} teammates
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {nextAction && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleUpdateTaskStatus(task.id, nextAction.status);
                          }}
                        >
                          {nextAction.label}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(event) => {
                          event.stopPropagation();
                          openTaskDetail(task);
                        }}
                      >
                        View details
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
              <p className="text-lg font-semibold text-gray-900 mb-2">You're all caught up!</p>
              <p className="text-sm text-gray-600 mb-4">
                No tasks are assigned to you yet. Browse the board or create one together.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="primary" onClick={() => setViewMode('board')} className="flex items-center gap-2">
                  <FolderKanban size={18} />
                  Browse board
                </Button>
                {projects.length > 0 && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (projects.length === 1) {
                        handleCreateTask(projects[0]);
                      } else {
                        setShowAdvancedTools(true);
                      }
                    }}
                  >
                    Create a task with my team
                  </Button>
                )}
              </div>
            </div>
          )}
        </section>

        {overdueMyTasks.length > 0 && (
          <section className="bg-qolabb-orange-50 border border-qolabb-orange-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-qolabb-orange-800 font-semibold">
              <AlertCircle size={18} />
              Needs attention soon
            </div>
            <p className="text-sm text-qolabb-orange-700">
              These tasks are past their due date. Open the details to ask for help or reassign together.
            </p>
            <div className="space-y-2">
              {overdueMyTasks.slice(0, 3).map((task: any) => (
                <button
                  key={task.id}
                  onClick={() => openTaskDetail(task)}
                  className="w-full bg-white/80 hover:bg-white border border-red-100 rounded-lg px-3 py-2 flex items-center justify-between text-left transition"
                >
                  <span className="text-sm font-medium text-qolabb-orange-800 truncate pr-3">{task.title}</span>
                  <span className="text-xs text-qolabb-orange-700">{formatDueDate(task.due_date)}</span>
                </button>
              ))}
            </div>
            {overdueMyTasks.length > 3 && (
              <p className="text-xs text-qolabb-orange-700">+{overdueMyTasks.length - 3} more overdue task{overdueMyTasks.length - 3 === 1 ? '' : 's'} on the board</p>
            )}
          </section>
        )}

        {isSupportRole && unassignedTeamTasks.length > 0 && (
          <section className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-blue-900 font-semibold">
              <Lightbulb size={18} />
              Tasks waiting for an owner
            </div>
            <p className="text-sm text-blue-800">
              {unassignedTeamTasks.length} task{unassignedTeamTasks.length === 1 ? '' : 's'} need someone to take the lead. Assign a teammate or invite learners from the team board.
            </p>
            <Button variant="secondary" onClick={() => setViewMode('board')} className="flex items-center gap-2 w-fit">
              <UsersIcon size={16} />
              Review together
            </Button>
          </section>
        )}

        {recentWins.length > 0 && (
          <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-qolabb-green-700 font-semibold mb-3">
              <CheckCircle2 size={18} />
              Recent wins
            </div>
            <div className="space-y-2">
              {recentWins.map((task: any) => (
                <div key={task.id} className="flex items-center justify-between text-sm text-gray-700">
                  <span className="truncate pr-3">{task.title}</span>
                  <span className="text-xs text-gray-400">{formatDueDate(task.updated_at || task.completed_at || task.created_at)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <HelpCircle size={18} className="text-blue-500 mt-1" />
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-900">Quick tips</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Start one task at a time. When you finish, log what you contributed so the class can celebrate it.</li>
                <li>• If something feels unclear, open the task details and leave a comment asking for next steps.</li>
                <li>• Need more controls? Tap "Show task options" above to reveal filters and advanced tools.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    );
  };

  const renderBoardView = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((column) => (
            <div key={column} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              {[1, 2, 3].map((card) => (
                <div key={card} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      );
    }

    if (filteredTasks.length === 0) {
      return (
        <div className="bg-white rounded-xl p-12 text-center border-2 border-dashed border-gray-300">
          <FolderKanban size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No tasks match your filters</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Clear filters or widen the search to see cards. You can drag between columns to update status at any time.
          </p>
          <Button variant="secondary" onClick={() => resetFilters()} className="flex items-center gap-2 mx-auto">
            <Filter size={16} />
            Clear filters
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Team board</h2>
          <p className="text-sm text-gray-600">
            Drag cards between <strong>To Start</strong>, <strong>Doing</strong>, and <strong>Done</strong>. Everyone sees updates immediately.
          </p>
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <KanbanColumn
              id="todo"
              title="To Start"
              icon={<AlertCircle size={18} className="text-qolabb-orange-600" />}
              count={tasksByStatus.todo.length}
              color="orange"
              tasks={tasksByStatus.todo}
              user={user}
              getStatusConfig={getStatusConfig}
              getPriorityColor={getPriorityColor}
              activeTaskMenu={activeTaskMenu}
              setActiveTaskMenu={setActiveTaskMenu}
              handleDeleteTask={handleDeleteTask}
              onTaskClick={openTaskDetail}
            />
            <KanbanColumn
              id="in_progress"
              title="Doing"
              icon={<Clock size={18} className="text-blue-600" />}
              count={tasksByStatus.in_progress.length}
              color="blue"
              tasks={tasksByStatus.in_progress}
              user={user}
              getStatusConfig={getStatusConfig}
              getPriorityColor={getPriorityColor}
              activeTaskMenu={activeTaskMenu}
              setActiveTaskMenu={setActiveTaskMenu}
              handleDeleteTask={handleDeleteTask}
              onTaskClick={openTaskDetail}
            />
            <KanbanColumn
              id="completed"
              title="Done"
              icon={<CheckCircle2 size={18} className="text-qolabb-green-600" />}
              count={tasksByStatus.completed.length}
              color="green"
              tasks={tasksByStatus.completed}
              user={user}
              getStatusConfig={getStatusConfig}
              getPriorityColor={getPriorityColor}
              activeTaskMenu={activeTaskMenu}
              setActiveTaskMenu={setActiveTaskMenu}
              handleDeleteTask={handleDeleteTask}
              onTaskClick={openTaskDetail}
            />
          </div>

          <DragOverlay>
            {activeId ? (
              <div className="bg-white border-2 border-blue-500 rounded-xl p-4 shadow-2xl opacity-90">
                <p className="font-semibold text-gray-900">{filteredTasks.find((t) => t.id === activeId)?.title}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    );
  };

  const renderAllTasksView = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-gray-200 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-3" />
              <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      );
    }

    if (filteredTasks.length === 0) {
      return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl p-12 text-center border-2 border-dashed border-gray-300">
          <CheckSquare size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No tasks match your filters</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Adjust the search or filters to see more tasks. You can also show completed work or tasks waiting for an owner.
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Button variant="secondary" onClick={() => resetFilters()} className="flex items-center gap-2">
              <Filter size={16} />
              Clear filters
            </Button>
            <Button variant="primary" onClick={() => setViewMode('board')} className="flex items-center gap-2">
              <FolderKanban size={18} />
              Open board
            </Button>
          </div>
        </motion.div>
      );
    }

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Task library ({filteredTasks.length})</h3>
          <p className="text-sm text-gray-600">Click any task to open the full details, files, and conversation.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task: any, index: number) => {
            const statusConfig = getStatusConfig(task.status);
            const isMyTask = isTaskAssignedToUser(task);

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all group relative cursor-pointer"
                onClick={() => openTaskDetail(task)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{task.title}</h3>
                    <div className="flex items-center text-xs text-gray-500 space-x-2">
                      <FolderKanban size={12} />
                      <span className="truncate">{task.project_name}</span>
                    </div>
                  </div>
                  <div className="relative ml-2">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setActiveTaskMenu(activeTaskMenu === task.id ? null : task.id);
                      }}
                      className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical size={16} className="text-gray-400" />
                    </button>
                    {activeTaskMenu === task.id && (
                      <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[150px]">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
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

                {task.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
                )}

                <div className="flex items-center justify-between mb-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusConfig.color}`}>
                    {statusConfig.icon}
                    {statusConfig.label}
                  </span>
                  <Flag size={14} className={getPriorityColor(task.priority)} />
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                  {task.assignees && task.assignees.length > 0 ? (
                    <div className="flex items-center">
                      {task.assignees.slice(0, 1).map((assigneeItem: any) => {
                        const assignee = assigneeItem.user || assigneeItem;
                        const assigneeIsMe = assignee?.id === user?.id || assigneeItem?.user_id === user?.id;
                        return (
                          <div key={assigneeItem.id || assigneeItem.user_id} className="flex items-center">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold mr-1.5 ${
                                assigneeIsMe
                                  ? 'bg-gradient-to-br from-blue-600 to-blue-400'
                                  : 'bg-gradient-to-br from-gray-400 to-gray-300'
                              }`}
                            >
                              {assignee?.full_name?.charAt(0) || 'U'}
                            </div>
                            <span className="truncate max-w-[110px]">{assigneeIsMe ? 'You' : assignee?.full_name || 'Unknown'}</span>
                            {task.assignees.length > 1 && (
                              <span className="ml-1 text-gray-400">+{task.assignees.length - 1}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : task.assignee ? (
                    <div className="flex items-center">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold mr-1.5 ${
                          isMyTask ? 'bg-gradient-to-br from-blue-600 to-blue-400' : 'bg-gradient-to-br from-gray-400 to-gray-300'
                        }`}
                      >
                        {task.assignee.full_name?.charAt(0) || 'U'}
                      </div>
                      <span className="truncate max-w-[110px]">{isMyTask ? 'You' : task.assignee.full_name}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">Unassigned</span>
                  )}

                  {task.due_date && (
                    <span className="flex items-center">
                      <Calendar size={12} className="mr-1" />
                      {formatDueDate(task.due_date)}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTeamView = () => {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Team workload</h2>
          <p className="text-sm text-gray-600">
            See how tasks are spread across people and projects so the group stays balanced.
          </p>
        </div>
        {tasks.length > 0 && projects.length > 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <TeamWorkloadWidget
              tasks={tasks}
              projects={projects}
              currentWorkspaceId={currentWorkspace.id}
              userId={user?.id}
            />
          </div>
        ) : (
          <div className="bg-white rounded-xl p-12 text-center border-2 border-dashed border-gray-300">
            <BarChart3 size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No tasks to analyze yet</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Create tasks with your team, then return here to see how work is shared.
            </p>
            <Button variant="primary" onClick={() => setViewMode('focus')} className="flex items-center gap-2 mx-auto">
              <ArrowRight size={18} />
              Go back to My Day
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderAdvancedTools = () => {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Task options</h3>
            <p className="text-sm text-gray-600">
              Search, filter, and reorder tasks. These controls apply to the board and task library views.
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => resetFilters()} className="flex items-center gap-2">
              <Filter size={16} />
              Reset filters
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowAdvancedTools(false)}>
              Hide task options
            </Button>
          </div>
        </div>

        {tasks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
              <div className="text-2xl font-bold text-gray-900">{taskCounts.all}</div>
              <div className="text-xs uppercase tracking-wide text-gray-500 mt-1">Total tasks</div>
            </div>
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
              <div className="text-2xl font-bold text-qolabb-orange-600">{taskCounts.todo}</div>
              <div className="text-xs uppercase tracking-wide text-gray-500 mt-1">To Start</div>
            </div>
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
              <div className="text-2xl font-bold text-blue-600">{taskCounts.in_progress}</div>
              <div className="text-xs uppercase tracking-wide text-gray-500 mt-1">Doing</div>
            </div>
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
              <div className="text-2xl font-bold text-qolabb-green-600">{taskCounts.completed}</div>
              <div className="text-xs uppercase tracking-wide text-gray-500 mt-1">Done</div>
            </div>
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
              <div className="text-2xl font-bold text-qolabb-orange-600">{overdueCount}</div>
              <div className="text-xs uppercase tracking-wide text-gray-500 mt-1">Overdue</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="task-search" className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Search tasks
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                id="task-search"
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Find tasks by title or description"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <p className="text-xs text-gray-500">
              Tip: Press <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded">⌘</kbd> + <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded">K</kbd> to jump here.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Filter by project</label>
            <select
              value={selectedProject}
              onChange={(event) => setSelectedProject(event.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="all">All projects ({projects.length})</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Filter by status</h4>
              <p className="text-xs text-gray-500">Quickly switch between personal and shared work.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)}>
              {showFilters ? 'Hide extra filters' : 'More filters'}
            </Button>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            {(['all', 'my_tasks', 'todo', 'in_progress', 'completed'] as FilterType[]).map((status) => {
              const labels: Record<FilterType, string> = {
                all: 'All tasks',
                my_tasks: 'Assigned to me',
                todo: 'To Start',
                in_progress: 'Doing',
                completed: 'Done',
              };
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                    statusFilter === status
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {labels[status]}
                  <span className="ml-2 opacity-75">({taskCounts[status]})</span>
                </button>
              );
            })}
          </div>
          <AnimatePresence initial={false}>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Priority</label>
                  <select
                    value={priorityFilter}
                    onChange={(event) => setPriorityFilter(event.target.value as any)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="all">All priorities</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Assignee</label>
                  <select
                    value={assigneeFilter}
                    onChange={(event) => setAssigneeFilter(event.target.value as any)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="all">Anyone</option>
                    <option value="me">Assigned to me</option>
                    <option value="unassigned">Needs an owner</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Sort by</label>
                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as any)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="created">Recently created</option>
                    <option value="due_date">Due date</option>
                    <option value="priority">Priority</option>
                    <option value="title">Title</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Sort order</label>
                  <select
                    value={sortOrder}
                    onChange={(event) => setSortOrder(event.target.value as any)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="desc">Newest first</option>
                    <option value="asc">Oldest first</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="overdue-only"
                    type="checkbox"
                    checked={showOverdueOnly}
                    onChange={(event) => setShowOverdueOnly(event.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="overdue-only" className="text-sm text-gray-600">
                    Show only overdue tasks
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  if (!currentWorkspace) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No workspace selected</h2>
          <p className="text-gray-600 mb-6">
            Please select a workspace from the dashboard to view tasks.
          </p>
          <Button onClick={() => router.push('/dashboard')} className="flex items-center gap-2">
            <ArrowRight size={18} />
            Go to dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* View Tabs Navigation */}
        <div className="bg-white rounded-xl border border-gray-200 p-2 shadow-sm">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {viewTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = viewMode === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setViewMode(tab.id);
                    if (tab.id === 'focus') {
                      setShowAdvancedTools(false);
                    }
                  }}
                  className={`w-full rounded-lg px-3 py-3 transition-all text-left border ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-gray-700 border-transparent hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`p-2 rounded-lg ${
                        isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      <Icon size={18} />
                    </span>
                    <div className="space-y-1 min-w-0">
                      <span className={`block text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-gray-800'}`}>
                        {tab.label}
                      </span>
                      <span className={`text-xs ${isActive ? 'text-white/80' : 'text-gray-500'} hidden sm:block truncate`}>
                        {tab.description}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Advanced Tools Banner */}
        {viewMode !== 'focus' && !showAdvancedTools && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Lightbulb size={16} className="text-blue-500 flex-shrink-0" />
              <span>Need to search, filter, or reorder tasks? Turn on task options to reveal those controls.</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvancedTools(true)}
              className="self-start sm:self-auto whitespace-nowrap"
            >
              Show task options
            </Button>
          </div>
        )}

        {showAdvancedTools && renderAdvancedTools()}

        <AnimatePresence mode="wait">
          {viewMode === 'focus' && <div key="focus">{renderFocusView()}</div>}
          {viewMode === 'board' && <div key="board">{renderBoardView()}</div>}
          {viewMode === 'all' && <div key="all">{renderAllTasksView()}</div>}
          {viewMode === 'team' && <div key="team">{renderTeamView()}</div>}
        </AnimatePresence>
      </div>

      <TaskModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        project={selectedTaskProject}
        onTaskCreated={handleTaskUpdated}
      />

      <TaskDetailModal
        task={selectedTask}
        isOpen={showTaskDetail}
        onClose={closeTaskDetail}
        onTaskUpdated={handleTaskUpdated}
        onTaskDeleted={handleTaskDeleted}
        canManageTasks={canManageTasks}
      />

      <ContributionLogModal
        task={taskForContribution}
        isOpen={showContributionModal}
        onClose={() => setShowContributionModal(false)}
        onLogUpdated={loadData}
      />
    </DashboardLayout>
  );
}
