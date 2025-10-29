// =====================================================
// Student Dashboard Component
// Enhanced features for task logging and team collaboration
// =====================================================

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Clock,
  Users,
  BookOpen,
  Target,
  Calendar,
  MessageSquare,
  Plus,
  Edit,
  Trash2,
  Timer,
  Play,
  Pause,
  Square,
  Award,
  TrendingUp,
  Activity,
  FileText,
  Upload,
  Download,
  Star,
  AlertCircle,
  ChevronRight,
  Filter,
  Search,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/Button';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';
import { cn } from '@/lib/utils';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string;
  estimatedHours: number;
  actualHours: number;
  teamId: string;
  teamName: string;
  projectId: string;
  projectName: string;
  assignedTo: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface TimeEntry {
  id: string;
  taskId: string;
  taskTitle: string;
  startTime: string;
  endTime?: string;
  duration: number; // in minutes
  description: string;
  date: string;
  isActive: boolean;
}

interface TeamActivity {
  id: string;
  type: 'task_completed' | 'comment_added' | 'file_uploaded' | 'meeting_scheduled';
  title: string;
  description: string;
  user: string;
  teamId: string;
  teamName: string;
  timestamp: string;
}

interface StudentStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  totalHours: number;
  thisWeekHours: number;
  participationScore: number;
  teamCount: number;
  upcomingDeadlines: number;
}

// =====================================================
// MAIN DASHBOARD COMPONENT
// =====================================================

export function StudentDashboard() {
  const { canAccess, can } = usePermissions();
  const { currentWorkspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'time' | 'teams'>('overview');
  const [activeTimer, setActiveTimer] = useState<TimeEntry | null>(null);
  
  // Mock data - replace with actual API calls
  const [stats, setStats] = useState<StudentStats>({
    totalTasks: 24,
    completedTasks: 18,
    inProgressTasks: 4,
    totalHours: 45.5,
    thisWeekHours: 12.5,
    participationScore: 88,
    teamCount: 3,
    upcomingDeadlines: 2
  });
  
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Implement user authentication',
      description: 'Set up login and registration functionality',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2024-01-15',
      estimatedHours: 8,
      actualHours: 5.5,
      teamId: 'team1',
      teamName: 'Team Alpha',
      projectId: 'proj1',
      projectName: 'Web App Development',
      assignedTo: ['user1', 'user2'],
      tags: ['frontend', 'auth'],
      createdAt: '2024-01-10',
      updatedAt: '2024-01-12'
    },
    {
      id: '2',
      title: 'Database schema design',
      description: 'Design and implement the database structure',
      status: 'completed',
      priority: 'medium',
      dueDate: '2024-01-12',
      estimatedHours: 6,
      actualHours: 7,
      teamId: 'team1',
      teamName: 'Team Alpha',
      projectId: 'proj1',
      projectName: 'Web App Development',
      assignedTo: ['user1'],
      tags: ['backend', 'database'],
      createdAt: '2024-01-08',
      updatedAt: '2024-01-12'
    }
  ]);
  
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([
    {
      id: '1',
      taskId: '1',
      taskTitle: 'Implement user authentication',
      startTime: '2024-01-12T09:00:00',
      endTime: '2024-01-12T11:30:00',
      duration: 150,
      description: 'Working on login form validation',
      date: '2024-01-12',
      isActive: false
    }
  ]);
  
  const [teamActivities, setTeamActivities] = useState<TeamActivity[]>([
    {
      id: '1',
      type: 'task_completed',
      title: 'Task Completed',
      description: 'Database schema design has been completed',
      user: 'Alice Johnson',
      teamId: 'team1',
      teamName: 'Team Alpha',
      timestamp: '2024-01-12T14:30:00'
    }
  ]);
  
  // Check if user can access student features
  const canAccessStudentFeatures = can('profile' as any, 'read' as any) && can('task' as any, 'read' as any);
  
  // Check permissions
  if (!canAccessStudentFeatures) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Access Restricted
          </h3>
          <p className="text-gray-600">
            You don't have permission to access this dashboard.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            My Dashboard
          </h1>
          <p className="text-gray-600">
            Track your tasks, time, and team collaboration
          </p>
        </div>
        
        {/* Quick Actions */}
        <div className="flex items-center space-x-3">
          {can('task' as any, 'create' as any) && (
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Button>
          )}
          
          {activeTimer ? (
            <div className="flex items-center space-x-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setActiveTimer(null)}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <Square className="w-4 h-4 mr-2" />
                Stop Timer
              </Button>
              <span className="text-sm text-gray-600">
                {Math.floor((Date.now() - new Date(activeTimer.startTime).getTime()) / 60000)}m
              </span>
            </div>
          ) : (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                const newEntry: TimeEntry = {
                  id: `time-${Date.now()}`,
                  taskId: tasks[0]?.id || 'general',
                  taskTitle: tasks[0]?.title || 'General Work',
                  startTime: new Date().toISOString(),
                  duration: 0,
                  description: '',
                  date: new Date().toISOString().split('T')[0],
                  isActive: true
                };
                setActiveTimer(newEntry);
              }}
              className="text-green-600 border-green-300 hover:bg-green-50"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Timer
            </Button>
          )}
        </div>
      </div>
      
      {/* Active Timer Banner */}
      {activeTimer && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 rounded-lg p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <div>
                <p className="font-medium text-green-900">
                  Timer Active: {activeTimer.taskTitle}
                </p>
                <p className="text-sm text-green-700">
                  Started at {new Date(activeTimer.startTime).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <div className="text-lg font-mono text-green-900">
              {/* Timer display would go here */}
              02:15:30
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'tasks', label: 'My Tasks', icon: CheckCircle2 },
            { id: 'time', label: 'Time Tracking', icon: Timer },
            { id: 'teams', label: 'Team Activity', icon: Users }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors',
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
      
      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && (
            <OverviewTab stats={stats} tasks={tasks} />
          )}
          {activeTab === 'tasks' && (
            <TasksTab tasks={tasks} setTasks={setTasks} />
          )}
          {activeTab === 'time' && (
            <TimeTrackingTab 
              timeEntries={timeEntries} 
              setTimeEntries={setTimeEntries}
              tasks={tasks}
            />
          )}
          {activeTab === 'teams' && (
            <TeamActivityTab activities={teamActivities} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// =====================================================
// OVERVIEW TAB
// =====================================================

function OverviewTab({ stats, tasks }: { stats: StudentStats; tasks: Task[] }) {
  const upcomingTasks = tasks
    .filter(task => task.status !== 'completed')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);
  
  const metrics = [
    {
      label: 'Tasks Completed',
      value: `${stats.completedTasks}/${stats.totalTasks}`,
      icon: CheckCircle2,
      color: 'green',
      percentage: Math.round((stats.completedTasks / stats.totalTasks) * 100)
    },
    {
      label: 'Hours This Week',
      value: `${stats.thisWeekHours}h`,
      icon: Clock,
      color: 'blue',
      subtext: `${stats.totalHours}h total`
    },
    {
      label: 'Participation Score',
      value: `${stats.participationScore}%`,
      icon: TrendingUp,
      color: 'purple',
      trend: '+5% this week'
    },
    {
      label: 'Active Teams',
      value: stats.teamCount,
      icon: Users,
      color: 'orange',
      subtext: 'across projects'
    }
  ];
  
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {metric.label}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {metric.value}
                </p>
                {metric.subtext && (
                  <p className="text-sm text-gray-500 mt-1">
                    {metric.subtext}
                  </p>
                )}
                {metric.trend && (
                  <p className="text-sm text-green-600 mt-1">
                    {metric.trend}
                  </p>
                )}
                {metric.percentage && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${metric.percentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className={cn(
                'p-3 rounded-lg',
                `bg-${metric.color}-100`
              )}>
                <metric.icon className={cn(
                  'w-6 h-6',
                  `text-${metric.color}-600`
                )} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* Upcoming Tasks and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Tasks */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Upcoming Tasks
            </h3>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {upcomingTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className={cn(
                  'w-3 h-3 rounded-full',
                  task.priority === 'urgent' ? 'bg-red-500' :
                  task.priority === 'high' ? 'bg-orange-500' :
                  task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {task.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {task.teamName} • Due {new Date(task.dueDate).toLocaleDateString()}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            ))}
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <Plus className="w-4 h-4 mr-2" />
              Log Work Hours
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <FileText className="w-4 h-4 mr-2" />
              Create Task
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Upload className="w-4 h-4 mr-2" />
              Upload File
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <MessageSquare className="w-4 h-4 mr-2" />
              Team Chat
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// TASKS TAB
// =====================================================

function TasksTab({ tasks, setTasks }: { 
  tasks: Task[]; 
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>; 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'in_progress' | 'completed' | 'blocked'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'urgent'>('all');
  
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });
  
  const updateTaskStatus = (taskId: string, newStatus: Task['status']) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status: newStatus, updatedAt: new Date().toISOString() } : task
    ));
  };
  
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Status</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="blocked">Blocked</option>
        </select>
        
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Priority</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>
      
      {/* Tasks List */}
      <div className="space-y-4">
        {filteredTasks.map((task, index) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {task.title}
                  </h3>
                  <PriorityBadge priority={task.priority} />
                  <StatusBadge status={task.status} />
                </div>
                
                <p className="text-gray-600 mb-3">
                  {task.description}
                </p>
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {task.teamName}
                  </span>
                  <span className="flex items-center">
                    <BookOpen className="w-4 h-4 mr-1" />
                    {task.projectName}
                  </span>
                  <span className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Due {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                  <span className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {task.actualHours}h / {task.estimatedHours}h
                  </span>
                </div>
                
                {task.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {task.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2 ml-4">
                {task.status !== 'completed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateTaskStatus(task.id, 'completed')}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Complete
                  </Button>
                )}
                
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4" />
                </Button>
                
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// =====================================================
// TIME TRACKING TAB
// =====================================================

function TimeTrackingTab({ 
  timeEntries, 
  setTimeEntries, 
  tasks 
}: { 
  timeEntries: TimeEntry[]; 
  setTimeEntries: React.Dispatch<React.SetStateAction<TimeEntry[]>>;
  tasks: Task[];
}) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddEntry, setShowAddEntry] = useState(false);
  
  const todayEntries = timeEntries.filter(entry => entry.date === selectedDate);
  const totalHoursToday = todayEntries.reduce((sum, entry) => sum + entry.duration, 0) / 60;
  
  return (
    <div className="space-y-6">
      {/* Time Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalHoursToday.toFixed(1)}h
              </p>
            </div>
            <Timer className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Week</p>
              <p className="text-2xl font-bold text-gray-900">32.5h</p>
            </div>
            <Calendar className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average/Day</p>
              <p className="text-2xl font-bold text-gray-900">4.6h</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>
      
      {/* Date Selector and Add Entry */}
      <div className="flex items-center justify-between">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        
        <Button onClick={() => setShowAddEntry(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Entry
        </Button>
      </div>
      
      {/* Time Entries */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Time Entries for {new Date(selectedDate).toLocaleDateString()}
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {todayEntries.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No time entries for this date</p>
            </div>
          ) : (
            todayEntries.map((entry) => (
              <div key={entry.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {entry.taskTitle}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {entry.description}
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <span>
                        {new Date(entry.startTime).toLocaleTimeString()} - 
                        {entry.endTime ? new Date(entry.endTime).toLocaleTimeString() : 'Active'}
                      </span>
                      <span>
                        {Math.floor(entry.duration / 60)}h {entry.duration % 60}m
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// TEAM ACTIVITY TAB
// =====================================================

function TeamActivityTab({ activities }: { activities: TeamActivity[] }) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Recent Team Activity
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {activities.map((activity) => (
            <div key={activity.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start space-x-3">
                <ActivityIcon type={activity.type} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.title}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {activity.description}
                  </p>
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    <span>{activity.user}</span>
                    <span>{activity.teamName}</span>
                    <span>{new Date(activity.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// UTILITY COMPONENTS
// =====================================================

function StatusBadge({ status }: { status: Task['status'] }) {
  const styles = {
    todo: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    blocked: 'bg-red-100 text-red-800'
  };
  
  const labels = {
    todo: 'To Do',
    in_progress: 'In Progress',
    completed: 'Completed',
    blocked: 'Blocked'
  };
  
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      styles[status]
    )}>
      {labels[status]}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: Task['priority'] }) {
  const styles = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
  };
  
  const labels = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent'
  };
  
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      styles[priority]
    )}>
      {labels[priority]}
    </span>
  );
}

function ActivityIcon({ type }: { type: TeamActivity['type'] }) {
  const icons = {
    task_completed: CheckCircle2,
    comment_added: MessageSquare,
    file_uploaded: Upload,
    meeting_scheduled: Calendar
  };
  
  const colors = {
    task_completed: 'text-green-600 bg-green-100',
    comment_added: 'text-blue-600 bg-blue-100',
    file_uploaded: 'text-purple-600 bg-purple-100',
    meeting_scheduled: 'text-orange-600 bg-orange-100'
  };
  
  const Icon = icons[type];
  
  return (
    <div className={cn('p-2 rounded-full', colors[type])}>
      <Icon className="w-4 h-4" />
    </div>
  );
}