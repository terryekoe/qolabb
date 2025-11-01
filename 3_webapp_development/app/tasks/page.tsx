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

  const isMyTask = task.assigned_to === user?.id;
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
            {task.assignee ? (
              <div className="flex items-center">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold mr-1 ${
                    isMyTask
                      ? 'bg-gradient-to-br from-qolabb-navy-600 to-qolabb-navy-400'
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
    orange: 'bg-orange-100 text-orange-700',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
  };

  // Make the column a droppable area
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div 
      ref={setNodeRef}
      className={`bg-gray-50 rounded-xl p-4 transition-colors ${
        isOver ? 'bg-gray-100 ring-2 ring-qolabb-navy-400 ring-offset-2' : ''
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
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [pageSection, setPageSection] = useState<'tasks' | 'workload'>('tasks');
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
        matchesFilter = task.assigned_to === user?.id;
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
      matchesStatus = task.assigned_to === user?.id;
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
      matchesAssignee = task.assigned_to === user?.id;
    } else if (assigneeFilter === 'unassigned') {
      matchesAssignee = !task.assigned_to;
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

  // Group tasks by status for Kanban view
  const tasksByStatus = {
    todo: sortedTasks.filter(t => t.status === 'todo'),
    in_progress: sortedTasks.filter(t => t.status === 'in_progress'),
    completed: sortedTasks.filter(t => t.status === 'completed'),
  };

  const taskCounts = {
    all: tasks.length,
    my_tasks: tasks.filter(t => t.assigned_to === user?.id).length,
    todo: tasks.filter(t => t.status === 'todo').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };
  
  // Get unique assignees for filter
  const uniqueAssignees = Array.from(new Set(
    tasks.filter(t => t.assignee).map(t => t.assignee.full_name)
  ));
  
  // Count overdue tasks
  const overdueCount = tasks.filter(t => {
    if (!t.due_date || t.status === 'completed') return false;
    const dueDate = new Date(t.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  }).length;

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
        {/* Page Section Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 p-1 inline-flex">
          <button
            onClick={() => setPageSection('tasks')}
            className={`px-6 py-3 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
              pageSection === 'tasks'
                ? 'bg-qolabb-navy-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <CheckSquare size={18} />
            <span>Tasks</span>
          </button>
          {tasks.length > 0 && projects.length > 0 && (canManageTasks || taskCounts.my_tasks > 0) && (
            <button
              onClick={() => setPageSection('workload')}
              className={`px-6 py-3 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                pageSection === 'workload'
                  ? 'bg-qolabb-navy-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <BarChart3 size={18} />
              <span>Team Workload</span>
            </button>
          )}
        </div>

        {/* Tasks Section */}
        {pageSection === 'tasks' && (
          <>
            {/* Header with Quick Stats */}
            <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
              <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
            <p className="text-gray-600 mt-1">
                Manage and track your work across all projects
            </p>
          </div>
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
                  <span>Create New Task</span>
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

          {/* Quick Stats Bar */}
          {tasks.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-2xl font-bold text-gray-900">{taskCounts.all}</div>
                <div className="text-sm text-gray-600 mt-1">Total Tasks</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-2xl font-bold text-orange-600">{taskCounts.todo}</div>
                <div className="text-sm text-gray-600 mt-1">To Do</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-2xl font-bold text-blue-600">{taskCounts.in_progress}</div>
                <div className="text-sm text-gray-600 mt-1">In Progress</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-2xl font-bold text-green-600">{taskCounts.completed}</div>
                <div className="text-sm text-gray-600 mt-1">Completed</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {overdueCount === 1 ? 'Overdue' : 'Overdue'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Filters and View Controls */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
          {/* Primary Controls: Search and View Mode */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Bar - Always Visible */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none z-10">
                <Search className="text-gray-400" size={20} />
              </div>
              <input
                id="task-search"
                type="text"
                placeholder="Search tasks by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1.5 ml-1">
                Press <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">⌘K</kbd> to focus search
              </p>
            </div>
            
            {/* Filter and View Mode Controls */}
            <div className="flex items-center gap-3 self-start pt-0">
              {/* Filter Icon Button */}
              <div className="relative">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-2.5 rounded-lg transition-colors ${
                    showFilters || statusFilter !== 'all' || selectedProject !== 'all'
                      ? 'bg-qolabb-navy-100 text-qolabb-navy-700'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title="Filter tasks"
                >
                  <Filter size={20} />
                </button>
                {(statusFilter !== 'all' || selectedProject !== 'all') && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                )}
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('kanban')}
                  className={`px-4 py-2 rounded font-medium text-sm transition-colors flex items-center gap-2 ${
                  viewMode === 'kanban'
                    ? 'bg-white text-qolabb-navy-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                  title="Board view - Drag tasks between columns to update status"
              >
                  <FolderKanban size={16} />
                  <span>Board</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded font-medium text-sm transition-colors flex items-center gap-2 ${
                  viewMode === 'list'
                    ? 'bg-white text-qolabb-navy-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                  title="List view - See all tasks in a grid layout"
              >
                  <CheckSquare size={16} />
                  <span>Grid</span>
              </button>
              </div>
            </div>
          </div>

          {/* Expandable Filters */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-gray-200 pt-5 space-y-4"
            >
            {/* Status Filter */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-2 block">Filter by Status</label>
                <div className="flex items-center space-x-2 overflow-x-auto">
                  {(['all', 'my_tasks', 'todo', 'in_progress', 'completed'] as FilterType[]).map((status) => {
                    const labels: Record<FilterType, string> = {
                      all: 'All Tasks',
                      my_tasks: 'My Tasks',
                      todo: 'To Do',
                      in_progress: 'In Progress',
                      completed: 'Completed'
                    };
                    return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                    statusFilter === status
                            ? 'bg-qolabb-navy-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                        {labels[status]}
                  <span className="ml-2 opacity-75">({taskCounts[status]})</span>
                </button>
                    );
                  })}
                </div>
            </div>

            {/* Project Filter */}
              <div>
                <label htmlFor="project-filter" className="text-xs font-medium text-gray-700 mb-2 block">
                  Filter by Project
                </label>
            <select
                  id="project-filter"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500 focus:border-transparent bg-white"
            >
                  <option value="all">All Projects ({projects.length})</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
            </motion.div>
          )}
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
              {searchQuery || statusFilter !== 'all' || selectedProject !== 'all' 
                ? 'No tasks match your filters' 
                : 'Get started with tasks'}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {searchQuery || statusFilter !== 'all' || selectedProject !== 'all'
                ? 'Try adjusting your search or filters to find what you\'re looking for.'
                : projects.length === 0
                ? 'Start by creating a project, then add tasks to track your team\'s work.'
                : 'Create your first task to begin tracking progress and collaborating with your team.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {projects.length === 0 ? (
              <Button
                  variant="primary"
                  onClick={() => router.push('/projects')}
                  className="flex items-center space-x-2"
              >
                <FolderKanban size={20} />
                <span>Go to Projects</span>
              </Button>
              ) : !searchQuery && statusFilter === 'all' && selectedProject === 'all' ? (
              <Button
                variant="primary"
                  onClick={() => {
                    if (projects.length === 1) {
                      handleCreateTask(projects[0]);
                    } else if (projects.length > 1) {
                      handleCreateTask(projects[0]);
                    }
                  }}
                  className="flex items-center space-x-2"
              >
                <Plus size={20} />
                  <span>Create Your First Task</span>
              </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setSelectedProject('all');
                  }}
                  className="flex items-center space-x-2"
                >
                  <Filter size={20} />
                  <span>Clear Filters</span>
                </Button>
              )}
            </div>
          </motion.div>
        ) : viewMode === 'kanban' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Task Board</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Drag tasks between columns to update their status
                </p>
              </div>
            </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* To Do Column */}
              <KanbanColumn
                id="todo"
                title="To Do"
                icon={<AlertCircle size={18} className="text-orange-600" />}
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

              {/* In Progress Column */}
              <KanbanColumn
                id="in_progress"
                title="In Progress"
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

              {/* Completed Column */}
              <KanbanColumn
                id="completed"
                title="Completed"
                icon={<CheckCircle2 size={18} className="text-green-600" />}
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

            {/* Drag Overlay */}
            <DragOverlay>
              {activeId ? (
                <div className="bg-white border-2 border-qolabb-navy-500 rounded-xl p-4 shadow-2xl opacity-90">
                  <p className="font-semibold text-gray-900">
                    {filteredTasks.find(t => t.id === activeId)?.title}
                  </p>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">All Tasks ({filteredTasks.length})</h3>
                <p className="text-sm text-gray-600 mt-1">Click any task to view details and manage it</p>
              </div>
            </div>
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
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all group relative cursor-pointer"
                  onClick={() => openTaskDetail(task)}
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
          </div>
        )}
          </>
        )}

        {/* Team Workload Section */}
        {pageSection === 'workload' && (
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Team Workload</h1>
              <p className="text-gray-600 mt-1">
                Analyze task distribution and workload balance across your team
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
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Tasks Available</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Create some tasks first to see the team workload analysis.
                </p>
                {projects.length > 0 && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      setPageSection('tasks');
                      if (projects.length === 1) {
                        handleCreateTask(projects[0]);
                      }
                    }}
                    className="flex items-center space-x-2 mx-auto"
                  >
                    <Plus size={20} />
                    <span>Go to Tasks</span>
                  </Button>
                )}
              </div>
            )}
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
      
      {/* Task Detail Modal */}
      {showTaskDetail && selectedTask && (
        <TaskDetailModal
          isOpen={showTaskDetail}
          onClose={closeTaskDetail}
          task={selectedTask}
          onTaskUpdated={handleTaskUpdated}
          onTaskDeleted={handleTaskDeleted}
          canManage={canManageTasks}
        />
      )}

      {/* Contribution Log Modal */}
      {taskForContribution && user && (
        <ContributionLogModal
          isOpen={showContributionModal && !!taskForContribution}
          onClose={() => {
            setShowContributionModal(false);
            setTaskForContribution(null);
          }}
          onSuccess={() => {
            loadData();
            setShowContributionModal(false);
            setTaskForContribution(null);
          }}
          task={taskForContribution}
          userId={user.id}
        />
      )}
    </DashboardLayout>
  );
}
