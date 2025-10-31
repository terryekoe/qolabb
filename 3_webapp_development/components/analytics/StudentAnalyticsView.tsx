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
import { getUserAnalytics, getTeamAnalytics, getUserTeams } from '@/lib/db/queries';
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
      const teamAnalyticsPromises = teams?.map((teamMember: any) => {
        const teamId = teamMember.team_id || teamMember.team?.id;
        if (!teamId) return null;
        return getTeamAnalytics(teamId).catch(() => null);
      }).filter(Boolean) || [];
      
      const teamAnalyticsResults = await Promise.all(teamAnalyticsPromises);
      setTeamStats(teamAnalyticsResults.filter(t => t !== null));

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

  const completionRate = userStats.totalTasks > 0
    ? Math.round((userStats.completedTasks / userStats.totalTasks) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-qolabb-navy-600 to-qolabb-navy-800 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">My Analytics</h1>
        <p className="text-qolabb-navy-100">Track your participation and contributions</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Hours"
          value={userStats.totalHours || 0}
          change={`${userStats.weekHours || 0} this week`}
          changeType="positive"
          icon={Clock}
          color="blue"
        />
        <StatCard
          title="Contributions"
          value={userStats.totalContributions || 0}
          change="All time"
          changeType="neutral"
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
          value={Math.round(
            (userStats.totalHours * 0.4) +
            (userStats.totalContributions * 2) +
            (completionRate * 0.5)
          )}
          change="Based on hours, contributions & completion"
          changeType="positive"
          icon={Award}
          color="orange"
        />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex space-x-4 border-b border-gray-200 mb-6">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'contributions', label: 'Contributions', icon: FileText },
            { id: 'teams', label: 'My Teams', icon: Users },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center space-x-2 px-4 py-2 border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-qolabb-navy-600 text-qolabb-navy-600 font-semibold'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              )}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Contribution Type Breakdown */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contribution Types</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(userStats.contributionBreakdown || {}).map(([type, count]: [string, any]) => (
                  <div key={type} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 capitalize">{type}</span>
                      <span className="text-lg font-bold text-qolabb-navy-600">{count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-qolabb-navy-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${userStats.totalContributions > 0 
                            ? (count / userStats.totalContributions) * 100 
                            : 0}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
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
                    {(userStats.totalTasks || 0) - (userStats.completedTasks || 0) - (userStats.inProgressTasks || 0)}
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
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-qolabb-navy-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">{contrib.title || 'Contribution'}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {contrib.project?.name || 'Project'} • {contrib.contribution_type || 'other'}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-qolabb-navy-600">
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
                <p className="text-gray-600">No contributions yet. Start contributing to see your analytics!</p>
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
                  className="bg-gray-50 rounded-lg p-6 border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">{team.team.name}</h3>
                    <div className="text-sm text-gray-600">
                      Fairness Score: <span className="font-semibold text-qolabb-navy-600">{team.fairnessScore}%</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
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
                    <div>
                      <div className="text-sm text-gray-600">Projects</div>
                      <div className="text-xl font-bold text-gray-900">{team.totalProjects || 0}</div>
                    </div>
                  </div>

                  {/* Team Member Participation */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Team Participation</h4>
                    <div className="space-y-2">
                      {team.members.map((member: any) => {
                        const isMe = member.userId === user?.id;
                        const memberPercentage = team.totalHours > 0
                          ? Math.round((member.hours / team.totalHours) * 100)
                          : 0;
                        
                        return (
                          <div key={member.userId} className="bg-white rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className={cn(
                                'text-sm font-medium',
                                isMe ? 'text-qolabb-navy-600' : 'text-gray-700'
                              )}>
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
                                  isMe ? 'bg-qolabb-navy-600' : 'bg-qolabb-beige-500'
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
