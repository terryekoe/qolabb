'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/Button';
import {
  ArrowLeft,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Filter,
  X,
} from 'lucide-react';
import { getProjectTeamsAndSubmissions, getProject, updateProject } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { TeamOverviewGrid } from '../../../../components/instructor/TeamOverviewGrid';
import { GradingPanel } from '../../../../components/instructor/GradingPanel';
import { TeamTaskBoard } from '../../../../components/instructor/TeamTaskBoard';
import { useAuth } from '@/lib/auth/AuthContext';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Link as LinkIcon, Pencil, Save, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function InstructorProjectPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();

  const [loading, setLoading] = useState(true);
  const [teamsData, setTeamsData] = useState<any[]>([]);
  const [project, setProject] = useState<any>(null);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [showGradingPanel, setShowGradingPanel] = useState(false);
  const [showTaskBoard, setShowTaskBoard] = useState(false);
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editForm, setEditForm] = useState({ description: '', resources: [] as any[] });
  const [selectedTaskTeam, setSelectedTaskTeam] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'graded' | 'pending'>(
    'all'
  );

  useEffect(() => {
    if (params.id) {
      loadData();
    }
  }, [params.id]);

  // Real-time subscription for new submissions
  useEffect(() => {
    if (!params.id) return;

    const channel = supabase
      .channel(`instructor-submissions:${params.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_submissions',
          filter: `project_id=eq.${params.id}`,
        },
        () => {
          console.log('Submission update received, reloading data...');
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [params.id]);

  async function loadData() {
    try {
      setLoading(true);
      console.log('Loading data for project:', params.id);

      const [teams, projectData] = await Promise.all([
        getProjectTeamsAndSubmissions(params.id as string),
        getProject(params.id as string),
      ]);

      console.log('Teams data:', teams);
      console.log('Project data:', projectData);

      setTeamsData(teams || []);
      setProject(projectData);

      // Check if all teams are graded and update project status if needed
      if (teams && teams.length > 0 && projectData && projectData.status !== 'completed') {
        const allGraded = teams.every((t: any) => t.submission && t.submission.status === 'graded');

        if (allGraded) {
          console.log('All teams graded, marking project as completed');
          try {
            await updateProject(projectData.id, { status: 'completed' });
            setProject({ ...projectData, status: 'completed' });
            toast.success('Project marked as completed (all teams graded)');
          } catch (err) {
            console.error('Failed to auto-complete project:', err);
          }
        }
      }
    } catch (error) {
      console.error('Error loading instructor data:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleGradeTeam = (teamData: any) => {
    setSelectedTeam(teamData);
    setShowGradingPanel(true);
  };

  const handleGradingComplete = () => {
    setShowGradingPanel(false);
    loadData(); // Refresh data to show updated grade/status
  };

  const handleViewTasks = (teamData: any) => {
    setSelectedTaskTeam(teamData);
    setShowTaskBoard(true);
  };

  const handleEditClick = () => {
    setEditForm({
      description: project.description || '',
      resources: project.resources ? JSON.parse(JSON.stringify(project.resources)) : [],
    });
    setIsEditingDetails(true);
  };

  const handleSaveDetails = async () => {
    try {
      await updateProject(project.id, {
        description: editForm.description,
        resources: editForm.resources,
      });

      setProject({ ...project, ...editForm });
      setIsEditingDetails(false);
      toast.success('Assignment details updated');
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Failed to update assignment details');
    }
  };

  // Filter teams
  const filteredTeams = teamsData.filter((item) => {
    const matchesSearch = item.team.name.toLowerCase().includes(searchQuery.toLowerCase());
    const status = item.submission?.status || 'pending';
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    total: teamsData.length,
    submitted: teamsData.filter((t) => t.submission?.status === 'submitted').length,
    graded: teamsData.filter((t) => t.submission?.status === 'graded').length,
    pending: teamsData.filter((t) => !t.submission).length,
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push('/projects')} className="p-2">
              <ArrowLeft size={20} />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Grading Dashboard
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage submissions and grades
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log('Opening project details. Project state:', project);
              setShowProjectDetails(true);
            }}
            className="flex items-center gap-2"
          >
            <FileText size={16} />
            Assignment Details
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 dark:text-gray-400 text-sm">Total Groups</span>
              <Users size={18} className="text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 dark:text-gray-400 text-sm">Submitted</span>
              <CheckCircle2 size={18} className="text-green-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats.submitted}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 dark:text-gray-400 text-sm">Graded</span>
              <CheckCircle2 size={18} className="text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats.graded}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 dark:text-gray-400 text-sm">Pending</span>
              <Clock size={18} className="text-orange-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats.pending}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="submitted">Submitted</option>
            <option value="graded">Graded</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        {/* Group Grid */}
        <TeamOverviewGrid
          teams={filteredTeams}
          loading={loading}
          onGrade={handleGradeTeam}
          onViewTasks={handleViewTasks}
        />

        {/* Grading Panel */}
        {selectedTeam && (
          <GradingPanel
            isOpen={showGradingPanel}
            onClose={() => setShowGradingPanel(false)}
            teamData={selectedTeam}
            onGradingComplete={handleGradingComplete}
          />
        )}

        {/* Task Board Modal */}
        <AnimatePresence>
          {showTaskBoard && selectedTaskTeam && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowTaskBoard(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-5xl h-[80vh] shadow-2xl flex flex-col overflow-hidden"
              >
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {selectedTaskTeam.team.name} - Group Task Board
                    </h2>
                    <p className="text-sm text-gray-500">
                      View group progress and task distribution
                    </p>
                  </div>
                  <button
                    onClick={() => setShowTaskBoard(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  >
                    <X size={24} className="text-gray-500" />
                  </button>
                </div>
                <div className="flex-1 p-6 overflow-hidden bg-gray-50 dark:bg-gray-900">
                  <TeamTaskBoard
                    projectId={params.id as string}
                    teamName={selectedTaskTeam.team.name}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Assignment Details Modal */}
        <AnimatePresence>
          {showProjectDetails && project && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => {
                setShowProjectDetails(false);
                setIsEditingDetails(false);
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[80vh]"
              >
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {project.name}
                    </h2>
                    <p className="text-sm text-gray-500">Assignment Details</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isEditingDetails ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleEditClick}
                        disabled={
                          teamsData.some((t) => t.submission) ||
                          (project.due_date && new Date(project.due_date) < new Date())
                        }
                        title={
                          teamsData.some((t) => t.submission)
                            ? 'Cannot edit after submission'
                            : project.due_date && new Date(project.due_date) < new Date()
                              ? 'Cannot edit after deadline'
                              : 'Edit assignment'
                        }
                      >
                        <Pencil size={18} />
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSaveDetails}
                        className="flex items-center gap-2"
                      >
                        <Save size={18} />
                        Save
                      </Button>
                    )}
                    <button
                      onClick={() => {
                        setShowProjectDetails(false);
                        setIsEditingDetails(false);
                      }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                      <X size={24} className="text-gray-500" />
                    </button>
                  </div>
                </div>

                <div className="p-6 overflow-y-auto">
                  {isEditingDetails ? (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Instructions
                        </label>
                        <textarea
                          value={editForm.description}
                          onChange={(e) =>
                            setEditForm({ ...editForm, description: e.target.value })
                          }
                          className="w-full h-64 p-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          placeholder="Enter assignment instructions..."
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Resources
                          </label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const url = prompt('Enter resource URL:');
                              const name = prompt('Enter resource name:');
                              if (url && name) {
                                setEditForm({
                                  ...editForm,
                                  resources: [
                                    ...editForm.resources,
                                    { id: crypto.randomUUID(), name, url, type: 'link' },
                                  ],
                                });
                              }
                            }}
                            className="text-xs"
                          >
                            <Plus size={14} className="mr-1" /> Add Link
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {editForm.resources.map((resource, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700"
                            >
                              <div className="flex items-center gap-3 overflow-hidden">
                                <LinkIcon size={16} className="text-blue-500 flex-shrink-0" />
                                <div className="min-w-0">
                                  <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                                    {resource.name}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate">
                                    {resource.url}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  const newResources = [...editForm.resources];
                                  newResources.splice(index, 1);
                                  setEditForm({ ...editForm, resources: newResources });
                                }}
                                className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                          {editForm.resources.length === 0 && (
                            <p className="text-sm text-gray-500 italic text-center py-4">
                              No resources added
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="prose dark:prose-invert max-w-none mb-8">
                        <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
                          Instructions
                        </h3>
                        <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {project.description || 'No instructions provided.'}
                        </div>
                      </div>

                      {project.resources && project.resources.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                            <LinkIcon size={18} />
                            Resources
                          </h3>
                          <div className="space-y-2">
                            {project.resources.map((resource: any) => (
                              <a
                                key={resource.id}
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              >
                                <LinkIcon size={16} className="text-blue-500 mr-3" />
                                <div>
                                  <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                    {resource.name}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate">
                                    {resource.url}
                                  </div>
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
