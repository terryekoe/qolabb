'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Inbox, ArrowRight, AlertCircle, Clock, CheckCircle2, Filter } from 'lucide-react';
import { Button } from '@/components/Button';

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  status: 'todo' | 'in_progress' | 'completed';
  triage_status?: 'inbox' | 'triage' | 'working';
}

interface TaskTriageViewProps {
  tasks: Task[];
  onTriageStatusChange: (taskId: string, status: 'inbox' | 'triage' | 'working') => void;
  onStartTask: (taskId: string) => void;
  wipLimit?: number;
  currentWip?: number;
}

export function TaskTriageView({
  tasks,
  onTriageStatusChange,
  onStartTask,
  wipLimit = 5,
  currentWip = 0,
}: TaskTriageViewProps) {
  const [filter, setFilter] = useState<'all' | 'urgent' | 'due-soon'>('all');

  const inboxTasks = useMemo(
    () => tasks.filter((t) => !t.triage_status || t.triage_status === 'inbox'),
    [tasks]
  );

  const triagedTasks = useMemo(() => tasks.filter((t) => t.triage_status === 'triage'), [tasks]);

  const workingTasks = useMemo(
    () => tasks.filter((t) => t.triage_status === 'working' || t.status === 'in_progress'),
    [tasks]
  );

  const filteredInbox = useMemo(() => {
    if (filter === 'urgent') {
      return inboxTasks.filter(
        (t) =>
          t.priority === 'high' ||
          (t.due_date && new Date(t.due_date) < new Date(Date.now() + 86400000 * 2))
      );
    }
    if (filter === 'due-soon') {
      return inboxTasks.filter((t) => {
        if (!t.due_date) return false;
        const due = new Date(t.due_date);
        const now = new Date();
        const daysUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return daysUntilDue > 0 && daysUntilDue <= 3;
      });
    }
    return inboxTasks;
  }, [inboxTasks, filter]);

  const isOverWipLimit = currentWip >= wipLimit;

  const handleTriage = (taskId: string, action: 'accept' | 'defer') => {
    onTriageStatusChange(taskId, action === 'accept' ? 'triage' : 'inbox');
  };

  const handleStartWork = (taskId: string) => {
    if (isOverWipLimit) {
      alert(
        `You've reached your WIP limit of ${wipLimit}. Complete or pause existing tasks first.`
      );
      return;
    }
    onTriageStatusChange(taskId, 'working');
    onStartTask(taskId);
  };

  return (
    <div className="space-y-6">
      {/* WIP Limit Indicator */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-900">Work in Progress</p>
            <p className="text-xs text-blue-700 mt-1">
              {currentWip} / {wipLimit} tasks
            </p>
          </div>
          <div
            className={`text-2xl font-bold ${isOverWipLimit ? 'text-red-600' : 'text-blue-600'}`}
          >
            {currentWip}/{wipLimit}
          </div>
        </div>
        {isOverWipLimit && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertCircle size={16} />
              <span className="text-sm font-medium">
                WIP limit reached. Complete or pause tasks to start new work.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Inbox - Tasks to Triage */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Inbox size={20} className="text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Inbox ({filteredInbox.length})</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('urgent')}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                filter === 'urgent'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Urgent
            </button>
            <button
              onClick={() => setFilter('due-soon')}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                filter === 'due-soon'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Due Soon
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {filteredInbox.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Inbox size={48} className="mx-auto mb-3 text-gray-300" />
              <p>No tasks to triage. Great work!</p>
            </div>
          ) : (
            filteredInbox.map((task) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{task.title}</h4>
                    {task.description && (
                      <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                    )}
                    <div className="flex items-center space-x-3 mt-2">
                      {task.priority === 'high' && (
                        <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
                          High Priority
                        </span>
                      )}
                      {task.due_date && (
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          <Clock size={12} />
                          <span>Due {new Date(task.due_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTriage(task.id, 'defer')}
                      className="text-gray-600"
                    >
                      Later
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleTriage(task.id, 'accept')}
                    >
                      Triage
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Triaged - Ready to Work */}
      {triagedTasks.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle2 size={20} className="text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Triaged ({triagedTasks.length})</h3>
          </div>
          <div className="space-y-3">
            {triagedTasks.map((task) => (
              <motion.div
                key={task.id}
                className="border border-blue-200 bg-blue-50 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{task.title}</h4>
                    <p className="text-sm text-blue-700 mt-1">Ready to start working</p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleStartWork(task.id)}
                    disabled={isOverWipLimit}
                  >
                    Start Work
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
