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
import { 
  updateTask, 
  deleteTask, 
  getProjectTasks,
  getTeamMembers
} from '@/lib/db/queries';
import type { TaskStatus, TaskPriority } from '@/lib/types/database';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: any;
  onTaskUpdated: () => void;
  onTaskDeleted: () => void;
  canManage: boolean;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  onClose,
  task,
  onTaskUpdated,
  onTaskDeleted,
  canManage,
}) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<TaskStatus>('todo');
  const [editPriority, setEditPriority] = useState<TaskPriority>('medium');
  const [editAssignedTo, setEditAssignedTo] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize edit fields when task changes
  useEffect(() => {
    if (task && isOpen) {
      setEditTitle(task.title || '');
      setEditDescription(task.description || '');
      setEditStatus(task.status || 'todo');
      setEditPriority(task.priority || 'medium');
      setEditAssignedTo(task.assigned_to || '');
      setEditDueDate(task.due_date ? task.due_date.split('T')[0] : '');
      
      // Load team members
      loadTeamMembers();
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

  function getStatusConfig(status: TaskStatus) {
    switch (status) {
      case 'todo':
        return {
          color: 'text-orange-600 bg-orange-50 border-orange-200',
          icon: <AlertCircle size={16} />,
          label: 'To Do'
        };
      case 'in_progress':
        return {
          color: 'text-blue-600 bg-blue-50 border-blue-200',
          icon: <Clock size={16} />,
          label: 'In Progress'
        };
      case 'completed':
        return {
          color: 'text-green-600 bg-green-50 border-green-200',
          icon: <CheckCircle2 size={16} />,
          label: 'Completed'
        };
      default:
        return {
          color: 'text-gray-600 bg-gray-50 border-gray-200',
          icon: <Clock size={16} />,
          label: status
        };
    }
  }

  function getPriorityConfig(priority: TaskPriority) {
    switch (priority) {
      case 'high':
        return {
          color: 'text-red-600',
          label: 'High Priority'
        };
      case 'medium':
        return {
          color: 'text-yellow-600',
          label: 'Medium Priority'
        };
      case 'low':
        return {
          color: 'text-gray-600',
          label: 'Low Priority'
        };
      default:
        return {
          color: 'text-gray-600',
          label: 'Priority'
        };
    }
  }

  async function handleSave() {
    if (!task?.id) return;
    
    setLoading(true);
    setError('');
    
    try {
      await updateTask(task.id, {
        title: editTitle.trim(),
        description: editDescription || null,
        status: editStatus,
        priority: editPriority,
        assigned_to: editAssignedTo || null,
        due_date: editDueDate || null,
      });
      
      setIsEditing(false);
      onTaskUpdated();
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
      year: 'numeric'
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

  const statusConfig = getStatusConfig(task.status);
  const priorityConfig = getPriorityConfig(task.priority);
  const isTaskOverdue = isOverdue(task.due_date, task.status);
  const isMyTask = task.assigned_to === user?.id;

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
            className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="text-2xl font-bold text-gray-900 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500 focus:border-transparent"
                      placeholder="Task title"
                    />
                  ) : (
                    <h2 className="text-2xl font-bold text-gray-900 mb-2 break-words">
                      {task.title}
                    </h2>
                  )}
                  
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
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  {canManage && (
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
                            {loading ? 'Saving...' : (
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
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
                  {/* Description */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <MessageSquare size={18} className="mr-2" />
                      Description
                    </h3>
                    
                    {isEditing ? (
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={6}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500 focus:border-transparent"
                        placeholder="Add a detailed description..."
                      />
                    ) : (
                      <div className="prose max-w-none">
                        {task.description ? (
                          <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
                        ) : (
                          <p className="text-gray-400 italic">No description provided</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Activity/Comments Section (Placeholder) */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <MessageSquare size={18} className="mr-2" />
                      Activity
                    </h3>
                    
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <MessageSquare size={24} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-500 text-sm">Comments and activity will appear here</p>
                      <p className="text-gray-400 text-xs mt-1">Coming soon</p>
                    </div>
                  </div>
                </div>

                {/* Right Column - Metadata */}
                <div className="space-y-6">
                  {/* Status */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Status</h4>
                    {isEditing ? (
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as TaskStatus)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500 focus:border-transparent"
                      >
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${statusConfig.color}`}>
                        {statusConfig.icon}
                        {statusConfig.label}
                      </span>
                    )}
                  </div>

                  {/* Priority */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Priority</h4>
                    {isEditing ? (
                      <select
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500 focus:border-transparent"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    ) : (
                      <div className="flex items-center">
                        <Flag size={16} className={`mr-2 ${priorityConfig.color}`} />
                        <span className="text-sm text-gray-700">{priorityConfig.label}</span>
                      </div>
                    )}
                  </div>

                  {/* Assignee */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Assignee</h4>
                    {isEditing ? (
                      <select
                        value={editAssignedTo}
                        onChange={(e) => setEditAssignedTo(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500 focus:border-transparent"
                      >
                        <option value="">Unassigned</option>
                        {teamMembers.map((member) => (
                          <option key={member.user_id} value={member.user_id}>
                            {member.profile?.full_name || member.user_id}
                          </option>
                        ))}
                      </select>
                    ) : task.assignee ? (
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
                          {isMyTask && (
                            <p className="text-xs text-qolabb-navy-600">Assigned to you</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Unassigned</p>
                    )}
                  </div>

                  {/* Due Date */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Due Date</h4>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editDueDate}
                        onChange={(e) => setEditDueDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500 focus:border-transparent"
                      />
                    ) : task.due_date ? (
                      <div className="flex items-center">
                        <Calendar size={16} className={`mr-2 ${isTaskOverdue ? 'text-red-500' : 'text-gray-500'}`} />
                        <span className={`text-sm ${isTaskOverdue ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
                          {formatDate(task.due_date)}
                          {isTaskOverdue && ' (Overdue)'}
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No due date</p>
                    )}
                  </div>

                  {/* Attachments (Placeholder) */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Paperclip size={16} className="mr-2" />
                      Attachments
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <Paperclip size={20} className="mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-500 text-sm">Drag and drop files here</p>
                      <p className="text-gray-400 text-xs mt-1">Coming soon</p>
                    </div>
                  </div>

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
