'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Clock,
  CheckCircle2,
  TrendingUp,
  Users,
  Target,
  Activity,
  Award,
  Calendar,
  FileText,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { useAuth } from '@/lib/auth/AuthContext';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';
import { getUserAnalytics, getTeamAnalytics, getUserTeams } from '@/lib/db';
import { cn } from '@/lib/utils';

export function StudentAnalyticsView() {
  const { user, profile } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<any>(null);
  const [teamStats, setTeamStats] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'contributions' | 'teams'>('overview');

  const loadAnalytics = useCallback(async () => {
    if (!user || !currentWorkspace) return;

    try {
      setLoading(true);

      // Get user's analytics
      const userAnalytics = await getUserAnalytics(user.id, currentWorkspace.id);
      setUserStats(userAnalytics);

      // Get user's teams
      const teams = await getUserTeams(user.id, currentWorkspace.id);

      // Get analytics for each team
      const teamAnalyticsPromises =
        teams
          ?.map((teamMember: any) => {
            const teamId = teamMember.team_id || teamMember.team?.id;
            if (!teamId) return null;
            return getTeamAnalytics(teamId).catch(() => null);
          })
          .filter(Boolean) || [];

      const teamAnalyticsResults = await Promise.all(teamAnalyticsPromises);
      setTeamStats(teamAnalyticsResults.filter((t) => t !== null));
    } catch (error) {
      console.error('Error loading student analytics:', error);
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

  if (!userStats) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <BarChart3 size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600">No analytics data available yet.</p>
        </div>
      </div>
    );
  }

  const completionRate =
    userStats.totalTasks > 0
      ? Math.round((userStats.completedTasks / userStats.totalTasks) * 100)
      : 0;

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-4 sm:p-8 text-white">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">My Analytics</h1>
        <p className="text-sm sm:text-base text-blue-100">
          Track your participation and contributions
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Hours"
          value={userStats.totalUnifiedHours || userStats.totalHours || 0}
          change={
            userStats.completedTasksWithoutContributions > 0
              ? `${userStats.estimatedHoursFromTasks || 0}h from tasks`
              : `${userStats.weekHours || 0} this week`
          }
          changeType="positive"
          icon={Clock}
          color="blue"
        />
        <StatCard
          title="Contributions"
          value={userStats.totalUnifiedContributions || userStats.totalContributions || 0}
          change={
            userStats.completedTasksWithoutContributions > 0
              ? `+${userStats.completedTasksWithoutContributions} from tasks`
              : 'All time'
          }
          changeType={userStats.completedTasksWithoutContributions > 0 ? 'positive' : 'neutral'}
          icon={Activity}
          color="green"
        />
        <StatCard
          title="Tasks Completed"
          value={userStats.completedTasks || 0}
          change={`${completionRate}% completion rate`}
          changeType="positive"
          icon={CheckCircle2}
          color="purple"
        />
        <StatCard
          title="Participation Score"
          value={
            userStats.unifiedParticipationScore ||
            Math.round(
              userStats.totalUnifiedHours * 0.4 +
                userStats.totalUnifiedContributions * 2 +
                completionRate * 0.5 +
                userStats.completedTasks * 1.0
            )
          }
          change={`Unified: Tasks + Contributions`}
          changeType="positive"
          icon={Award}
          color="orange"
        />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        <div className="flex space-x-2 sm:space-x-4 border-b border-gray-200 mb-4 sm:mb-6 overflow-x-auto scrollbar-hide">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'contributions', label: 'Contributions', icon: FileText },
            { id: 'teams', label: 'My Teams', icon: Users },
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
            {/* Unified Participation Warning */}
            {userStats.completedTasksWithoutContributions > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Target className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 mb-1">
                      Enhanced Participation Tracking
                    </p>
                    <p className="text-xs text-blue-800">
                      {userStats.completedTasksWithoutContributions} completed task
                      {userStats.completedTasksWithoutContributions !== 1 ? 's' : ''} without logged
                      contributions. Estimated {userStats.estimatedHoursFromTasks || 0} hours
                      included in your participation score.
                      {userStats.completedTasksWithoutContributions > 0 && (
                        <span className="block mt-1 font-medium">
                          💡 Tip: Log contributions when completing tasks for more accurate
                          tracking!
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Contribution Type Breakdown */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contribution Types</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                {Object.entries(userStats.contributionBreakdown || {}).map(
                  ([type, count]: [string, any]) => (
                    <div key={type} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 capitalize">{type}</span>
                        <span className="text-lg font-bold text-blue-600">{count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{
                            width: `${
                              userStats.totalContributions > 0
                                ? (count / userStats.totalContributions) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Task Status */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Status</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {userStats.inProgressTasks || 0}
                  </div>
                  <div className="text-sm text-gray-600">In Progress</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {userStats.completedTasks || 0}
                  </div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="text-2xl font-bold text-gray-600 mb-1">
                    {(userStats.totalTasks || 0) -
                      (userStats.completedTasks || 0) -
                      (userStats.inProgressTasks || 0)}
                  </div>
                  <div className="text-sm text-gray-600">To Do</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contributions Tab */}
        {activeTab === 'contributions' && (
          <div className="space-y-4">
            {userStats.contributions && userStats.contributions.length > 0 ? (
              <div className="space-y-3">
                {userStats.contributions.slice(0, 10).map((contrib: any) => (
                  <div
                    key={contrib.id}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {contrib.title || 'Contribution'}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {contrib.project?.name || 'Project'} •{' '}
                          {contrib.contribution_type || 'other'}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-600">
                          {contrib.hours_spent || 0}h
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(contrib.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600">
                  No contributions yet. Start contributing to see your analytics!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Teams Tab */}
        {activeTab === 'teams' && (
          <div className="space-y-4">
            {teamStats.length > 0 ? (
              teamStats.map((team: any) => (
                <div
                  key={team.team.id}
                  className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-200"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">{team.team.name}</h3>
                    <div className="text-xs sm:text-sm text-gray-600">
                      Fairness Score:{' '}
                      <span className="font-semibold text-blue-600">{team.fairnessScore}%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
                    <div>
                      <div className="text-sm text-gray-600">Total Hours</div>
                      <div className="text-xl font-bold text-gray-900">{team.totalHours || 0}h</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Contributions</div>
                      <div className="text-xl font-bold text-gray-900">
                        {team.totalContributions || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Tasks</div>
                      <div className="text-xl font-bold text-gray-900">
                        {team.completedTasks || 0}/{team.totalTasks || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Projects</div>
                      <div className="text-xl font-bold text-gray-900">
                        {team.totalProjects || 0}
                      </div>
                    </div>
                  </div>

                  {/* Team Member Participation */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Team Participation</h4>
                    <div className="space-y-2">
                      {team.members.map((member: any) => {
                        const isMe = member.userId === user?.id;
                        const memberPercentage =
                          team.totalHours > 0
                            ? Math.round((member.hours / team.totalHours) * 100)
                            : 0;

                        return (
                          <div key={member.userId} className="bg-white rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span
                                className={cn(
                                  'text-sm font-medium',
                                  isMe ? 'text-blue-600' : 'text-gray-700'
                                )}
                              >
                                {member.name} {isMe && '(You)'}
                              </span>
                              <span className="text-sm font-semibold text-gray-900">
                                {member.hours}h ({memberPercentage}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={cn(
                                  'h-2 rounded-full transition-all',
                                  isMe ? 'bg-blue-600' : 'bg-qolabb-beige-500'
                                )}
                                style={{ width: `${memberPercentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Users size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600">You're not part of any teams yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
