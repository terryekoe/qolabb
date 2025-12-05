'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FolderKanban,
  Users,
  BarChart3,
  TrendingUp,
  Plus,
  Clock,
  ClipboardCheck,
} from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Button } from '@/components/Button';
import Avatar from '@/components/ui/Avatar';
import { useAuth } from '@/lib/auth/AuthContext';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';
import {
  getWorkspaceStats,
  getWorkspaceActivity,
  getWorkspaceProjects,
  getPendingEvaluations,
} from '@/lib/db/queries';
import { useRouter } from 'next/navigation';
import { FirstRunTour } from '@/components/onboarding/FirstRunTour';
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist';
import { PeerReviewAlert } from '@/components/dashboard/PeerReviewAlert';

export default function DashboardPage() {
  const { profile, user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const router = useRouter();
  const userName = profile?.full_name?.split(' ')[0] || 'User';

  const [stats, setStats] = useState({
    activeProjects: 0,
    totalMembers: 0,
    tasksCompleted: 0,
    avgParticipation: 0,
  });
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [pendingEvaluations, setPendingEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTour, setShowTour] = useState(false);
  const [hasGroups, setHasGroups] = useState(false);
  const [hasContributions, setHasContributions] = useState(false);

  // Helper function to check if user is instructor
  const isInstructor = () => {
    const role = profile?.role?.toLowerCase();
    return role === 'instructor' || role === 'both';
  };

  // Check if user needs to see first-run tour
  useEffect(() => {
    if (profile && currentWorkspace) {
      // Check both profile flag and localStorage as backup
      const tourCompletedInProfile = profile.first_tour_completed;
      const tourCompletedInStorage =
        typeof window !== 'undefined' && localStorage.getItem('first_tour_completed') === 'true';

      // Only show tour if not completed in profile AND not dismissed in storage
      if (!tourCompletedInProfile && !tourCompletedInStorage) {
        setShowTour(true);
      } else {
        setShowTour(false);
      }
    }
  }, [profile, currentWorkspace]);

  useEffect(() => {
    if (currentWorkspace) {
      // Clear previous workspace data immediately to avoid showing stale data
      setStats({ activeProjects: 0, totalMembers: 0, tasksCompleted: 0, avgParticipation: 0 });
      setRecentProjects([]);
      setRecentActivity([]);
      setPendingEvaluations([]);

      // Load new workspace data
      loadDashboardData();
    } else {
      setLoading(false);
    }
  }, [currentWorkspace]);

  async function loadDashboardData() {
    if (!currentWorkspace || !user) return;

    try {
      setLoading(true);

      // Load stats
      const statsData = await getWorkspaceStats(currentWorkspace.id);
      setStats(statsData);

      // Load recent projects
      const projectsData = await getWorkspaceProjects(currentWorkspace.id);
      setRecentProjects(projectsData?.slice(0, 3) || []);

      // Load recent activity
      const activityData = await getWorkspaceActivity(currentWorkspace.id, 5, user.id);
      setRecentActivity(activityData || []);

      // Load pending peer evaluations
      const evaluationsData = await getPendingEvaluations(user.id, currentWorkspace.id);
      setPendingEvaluations(evaluationsData || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (!currentWorkspace) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <FolderKanban size={64} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Class Selected</h2>
            <p className="text-gray-600">Select or create a class to get started</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto">
        {showTour && (
          <FirstRunTour
            onComplete={() => {
              setShowTour(false);
              // Also save to localStorage as backup
              if (typeof window !== 'undefined') {
                localStorage.setItem('first_tour_completed', 'true');
              }
            }}
          />
        )}
        {/* Welcome Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Welcome back, {userName}! 👋
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Here's what's happening in {currentWorkspace.name}
            </p>
          </motion.div>
        </div>

        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 animate-pulse"
                >
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Peer Review Alert for students */}
              <PeerReviewAlert pendingEvaluations={pendingEvaluations} />

              {/* Onboarding Checklist for new users */}
              <OnboardingChecklist
                hasGroups={hasGroups}
                hasAssignments={stats.activeProjects > 0}
                hasContributions={hasContributions}
              />

              {/* Role-Based Stats Grid */}
              {isInstructor() ? (
                // Instructor Dashboard: 4 stats
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard
                    title="Active Classes"
                    value="1"
                    change={currentWorkspace ? currentWorkspace.name : 'No class selected'}
                    changeType="neutral"
                    icon={FolderKanban}
                    color="blue"
                  />
                  <StatCard
                    title="Assignments"
                    value={stats.activeProjects.toString()}
                    change={
                      stats.activeProjects > 0
                        ? `${stats.activeProjects} active`
                        : 'No assignments yet'
                    }
                    changeType={stats.activeProjects > 0 ? 'positive' : 'neutral'}
                    icon={FolderKanban}
                    color="green"
                    href="/projects"
                  />
                  <StatCard
                    title="Students"
                    value={stats.totalMembers.toString()}
                    change={
                      stats.totalMembers > 0 ? `${stats.totalMembers} enrolled` : 'No students yet'
                    }
                    changeType={stats.totalMembers > 0 ? 'positive' : 'neutral'}
                    icon={Users}
                    color="purple"
                    href="/teams"
                  />
                  <StatCard
                    title="Avg. Participation"
                    value={`${stats.avgParticipation}%`}
                    change={stats.avgParticipation > 0 ? 'Based on contributions' : 'No data yet'}
                    changeType={
                      stats.avgParticipation > 70
                        ? 'positive'
                        : stats.avgParticipation > 50
                          ? 'neutral'
                          : 'negative'
                    }
                    icon={TrendingUp}
                    color="orange"
                    href="/analytics"
                  />
                </div>
              ) : (
                // Student Dashboard: 3 stats
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <StatCard
                    title="Assignments Due"
                    value={stats.activeProjects.toString()}
                    change={
                      stats.activeProjects > 0
                        ? `${stats.activeProjects} to complete`
                        : 'All caught up!'
                    }
                    changeType={stats.activeProjects > 0 ? 'neutral' : 'positive'}
                    icon={FolderKanban}
                    color="blue"
                    href="/projects"
                  />
                  <StatCard
                    title="Contributions Made"
                    value={stats.tasksCompleted.toString()}
                    change={stats.tasksCompleted > 0 ? 'Keep it up!' : 'Start contributing'}
                    changeType={stats.tasksCompleted > 0 ? 'positive' : 'neutral'}
                    icon={BarChart3}
                    color="green"
                    href="/tasks"
                  />
                  <StatCard
                    title="Class Members"
                    value={stats.totalMembers.toString()}
                    change={stats.totalMembers > 0 ? 'In your group' : 'Join a group'}
                    changeType={stats.totalMembers > 0 ? 'positive' : 'neutral'}
                    icon={Users}
                    color="purple"
                    href="/teams"
                  />
                </div>
              )}

              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-4 sm:p-8 text-white"
              >
                <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  {isInstructor() ? (
                    // Instructor Quick Actions
                    <>
                      <button
                        onClick={() => router.push('/projects?create=true')}
                        className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg p-4 text-left transition-colors group"
                      >
                        <Plus
                          className="mb-2 group-hover:scale-110 transition-transform"
                          size={24}
                        />
                        <p className="font-semibold">Create Assignment</p>
                        <p className="text-sm opacity-80">Add a new assignment</p>
                      </button>
                      <button
                        onClick={() => router.push('/teams')}
                        className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg p-4 text-left transition-colors group"
                      >
                        <Users
                          className="mb-2 group-hover:scale-110 transition-transform"
                          size={24}
                        />
                        <p className="font-semibold">Manage Groups</p>
                        <p className="text-sm opacity-80">Create and organize groups</p>
                      </button>
                      <button
                        onClick={() => router.push('/evaluations')}
                        className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg p-4 text-left transition-colors group"
                      >
                        <BarChart3
                          className="mb-2 group-hover:scale-110 transition-transform"
                          size={24}
                        />
                        <p className="font-semibold">View Reviews</p>
                        <p className="text-sm opacity-80">Check peer evaluations</p>
                      </button>
                    </>
                  ) : (
                    // Student Quick Actions
                    <>
                      <button
                        onClick={() => router.push('/tasks?log=true')}
                        className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg p-4 text-left transition-colors group"
                      >
                        <Plus
                          className="mb-2 group-hover:scale-110 transition-transform"
                          size={24}
                        />
                        <p className="font-semibold">Log Contribution</p>
                        <p className="text-sm opacity-80">Record your work</p>
                      </button>
                      <button
                        onClick={() => router.push('/teams')}
                        className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg p-4 text-left transition-colors group"
                      >
                        <Users
                          className="mb-2 group-hover:scale-110 transition-transform"
                          size={24}
                        />
                        <p className="font-semibold">View My Group</p>
                        <p className="text-sm opacity-80">See your teammates</p>
                      </button>
                      {pendingEvaluations.length > 0 && (
                        <button
                          onClick={() => router.push('/evaluations')}
                          className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg p-4 text-left transition-colors group"
                        >
                          <ClipboardCheck
                            className="mb-2 group-hover:scale-110 transition-transform"
                            size={24}
                          />
                          <p className="font-semibold">Complete Reviews</p>
                          <p className="text-sm opacity-80">{pendingEvaluations.length} pending</p>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </motion.div>

              {/* Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Projects */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6"
                >
                  <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2 sm:gap-4">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 flex-shrink-0 min-w-0">
                      Current Assignments
                    </h2>
                    {recentProjects.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-shrink-0 whitespace-nowrap"
                        onClick={() => router.push('/projects')}
                      >
                        View All
                      </Button>
                    )}
                  </div>

                  {recentProjects.length === 0 ? (
                    <div className="text-center py-12">
                      <FolderKanban size={48} className="mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-600 dark:text-gray-400 mb-4">No assignments yet</p>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => router.push('/projects?create=true')}
                      >
                        <Plus size={16} className="mr-2" />
                        Create First Assignment
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentProjects.map((project) => (
                        <div
                          key={project.id}
                          onClick={() => router.push(`/projects?id=${project.id}`)}
                          className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all cursor-pointer bg-white dark:bg-gray-800"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                              {project.name}
                            </h3>
                            <span
                              className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                                project.status === 'active'
                                  ? 'text-blue-600 bg-blue-50'
                                  : project.status === 'completed'
                                    ? 'text-qolabb-green-600 bg-qolabb-green-50'
                                    : 'text-qolabb-orange-600 bg-qolabb-orange-50'
                              }`}
                            >
                              <Clock size={14} />
                              {project.status}
                            </span>
                          </div>
                          {project.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                              {project.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>

                {/* Recent Activity */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6"
                >
                  <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2 sm:gap-4">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 flex-shrink-0 min-w-0">
                      Recent Activity
                    </h2>
                    {recentActivity.length > 0 && (
                      <Button variant="ghost" size="sm" className="flex-shrink-0 whitespace-nowrap">
                        View All
                      </Button>
                    )}
                  </div>

                  {recentActivity.length === 0 ? (
                    <div className="text-center py-12">
                      <Clock size={48} className="mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">No activity yet</p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                        Activity will appear here when group members start working
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentActivity.map((activity) => (
                        <div key={activity.id} className="flex items-start space-x-3">
                          <Avatar
                            userId={activity.user?.id || activity.id}
                            name={activity.user?.full_name || 'User'}
                            src={activity.user?.avatar_url}
                            size="md"
                            className="flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 dark:text-gray-100">
                              <span className="font-semibold">
                                {activity.user?.full_name || 'Someone'}
                              </span>{' '}
                              {activity.action_type}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(activity.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
