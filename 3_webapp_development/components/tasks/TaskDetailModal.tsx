'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  User,
  Flag,
  Clock,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Trash2,
  MessageSquare,
  Paperclip,
  Plus,
  Save,
  X as CloseIcon,
  ChevronDown,
  Link,
  Hash,
} from 'lucide-react';
import { Button } from '@/components/Button';
import Avatar from '@/components/ui/Avatar';
import { useAuth } from '@/lib/auth/AuthContext';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';
import {
  updateTask,
  deleteTask,
  getProjectTasks,
  getTeamMembers,
  getProjectContributions,
  getTaskAssignees,
  addTaskAssignees,
  removeTaskAssignee,
} from '@/lib/db/queries';
import { TaskComments } from './TaskComments';
import { TaskActivityTimeline } from './TaskActivityTimeline';
import { TaskTimeTracker } from './TaskTimeTracker';
import { TaskAttachments } from './TaskAttachments';
import { TaskSubtasks } from './TaskSubtasks';
import type { TaskStatus, TaskPriority } from '@/lib/types/database';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: any;
  onTaskUpdated: () => void;
  onTaskDeleted: () => void;
  canManage: boolean;
  simplified?: boolean;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  onClose,
  task,
  onTaskUpdated,
  onTaskDeleted,

  canManage,
  simplified = false,
}) => {
  const { user, profile } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<TaskStatus>('todo');
  const [editPriority, setEditPriority] = useState<TaskPriority>('medium');
  const [editAssignedTo, setEditAssignedTo] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [contributions, setContributions] = useState<any[]>([]);
  const [assignees, setAssignees] = useState<any[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingContributions, setLoadingContributions] = useState(false);
  const [error, setError] = useState('');

  // Check if user can manage attachments (either has canManage permission OR is assigned to the task)
  const canManageAttachments = React.useMemo(() => {
    if (!user || !task) return false;
    // Users with canManage permission can always manage attachments
    if (canManage) return true;
    // Check if user is in the assignees list (new multiple assignees system)
    if (assignees.some((a: any) => a.user_id === user.id)) return true;
    // Check if user is the single assignee (old system, for backward compatibility)
    if (task.assigned_to === user.id) return true;
    return false;
  }, [canManage, user, assignees, task]);

  // Initialize edit fields when task changes
  useEffect(() => {
    if (task && isOpen) {
      setEditTitle(task.title || '');
      setEditDescription(task.description || '');
      setEditStatus(task.status || 'todo');
      setEditPriority(task.priority || 'medium');
      setEditAssignedTo(task.assigned_to || '');
      setEditDueDate(task.due_date ? task.due_date.split('T')[0] : '');

      // Load team members, contributions, and assignees
      loadTeamMembers();
      loadContributions();
      loadAssignees();
    }
  }, [task, isOpen]);

  async function loadTeamMembers() {
    if (!task?.team_id) return;

    try {
      const members = await getTeamMembers(task.team_id);
      setTeamMembers(members || []);
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  }

  async function loadContributions() {
    if (!task?.project_id) return;

    try {
      setLoadingContributions(true);
      const projectContributions = await getProjectContributions(task.project_id);
      // Filter contributions linked to this task
      const taskContributions = (projectContributions || []).filter(
        (contrib: any) => contrib.task_id === task.id
      );
      setContributions(taskContributions);
    } catch (error) {
      console.error('Error loading contributions:', error);
    } finally {
      setLoadingContributions(false);
    }
  }

  async function loadAssignees() {
    if (!task?.id) return;

    try {
      const taskAssignees = await getTaskAssignees(task.id);
      setAssignees(taskAssignees || []);
      setSelectedAssignees((taskAssignees || []).map((a: any) => a.user_id));
    } catch (error) {
      console.error('Error loading assignees:', error);
      // Fallback to old assigned_to if assignees query fails
      if (task.assigned_to) {
        setSelectedAssignees([task.assigned_to]);
      }
    }
  }

  function getStatusConfig(status: TaskStatus) {
    switch (status) {
      case 'todo':
        return {
          color: 'text-orange-600 bg-orange-50 border-orange-200',
          icon: <AlertCircle size={16} />,
          label: 'To Do',
        };
      case 'in_progress':
        return {
          color: 'text-blue-600 bg-blue-50 border-blue-200',
          icon: <Clock size={16} />,
          label: 'In Progress',
        };
      case 'completed':
        return {
          color: 'text-green-600 bg-green-50 border-green-200',
          icon: <CheckCircle2 size={16} />,
          label: 'Completed',
        };
      default:
        return {
          color: 'text-gray-600 bg-gray-50 border-gray-200',
          icon: <Clock size={16} />,
          label: status,
        };
    }
  }

  function getPriorityConfig(priority: TaskPriority) {
    switch (priority) {
      case 'high':
        return {
          color: 'text-red-600',
          label: 'High Priority',
        };
      case 'medium':
        return {
          color: 'text-yellow-600',
          label: 'Medium Priority',
        };
      case 'low':
        return {
          color: 'text-gray-600',
          label: 'Low Priority',
        };
      default:
        return {
          color: 'text-gray-600',
          label: 'Priority',
        };
    }
  }

  async function handleSave() {
    if (!task?.id || !user?.id) return;

    setLoading(true);
    setError('');

    try {
      const wasJustCompleted = task.status !== 'completed' && editStatus === 'completed';

      // Update task basic fields
      await updateTask(task.id, {
        title: editTitle.trim(),
        description: editDescription || null,
        status: editStatus,
        priority: editPriority,
        due_date: editDueDate || null,
      });

      // Handle assignees separately
      const currentAssigneeIds = new Set(assignees.map((a: any) => a.user_id));
      const newAssigneeIds = new Set(selectedAssignees.filter((id) => id !== ''));

      // Find assignees to add
      const toAdd = Array.from(newAssigneeIds).filter((id) => !currentAssigneeIds.has(id));
      // Find assignees to remove
      const toRemove = Array.from(currentAssigneeIds).filter((id) => !newAssigneeIds.has(id));

      // Add new assignees
      if (toAdd.length > 0) {
        await addTaskAssignees(task.id, toAdd, user.id);
      }

      // Remove unassigned assignees
      if (toRemove.length > 0) {
        for (const userId of toRemove) {
          await removeTaskAssignee(task.id, userId, user.id);
        }
      }

      // Reload assignees
      await loadAssignees();

      setIsEditing(false);
      onTaskUpdated();

      // Reload contributions if task was completed
      if (wasJustCompleted) {
        await loadContributions();
      }
    } catch (error: any) {
      console.error('Error updating task:', error);
      setError(error.message || 'Failed to update task');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!task?.id) return;

    if (!confirm('Are you sure you want to delete this task? This cannot be undone.')) {
      return;
    }

    try {
      await deleteTask(task.id);
      onTaskDeleted();
      onClose();
    } catch (error) {
      console.error('Error deleting task:', error);
      setError('Failed to delete task');
    }
  }

  function formatDate(dateString: string) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function isOverdue(dueDate: string, status: string) {
    if (!dueDate || status === 'completed') return false;
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  }

  if (!isOpen || !task) return null;

  const statusConfig = getStatusConfig(task?.status || 'todo');
  const priorityConfig = getPriorityConfig(task?.priority || 'medium');
  const isTaskOverdue = isOverdue(task?.due_date, task?.status);
  const isMyTask = task?.assigned_to === user?.id;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
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
            className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="text-2xl font-bold text-gray-900 dark:text-gray-100 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Task title"
                    />
                  ) : (
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 break-words">
                      {task.title}
                    </h2>
                  )}

                  {!simplified && (
                    <div className="flex items-center flex-wrap gap-3 text-sm text-gray-500">
                      <span className="flex items-center">
                        <Hash size={14} className="mr-1" />
                        {task.id?.slice(0, 8)}
                      </span>

                      {task.project_name && (
                        <span className="flex items-center">
                          <span className="w-2 h-2 rounded-full bg-gray-300 mr-2"></span>
                          {task.project_name}
                        </span>
                      )}

                      {task.created_at && (
                        <span className="flex items-center">
                          <span className="w-2 h-2 rounded-full bg-gray-300 mr-2"></span>
                          Created {formatDate(task.created_at)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  {canManage && !simplified && (
                    <>
                      {isEditing ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditing(false)}
                            disabled={loading}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={handleSave}
                            disabled={loading || !editTitle.trim()}
                            className="flex items-center"
                          >
                            {loading ? (
                              'Saving...'
                            ) : (
                              <>
                                <Save size={16} className="mr-1" />
                                Save
                              </>
                            )}
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditing(true)}
                          className="flex items-center"
                        >
                          <Edit3 size={16} className="mr-1" />
                          Edit
                        </Button>
                      )}
                    </>
                  )}

                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800 mb-6">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Main Content */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Subtasks */}
                  {user && <TaskSubtasks taskId={task.id} userId={user.id} />}

                  {/* Description */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                      <MessageSquare size={18} className="mr-2" />
                      Description
                    </h3>

                    {isEditing ? (
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={6}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Add a detailed description..."
                      />
                    ) : (
                      <div className="prose max-w-none">
                        {task.description ? (
                          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {task.description}
                          </p>
                        ) : (
                          <p className="text-gray-400 italic">No description provided</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Comments Section */}
                  {user && currentWorkspace && task?.project_id && (
                    <div>
                      <TaskComments
                        taskId={task.id}
                        projectId={task.project_id}
                        workspaceId={currentWorkspace.id}
                        userId={user.id}
                        userProfile={
                          profile
                            ? {
                                id: profile.id,
                                full_name: profile.full_name || 'User',
                                avatar_url: profile.avatar_url || undefined,
                              }
                            : undefined
                        }
                      />
                    </div>
                  )}

                  {/* Activity Timeline */}
                  {task?.project_id && !simplified && (
                    <div>
                      <TaskActivityTimeline taskId={task.id} projectId={task.project_id} />
                    </div>
                  )}
                </div>

                {/* Right Column - Metadata */}
                <div className="space-y-6">
                  {/* Time Tracker - Only show for assigned users */}
                  {user &&
                    task?.project_id &&
                    (task?.assigned_to === user.id ||
                      assignees.some((a: any) => a.user_id === user.id)) &&
                    !simplified && (
                      <TaskTimeTracker
                        taskId={task.id}
                        projectId={task.project_id}
                        userId={user.id}
                        taskTitle={task.title}
                        estimatedHours={task.estimated_hours || undefined}
                        onTimeLogged={async () => {
                          await loadContributions();
                        }}
                      />
                    )}

                  {/* Status */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Status
                    </h4>
                    {simplified ? (
                      <Button
                        variant={task.status === 'completed' ? 'secondary' : 'primary'}
                        className={`w-full justify-center py-6 text-lg font-semibold ${
                          task.status === 'completed'
                            ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                            : ''
                        }`}
                        onClick={async () => {
                          const newStatus = task.status === 'completed' ? 'todo' : 'completed';
                          setEditStatus(newStatus);
                          // Immediate update
                          try {
                            setLoading(true);
                            await updateTask(task.id, { status: newStatus });
                            onTaskUpdated();
                            if (newStatus === 'completed') {
                              await loadContributions();
                              // Close the modal after a short delay to show the success state
                              setTimeout(() => {
                                onClose();
                              }, 500);
                            }
                          } catch (err) {
                            console.error('Error updating status:', err);
                          } finally {
                            setLoading(false);
                          }
                        }}
                        disabled={loading}
                      >
                        {loading ? (
                          'Updating...'
                        ) : task.status === 'completed' ? (
                          <>
                            <CheckCircle2 size={24} className="mr-2" />
                            Completed
                          </>
                        ) : (
                          'Mark as Complete'
                        )}
                      </Button>
                    ) : isEditing ? (
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as TaskStatus)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${statusConfig.color}`}
                      >
                        {statusConfig.icon}
                        {statusConfig.label}
                      </span>
                    )}
                  </div>

                  {/* Priority */}
                  {!simplified && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Priority
                      </h4>
                      {isEditing ? (
                        <select
                          value={editPriority}
                          onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      ) : (
                        <div className="flex items-center">
                          <Flag size={16} className={`mr-2 ${priorityConfig.color}`} />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {priorityConfig.label}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Assignees */}
                  {!simplified && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Assignees
                      </h4>
                      {isEditing ? (
                        <div className="space-y-2">
                          <select
                            multiple
                            value={selectedAssignees}
                            onChange={(e) => {
                              const values = Array.from(
                                e.target.selectedOptions,
                                (option) => option.value
                              );
                              setSelectedAssignees(values);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px]"
                            size={Math.min(teamMembers.length + 1, 6)}
                          >
                            <option value="">Unassigned</option>
                            {teamMembers.map((member) => (
                              <option key={member.user_id} value={member.user_id}>
                                {member.profile?.full_name || member.user_id}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-gray-500">
                            Hold Cmd/Ctrl to select multiple assignees
                          </p>
                        </div>
                      ) : assignees.length > 0 ? (
                        <div className="space-y-2">
                          {assignees.map((assignee: any) => {
                            const isMe = assignee.user_id === user?.id;
                            return (
                              <div key={assignee.id} className="flex items-center">
                                <Avatar
                                  userId={assignee.user_id}
                                  name={assignee.user?.full_name || 'User'}
                                  src={assignee.user?.avatar_url}
                                  size="sm"
                                  className="mr-3"
                                />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {assignee.user?.full_name || 'Unknown User'}
                                    {isMe && (
                                      <span className="ml-2 text-xs text-blue-600">(You)</span>
                                    )}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Assigned {new Date(assignee.assigned_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : task.assignee ? (
                        // Fallback to old single assignee display
                        <div className="flex items-center">
                          <Avatar
                            userId={task.assignee.id}
                            name={task.assignee.full_name || 'User'}
                            src={task.assignee.avatar_url}
                            size="sm"
                            className="mr-3"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {task.assignee.full_name}
                            </p>
                            {isMyTask && <p className="text-xs text-blue-600">Assigned to you</p>}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Unassigned</p>
                      )}
                    </div>
                  )}

                  {/* Due Date */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Due Date
                    </h4>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editDueDate}
                        onChange={(e) => setEditDueDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : task.due_date ? (
                      <div className="flex items-center">
                        <Calendar
                          size={16}
                          className={`mr-2 ${isTaskOverdue ? 'text-red-500' : 'text-gray-500'}`}
                        />
                        <span
                          className={`text-sm ${isTaskOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                        >
                          {formatDate(task.due_date)}
                          {isTaskOverdue && ' (Overdue)'}
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No due date</p>
                    )}
                  </div>

                  {/* Contributions */}
                  {task.status === 'completed' && !simplified && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                        <Link size={16} className="mr-2" />
                        Linked Contributions
                      </h4>
                      {loadingContributions ? (
                        <div className="text-center py-4 text-sm text-gray-500">
                          Loading contributions...
                        </div>
                      ) : contributions.length > 0 ? (
                        <div className="space-y-2">
                          {contributions.map((contrib: any) => (
                            <div
                              key={contrib.id}
                              className="bg-gray-50 border border-gray-200 rounded-lg p-3"
                            >
                              <div className="flex items-start justify-between mb-1">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {contrib.title}
                                  </p>
                                  {contrib.description && (
                                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                      {contrib.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                                <span className="capitalize">{contrib.contribution_type}</span>
                                {contrib.hours_spent && (
                                  <span className="flex items-center">
                                    <Clock size={12} className="mr-1" />
                                    {contrib.hours_spent}h
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                          <Link size={20} className="mx-auto text-gray-300 mb-2" />
                          <p className="text-gray-500 text-sm">No contributions logged yet</p>
                          <p className="text-gray-400 text-xs mt-1">
                            Contributions linked to this task will appear here
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Attachments */}
                  {user && (
                    <div className={simplified ? 'order-first' : ''}>
                      {simplified && (
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Your Work
                        </h4>
                      )}
                      <TaskAttachments
                        taskId={task.id}
                        userId={user.id}
                        canManage={canManageAttachments}
                      />
                    </div>
                  )}

                  {/* Delete Task (Admin Only) */}
                  {canManage && !isEditing && (
                    <div className="pt-4 border-t border-gray-200">
                      <Button
                        variant="ghost"
                        onClick={handleDelete}
                        className="text-red-600 hover:bg-red-50 w-full flex items-center justify-center"
                      >
                        <Trash2 size={16} className="mr-2" />
                        Delete Task
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
