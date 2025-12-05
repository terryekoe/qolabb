import React, { useState, useEffect } from 'react';
import { getProjectTasks } from '@/lib/db';
import { Loader2, CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';

interface TeamTaskBoardProps {
  projectId: string;
  teamName: string;
}

type TaskStatus = 'todo' | 'in_progress' | 'completed';

export function TeamTaskBoard({ projectId, teamName }: TeamTaskBoardProps) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, [projectId]);

  async function loadTasks() {
    try {
      setLoading(true);
      const data = await getProjectTasks(projectId);
      setTasks(data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  }

  const tasksByStatus = {
    todo: tasks.filter((t) => t.status === 'todo'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    completed: tasks.filter((t) => t.status === 'completed'),
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full overflow-hidden">
        {/* Todo Column */}
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700 min-h-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Circle size={16} className="text-gray-400" />
              To Do
            </h3>
            <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full">
              {tasksByStatus.todo.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 min-h-0 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
            {tasksByStatus.todo.map((task) => (
              <TaskCard key={task.id} task={task} getPriorityColor={getPriorityColor} />
            ))}
            {tasksByStatus.todo.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm italic">No tasks</div>
            )}
          </div>
        </div>

        {/* In Progress Column */}
        <div className="flex flex-col h-full bg-blue-50/50 dark:bg-blue-900/10 rounded-xl p-4 border border-blue-100 dark:border-blue-800/30 min-h-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <Clock size={16} />
              In Progress
            </h3>
            <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full">
              {tasksByStatus.in_progress.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 min-h-0 scrollbar-thin scrollbar-thumb-blue-200 dark:scrollbar-thumb-blue-800">
            {tasksByStatus.in_progress.map((task) => (
              <TaskCard key={task.id} task={task} getPriorityColor={getPriorityColor} />
            ))}
            {tasksByStatus.in_progress.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm italic">No tasks</div>
            )}
          </div>
        </div>

        {/* Completed Column */}
        <div className="flex flex-col h-full bg-green-50/50 dark:bg-green-900/10 rounded-xl p-4 border border-green-100 dark:border-green-800/30 min-h-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-green-700 dark:text-green-300 flex items-center gap-2">
              <CheckCircle2 size={16} />
              Completed
            </h3>
            <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs px-2 py-0.5 rounded-full">
              {tasksByStatus.completed.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 min-h-0 scrollbar-thin scrollbar-thumb-green-200 dark:scrollbar-thumb-green-800">
            {tasksByStatus.completed.map((task) => (
              <TaskCard key={task.id} task={task} getPriorityColor={getPriorityColor} />
            ))}
            {tasksByStatus.completed.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm italic">No tasks</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskCard({
  task,
  getPriorityColor,
}: {
  task: any;
  getPriorityColor: (p: string) => string;
}) {
  // Combine single assignee and multi-assignees for display
  const allAssignees: any[] = [];
  if (task.assignee) allAssignees.push(task.assignee);
  if (task.assignees && task.assignees.length > 0) {
    task.assignees.forEach((a: any) => {
      if (!allAssignees.find((existing) => existing.id === a.user.id)) {
        allAssignees.push(a.user);
      }
    });
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getPriorityColor(task.priority)}`}
        >
          {task.priority.toUpperCase()}
        </span>
        {task.due_date && (
          <span
            className={`text-[10px] flex items-center ${
              new Date(task.due_date) < new Date() && task.status !== 'completed'
                ? 'text-red-600'
                : 'text-gray-500'
            }`}
          >
            {new Date(task.due_date).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        )}
      </div>

      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 line-clamp-2">
        {task.title}
      </h4>

      <div className="flex items-center justify-between mt-3">
        <div className="flex -space-x-1.5">
          {allAssignees.length > 0 ? (
            allAssignees
              .slice(0, 3)
              .map((user: any) => (
                <Avatar
                  key={user.id}
                  userId={user.id}
                  name={user.full_name}
                  src={user.avatar_url}
                  alt={user.full_name}
                  size="xs"
                  className="border border-white dark:border-gray-800"
                />
              ))
          ) : (
            <span className="text-[10px] text-gray-400 italic">Unassigned</span>
          )}
          {allAssignees.length > 3 && (
            <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 border border-white dark:border-gray-800 flex items-center justify-center text-[8px] text-gray-600 dark:text-gray-400">
              +{allAssignees.length - 3}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
