'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderKanban,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Calendar,
  Users as UsersIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  Archive,
  X,
  Shield,
  Crown,
} from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/Button';
import Avatar, { AvatarGroup } from '@/components/ui/Avatar';
import { ProjectDetailModal } from '@/components/projects/ProjectDetailModal';
import { useAuth } from '@/lib/auth/AuthContext';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  getWorkspaceProjects, 
  getWorkspaceTeams, 
  createProject,
  isTeamLeaderOrInstructor,
  getWorkspaceMembers,
  updateTeamMemberRole,
} from '@/lib/db/queries';

type ProjectStatus = 'pending' | 'active' | 'completed' | 'archived';
type FilterType = 'all' | ProjectStatus;

// Force dynamic rendering to prevent prerender errors
export const dynamic = 'force-dynamic';

function ProjectsPageContent() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const searchParams = useSearchParams();
  
  const [projects, setProjects] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterType>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [canManageTasks, setCanManageTasks] = useState(false);
  const [isInstructor, setIsInstructor] = useState(false);
  
  // Create project form state
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Check for create parameter and open modal
  useEffect(() => {
    const shouldCreate = searchParams.get('create');
    if (shouldCreate === 'true') {
      setShowCreateModal(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (currentWorkspace) {
      loadProjects();
      loadTeams();
    }
  }, [currentWorkspace]);

  // Real-time subscriptions for projects and teams
  useEffect(() => {
    if (!currentWorkspace?.id) return;

    // Subscribe to projects changes
    const projectsChannel = supabase
      .channel(`projects:workspace:${currentWorkspace.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `workspace_id=eq.${currentWorkspace.id}`,
        },
        () => {
          loadProjects();
        }
      )
      .subscribe();

    // Subscribe to teams changes
    const teamsChannel = supabase
      .channel(`teams:workspace:${currentWorkspace.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams',
          filter: `workspace_id=eq.${currentWorkspace.id}`,
        },
        () => {
          loadTeams();
        }
      )
      .subscribe();

    // Subscribe to team_members changes (affects team counts)
    const teamMembersChannel = supabase
      .channel(`team_members:workspace:${currentWorkspace.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_members',
        },
        () => {
          // Reload teams to get updated member counts
          loadTeams();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(projectsChannel);
      supabase.removeChannel(teamsChannel);
      supabase.removeChannel(teamMembersChannel);
    };
  }, [currentWorkspace?.id]);

  async function loadProjects() {
    if (!currentWorkspace) return;
    
    try {
      setLoading(true);
      const data = await getWorkspaceProjects(currentWorkspace.id);
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadTeams() {
    if (!currentWorkspace) return;
    
    try {
      const data = await getWorkspaceTeams(currentWorkspace.id);
      setTeams(data || []);
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  }

  async function handleCreateProject() {
    if (!user || !currentWorkspace || !projectName.trim() || !selectedTeam) return;

    setCreating(true);
    setError('');

    try {
      await createProject({
        workspace_id: currentWorkspace.id,
        team_id: selectedTeam,
        name: projectName,
        description: projectDescription || null,
        status: 'active',
        due_date: dueDate || null,
        created_by: user.id,
      }, user.id);

      await loadProjects();
      setShowCreateModal(false);
      resetForm();
    } catch (error: any) {
      setError(error.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  }

  function resetForm() {
    setProjectName('');
    setProjectDescription('');
    setSelectedTeam('');
    setDueDate('');
    setError('');
  }

  async function handleProjectClick(project: any) {
    if (!user || !currentWorkspace) return;
    
    // Check if user can manage tasks (instructor or team leader)
    const canManage = await isTeamLeaderOrInstructor(user.id, project.team_id, currentWorkspace.id);
    setCanManageTasks(canManage);
    setSelectedProject(project);
  }

  // Filter and search projects
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          color: 'text-blue-600 bg-blue-50 border-blue-200',
          icon: <Clock size={14} />,
          label: 'Active'
        };
      case 'completed':
        return {
          color: 'text-green-600 bg-green-50 border-green-200',
          icon: <CheckCircle2 size={14} />,
          label: 'Completed'
        };
      case 'pending':
        return {
          color: 'text-orange-600 bg-orange-50 border-orange-200',
          icon: <AlertCircle size={14} />,
          label: 'Pending'
        };
      case 'archived':
        return {
          color: 'text-gray-600 bg-gray-50 border-gray-200',
          icon: <Archive size={14} />,
          label: 'Archived'
        };
      default:
        return {
          color: 'text-gray-600 bg-gray-50 border-gray-200',
          icon: <Clock size={14} />,
          label: status
        };
    }
  };

  const statusCounts = {
    all: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    pending: projects.filter(p => p.status === 'pending').length,
    completed: projects.filter(p => p.status === 'completed').length,
    archived: projects.filter(p => p.status === 'archived').length,
  };

  if (!currentWorkspace) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <FolderKanban size={64} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Workspace Selected</h2>
            <p className="text-gray-600">Select a workspace to view projects</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Projects</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage projects in {currentWorkspace.name}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Button
              variant="primary"
              onClick={() => {
                console.log('Create Project button clicked');
                console.log('Teams available:', teams.length);
                setShowCreateModal(true);
              }}
              className="flex items-center space-x-2"
              disabled={teams.length === 0}
            >
              <Plus size={20} />
              <span>New Project</span>
            </Button>
            {teams.length === 0 && (
              <p className="text-sm text-orange-600 flex items-center gap-1">
                <AlertCircle size={14} />
                Create a team first to add projects
              </p>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-2 overflow-x-auto">
              <Filter size={20} className="text-gray-400 flex-shrink-0" />
              {(['all', 'active', 'pending', 'completed', 'archived'] as FilterType[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                    statusFilter === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                  <span className="ml-2 opacity-75">({statusCounts[status]})</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 animate-pulse">
                <div className="h-6 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border-2 border-dashed border-gray-300 dark:border-gray-600"
          >
            <FolderKanban size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {searchQuery || statusFilter !== 'all' ? 'No projects found' : 'No projects yet'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters or search query'
                : teams.length === 0
                ? 'You need to create a team before you can add projects'
                : 'Create your first project to start collaborating with your team'}
            </p>
            {teams.length === 0 ? (
              <Button
                variant="secondary"
                onClick={() => window.location.href = '/teams'}
                className="flex items-center space-x-2 mx-auto"
              >
                <UsersIcon size={20} />
                <span>Go to Teams Page</span>
              </Button>
            ) : !searchQuery && statusFilter === 'all' ? (
              <Button
                variant="primary"
                onClick={() => setShowCreateModal(true)}
                className="flex items-center space-x-2 mx-auto"
              >
                <Plus size={20} />
                <span>Create First Project</span>
              </Button>
            ) : null}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project, index) => {
              const statusConfig = getStatusConfig(project.status);
              
              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -4 }}
                  onClick={() => handleProjectClick(project)}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all overflow-hidden group cursor-pointer"
                >
                  {/* Project Header */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1 truncate">
                          {project.name}
                        </h3>
                        {project.team && (
                          <p className="text-sm text-gray-500 flex items-center">
                            <UsersIcon size={14} className="mr-1" />
                            {project.team.name}
                          </p>
                        )}
                      </div>
                      <button className="p-2 hover:bg-gray-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical size={18} className="text-gray-400" />
                      </button>
                    </div>

                    {/* Description */}
                    {project.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                        {project.description}
                      </p>
                    )}

                    {/* Status Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusConfig.color}`}>
                        {statusConfig.icon}
                        {statusConfig.label}
                      </span>
                      {project.due_date && (
                        <span className="flex items-center text-xs text-gray-500">
                          <Calendar size={14} className="mr-1" />
                          {new Date(project.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {/* Tasks Progress (if available) */}
                    {project.tasks && project.tasks.length > 0 && (
                      <div>
                        <div className="flex justify-between text-xs text-gray-600 mb-2">
                          <span>Tasks</span>
                          <span>
                            {project.tasks.filter((t: any) => t.status === 'completed').length}/{project.tasks.length}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{
                              width: `${(project.tasks.filter((t: any) => t.status === 'completed').length / project.tasks.length) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Team Members (if available) */}
                    {project.contributions && project.contributions.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Contributors</span>
                          <div className="flex -space-x-2">
                            <AvatarGroup
                              users={project.contributions.map((contrib: any) => ({
                                userId: contrib.user?.id || contrib.id,
                                name: contrib.user?.full_name || 'User',
                                src: contrib.user?.avatar_url
                              }))}
                              max={3}
                              size="sm"
                              className="[&>*]:border-2 [&>*]:border-white"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            style={{ zIndex: 9999 }}
            onClick={() => {
              setShowCreateModal(false);
              resetForm();
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg mr-4">
                    <FolderKanban className="text-blue-700 dark:text-blue-400" size={24} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create Project</h2>
                </div>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g., Mobile App Redesign"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team *
                  </label>
                  <select
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a team...</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder="Brief description of the project..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date (optional)
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="flex-1"
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleCreateProject}
                  disabled={!projectName.trim() || !selectedTeam || creating}
                  className="flex-1"
                >
                  {creating ? 'Creating...' : 'Create Project'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Project Detail Modal */}
      {selectedProject && (
        <ProjectDetailModal
          isOpen={!!selectedProject}
          onClose={() => setSelectedProject(null)}
          project={selectedProject}
          workspaceId={currentWorkspace.id}
          canManageTasks={canManageTasks}
        />
      )}
    </DashboardLayout>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    }>
      <ProjectsPageContent />
    </Suspense>
  );
}
