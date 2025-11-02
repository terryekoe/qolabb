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
  Eye,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import Avatar from '@/components/ui/Avatar';
import { useAuth } from '@/lib/auth/AuthContext';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';
import { getWorkspaceAnalytics, getTeamAnalytics, getStudentPerformance, getWorkspaceTeams } from '@/lib/db/queries';
import { cn } from '@/lib/utils';
import { Button } from '@/components/Button';

export function TAAnalyticsView() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [workspaceStats, setWorkspaceStats] = useState<any>(null);
  const [teamStats, setTeamStats] = useState<any[]>([]);
  const [studentPerformance, setStudentPerformance] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'teams' | 'students'>('overview');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

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
      console.error('Error loading TA analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [user, currentWorkspace]);

  useEffect(() => {
    if (user && currentWorkspace) {
      loadAnalytics();
    }
  }, [user, currentWorkspace, loadAnalytics]);

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

  const selectedTeamData = selectedTeam 
    ? teamStats.find(t => t.team.id === selectedTeam)
    : null;

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-qolabb-beige-600 rounded-2xl p-4 sm:p-8 text-white">
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Workspace Analytics</h1>
            <p className="text-sm sm:text-base text-white/80">Monitor team performance and student participation</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-white/80 mb-1">Role</div>
            <div className="text-lg sm:text-xl font-bold">Teaching Assistant</div>
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
          title="Tasks Completed"
          value={workspaceStats.tasksCompleted || 0}
          change={`${workspaceStats.completionRate || 0}% completion rate`}
          changeType="positive"
          icon={CheckCircle2}
          color="purple"
        />
        <StatCard
          title="Avg Participation"
          value={`${workspaceStats.avgParticipation || 0}h`}
          change="Per member average"
          changeType="positive"
          icon={TrendingUp}
          color="orange"
        />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        <div className="flex space-x-2 sm:space-x-4 border-b border-gray-200 mb-4 sm:mb-6 overflow-x-auto scrollbar-hide">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'teams', label: 'Teams', icon: Users },
            { id: 'students', label: 'Students', icon: Eye },
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
            {/* Team Comparison */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Comparison</h3>
              <div className="space-y-3">
                {teamStats.slice(0, 5).map((team: any) => (
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
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${workspaceStats.totalHours > 0 
                            ? (team.totalHours / workspaceStats.totalHours) * 100 
                            : 0}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Participation Distribution */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Participation Overview</h3>
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
                          const memberPercentage = team.totalHours > 0
                            ? Math.round((member.hours / team.totalHours) * 100)
                            : 0;
                          
                          return (
                            <div key={member.userId} className="bg-white rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">{member.name}</span>
                                <span className="text-sm font-semibold text-gray-900">
                                  {member.hours}h ({memberPercentage}%) • {member.contributions} contributions
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
            {studentPerformance.length > 0 ? (
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
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {studentPerformance.map((student) => (
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
                              {student.tasksCompleted}/{student.tasksAssigned}
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600">No student performance data available.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
