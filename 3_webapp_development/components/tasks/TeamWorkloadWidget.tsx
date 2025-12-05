'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Lightbulb,
  ArrowRight,
  Clock,
  Target,
  Filter,
  Info,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { getTeamMembers } from '@/lib/db/queries';
import { cn } from '@/lib/utils';

interface TeamWorkloadWidgetProps {
  tasks: any[];
  projects: any[];
  currentWorkspaceId: string;
  userId?: string;
}

interface MemberWorkload {
  userId: string;
  name: string;
  avatar?: string;
  totalTasks: number;
  todoTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  unassignedTasks: number;
  percentage: number;
  teamId?: string;
  teamName?: string;
}

export function TeamWorkloadWidget({
  tasks,
  projects,
  currentWorkspaceId,
  userId,
}: TeamWorkloadWidgetProps) {
  const [teamMembersMap, setTeamMembersMap] = useState<Record<string, any[]>>({});
  const [teamNamesMap, setTeamNamesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string>('all');

  // Group tasks by team and get team names
  const tasksByTeam = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    const names: Record<string, string> = {};

    tasks.forEach((task) => {
      if (task.team_id) {
        if (!grouped[task.team_id]) {
          grouped[task.team_id] = [];
        }
        grouped[task.team_id].push(task);

        // Get team name from project
        if (!names[task.team_id] && task.project) {
          // Try to find team name from projects array
          const project = projects.find((p) => p.team_id === task.team_id);
          if (project?.team?.name) {
            names[task.team_id] = project.team.name;
          } else {
            names[task.team_id] = `Team ${task.team_id.slice(0, 8)}`;
          }
        }
      }
    });

    setTeamNamesMap(names);
    return grouped;
  }, [tasks, projects]);

  // Get unique team IDs
  const teamIds = useMemo(() => {
    return [...new Set(projects.map((p) => p.team_id).filter(Boolean))];
  }, [projects]);

  // Load team members for all teams
  useEffect(() => {
    async function loadTeamMembers() {
      if (projects.length === 0) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const membersMap: Record<string, any[]> = {};

        // Get unique team IDs
        const uniqueTeamIds = [...new Set(projects.map((p) => p.team_id).filter(Boolean))];

        for (const teamId of uniqueTeamIds) {
          try {
            const members = await getTeamMembers(teamId);
            // Filter out instructors
            const studentMembers = members.filter((member: any) => {
              const userRole =
                member.user?.role?.toLowerCase() || member.profile?.role?.toLowerCase() || '';
              return userRole !== 'instructor' && userRole !== 'teaching_assistant';
            });
            membersMap[teamId] = studentMembers || [];
          } catch (error) {
            console.error(`Error loading members for team ${teamId}:`, error);
            membersMap[teamId] = [];
          }
        }

        setTeamMembersMap(membersMap);
      } catch (error) {
        console.error('Error loading team members:', error);
      } finally {
        setLoading(false);
      }
    }

    loadTeamMembers();
  }, [projects]);

  // Calculate workload per member for each team (supporting multiple assignees)
  const calculateWorkload = useMemo(() => {
    const allWorkloads: MemberWorkload[] = [];

    Object.entries(tasksByTeam).forEach(([teamId, teamTasks]) => {
      const members = teamMembersMap[teamId] || [];

      if (members.length === 0) return;

      // Count tasks per member
      const memberTaskCounts: Record<
        string,
        {
          total: number;
          todo: number;
          inProgress: number;
          completed: number;
        }
      > = {};

      // Initialize all members
      members.forEach((member: any) => {
        const memberId = member.user_id;
        memberTaskCounts[memberId] = {
          total: 0,
          todo: 0,
          inProgress: 0,
          completed: 0,
        };
      });

      // Count assigned tasks (support both old assigned_to and new assignees array)
      teamTasks.forEach((task) => {
        // Get all assignees for this task (new system)
        const assigneeIds = new Set<string>();

        // Add from assignees array (new multiple assignees system)
        if (task.assignees && Array.isArray(task.assignees) && task.assignees.length > 0) {
          task.assignees.forEach((assignee: any) => {
            if (assignee.user_id) {
              assigneeIds.add(assignee.user_id);
            }
          });
        }

        // Also check old assigned_to field (backward compatibility)
        if (task.assigned_to) {
          assigneeIds.add(task.assigned_to);
        }

        // Count task for each assignee
        assigneeIds.forEach((assigneeId) => {
          if (memberTaskCounts[assigneeId]) {
            memberTaskCounts[assigneeId].total += 1;
            if (task.status === 'todo') memberTaskCounts[assigneeId].todo += 1;
            if (task.status === 'in_progress') memberTaskCounts[assigneeId].inProgress += 1;
            if (task.status === 'completed') memberTaskCounts[assigneeId].completed += 1;
          }
        });
      });

      // Calculate unassigned tasks (tasks with no assignees)
      const unassignedCount = teamTasks.filter((t) => {
        const hasOldAssignee = t.assigned_to;
        const hasNewAssignees = t.assignees && Array.isArray(t.assignees) && t.assignees.length > 0;
        return !hasOldAssignee && !hasNewAssignees;
      }).length;

      const totalAssignedTasks = Object.values(memberTaskCounts).reduce(
        (sum, m) => sum + m.total,
        0
      );
      const totalTasks = teamTasks.length;
      const avgTasksPerMember = members.length > 0 ? totalAssignedTasks / members.length : 0;

      // Build workload array
      members.forEach((member: any) => {
        const memberId = member.user_id;
        const counts = memberTaskCounts[memberId];
        const memberName = member.user?.full_name || member.profile?.full_name || 'Unknown';
        const memberAvatar = member.user?.avatar_url || member.profile?.avatar_url;

        const percentage =
          avgTasksPerMember > 0 ? Math.round((counts.total / avgTasksPerMember) * 100) : 0;

        allWorkloads.push({
          userId: memberId,
          name: memberName,
          avatar: memberAvatar,
          totalTasks: counts.total,
          todoTasks: counts.todo,
          inProgressTasks: counts.inProgress,
          completedTasks: counts.completed,
          unassignedTasks: 0,
          percentage,
          teamId,
          teamName: teamNamesMap[teamId],
        });
      });

      // Add unassigned indicator (distributed evenly for visualization)
      if (unassignedCount > 0) {
        const unassignedPerMember = unassignedCount / members.length;
        allWorkloads.forEach((workload) => {
          if (workload.teamId === teamId) {
            workload.unassignedTasks = Math.round(unassignedPerMember * 10) / 10;
          }
        });
      }
    });

    return allWorkloads;
  }, [tasksByTeam, teamMembersMap, teamNamesMap]);

  // Filter workloads by selected team
  const filteredWorkloads = useMemo(() => {
    if (selectedTeam === 'all') return calculateWorkload;
    return calculateWorkload.filter((w) => w.teamId === selectedTeam);
  }, [calculateWorkload, selectedTeam]);

  // Calculate overall statistics
  const statistics = useMemo(() => {
    const workloads = filteredWorkloads;
    if (workloads.length === 0) {
      return {
        totalTasks: 0,
        totalMembers: 0,
        avgTasks: 0,
        totalCompleted: 0,
        totalInProgress: 0,
        totalTodo: 0,
        unassignedCount: 0,
      };
    }

    const totalTasks = workloads.reduce((sum, w) => sum + w.totalTasks, 0);
    const totalCompleted = workloads.reduce((sum, w) => sum + w.completedTasks, 0);
    const totalInProgress = workloads.reduce((sum, w) => sum + w.inProgressTasks, 0);
    const totalTodo = workloads.reduce((sum, w) => sum + w.todoTasks, 0);
    const unassignedCount = tasks.filter((t) => {
      const hasOldAssignee = t.assigned_to;
      const hasNewAssignees = t.assignees && Array.isArray(t.assignees) && t.assignees.length > 0;
      return !hasOldAssignee && !hasNewAssignees;
    }).length;

    return {
      totalTasks,
      totalMembers: workloads.length,
      avgTasks: totalTasks / workloads.length,
      totalCompleted,
      totalInProgress,
      totalTodo,
      unassignedCount,
    };
  }, [filteredWorkloads, tasks]);

  // Calculate balance score
  const balanceScore = useMemo(() => {
    if (filteredWorkloads.length === 0) return 0;

    const taskCounts = filteredWorkloads.map((w) => w.totalTasks);
    const maxTasks = Math.max(...taskCounts);
    const minTasks = Math.min(...taskCounts);
    const avgTasks = taskCounts.reduce((sum, count) => sum + count, 0) / taskCounts.length;

    if (avgTasks === 0) return 100; // Perfect balance if no tasks

    // Calculate coefficient of variation (lower = more balanced)
    const variance =
      taskCounts.reduce((sum, count) => sum + Math.pow(count - avgTasks, 2), 0) / taskCounts.length;
    const stdDev = Math.sqrt(variance);
    const cv = avgTasks > 0 ? stdDev / avgTasks : 0;

    // Convert to score (0-100, higher is better)
    const score = Math.max(0, Math.min(100, Math.round((1 - cv) * 100)));
    return score;
  }, [filteredWorkloads]);

  // Sort by total tasks (highest first)
  const sortedWorkload = [...filteredWorkloads].sort((a, b) => b.totalTasks - a.totalTasks);

  // Find imbalance indicators
  const avgTasks = statistics.avgTasks;

  const hasImbalance =
    sortedWorkload.length > 0 &&
    (sortedWorkload[0].totalTasks > avgTasks * 1.5 ||
      sortedWorkload[sortedWorkload.length - 1].totalTasks < avgTasks * 0.5);

  // Calculate redistribution suggestions
  const redistributionSuggestions = useMemo(() => {
    if (!hasImbalance || sortedWorkload.length < 2) return [];

    const overloaded = sortedWorkload.filter((m) => m.totalTasks > avgTasks * 1.3);
    const underutilized = sortedWorkload.filter(
      (m) => m.totalTasks < avgTasks * 0.7 && m.totalTasks < avgTasks
    );

    if (overloaded.length === 0 || underutilized.length === 0) return [];

    const suggestions: Array<{
      from: MemberWorkload;
      to: MemberWorkload;
      suggestedTasks: number;
    }> = [];

    overloaded.forEach((overloadedMember) => {
      const excess = overloadedMember.totalTasks - avgTasks;
      if (excess > 0 && underutilized.length > 0) {
        // Find the most underutilized member
        const mostUnderutilized = underutilized.reduce((min, member) =>
          member.totalTasks < min.totalTasks ? member : min
        );
        const deficit = avgTasks - mostUnderutilized.totalTasks;

        if (deficit > 0) {
          const tasksToMove = Math.min(Math.ceil(excess / 2), Math.ceil(deficit));
          if (tasksToMove > 0) {
            suggestions.push({
              from: overloadedMember,
              to: mostUnderutilized,
              suggestedTasks: tasksToMove,
            });
          }
        }
      }
    });

    return suggestions.slice(0, 3); // Max 3 suggestions
  }, [hasImbalance, sortedWorkload, avgTasks]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-500 mt-4">Loading team workload...</p>
      </div>
    );
  }

  if (filteredWorkloads.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
        <Users size={48} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          No Team Members Found
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          {selectedTeam === 'all'
            ? 'Add team members to see workload distribution.'
            : 'No members found for the selected team.'}
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Statistics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <Target className="text-blue-600" size={20} />
            <span className="text-2xl font-bold text-blue-900">{statistics.totalTasks}</span>
          </div>
          <p className="text-xs font-medium text-blue-700">Total Tasks</p>
          <p className="text-xs text-blue-600 mt-1">{statistics.totalMembers} members</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle2 className="text-green-600" size={20} />
            <span className="text-2xl font-bold text-green-900">{statistics.totalCompleted}</span>
          </div>
          <p className="text-xs font-medium text-green-700">Completed</p>
          <p className="text-xs text-green-600 mt-1">
            {statistics.totalTasks > 0
              ? Math.round((statistics.totalCompleted / statistics.totalTasks) * 100)
              : 0}
            % done
          </p>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 border border-yellow-200">
          <div className="flex items-center justify-between mb-2">
            <Clock className="text-yellow-600" size={20} />
            <span className="text-2xl font-bold text-yellow-900">{statistics.totalInProgress}</span>
          </div>
          <p className="text-xs font-medium text-yellow-700">In Progress</p>
          <p className="text-xs text-yellow-600 mt-1">
            {statistics.totalTasks > 0
              ? Math.round((statistics.totalInProgress / statistics.totalTasks) * 100)
              : 0}
            % active
          </p>
        </div>

        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="text-gray-600 dark:text-gray-400" size={20} />
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {statistics.avgTasks.toFixed(1)}
            </span>
          </div>
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Avg per Member</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {statistics.totalTodo} to do
          </p>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-2.5 rounded-lg">
              <Users className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Team Workload Analysis
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Task distribution and participation balance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Team Filter */}
            {teamIds.length > 1 && (
              <div className="relative">
                <Filter
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="all">All Teams</option>
                  {teamIds.map((teamId) => (
                    <option key={teamId} value={teamId}>
                      {teamNamesMap[teamId] || `Team ${teamId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Balance Score */}
            <div
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2',
                balanceScore >= 70
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : balanceScore >= 50
                    ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                    : 'bg-red-100 text-red-700 border border-red-200'
              )}
            >
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  balanceScore >= 70
                    ? 'bg-green-600'
                    : balanceScore >= 50
                      ? 'bg-yellow-600'
                      : 'bg-red-600'
                )}
              />
              {balanceScore}% Balanced
            </div>

            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
              title={expanded ? 'Collapse details' : 'Expand details'}
            >
              {expanded ? (
                <ChevronUp size={18} className="text-gray-600" />
              ) : (
                <ChevronDown size={18} className="text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Balance Alert with Suggestions */}
        {hasImbalance && (
          <div className="mb-6 space-y-3">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-4 flex items-start space-x-3">
              <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-yellow-900">Workload Imbalance Detected</p>
                <p className="text-xs text-yellow-800 mt-1">
                  Consider redistributing tasks to ensure equitable participation across team
                  members.
                </p>
              </div>
            </div>

            {/* Redistribution Suggestions */}
            {redistributionSuggestions.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Lightbulb className="text-blue-600" size={18} />
                  <p className="text-sm font-semibold text-blue-900">Redistribution Suggestions</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {redistributionSuggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-blue-200 dark:border-blue-700"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <Avatar
                            userId={suggestion.from.userId}
                            name={suggestion.from.name}
                            src={suggestion.from.avatar}
                            size="xs"
                          />
                          <span className="font-medium text-gray-700 dark:text-gray-300 truncate">
                            {suggestion.from.userId === userId
                              ? 'You'
                              : suggestion.from.name.split(' ')[0]}
                          </span>
                          <ArrowRight size={14} className="text-blue-600 flex-shrink-0" />
                          <Avatar
                            userId={suggestion.to.userId}
                            name={suggestion.to.name}
                            src={suggestion.to.avatar}
                            size="xs"
                          />
                          <span className="font-medium text-gray-700 dark:text-gray-300 truncate">
                            {suggestion.to.userId === userId
                              ? 'You'
                              : suggestion.to.name.split(' ')[0]}
                          </span>
                        </div>
                        <span className="text-blue-700 font-bold ml-2 flex-shrink-0 text-base">
                          {suggestion.suggestedTasks}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Visual Distribution Chart */}
        <div className="mb-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 rounded-xl p-5 border border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <BarChart3 size={18} className="text-gray-600 dark:text-gray-400" />
              <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
                Task Distribution Chart
              </h4>
            </div>
            {avgTasks > 0 && (
              <div className="flex items-center space-x-2">
                <Info size={14} className="text-gray-400 dark:text-gray-500" />
                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                  Average: <span className="font-bold">{avgTasks.toFixed(1)}</span> tasks per member
                </span>
              </div>
            )}
          </div>
          <div className="space-y-3">
            {sortedWorkload.slice(0, 8).map((member) => {
              const maxTasks = Math.max(...sortedWorkload.map((m) => m.totalTasks), 1);
              const barWidth = maxTasks > 0 ? (member.totalTasks / maxTasks) * 100 : 0;
              const isOverloaded = member.totalTasks > avgTasks * 1.3;
              const isUnderutilized = member.totalTasks < avgTasks * 0.7;
              const isCurrentUser = member.userId === userId;
              const deviation =
                avgTasks > 0 ? ((member.totalTasks - avgTasks) / avgTasks) * 100 : 0;

              return (
                <div key={member.userId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <Avatar
                        userId={member.userId}
                        name={member.name}
                        src={member.avatar}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span
                            className={cn(
                              'text-sm font-semibold truncate',
                              isCurrentUser
                                ? 'text-blue-700 dark:text-blue-400'
                                : 'text-gray-900 dark:text-gray-100'
                            )}
                          >
                            {isCurrentUser ? 'You' : member.name}
                          </span>
                          {member.teamName && teamIds.length > 1 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded-full">
                              {member.teamName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          <span>{member.todoTasks} to do</span>
                          <span>•</span>
                          <span>{member.inProgressTasks} active</span>
                          <span>•</span>
                          <span className="text-green-600 font-medium">
                            {member.completedTasks} done
                          </span>
                          {deviation !== 0 && (
                            <>
                              <span>•</span>
                              <span
                                className={cn(
                                  'font-semibold',
                                  deviation > 0 ? 'text-orange-600' : 'text-blue-600'
                                )}
                              >
                                {deviation > 0 ? '+' : ''}
                                {deviation.toFixed(0)}%
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 ml-4">
                      {isOverloaded && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold border border-orange-200">
                          Overloaded
                        </span>
                      )}
                      {isUnderutilized && avgTasks > 0 && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold border border-blue-200">
                          Underutilized
                        </span>
                      )}
                      <span className="text-lg font-bold text-gray-900 dark:text-gray-100 min-w-[2.5rem] text-right">
                        {member.totalTasks}
                      </span>
                    </div>
                  </div>
                  <div className="relative w-full bg-gray-200 dark:bg-gray-600 rounded-full h-4 overflow-hidden shadow-inner">
                    {/* Average line indicator */}
                    {avgTasks > 0 && maxTasks > 0 && (
                      <div
                        className="absolute top-0 bottom-0 w-1 bg-gray-400 z-10 opacity-60"
                        style={{ left: `${Math.min((avgTasks / maxTasks) * 100, 95)}%` }}
                        title={`Average: ${avgTasks.toFixed(1)} tasks`}
                      />
                    )}
                    {/* Bar */}
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(barWidth, 100)}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className={cn(
                        'h-4 rounded-full transition-all relative z-0 shadow-sm',
                        isCurrentUser
                          ? 'bg-blue-600'
                          : isOverloaded
                            ? 'bg-gradient-to-r from-orange-500 to-orange-600'
                            : isUnderutilized
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                              : 'bg-gradient-to-r from-gray-400 to-gray-500'
                      )}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expanded Detailed View */}
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6"
          >
            <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Users size={18} />
              Detailed Member Breakdown
            </h4>
            <div className="space-y-4">
              {sortedWorkload.map((member, index) => {
                const maxTasks = Math.max(...sortedWorkload.map((m) => m.totalTasks), 1);
                const barWidth = maxTasks > 0 ? (member.totalTasks / maxTasks) * 100 : 0;
                const isOverloaded = member.totalTasks > avgTasks * 1.3;
                const isUnderutilized = member.totalTasks < avgTasks * 0.7;
                const isCurrentUser = member.userId === userId;

                return (
                  <div
                    key={member.userId}
                    className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <Avatar
                          userId={member.userId}
                          name={member.name}
                          src={member.avatar}
                          size="md"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p
                              className={cn(
                                'text-base font-semibold truncate',
                                isCurrentUser
                                  ? 'text-blue-700 dark:text-blue-400'
                                  : 'text-gray-900 dark:text-gray-100'
                              )}
                            >
                              {member.name}{' '}
                              {isCurrentUser && (
                                <span className="text-blue-600 dark:text-blue-400">(You)</span>
                              )}
                            </p>
                            {member.teamName && teamIds.length > 1 && (
                              <span className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded-full border border-gray-300 dark:border-gray-600">
                                {member.teamName}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-3 text-xs text-gray-600 dark:text-gray-400 mt-1">
                            <span className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                              {member.todoTasks} to do
                            </span>
                            <span className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                              {member.inProgressTasks} in progress
                            </span>
                            <span className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              {member.completedTasks} completed
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 ml-4">
                        {isOverloaded && (
                          <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold border border-orange-200">
                            Overloaded
                          </span>
                        )}
                        {isUnderutilized && avgTasks > 0 && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold border border-blue-200">
                            Underutilized
                          </span>
                        )}
                        <span className="text-2xl font-bold text-gray-900 min-w-[3rem] text-right">
                          {member.totalTasks}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                      {avgTasks > 0 && maxTasks > 0 && (
                        <div
                          className="absolute top-0 bottom-0 w-1 bg-gray-400 z-10 opacity-60"
                          style={{ left: `${Math.min((avgTasks / maxTasks) * 100, 95)}%` }}
                        />
                      )}
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(barWidth, 100)}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className={cn(
                          'h-3 rounded-full transition-all relative z-0 shadow-sm',
                          isCurrentUser
                            ? 'bg-blue-600'
                            : isOverloaded
                              ? 'bg-gradient-to-r from-orange-500 to-orange-600'
                              : isUnderutilized
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                                : 'bg-gradient-to-r from-gray-400 to-gray-500'
                        )}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Unassigned Tasks Indicator */}
              {statistics.unassignedCount > 0 && (
                <div className="pt-4 mt-4 border-t border-gray-300">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="text-amber-600" size={20} />
                      <div>
                        <p className="text-sm font-semibold text-amber-900">Unassigned Tasks</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          {statistics.unassignedCount} task
                          {statistics.unassignedCount !== 1 ? 's' : ''} need assignment
                        </p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-amber-900">
                      {statistics.unassignedCount}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
