'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertCircle, Calendar, Bell } from 'lucide-react';
import { Button } from '@/components/Button';

interface Task {
  id: string;
  title: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in_progress' | 'completed';
}

interface DeadlineNudge {
  taskId: string;
  taskTitle: string;
  dueDate: string;
  timeUntilDue: number; // hours
  urgency: 'critical' | 'high' | 'medium';
  message: string;
}

interface DeadlineNudgerProps {
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
  onSnooze?: (taskId: string, hours: number) => void;
}

export function DeadlineNudger({ tasks, onTaskClick, onSnooze }: DeadlineNudgerProps) {
  const nudges = useMemo(() => {
    const now = new Date();
    const nudges: DeadlineNudge[] = [];

    tasks
      .filter((task) => task.status !== 'completed' && task.due_date)
      .forEach((task) => {
        const dueDate = new Date(task.due_date);
        const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntilDue <= 0) {
          // Overdue
          nudges.push({
            taskId: task.id,
            taskTitle: task.title,
            dueDate: task.due_date,
            timeUntilDue: Math.abs(hoursUntilDue),
            urgency: 'critical',
            message: `This task is overdue by ${Math.round(Math.abs(hoursUntilDue))} hour${Math.round(Math.abs(hoursUntilDue)) !== 1 ? 's' : ''}.`,
          });
        } else if (hoursUntilDue <= 24) {
          // Due within 24 hours
          nudges.push({
            taskId: task.id,
            taskTitle: task.title,
            dueDate: task.due_date,
            timeUntilDue,
            urgency: 'critical',
            message: `This task is due in ${Math.round(hoursUntilDue)} hour${Math.round(hoursUntilDue) !== 1 ? 's' : ''}.`,
          });
        } else if (hoursUntilDue <= 48) {
          // Due within 48 hours
          nudges.push({
            taskId: task.id,
            taskTitle: task.title,
            dueDate: task.due_date,
            timeUntilDue,
            urgency: 'high',
            message: `This task is due in ${Math.round(hoursUntilDue / 24)} day${Math.round(hoursUntilDue / 24) !== 1 ? 's' : ''}.`,
          });
        } else if (hoursUntilDue <= 168) {
          // Due within a week
          nudges.push({
            taskId: task.id,
            taskTitle: task.title,
            dueDate: task.due_date,
            timeUntilDue,
            urgency: 'medium',
            message: `This task is due in ${Math.round(hoursUntilDue / 24)} day${Math.round(hoursUntilDue / 24) !== 1 ? 's' : ''}.`,
          });
        }
      });

    // Sort by urgency and time
    return nudges.sort((a, b) => {
      const urgencyOrder = { critical: 0, high: 1, medium: 2 };
      if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      }
      return a.timeUntilDue - b.timeUntilDue;
    });
  }, [tasks]);

  if (nudges.length === 0) return null;

  const getUrgencyStyles = (urgency: DeadlineNudge['urgency']) => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-50 border-red-300 text-red-900';
      case 'high':
        return 'bg-yellow-50 border-yellow-300 text-yellow-900';
      case 'medium':
        return 'bg-blue-50 border-blue-300 text-blue-900';
      default:
        return 'bg-gray-50 border-gray-300 text-gray-900';
    }
  };

  const getUrgencyIcon = (urgency: DeadlineNudge['urgency']) => {
    switch (urgency) {
      case 'critical':
        return <AlertCircle className="text-red-600" size={20} />;
      case 'high':
        return <Bell className="text-yellow-600" size={20} />;
      case 'medium':
        return <Clock className="text-blue-600" size={20} />;
      default:
        return <Calendar className="text-gray-600" size={20} />;
    }
  };

  return (
    <div className="space-y-3">
      {nudges.slice(0, 5).map((nudge) => (
        <motion.div
          key={nudge.taskId}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className={`rounded-lg border-2 p-4 ${getUrgencyStyles(nudge.urgency)}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              {getUrgencyIcon(nudge.urgency)}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold mb-1">{nudge.taskTitle}</h4>
                <p className="text-sm">{nudge.message}</p>
                <p className="text-xs opacity-75 mt-1">
                  Due: {new Date(nudge.dueDate).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 ml-4">
              {onSnooze && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSnooze(nudge.taskId, 24)}
                  className="text-xs"
                >
                  Snooze 24h
                </Button>
              )}
              {onTaskClick && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onTaskClick(nudge.taskId)}
                  className="text-xs"
                >
                  View Task
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
