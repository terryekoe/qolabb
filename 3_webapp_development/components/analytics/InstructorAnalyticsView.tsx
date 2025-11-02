'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
  FileText,
  Download,
  FileDown,
  Filter,
  Search,
  Eye,
  Award,
  Activity,
  Calendar,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import Avatar from '@/components/ui/Avatar';
import { Button } from '@/components/Button';
import { useAuth } from '@/lib/auth/AuthContext';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';
import {
  getWorkspaceAnalytics,
  getTeamAnalytics,
  getStudentPerformance,
  getWorkspaceTeams,
} from '@/lib/db/queries';
import { cn } from '@/lib/utils';

export function InstructorAnalyticsView() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [workspaceStats, setWorkspaceStats] = useState<any>(null);
  const [teamStats, setTeamStats] = useState<any[]>([]);
  const [studentPerformance, setStudentPerformance] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'teams' | 'students' | 'equity'>('overview');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'semester'>('semester');
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadAnalytics = useCallback(async () => {
    if (!user || !currentWorkspace) return;

    try {
      setLoading(true);
      
      // Get workspace analytics
      const workspaceAnalytics = await getWorkspaceAnalytics(currentWorkspace.id);
      setWorkspaceStats(workspaceAnalytics);

      // Get all teams
      const teams = await getWorkspaceTeams(currentWorkspace.id);
      
      // Get analytics for each team
      const teamAnalyticsPromises = teams?.map((team: any) => 
        getTeamAnalytics(team.id).catch(() => null)
      ) || [];
      
      const teamAnalyticsResults = await Promise.all(teamAnalyticsPromises);
      setTeamStats(teamAnalyticsResults.filter(t => t !== null));

      // Get student performance
      const performance = await getStudentPerformance(currentWorkspace.id);
      setStudentPerformance(performance);

    } catch (error) {
      console.error('Error loading instructor analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [user, currentWorkspace]);

  useEffect(() => {
    if (user && currentWorkspace) {
      loadAnalytics();
    }
  }, [user, currentWorkspace, loadAnalytics]);

  // Export functions
  async function exportToCSV(data: any[], filename: string) {
    if (!data || data.length === 0) return;
    
    setExporting(true);
    try {
      // Get headers from first object
      const headers = Object.keys(data[0]);
      
      // Create CSV content
      const csvRows = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            // Handle values with commas or quotes
            if (value === null || value === undefined) return '';
            const stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          }).join(',')
        )
      ];
      
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  async function exportWorkspaceReport() {
    if (!workspaceStats) return;
    
    setExporting(true);
    try {
      const reportData = {
        workspace: currentWorkspace?.name || 'Workspace',
        generatedAt: new Date().toISOString(),
        overview: {
          totalMembers: workspaceStats.totalMembers,
          totalTeams: workspaceStats.totalTeams,
          activeProjects: workspaceStats.activeProjects,
          totalContributions: workspaceStats.totalContributions,
          totalHours: workspaceStats.totalHours,
          avgParticipation: workspaceStats.avgParticipation,
          completionRate: workspaceStats.completionRate,
        },
        teams: teamStats.map(team => ({
          name: team.team.name,
          members: team.members.length,
          totalHours: team.totalHours,
          contributions: team.totalContributions,
          tasks: `${team.completedTasks}/${team.totalTasks}`,
          fairnessScore: team.fairnessScore,
        })),
        students: studentPerformance.map(student => ({
          name: student.name,
          institution: student.institution || 'N/A',
          totalHours: student.totalHours,
          contributions: student.contributions,
          tasks: `${student.tasksCompleted}/${student.tasksAssigned}`,
          participationScore: student.participationScore,
          lastActive: student.lastActive || 'N/A',
        })),
      };

      const jsonContent = JSON.stringify(reportData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `workspace_report_${currentWorkspace?.name || 'report'}_${new Date().toISOString().split('T')[0]}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Failed to export report. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  // Calculate equity metrics
  function calculateEquityMetrics() {
    if (!studentPerformance || studentPerformance.length === 0) {
      return {
        giniCoefficient: 0,
        fairnessScore: 0,
        participationVariance: 0,
        mostActive: null,
        leastActive: null,
      };
    }

    const hoursArray = studentPerformance.map(s => s.totalHours || 0);
    const totalHours = hoursArray.reduce((sum, h) => sum + h, 0);
    const n = hoursArray.length;
    
    // Guard against division by zero
    if (n === 0 || totalHours === 0) {
      return {
        giniCoefficient: 0,
        fairnessScore: 0,
        participationVariance: 0,
        mostActive: null,
        leastActive: null,
      };
    }
    
    const avgHours = totalHours / n;

    // Calculate Gini coefficient (equality measure)
    const sortedHours = [...hoursArray].sort((a, b) => a - b);
    let giniSum = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        giniSum += Math.abs(sortedHours[i] - sortedHours[j]);
      }
    }
    const giniCoefficient = avgHours > 0 ? giniSum / (2 * n * n * avgHours) : 0;

    // Calculate variance
    const variance = hoursArray.reduce((sum, h) => sum + Math.pow(h - avgHours, 2), 0) / n;
    const fairnessScore = Math.max(0, Math.min(100, Math.round((1 - giniCoefficient) * 100)));

    return {
      giniCoefficient: Math.round(giniCoefficient * 100) / 100,
      fairnessScore,
      participationVariance: Math.round(variance * 10) / 10,
      mostActive: studentPerformance[0] || null,
      leastActive: studentPerformance[studentPerformance.length - 1] || null,
    };
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!workspaceStats) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <BarChart3 size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600">No analytics data available yet.</p>
        </div>
      </div>
    );
  }

  const equityMetrics = calculateEquityMetrics();
  const filteredStudents = studentPerformance.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.institution?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-qolabb-beige-600 rounded-2xl p-4 sm:p-8 text-white">
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Workspace Analytics</h1>
            <p className="text-sm sm:text-base text-white/80">Comprehensive insights for equitable participation tracking</p>
          </div>
          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
            {/* Time Range Selector */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2 sm:p-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="bg-transparent text-white border-none outline-none cursor-pointer text-sm sm:text-base"
              >
                <option value="week" className="text-gray-900">This Week</option>
                <option value="month" className="text-gray-900">This Month</option>
                <option value="semester" className="text-gray-900">This Semester</option>
              </select>
            </div>
            
            {/* Export Buttons */}
            <div className="flex items-center space-x-2 flex-wrap gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => exportToCSV(studentPerformance, 'student_performance')}
                disabled={exporting || studentPerformance.length === 0}
                className="bg-white/10 text-white hover:bg-white/20 border-white/20 text-xs sm:text-sm flex-1 sm:flex-initial"
              >
                <Download size={14} className="sm:mr-2 sm:block hidden" />
                <span className="sm:hidden">CSV</span>
                <span className="hidden sm:inline">Export CSV</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={exportWorkspaceReport}
                disabled={exporting}
                className="bg-white/10 text-white hover:bg-white/20 border-white/20 text-xs sm:text-sm flex-1 sm:flex-initial"
              >
                <FileDown size={14} className="sm:mr-2 sm:block hidden" />
                <span className="sm:hidden">Report</span>
                <span className="hidden sm:inline">Full Report</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadAnalytics}
                disabled={loading}
                className="bg-white/10 text-white hover:bg-white/20 border-white/20 text-xs sm:text-sm flex-1 sm:flex-initial"
              >
                <RefreshCw size={14} className={cn('sm:mr-2 sm:block hidden', loading && 'animate-spin')} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Members"
          value={workspaceStats.totalMembers || 0}
          change="Active workspace members"
          changeType="neutral"
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Teams"
          value={workspaceStats.totalTeams || 0}
          change="Active teams"
          changeType="neutral"
          icon={Users}
          color="green"
        />
        <StatCard
          title="Equity Score"
          value={`${equityMetrics.fairnessScore}%`}
          change={
            equityMetrics.fairnessScore >= 70 ? 'Well balanced' :
            equityMetrics.fairnessScore >= 50 ? 'Moderate balance' :
            'Needs attention'
          }
          changeType={
            equityMetrics.fairnessScore >= 70 ? 'positive' :
            equityMetrics.fairnessScore >= 50 ? 'neutral' : 'negative'
          }
          icon={Target}
          color="purple"
        />
        <StatCard
          title="Avg Participation"
          value={`${workspaceStats.avgParticipation || 0}h`}
          change={`${workspaceStats.totalHours || 0}h total`}
          changeType="positive"
          icon={TrendingUp}
          color="orange"
        />
      </div>

      {/* Equity Alert */}
      {equityMetrics.fairnessScore < 70 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 mb-1">Participation Imbalance Detected</h3>
              <p className="text-sm text-yellow-800">
                The equity score of {equityMetrics.fairnessScore}% indicates uneven participation across teams.
                Consider redistributing tasks or providing additional support to students with lower participation.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        <div className="flex space-x-2 sm:space-x-4 border-b border-gray-200 mb-4 sm:mb-6 overflow-x-auto scrollbar-hide">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'teams', label: 'Teams', icon: Users },
            { id: 'students', label: 'Students', icon: Eye },
            { id: 'equity', label: 'Equity Analysis', icon: Target },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 border-b-2 transition-colors whitespace-nowrap flex-shrink-0',
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 font-semibold'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              )}
            >
              <tab.icon size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span className="text-sm sm:text-base">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {workspaceStats.totalContributions || 0}
                </div>
                <div className="text-sm text-gray-600">Total Contributions</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {workspaceStats.totalHours || 0}h
                </div>
                <div className="text-sm text-gray-600">Total Hours</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="text-2xl font-bold text-purple-600 mb-1">
                  {workspaceStats.activeProjects || 0}
                </div>
                <div className="text-sm text-gray-600">Active Projects</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <div className="text-2xl font-bold text-orange-600 mb-1">
                  {workspaceStats.completionRate || 0}%
                </div>
                <div className="text-sm text-gray-600">Completion Rate</div>
              </div>
            </div>

            {/* Team Comparison */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Performance Comparison</h3>
              <div className="space-y-3">
                {teamStats.slice(0, 10).map((team: any) => (
                  <div key={team.team.id} className="bg-gray-50 rounded-lg p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 space-y-1 sm:space-y-0">
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base">{team.team.name}</h4>
                      <div className="flex items-center flex-wrap gap-2 sm:space-x-4 text-xs sm:text-sm">
                        <span className="text-gray-600">{team.totalHours}h total</span>
                        <span className={cn(
                          'font-semibold',
                          team.fairnessScore >= 70 ? 'text-green-600' : 
                          team.fairnessScore >= 50 ? 'text-yellow-600' : 'text-red-600'
                        )}>
                          Fairness: {team.fairnessScore}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all"
                        style={{
                          width: `${workspaceStats.totalHours > 0 
                            ? (team.totalHours / workspaceStats.totalHours) * 100 
                            : 0}%`
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>{team.totalContributions} contributions</span>
                      <span>{team.completedTasks}/{team.totalTasks} tasks completed</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Teams Tab */}
        {activeTab === 'teams' && (
          <div className="space-y-4">
            {teamStats.length > 0 ? (
              teamStats.map((team: any) => (
                <div
                  key={team.team.id}
                  className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-200 hover:border-blue-300 transition-colors cursor-pointer"
                  onClick={() => setSelectedTeam(selectedTeam === team.team.id ? null : team.team.id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">{team.team.name}</h3>
                    <div className="flex items-center space-x-2 sm:space-x-4">
                      <div className={cn(
                        'px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold',
                        team.fairnessScore >= 70 ? 'bg-green-100 text-green-700' : 
                        team.fairnessScore >= 50 ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-red-100 text-red-700'
                      )}>
                        Fairness: {team.fairnessScore}%
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          exportToCSV(team.members, `team_${team.team.name}_members`);
                        }}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                      >
                        <Download size={16} className="text-gray-600" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
                    <div>
                      <div className="text-sm text-gray-600">Members</div>
                      <div className="text-xl font-bold text-gray-900">{team.members.length}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Total Hours</div>
                      <div className="text-xl font-bold text-gray-900">{team.totalHours || 0}h</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Contributions</div>
                      <div className="text-xl font-bold text-gray-900">{team.totalContributions || 0}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Tasks</div>
                      <div className="text-xl font-bold text-gray-900">
                        {team.completedTasks || 0}/{team.totalTasks || 0}
                      </div>
                    </div>
                  </div>

                  {selectedTeam === team.team.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="border-t border-gray-200 pt-4 mt-4"
                    >
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Member Participation</h4>
                      <div className="space-y-2">
                        {team.members.map((member: any) => {
                          const memberPercentage = team.totalHours > 0 && !isNaN(team.totalHours)
                            ? Math.round((member.hours || 0) / team.totalHours * 100)
                            : 0;
                          
                          return (
                            <div key={member.userId} className="bg-white rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">{member.name}</span>
                                <span className="text-sm font-semibold text-gray-900">
                                  {member.hours}h ({memberPercentage}%) • {member.contributions} contributions • {member.tasksCompleted}/{member.tasksAssigned} tasks
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all"
                                  style={{ width: `${memberPercentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Users size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600">No teams found in this workspace.</p>
              </div>
            )}
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="space-y-4">
            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToCSV(filteredStudents, 'student_performance')}
                disabled={exporting || filteredStudents.length === 0}
                className="whitespace-nowrap"
              >
                <Download size={16} className="mr-2" />
                Export
              </Button>
            </div>

            {filteredStudents.length > 0 ? (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <div className="overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700">Student</th>
                          <th className="text-right py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700">Hours</th>
                          <th className="text-right py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 hidden sm:table-cell">Contributions</th>
                          <th className="text-right py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 hidden md:table-cell">Tasks</th>
                          <th className="text-right py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700">Score</th>
                          <th className="text-right py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold text-gray-700 hidden lg:table-cell">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredStudents.map((student) => {
                          const isAtRisk = student.participationScore < 50;
                          const completionRate = student.tasksAssigned > 0
                            ? Math.round((student.tasksCompleted / student.tasksAssigned) * 100)
                            : 0;
                          
                          return (
                            <tr key={student.userId} className="hover:bg-gray-50">
                              <td className="py-3 px-3 sm:px-4">
                                <div className="flex items-center space-x-2 sm:space-x-3">
                                  <Avatar
                                    userId={student.userId}
                                    name={student.name}
                                    src={student.avatar}
                                    size="sm"
                                  />
                                  <div className="min-w-0">
                                    <div className="font-medium text-gray-900 text-sm sm:text-base truncate">{student.name}</div>
                                    {student.institution && (
                                      <div className="text-xs text-gray-500 truncate hidden sm:block">{student.institution}</div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="text-right py-3 px-3 sm:px-4 text-xs sm:text-sm text-gray-700">
                                {student.totalHours}h
                              </td>
                              <td className="text-right py-3 px-3 sm:px-4 text-xs sm:text-sm text-gray-700 hidden sm:table-cell">
                                {student.contributions}
                              </td>
                              <td className="text-right py-3 px-3 sm:px-4 text-xs sm:text-sm text-gray-700 hidden md:table-cell">
                                {student.tasksCompleted}/{student.tasksAssigned} ({completionRate}%)
                              </td>
                              <td className="text-right py-3 px-3 sm:px-4">
                                <span className={cn(
                                  'inline-flex px-2 py-1 rounded-full text-xs font-semibold',
                                  student.participationScore >= 70 ? 'bg-green-100 text-green-700' : 
                                  student.participationScore >= 50 ? 'bg-yellow-100 text-yellow-700' : 
                                  'bg-red-100 text-red-700'
                                )}>
                                  {student.participationScore}
                                </span>
                              </td>
                              <td className="text-right py-3 px-3 sm:px-4 hidden lg:table-cell">
                                {isAtRisk && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                    <AlertTriangle size={12} className="mr-1" />
                                    At Risk
                                  </span>
                                )}
                                {!isAtRisk && student.participationScore >= 70 && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                    <CheckCircle2 size={12} className="mr-1" />
                                    Active
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600">No students found matching your search.</p>
              </div>
            )}
          </div>
        )}

        {/* Equity Analysis Tab */}
        {activeTab === 'equity' && (
          <div className="space-y-6">
            {/* Equity Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-qolabb-beige-50 rounded-xl p-6 border border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Equity Score</h3>
                  <Target className="text-blue-600" size={24} />
                </div>
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  {equityMetrics.fairnessScore}%
                </div>
                <p className="text-sm text-gray-600">
                  {equityMetrics.fairnessScore >= 70 ? 'Well balanced participation' :
                   equityMetrics.fairnessScore >= 50 ? 'Moderate balance needed' :
                   'Significant imbalance detected'}
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Gini Coefficient</h3>
                  <BarChart3 className="text-gray-600" size={24} />
                </div>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  {equityMetrics.giniCoefficient}
                </div>
                <p className="text-sm text-gray-600">
                  {equityMetrics.giniCoefficient < 0.3 ? 'Low inequality' :
                   equityMetrics.giniCoefficient < 0.5 ? 'Moderate inequality' :
                   'High inequality'}
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Participation Variance</h3>
                  <TrendingUp className="text-gray-600" size={24} />
                </div>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  {equityMetrics.participationVariance}
                </div>
                <p className="text-sm text-gray-600">Lower is better for equity</p>
              </div>
            </div>

            {/* Participation Distribution */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Participation Distribution</h3>
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="space-y-3">
                    {studentPerformance.slice(0, 10).map((student, index) => {
                    const maxHours = Math.max(...studentPerformance.map(s => s.totalHours || 0));
                    const percentage = maxHours > 0 && !isNaN(maxHours) ? ((student.totalHours || 0) / maxHours) * 100 : 0;
                    
                    return (
                      <div key={student.userId}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <span className="text-sm font-medium text-gray-600 w-6">#{index + 1}</span>
                            <span className="text-sm font-medium text-gray-900">{student.name}</span>
                          </div>
                          <span className="text-sm font-semibold text-gray-900">
                            {student.totalHours}h
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-blue-600 h-3 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Top/Bottom Performers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* Most Active */}
              {equityMetrics.mostActive && (
                <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                  <div className="flex items-center space-x-2 mb-4">
                    <Award className="text-green-600" size={20} />
                    <h3 className="text-lg font-semibold text-green-900">Most Active</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="font-bold text-green-900">{equityMetrics.mostActive.name}</div>
                    <div className="text-sm text-green-700">
                      {equityMetrics.mostActive.totalHours}h • {equityMetrics.mostActive.contributions} contributions
                    </div>
                  </div>
                </div>
              )}

              {/* Least Active */}
              {equityMetrics.leastActive && (
                <div className="bg-red-50 rounded-xl p-6 border border-red-200">
                  <div className="flex items-center space-x-2 mb-4">
                    <AlertTriangle className="text-red-600" size={20} />
                    <h3 className="text-lg font-semibold text-red-900">Needs Support</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="font-bold text-red-900">{equityMetrics.leastActive.name}</div>
                    <div className="text-sm text-red-700">
                      {equityMetrics.leastActive.totalHours}h • {equityMetrics.leastActive.contributions} contributions
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Recommendations */}
            {equityMetrics.fairnessScore < 70 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">Recommendations</h3>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Consider redistributing tasks to balance workload across team members</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Provide additional support or resources to students with lower participation</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Review team assignments to ensure fair distribution of responsibilities</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Schedule check-ins with at-risk students to understand challenges</span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
