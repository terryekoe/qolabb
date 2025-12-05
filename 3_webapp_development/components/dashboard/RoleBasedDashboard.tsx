// =====================================================
// Role-Based Dashboard Component
// Unified dashboard that adapts based on user role and permissions
// =====================================================

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Users,
  BookOpen,
  Target,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Calendar,
  MessageSquare,
  Settings,
  Bell,
  Search,
  Filter,
  Download,
  Plus,
  Eye,
  Edit,
  MoreHorizontal,
  ArrowRight,
  Activity,
  Award,
  Zap,
  Globe,
  Shield,
  Lightbulb,
  Heart,
  Star,
  Bookmark,
  Share2,
  RefreshCw,
  X,
} from 'lucide-react';
import { Button } from '@/components/Button';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';
import { InstructorDashboard } from '@/components/instructor/InstructorDashboard';
import { StudentDashboard } from '@/components/student/StudentDashboard';
import { RoleBasedNavigation } from '@/components/navigation/RoleBasedNavigation';
import { WorkspaceRoleManager } from '@/components/workspace/WorkspaceRoleManager';
import { cn } from '@/lib/utils';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

interface DashboardWidget {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType;
  permissions: string[];
  roles: string[];
  priority: number;
  category: 'overview' | 'analytics' | 'management' | 'collaboration' | 'personal';
}

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  permissions: string[];
  roles: string[];
  variant: 'primary' | 'secondary' | 'outline';
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
  actionLabel?: string;
  actionUrl?: string;
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export function RoleBasedDashboard() {
  const { userRole, isStudent, isInstructor, isAdmin, isTA, canAccess, can } = usePermissions();
  const { currentWorkspace } = useWorkspace();

  const [activeView, setActiveView] = useState<
    'dashboard' | 'analytics' | 'management' | 'settings'
  >('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'New Team Assignment',
      message: 'You have been assigned to Team Alpha for the Machine Learning project.',
      type: 'info',
      timestamp: '2024-01-12T10:30:00',
      read: false,
      actionLabel: 'View Team',
      actionUrl: '/teams/alpha',
    },
    {
      id: '2',
      title: 'Task Due Soon',
      message: 'Your literature review task is due in 2 days.',
      type: 'warning',
      timestamp: '2024-01-12T09:15:00',
      read: false,
      actionLabel: 'View Task',
      actionUrl: '/tasks/123',
    },
  ]);

  // Define available widgets based on role and permissions
  const availableWidgets: DashboardWidget[] = [
    {
      id: 'overview',
      title: 'Overview',
      description: 'Quick overview of your workspace activity',
      icon: BarChart3,
      component: OverviewWidget,
      permissions: ['profile:read'],
      roles: ['student', 'instructor', 'teaching_assistant', 'admin'],
      priority: 1,
      category: 'overview',
    },
    {
      id: 'team-analytics',
      title: 'Team Analytics',
      description: 'Monitor team performance and participation',
      icon: Users,
      component: TeamAnalyticsWidget,
      permissions: ['analytics:view_basic'],
      roles: ['instructor', 'teaching_assistant', 'admin'],
      priority: 2,
      category: 'analytics',
    },
    {
      id: 'student-progress',
      title: 'Student Progress',
      description: 'Track individual student progress and engagement',
      icon: TrendingUp,
      component: StudentProgressWidget,
      permissions: ['analytics:view_detailed'],
      roles: ['instructor', 'admin'],
      priority: 3,
      category: 'analytics',
    },
    {
      id: 'my-tasks',
      title: 'My Tasks',
      description: 'Your assigned tasks and deadlines',
      icon: Target,
      component: MyTasksWidget,
      permissions: ['task:read'],
      roles: ['student', 'instructor', 'teaching_assistant'],
      priority: 4,
      category: 'personal',
    },
    {
      id: 'workspace-management',
      title: 'Workspace Management',
      description: 'Manage workspace members and settings',
      icon: Settings,
      component: WorkspaceManagementWidget,
      permissions: ['workspace:manage'],
      roles: ['instructor', 'admin'],
      priority: 5,
      category: 'management',
    },
    {
      id: 'collaboration-hub',
      title: 'Collaboration Hub',
      description: 'Team discussions and shared resources',
      icon: MessageSquare,
      component: CollaborationWidget,
      permissions: ['team:read'],
      roles: ['student', 'instructor', 'teaching_assistant'],
      priority: 6,
      category: 'collaboration',
    },
  ];

  // Filter widgets based on user permissions and role
  const visibleWidgets = availableWidgets
    .filter((widget) => {
      const hasRole = widget.roles.includes(userRole);
      const hasPermissions = widget.permissions.every((permission) => {
        const [category, action] = permission.split(':');
        return can(category as any, action as any);
      });
      return hasRole && hasPermissions;
    })
    .sort((a, b) => a.priority - b.priority);

  // Define quick actions based on role
  const quickActions: QuickAction[] = [
    {
      id: 'create-team',
      label: 'Create Team',
      description: 'Start a new team project',
      icon: Users,
      action: () => console.log('Create team'),
      permissions: ['team:create'],
      roles: ['instructor', 'admin'],
      variant: 'primary' as const,
    },
    {
      id: 'new-task',
      label: 'New Task',
      description: 'Create a new task',
      icon: Plus,
      action: () => console.log('New task'),
      permissions: ['task:create'],
      roles: ['student', 'instructor', 'teaching_assistant'],
      variant: 'secondary' as const,
    },
    {
      id: 'view-analytics',
      label: 'Analytics',
      description: 'View detailed analytics',
      icon: BarChart3,
      action: () => console.log('View analytics'),
      permissions: ['analytics:view_basic'],
      roles: ['instructor', 'teaching_assistant', 'admin'],
      variant: 'outline' as const,
    },
    {
      id: 'manage-workspace',
      label: 'Workspace Settings',
      description: 'Manage workspace settings',
      icon: Settings,
      action: () => console.log('Workspace settings'),
      permissions: ['workspace:manage'],
      roles: ['instructor', 'admin'],
      variant: 'outline' as const,
    },
  ].filter((action) => {
    const hasRole = action.roles.includes(userRole);
    const hasPermissions = action.permissions.every((permission) => {
      const [resource, action_type] = permission.split(':');
      return can(resource as any, action_type as any);
    });
    return hasRole && hasPermissions;
  });

  const unreadNotifications = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Navigation */}
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">Q</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Qolabb</h1>
                  <p className="text-xs text-gray-500">{currentWorkspace?.name || 'Workspace'}</p>
                </div>
              </div>

              <nav className="hidden md:flex space-x-6">
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                  {
                    id: 'analytics',
                    label: 'Analytics',
                    icon: TrendingUp,
                    permissions: ['analytics:view_basic'],
                  },
                  {
                    id: 'management',
                    label: 'Management',
                    icon: Settings,
                    permissions: ['workspace:manage'],
                  },
                ].map((item) => {
                  const hasPermissions =
                    !item.permissions ||
                    item.permissions.every((permission) => {
                      const [category, action] = permission.split(':');
                      return can(category as any, action as any);
                    });

                  if (!hasPermissions) return null;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveView(item.id as any)}
                      className={cn(
                        'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        activeView === item.id
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      )}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Right side actions */}
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadNotifications}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <NotificationDropdown
                    notifications={notifications}
                    onClose={() => setShowNotifications(false)}
                  />
                )}
              </div>

              {/* User menu */}
              <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">John Doe</p>
                  <p className="text-xs text-gray-500 capitalize">{userRole}</p>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">JD</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeView === 'dashboard' && (
              <DashboardView
                widgets={visibleWidgets}
                quickActions={quickActions}
                userRole={userRole}
              />
            )}
            {activeView === 'analytics' && can('analytics' as any, 'view_basic' as any) && (
              <AnalyticsView userRole={userRole} />
            )}
            {activeView === 'management' && can('workspace' as any, 'manage' as any) && (
              <ManagementView />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// =====================================================
// DASHBOARD VIEW
// =====================================================

function DashboardView({
  widgets,
  quickActions,
  userRole,
}: {
  widgets: DashboardWidget[];
  quickActions: QuickAction[];
  userRole: string;
}) {
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Welcome back, John! 👋</h2>
            <p className="text-blue-100">
              {userRole === 'student'
                ? 'Ready to collaborate and learn with your team?'
                : "Let's check on your students' progress and team dynamics."}
            </p>
          </div>
          <div className="hidden md:block">
            <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Activity className="w-12 h-12 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <motion.button
                key={action.id}
                onClick={action.action}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'p-4 rounded-lg border text-left transition-all duration-200',
                  action.variant === 'primary' &&
                    'bg-blue-600 text-white border-blue-600 hover:bg-blue-700',
                  action.variant === 'secondary' &&
                    'bg-gray-100 text-gray-900 border-gray-200 hover:bg-gray-200',
                  action.variant === 'outline' &&
                    'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'
                )}
              >
                <div className="flex items-center space-x-3">
                  <action.icon
                    className={cn(
                      'w-5 h-5',
                      action.variant === 'primary' ? 'text-white' : 'text-gray-600'
                    )}
                  />
                  <div>
                    <p
                      className={cn(
                        'font-medium',
                        action.variant === 'primary' ? 'text-white' : 'text-gray-900'
                      )}
                    >
                      {action.label}
                    </p>
                    <p
                      className={cn(
                        'text-sm',
                        action.variant === 'primary' ? 'text-blue-100' : 'text-gray-600'
                      )}
                    >
                      {action.description}
                    </p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Widgets Grid */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Dashboard Widgets</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {widgets.map((widget) => (
            <motion.div
              key={widget.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: widget.priority * 0.1 }}
              className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
            >
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <widget.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{widget.title}</h4>
                    <p className="text-sm text-gray-600">{widget.description}</p>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <widget.component />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Role-specific content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {userRole === 'student' && <StudentDashboard />}
          {(userRole === 'instructor' || userRole === 'teaching_assistant') && (
            <InstructorDashboard />
          )}
        </div>
        <div>
          <RoleBasedNavigation />
        </div>
      </div>
    </div>
  );
}

// =====================================================
// ANALYTICS VIEW
// =====================================================

function AnalyticsView({ userRole }: { userRole: string }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600">
            Comprehensive insights into team performance and collaboration
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Analytics Content</h3>
        <p className="text-gray-600">
          Detailed analytics dashboard would be implemented here with charts, metrics, and insights
          based on user role and permissions.
        </p>
      </div>
    </div>
  );
}

// =====================================================
// MANAGEMENT VIEW
// =====================================================

function ManagementView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Workspace Management</h2>
        <p className="text-gray-600">Manage your workspace settings, members, and permissions</p>
      </div>

      <WorkspaceRoleManager />
    </div>
  );
}

// =====================================================
// WIDGET COMPONENTS
// =====================================================

function OverviewWidget() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Active Groups', value: '3', icon: Users, href: '/teams' },
          { label: 'Pending Tasks', value: '7', icon: Target, href: '/tasks' },
          { label: 'This Week', value: '12h', icon: Clock, href: '/analytics' },
          { label: 'Contributions', value: '24', icon: Activity, href: '/tasks' },
        ].map((stat) =>
          stat.href ? (
            <Link key={stat.label} href={stat.href} className="block">
              <div className="text-center hover:bg-gray-50 rounded-lg p-2 transition-colors cursor-pointer">
                <div className="flex items-center justify-center mb-2">
                  <stat.icon className="w-4 h-4 text-gray-600" />
                </div>
                <p className="text-lg font-semibold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-600">{stat.label}</p>
              </div>
            </Link>
          ) : (
            <div key={stat.label} className="text-center">
              <div className="flex items-center justify-center mb-2">
                <stat.icon className="w-4 h-4 text-gray-600" />
              </div>
              <p className="text-lg font-semibold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-600">{stat.label}</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function TeamAnalyticsWidget() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Group Performance</span>
        <span className="text-xs text-gray-500">This week</span>
      </div>
      <div className="space-y-2">
        {['Group Alpha', 'Group Beta', 'Group Gamma'].map((team, index) => (
          <div key={team} className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{team}</span>
            <div className="flex items-center space-x-2">
              <div className="w-16 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${85 - index * 10}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">{85 - index * 10}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StudentProgressWidget() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Student Engagement</span>
        <Button variant="outline" size="sm">
          <Eye className="w-3 h-3 mr-1" />
          View All
        </Button>
      </div>
      <div className="space-y-2">
        {[
          { name: 'Alice Chen', progress: 92, status: 'excellent' },
          { name: 'Bob Smith', progress: 78, status: 'good' },
          { name: 'Carol Davis', progress: 65, status: 'needs-attention' },
        ].map((student) => (
          <div key={student.name} className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{student.name}</span>
            <div className="flex items-center space-x-2">
              <div className="w-12 bg-gray-200 rounded-full h-1.5">
                <div
                  className={cn(
                    'h-1.5 rounded-full',
                    student.status === 'excellent' && 'bg-green-500',
                    student.status === 'good' && 'bg-blue-500',
                    student.status === 'needs-attention' && 'bg-yellow-500'
                  )}
                  style={{ width: `${student.progress}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">{student.progress}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MyTasksWidget() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Upcoming Tasks</span>
        <Button variant="outline" size="sm">
          <Plus className="w-3 h-3 mr-1" />
          Add
        </Button>
      </div>
      <div className="space-y-2">
        {[
          { title: 'Literature Review', due: '2 days', priority: 'high' },
          { title: 'Team Meeting Prep', due: '1 week', priority: 'medium' },
          { title: 'Code Review', due: '3 days', priority: 'low' },
        ].map((task) => (
          <div
            key={task.title}
            className="flex items-center justify-between p-2 bg-gray-50 rounded"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">{task.title}</p>
              <p className="text-xs text-gray-500">Due in {task.due}</p>
            </div>
            <div
              className={cn(
                'w-2 h-2 rounded-full',
                task.priority === 'high' && 'bg-red-500',
                task.priority === 'medium' && 'bg-yellow-500',
                task.priority === 'low' && 'bg-green-500'
              )}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkspaceManagementWidget() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Class Overview</span>
        <Button variant="outline" size="sm">
          <Settings className="w-3 h-3 mr-1" />
          Manage
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Members', value: '24', icon: Users, href: '/settings' },
          { label: 'Groups', value: '6', icon: Users, href: '/teams' },
          { label: 'Projects', value: '3', icon: BookOpen, href: '/projects' },
          { label: 'Active', value: '18', icon: Activity, href: '/analytics' },
        ].map((stat) =>
          stat.href ? (
            <Link key={stat.label} href={stat.href} className="block">
              <div className="text-center p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors cursor-pointer h-full">
                <stat.icon className="w-4 h-4 text-gray-600 mx-auto mb-1" />
                <p className="text-sm font-semibold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-600">{stat.label}</p>
              </div>
            </Link>
          ) : (
            <div key={stat.label} className="text-center p-2 bg-gray-50 rounded">
              <stat.icon className="w-4 h-4 text-gray-600 mx-auto mb-1" />
              <p className="text-sm font-semibold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-600">{stat.label}</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function CollaborationWidget() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Recent Activity</span>
        <Button variant="outline" size="sm">
          <MessageSquare className="w-3 h-3 mr-1" />
          View All
        </Button>
      </div>
      <div className="space-y-2">
        {[
          { user: 'Alice', action: 'commented on task', time: '2h ago' },
          { user: 'Bob', action: 'shared a file', time: '4h ago' },
          { user: 'Carol', action: 'updated project', time: '1d ago' },
        ].map((activity, index) => (
          <div key={index} className="flex items-center space-x-2 text-sm">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-blue-600">{activity.user[0]}</span>
            </div>
            <div className="flex-1">
              <span className="font-medium text-gray-900">{activity.user}</span>
              <span className="text-gray-600"> {activity.action}</span>
            </div>
            <span className="text-xs text-gray-500">{activity.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// =====================================================
// NOTIFICATION DROPDOWN
// =====================================================

function NotificationDropdown({
  notifications,
  onClose,
}: {
  notifications: Notification[];
  onClose: () => void;
}) {
  return (
    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">No notifications</div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={cn(
                'p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer',
                !notification.read && 'bg-blue-50'
              )}
            >
              <div className="flex items-start space-x-3">
                <div
                  className={cn(
                    'w-2 h-2 rounded-full mt-2',
                    notification.type === 'info' && 'bg-blue-500',
                    notification.type === 'success' && 'bg-green-500',
                    notification.type === 'warning' && 'bg-yellow-500',
                    notification.type === 'error' && 'bg-red-500'
                  )}
                />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">{notification.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(notification.timestamp).toLocaleString()}
                  </p>
                  {notification.actionLabel && (
                    <button className="text-xs text-blue-600 hover:text-blue-800 mt-2">
                      {notification.actionLabel}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {notifications.length > 0 && (
        <div className="p-4 border-t border-gray-200">
          <button className="text-sm text-blue-600 hover:text-blue-800">Mark all as read</button>
        </div>
      )}
    </div>
  );
}
