'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, Square, Plus, Trash2, Edit2, Save, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/Button';
import {
  getTaskSubtasks,
  createTaskSubtask,
  updateTaskSubtask,
  deleteTaskSubtask,
} from '@/lib/db/queries';
import { supabase } from '@/lib/supabase';
import { TaskSubtask } from '@/lib/types/database';
import { cn } from '@/lib/utils';

interface TaskSubtasksProps {
  taskId: string;
  userId: string;
}

export function TaskSubtasks({ taskId, userId }: TaskSubtasksProps) {
  const [subtasks, setSubtasks] = useState<TaskSubtask[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadSubtasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTaskSubtasks(taskId);
      setSubtasks(data as TaskSubtask[]);
    } catch (error) {
      console.error('Error loading subtasks:', error);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadSubtasks();

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`task_subtasks:${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_subtasks',
          filter: `task_id=eq.${taskId}`,
        },
        () => {
          loadSubtasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, loadSubtasks]);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const handleToggleComplete = async (subtask: TaskSubtask) => {
    try {
      await updateTaskSubtask(subtask.id, { completed: !subtask.completed });
      await loadSubtasks();
    } catch (error) {
      console.error('Error toggling subtask:', error);
    }
  };

  const handleStartEdit = (subtask: TaskSubtask) => {
    setEditingId(subtask.id);
    setEditTitle(subtask.title);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editTitle.trim()) return;

    try {
      await updateTaskSubtask(editingId, { title: editTitle.trim() });
      setEditingId(null);
      setEditTitle('');
      await loadSubtasks();
    } catch (error) {
      console.error('Error updating subtask:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const handleAdd = async () => {
    if (!newSubtaskTitle.trim()) return;

    setAdding(true);
    try {
      await createTaskSubtask(taskId, newSubtaskTitle.trim(), userId);
      setNewSubtaskTitle('');
      await loadSubtasks();
    } catch (error) {
      console.error('Error creating subtask:', error);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (subtaskId: string) => {
    if (!confirm('Are you sure you want to delete this subtask?')) return;

    try {
      await deleteTaskSubtask(subtaskId);
      await loadSubtasks();
    } catch (error) {
      console.error('Error deleting subtask:', error);
    }
  };

  const completedCount = subtasks.filter((s) => s.completed).length;
  const totalCount = subtasks.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 flex items-center">
          <CheckSquare size={16} className="mr-2" />
          Subtasks
          {totalCount > 0 && (
            <span className="ml-2 text-xs text-gray-500">
              ({completedCount}/{totalCount})
            </span>
          )}
        </h4>
      </div>

      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="space-y-1">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={cn(
                'h-2 rounded-full transition-all',
                completionPercentage === 100
                  ? 'bg-green-500'
                  : completionPercentage >= 50
                    ? 'bg-blue-500'
                    : 'bg-gray-400'
              )}
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">{completionPercentage}% complete</p>
        </div>
      )}

      {/* Subtasks List */}
      {loading ? (
        <div className="text-center py-4 text-sm text-gray-500">
          <Loader2 size={16} className="animate-spin mx-auto mb-2" />
          Loading subtasks...
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {subtasks.map((subtask) => {
              const isEditing = editingId === subtask.id;

              return (
                <motion.div
                  key={subtask.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={cn(
                    'flex items-center space-x-3 p-2 rounded-lg transition-colors',
                    subtask.completed && 'bg-green-50',
                    !subtask.completed && 'bg-gray-50'
                  )}
                >
                  <button
                    onClick={() => handleToggleComplete(subtask)}
                    className="flex-shrink-0 text-gray-400 hover:text-green-600 transition-colors"
                    title={subtask.completed ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {subtask.completed ? (
                      <CheckSquare size={20} className="text-green-600" />
                    ) : (
                      <Square size={20} />
                    )}
                  </button>

                  {isEditing ? (
                    <div className="flex-1 flex items-center space-x-2">
                      <input
                        ref={inputRef}
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEdit();
                          } else if (e.key === 'Escape') {
                            handleCancelEdit();
                          }
                        }}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        onClick={handleSaveEdit}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                        title="Save"
                      >
                        <Save size={16} />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                        title="Cancel"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onDoubleClick={() => handleStartEdit(subtask)}
                      >
                        <p
                          className={cn(
                            'text-sm',
                            subtask.completed ? 'line-through text-gray-500' : 'text-gray-900'
                          )}
                        >
                          {subtask.title}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleStartEdit(subtask)}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(subtask.id)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Add New Subtask */}
          <div className="flex items-center space-x-2 pt-2 border-t border-gray-200">
            <input
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !adding) {
                  handleAdd();
                }
              }}
              placeholder="Add a subtask..."
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={adding}
            />
            <Button
              variant="primary"
              size="sm"
              onClick={handleAdd}
              disabled={adding || !newSubtaskTitle.trim()}
              className="flex items-center"
            >
              {adding ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <>
                  <Plus size={14} className="mr-1" />
                  Add
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {totalCount === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <CheckSquare size={20} className="mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500 text-sm">No subtasks yet</p>
          <p className="text-gray-400 text-xs mt-1">Break down the task into smaller steps</p>
        </div>
      )}
    </div>
  );
}
