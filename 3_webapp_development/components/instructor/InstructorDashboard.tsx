// =====================================================
// Instructor Dashboard Component
// Comprehensive monitoring and analytics for instructors
// =====================================================

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BarChart3,
  PieChart,
  Activity,
  Calendar,
  MessageSquare,
  Award,
  Target,
  BookOpen,
  UserCheck,
  FileText,
  Download,
  Filter,
  Search,
  Eye,
  Edit,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { Button } from '@/components/Button';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';
import { cn } from '@/lib/utils';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

interface TeamMetrics {
  id: string;
  name: string;
  memberCount: number;
  activeProjects: number;
  completedTasks: number;
  totalTasks: number;
  participationScore: number;
  lastActivity: string;
  status: 'active' | 'inactive' | 'at_risk';
  trend: 'up' | 'down' | 'stable';
}

interface StudentProgress {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  teamCount: number;
  tasksCompleted: number;
  contributionHours: number;
  participationScore: number;
  lastActive: string;
  status: 'active' | 'inactive' | 'at_risk';
  trend: 'up' | 'down' | 'stable';
}

interface WorkspaceOverview {
  totalStudents: number;
  totalTeams: number;
  totalProjects: number;
  averageParticipation: number;
  activeStudents: number;
  atRiskStudents: number;
  completionRate: number;
}

// =====================================================
// MAIN DASHBOARD COMPONENT
// =====================================================

export function InstructorDashboard() {
  const { canAccess, can } = usePermissions();
  const { currentWorkspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState<'overview' | 'teams' | 'students' | 'analytics'>('overview');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'semester'>('week');
  
  // Mock data - replace with actual API calls
  const [overview, setOverview] = useState<WorkspaceOverview>({
    totalStudents: 45,
    totalTeams: 12,
    totalProjects: 8,
    averageParticipation: 78,
    activeStudents: 38,
    atRiskStudents: 7,
    completionRate: 85
  });
  
  const [teams, setTeams] = useState<TeamMetrics[]>([
    {
      id: '1',
      name: 'Team Alpha',
      memberCount: 4,
      activeProjects: 2,
      completedTasks: 15,
      totalTasks: 20,
      participationScore: 92,
      lastActivity: '2 hours ago',
      status: 'active',
      trend: 'up'
    },
    {
      id: '2',
      name: 'Team Beta',
      memberCount: 3,
      activeProjects: 1,
      completedTasks: 8,
      totalTasks: 18,
      participationScore: 65,
      lastActivity: '1 day ago',
      status: 'at_risk',
      trend: 'down'
    }
  ]);
  
  const [students, setStudents] = useState<StudentProgress[]>([
    {
      id: '1',
      name: 'Alice Johnson',
      email: 'alice@example.com',
      teamCount: 2,
      tasksCompleted: 12,
      contributionHours: 25,
      participationScore: 88,
      lastActive: '1 hour ago',
      status: 'active',
      trend: 'up'
    },
    {
      id: '2',
      name: 'Bob Smith',
      email: 'bob@example.com',
      teamCount: 1,
      tasksCompleted: 5,
      contributionHours: 8,
      participationScore: 45,
      lastActive: '3 days ago',
      status: 'at_risk',
      trend: 'down'
    }
  ]);
  
  // Check permissions
  if (!canAccess.instructorFeatures()) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Access Restricted
          </h3>
          <p className="text-gray-600">
            You don't have permission to access instructor features.
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
            Instructor Dashboard
          </h1>
          <p className="text-gray-600">
            Monitor student progress and team performance
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="semester">This Semester</option>
          </select>
          
          {can('analytics', 'export_data') && (
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>
      
      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'teams', label: 'Teams', icon: Users },
            { id: 'students', label: 'Students', icon: UserCheck },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp }
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
            <OverviewTab overview={overview} />
          )}
          {activeTab === 'teams' && (
            <TeamsTab teams={teams} />
          )}
          {activeTab === 'students' && (
            <StudentsTab students={students} />
          )}
          {activeTab === 'analytics' && (
            <AnalyticsTab />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// =====================================================
// OVERVIEW TAB
// =====================================================

function OverviewTab({ overview }: { overview: WorkspaceOverview }) {
  const metrics = [
    {
      label: 'Total Students',
      value: overview.totalStudents,
      icon: Users,
      color: 'blue',
      trend: '+5 this week'
    },
    {
      label: 'Active Teams',
      value: overview.totalTeams,
      icon: Users,
      color: 'green',
      trend: '+2 this week'
    },
    {
      label: 'Projects',
      value: overview.totalProjects,
      icon: BookOpen,
      color: 'purple',
      trend: '+1 this week'
    },
    {
      label: 'Avg. Participation',
      value: `${overview.averageParticipation}%`,
      icon: TrendingUp,
      color: 'orange',
      trend: '+3% this week'
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
                <p className="text-sm text-green-600 mt-1">
                  {metric.trend}
                </p>
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
      
      {/* Alerts and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Attention Required
          </h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-900">
                  7 students at risk
                </p>
                <p className="text-xs text-red-700">
                  Low participation in the last week
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-yellow-900">
                  3 overdue assignments
                </p>
                <p className="text-xs text-yellow-700">
                  Team Beta needs attention
                </p>
              </div>
            </div>
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
              Create New Assignment
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <MessageSquare className="w-4 h-4 mr-2" />
              Send Announcement
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <FileText className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// TEAMS TAB
// =====================================================

function TeamsTab({ teams }: { teams: TeamMetrics[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'at_risk' | 'inactive'>('all');
  
  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || team.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search teams..."
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
          <option value="all">All Teams</option>
          <option value="active">Active</option>
          <option value="at_risk">At Risk</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      
      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeams.map((team, index) => (
          <motion.div
            key={team.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {team.name}
              </h3>
              <div className="flex items-center space-x-2">
                <StatusBadge status={team.status} />
                <TrendIndicator trend={team.trend} />
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Members</span>
                <span className="font-medium">{team.memberCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Active Projects</span>
                <span className="font-medium">{team.activeProjects}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Task Progress</span>
                <span className="font-medium">
                  {team.completedTasks}/{team.totalTasks}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Participation</span>
                <span className="font-medium">{team.participationScore}%</span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Last active: {team.lastActivity}
                </span>
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4 mr-1" />
                  View
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
// STUDENTS TAB
// =====================================================

function StudentsTab({ students }: { students: StudentProgress[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'at_risk' | 'inactive'>('all');
  
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || student.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search students..."
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
          <option value="all">All Students</option>
          <option value="active">Active</option>
          <option value="at_risk">At Risk</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      
      {/* Students Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teams
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tasks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Participation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {student.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {student.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {student.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.teamCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.tasksCompleted}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.contributionHours}h
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-900 mr-2">
                        {student.participationScore}%
                      </span>
                      <TrendIndicator trend={student.trend} />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={student.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// ANALYTICS TAB
// =====================================================

function AnalyticsTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Participation Trends */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Participation Trends
          </h3>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 mx-auto mb-2" />
              <p>Chart visualization would go here</p>
            </div>
          </div>
        </div>
        
        {/* Team Performance */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Team Performance
          </h3>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <PieChart className="w-12 h-12 mx-auto mb-2" />
              <p>Chart visualization would go here</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Detailed Analytics */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Detailed Analytics
        </h3>
        <p className="text-gray-600">
          Advanced analytics and reporting features would be implemented here,
          including participation metrics, collaboration patterns, and performance insights.
        </p>
      </div>
    </div>
  );
}

// =====================================================
// UTILITY COMPONENTS
// =====================================================

function StatusBadge({ status }: { status: 'active' | 'at_risk' | 'inactive' }) {
  const styles = {
    active: 'bg-green-100 text-green-800',
    at_risk: 'bg-yellow-100 text-yellow-800',
    inactive: 'bg-red-100 text-red-800'
  };
  
  const labels = {
    active: 'Active',
    at_risk: 'At Risk',
    inactive: 'Inactive'
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

function TrendIndicator({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  const icons = {
    up: ArrowUpRight,
    down: ArrowDownRight,
    stable: Minus
  };
  
  const colors = {
    up: 'text-green-500',
    down: 'text-red-500',
    stable: 'text-gray-400'
  };
  
  const Icon = icons[trend];
  
  return (
    <Icon className={cn('w-4 h-4', colors[trend])} />
  );
}