'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardCheck,
  CheckCircle2,
  Clock,
  Users,
  TrendingUp,
  AlertCircle,
  X,
} from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/Button';
import { useAuth } from '@/lib/auth/AuthContext';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';
import {
  getPendingEvaluations,
  getEvaluationResults,
  getTeamEvaluationPeriods,
  isTeamLeaderOrInstructor,
  getUserTeams,
  getTeamEvaluationsForInstructor,
  type PendingEvaluationWithDetails,
} from '@/lib/db';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { EvaluationCard } from '@/components/evaluations/EvaluationCard';
import { PeerEvaluationForm } from '@/components/evaluations/PeerEvaluationForm';
import { CreateEvaluationPeriodModal } from '@/components/evaluations/CreateEvaluationPeriodModal';
import { toast } from 'react-hot-toast';
import { Plus } from 'lucide-react';

export default function EvaluationsPage() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { isInstructor, isAdmin, canAccess } = usePermissions();
  const [pendingEvaluations, setPendingEvaluations] = useState<PendingEvaluationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvaluation, setSelectedEvaluation] = useState<PendingEvaluationWithDetails | null>(
    null
  );
  const [showForm, setShowForm] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [canCreatePeriod, setCanCreatePeriod] = useState(false);
  const [userTeams, setUserTeams] = useState<any[]>([]);
  const [instructorEvaluations, setInstructorEvaluations] = useState<any[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);

  const loadData = async () => {
    if (!user?.id || !currentWorkspace) return;

    setLoading(true);
    try {
      const loadPromises: Promise<any>[] = [
        getPendingEvaluations(user.id, currentWorkspace.id),
        getEvaluationResults(user.id, currentWorkspace.id),
        getUserTeams(user.id, currentWorkspace.id),
      ];

      // If instructor/admin, also load team evaluations
      if (isInstructor || isAdmin || canAccess.instructorFeatures()) {
        loadPromises.push(
          getTeamEvaluationsForInstructor(
            user.id,
            currentWorkspace.id,
            undefined,
            selectedPeriodId || undefined
          )
        );
      }

      const results = await Promise.all(loadPromises);
      const [pending, resultsData, teams, instructorEvals] = results;

      setPendingEvaluations(pending || []);
      setResults(resultsData);

      if (instructorEvals) {
        setInstructorEvaluations(instructorEvals);
      }

      // Check if user can create evaluation periods (is leader of any team or instructor)
      const teamsData = (teams || []).filter((tm: any) => tm?.team?.id) as any[];
      setUserTeams(teamsData);

      if (teamsData.length > 0) {
        const leaderChecks = await Promise.all(
          teamsData
            .filter((teamMember: any) => teamMember?.team?.id)
            .map((teamMember: any) =>
              isTeamLeaderOrInstructor(user.id, teamMember.team.id, currentWorkspace.id)
            )
        );
        setCanCreatePeriod(leaderChecks.some((can) => can));
      } else {
        setCanCreatePeriod(false);
      }
    } catch (error) {
      console.error('Error loading evaluations:', error);
      toast.error('Failed to load evaluations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id, currentWorkspace?.id, selectedPeriodId]);

  const handleStartEvaluation = (evaluation: PendingEvaluationWithDetails) => {
    setSelectedEvaluation(evaluation);
    setShowForm(true);
  };

  const handleEvaluationSubmitted = () => {
    setShowForm(false);
    setSelectedEvaluation(null);
    loadData();
  };

  const handleCancel = () => {
    setShowForm(false);
    setSelectedEvaluation(null);
  };

  if (!currentWorkspace) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Users size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              No Workspace Selected
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Select a workspace to view evaluations
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Peer Evaluations
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Provide feedback on your team members' contributions and collaboration
            </p>
          </div>
          {canCreatePeriod && currentWorkspace && (
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2"
            >
              <Plus size={18} />
              Create Evaluation Period
            </Button>
          )}
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending Evaluations</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {pendingEvaluations.length}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="text-yellow-600 dark:text-yellow-400" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">My Average Score</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {results?.averageScores?.overall ? results.averageScores.overall.toFixed(1) : '—'}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <TrendingUp className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Received</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {results?.totalEvaluations || 0}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle2 className="text-green-600 dark:text-green-400" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Pending Evaluations */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <ClipboardCheck size={20} />
              Pending Evaluations
            </h2>
            <Button variant="ghost" size="sm" onClick={loadData}>
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 animate-pulse">
                  <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : pendingEvaluations.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardCheck size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No Pending Evaluations
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                You're all caught up! Check back when new evaluation periods are created.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingEvaluations.map((evaluation) => (
                <EvaluationCard
                  key={evaluation.id}
                  evaluationResponse={evaluation}
                  onClick={() => handleStartEvaluation(evaluation)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Instructor View - Team Evaluations */}
        {(isInstructor || isAdmin || canAccess.instructorFeatures()) &&
          instructorEvaluations.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Users size={20} />
                  Team Evaluations (Instructor View)
                </h2>
                <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium">
                  {instructorEvaluations.length} evaluation
                  {instructorEvaluations.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="space-y-4">
                {instructorEvaluations.map((evaluation: any) => (
                  <div
                    key={evaluation.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            {evaluation.evaluatee?.full_name || 'Unknown Student'}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            evaluated by
                          </span>
                          {evaluation.isAnonymous ? (
                            <span className="text-sm text-gray-500 dark:text-gray-400 italic">
                              Anonymous
                            </span>
                          ) : (
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              {evaluation.evaluator?.full_name || 'Unknown'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span>Team: {evaluation.evaluation_period?.team?.name || 'Unknown'}</span>
                          {evaluation.evaluation_period?.project?.name && (
                            <span>Project: {evaluation.evaluation_period.project.name}</span>
                          )}
                          <span>
                            Period: {evaluation.evaluation_period?.period_name || 'Unknown'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {evaluation.overall_score?.toFixed(1) || 'N/A'} / 5.0
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Overall</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mb-3 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Contribution:</span>
                        <span className="ml-1 font-semibold text-gray-900 dark:text-gray-100">
                          {evaluation.contribution_score || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Communication:</span>
                        <span className="ml-1 font-semibold text-gray-900 dark:text-gray-100">
                          {evaluation.communication_score || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Collaboration:</span>
                        <span className="ml-1 font-semibold text-gray-900 dark:text-gray-100">
                          {evaluation.collaboration_score || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Reliability:</span>
                        <span className="ml-1 font-semibold text-gray-900 dark:text-gray-100">
                          {evaluation.reliability_score || 'N/A'}
                        </span>
                      </div>
                    </div>

                    {evaluation.strengths && (
                      <div className="mb-2">
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Strengths:
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                          {evaluation.strengths}
                        </p>
                      </div>
                    )}

                    {evaluation.areas_for_improvement && (
                      <div className="mb-2">
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Areas for Improvement:
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                          {evaluation.areas_for_improvement}
                        </p>
                      </div>
                    )}

                    {evaluation.additional_comments && (
                      <div>
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Additional Comments:
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                          {evaluation.additional_comments}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* My Results */}
        {results && results.totalEvaluations > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <TrendingUp size={20} />
                My Evaluation Results
              </h2>
              {results.evaluations?.[0]?.evaluation_period?.is_anonymous && (
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                  Anonymous
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Contribution</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {results.averageScores.contribution.toFixed(1)}
                </p>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Communication</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {results.averageScores.communication.toFixed(1)}
                </p>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Collaboration</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {results.averageScores.collaboration.toFixed(1)}
                </p>
              </div>
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Reliability</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {results.averageScores.reliability.toFixed(1)}
                </p>
              </div>
            </div>

            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Overall Average</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {results.averageScores.overall.toFixed(2)} / 5.0
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Based on {results.totalEvaluations} evaluation
                    {results.totalEvaluations !== 1 ? 's' : ''}
                  </p>
                  {results.evaluations?.[0]?.evaluation_period?.is_anonymous && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Evaluators are anonymous
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Evaluation Form Modal */}
      {showForm && selectedEvaluation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Peer Evaluation
              </h2>
              <button
                onClick={handleCancel}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <PeerEvaluationForm
                evaluationPeriodId={selectedEvaluation.evaluation_period.id}
                evaluateeId={selectedEvaluation.evaluatee_id}
                evaluateeName={selectedEvaluation.evaluatee?.full_name || 'Team Member'}
                evaluateeAvatar={selectedEvaluation.evaluatee?.avatar_url}
                teamId={selectedEvaluation.evaluation_period.team.id}
                projectId={selectedEvaluation.evaluation_period.project_id}
                projectName={selectedEvaluation.evaluation_period.project?.name}
                isAnonymous={selectedEvaluation.evaluation_period.is_anonymous}
                onSuccess={handleEvaluationSubmitted}
                onCancel={handleCancel}
              />
            </div>
          </motion.div>
        </div>
      )}

      {/* Create Evaluation Period Modal */}
      {showCreateModal && currentWorkspace && userTeams.length > 0 && userTeams[0]?.team?.id && (
        <CreateEvaluationPeriodModal
          teamId={userTeams[0].team.id}
          workspaceId={currentWorkspace.id}
          onSuccess={() => {
            loadData();
            setShowCreateModal(false);
          }}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </DashboardLayout>
  );
}
