// =====================================================
// Peer Evaluation Database Functions
// Functions for peer evaluation periods, submissions, and results
// =====================================================

import { supabase } from '../supabase';
import { getTeamMembers } from './teams';

// =====================================================
// TYPES
// =====================================================

export interface EvaluationPeriod {
  id: string;
  team_id: string;
  workspace_id: string;
  period_name: string;
  period_type: 'weekly' | 'mid_term' | 'final' | 'custom';
  start_date: string;
  end_date: string;
  due_date: string;
  status: 'draft' | 'active' | 'closed' | 'completed';
  is_anonymous: boolean;
  allow_self_evaluation: boolean;
  require_all_members: boolean;
  project_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PeerEvaluation {
  id: string;
  evaluator_id: string;
  evaluatee_id: string;
  team_id: string;
  project_id?: string;
  evaluation_period_id: string;
  contribution_score?: number;
  communication_score?: number;
  collaboration_score?: number;
  reliability_score?: number;
  overall_score?: number;
  strengths?: string;
  areas_for_improvement?: string;
  additional_comments?: string;
  is_anonymous: boolean;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

export interface EvaluationResponse {
  id: string;
  evaluation_period_id: string;
  evaluator_id: string;
  evaluatee_id: string;
  peer_evaluation_id?: string;
  status: 'pending' | 'in_progress' | 'submitted' | 'reminded';
  reminder_sent_at?: string;
  submitted_at?: string;
  created_at: string;
}

export interface PendingEvaluationWithDetails extends EvaluationResponse {
  evaluation_period: {
    id: string;
    period_name: string;
    period_type: string;
    due_date: string;
    status: string;
    is_anonymous: boolean;
    project_id?: string;
    team: {
      id: string;
      name: string;
    };
    project?: {
      id: string;
      name: string;
    };
  };
  evaluatee?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

// =====================================================
// EVALUATION PERIOD FUNCTIONS
// =====================================================

/**
 * Create an evaluation period for a team
 * @param params - Period parameters (dates, type, settings)
 * @returns Created evaluation period ID
 */
export async function createEvaluationPeriod(params: {
  teamId: string;
  workspaceId: string;
  periodName: string;
  periodType: 'weekly' | 'mid_term' | 'final' | 'custom';
  startDate: string;
  endDate: string;
  dueDate: string;
  isAnonymous?: boolean;
  allowSelfEvaluation?: boolean;
  requireAllMembers?: boolean;
  projectId?: string;
}): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('create_evaluation_period_with_responses', {
      p_team_id: params.teamId,
      p_workspace_id: params.workspaceId,
      p_period_name: params.periodName,
      p_period_type: params.periodType,
      p_start_date: params.startDate,
      p_end_date: params.endDate,
      p_due_date: params.dueDate,
      p_is_anonymous: params.isAnonymous ?? true,
      p_created_by: null, // Will use auth.uid() in function
      p_project_id: params.projectId || null,
    });

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error(
      'createEvaluationPeriod error:',
      error?.message || JSON.stringify(error, null, 2)
    );
    throw error;
  }
}

/**
 * Get evaluation periods for a team
 * @param teamId - Team ID
 * @returns List of evaluation periods
 */
export async function getTeamEvaluationPeriods(teamId: string): Promise<EvaluationPeriod[]> {
  try {
    const { data, error } = await supabase
      .from('evaluation_periods')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as EvaluationPeriod[];
  } catch (error: any) {
    console.error(
      'getTeamEvaluationPeriods error:',
      error?.message || JSON.stringify(error, null, 2)
    );
    return [];
  }
}

// =====================================================
// PEER EVALUATION SUBMISSION
// =====================================================

/**
 * Submit a peer evaluation
 * @param params - Evaluation data (scores, comments)
 * @returns Submitted evaluation
 */
export async function submitPeerEvaluation(params: {
  evaluationPeriodId: string;
  evaluateeId: string;
  teamId: string;
  projectId?: string;
  contributionScore: number;
  communicationScore: number;
  collaborationScore: number;
  reliabilityScore: number;
  strengths?: string;
  areasForImprovement?: string;
  additionalComments?: string;
}): Promise<PeerEvaluation> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Insert evaluation
    const { data: evaluation, error: evalError } = await supabase
      .from('peer_evaluations')
      .insert({
        evaluator_id: user.id,
        evaluatee_id: params.evaluateeId,
        team_id: params.teamId,
        project_id: params.projectId || null,
        evaluation_period_id: params.evaluationPeriodId,
        contribution_score: params.contributionScore,
        communication_score: params.communicationScore,
        collaboration_score: params.collaborationScore,
        reliability_score: params.reliabilityScore,
        strengths: params.strengths || null,
        areas_for_improvement: params.areasForImprovement || null,
        additional_comments: params.additionalComments || null,
      })
      .select()
      .single();

    if (evalError) throw evalError;

    // Update evaluation response status
    const { error: responseError } = await supabase
      .from('evaluation_responses')
      .update({
        status: 'submitted',
        peer_evaluation_id: evaluation.id,
        submitted_at: new Date().toISOString(),
      })
      .eq('evaluation_period_id', params.evaluationPeriodId)
      .eq('evaluator_id', user.id)
      .eq('evaluatee_id', params.evaluateeId);

    if (responseError) throw responseError;

    return evaluation as PeerEvaluation;
  } catch (error: any) {
    console.error('submitPeerEvaluation error:', error?.message || JSON.stringify(error, null, 2));
    throw error;
  }
}

// =====================================================
// EVALUATION RETRIEVAL
// =====================================================

/**
 * Get pending evaluations for a user (optionally filtered by workspace)
 * @param userId - User ID
 * @param workspaceId - Optional workspace ID to filter by
 * @returns List of pending evaluations with details
 */
export async function getPendingEvaluations(
  userId: string,
  workspaceId?: string
): Promise<PendingEvaluationWithDetails[]> {
  try {
    // First, get evaluation responses with period and team info
    let query = supabase
      .from('evaluation_responses')
      .select(
        `
        *,
        evaluation_period:evaluation_periods!inner(
          id,
          period_name,
          period_type,
          due_date,
          status,
          is_anonymous,
          project_id,
          workspace_id,
          team:teams!inner(id, name),
          project:projects(id, name)
        )
      `
      )
      .eq('evaluator_id', userId)
      .eq('status', 'pending');

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    let responses = (data || []) as any[];

    // Filter by workspace if provided
    if (workspaceId) {
      responses = responses.filter((r: any) => r.evaluation_period?.workspace_id === workspaceId);
    }

    // Filter out evaluations for instructors/owners/admins
    if (workspaceId) {
      try {
        const { data: workspaceMember } = await supabase
          .from('workspace_members')
          .select('role')
          .eq('workspace_id', workspaceId)
          .eq('user_id', userId)
          .single();

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();

        const userRole = profile?.role?.toLowerCase();
        const workspaceRole = workspaceMember?.role;

        const isInstructorOrAdmin =
          workspaceRole === 'owner' ||
          workspaceRole === 'admin' ||
          userRole === 'instructor' ||
          userRole === 'teaching_assistant' ||
          userRole === 'admin';

        if (isInstructorOrAdmin) {
          return [];
        }
      } catch (err) {
        console.warn('Could not check role for evaluation filtering:', err);
      }
    }

    if (responses.length === 0) {
      return [];
    }

    // Get unique evaluatee IDs and team IDs for profile lookups
    const evaluateeIds = [...new Set(responses.map((r) => r.evaluatee_id).filter(Boolean))];
    const teamIds = [
      ...new Set(responses.map((r) => r.evaluation_period?.team?.id).filter(Boolean)),
    ];

    // Fetch profiles for evaluatees using team_members approach
    let profileMap = new Map();
    if (evaluateeIds.length > 0 && teamIds.length > 0) {
      try {
        const teamMembersPromises = teamIds.map((teamId) => getTeamMembers(teamId));
        const teamMembersArrays = await Promise.all(teamMembersPromises);

        const allTeamMembers = teamMembersArrays.flat();
        allTeamMembers.forEach((member: any) => {
          if (member.user_id && evaluateeIds.includes(member.user_id)) {
            const profile = member.user || member.profile;
            if (profile) {
              profileMap.set(member.user_id, {
                id: profile.id,
                full_name: profile.full_name,
                avatar_url: profile.avatar_url,
                user_id: member.user_id,
              });
            }
          }
        });
      } catch (err) {
        console.warn('Error fetching team members for profiles:', err);
      }
    }

    // Enrich responses with profile data
    const enrichedResponses = responses.map((response) => {
      const evaluateeProfile = response.evaluatee_id ? profileMap.get(response.evaluatee_id) : null;
      return {
        ...response,
        evaluatee: evaluateeProfile || null,
      };
    });

    return enrichedResponses as PendingEvaluationWithDetails[];
  } catch (error: any) {
    console.error('getPendingEvaluations error:', error?.message || JSON.stringify(error, null, 2));
    return [];
  }
}

/**
 * Get evaluation results for a user (aggregated, optionally filtered by workspace)
 * @param userId - User ID
 * @param workspaceId - Optional workspace ID to filter by
 * @param evaluationPeriodId - Optional period ID to filter by
 * @returns Aggregated evaluation results
 */
export async function getEvaluationResults(
  userId: string,
  workspaceId?: string,
  evaluationPeriodId?: string
): Promise<any> {
  try {
    let query = supabase
      .from('peer_evaluations')
      .select(
        `
        *,
        evaluation_period:evaluation_periods!inner(id, period_name, period_type, due_date, workspace_id)
      `
      )
      .eq('evaluatee_id', userId);

    if (evaluationPeriodId) {
      query = query.eq('evaluation_period_id', evaluationPeriodId);
    }

    const { data, error } = await query.order('submitted_at', { ascending: false });

    if (error) throw error;

    let evaluations = (data || []) as any[];

    // Filter by workspace if provided
    if (workspaceId) {
      evaluations = evaluations.filter(
        (e: any) => e.evaluation_period?.workspace_id === workspaceId
      );
    }

    if (evaluations.length === 0) {
      return {
        averageScores: {
          contribution: 0,
          communication: 0,
          collaboration: 0,
          reliability: 0,
          overall: 0,
        },
        totalEvaluations: 0,
        evaluations: [],
      };
    }

    // Get unique user IDs for profile lookups
    const evaluatorIds = [...new Set(evaluations.map((e) => e.evaluator_id))];
    const evaluateeIds = [...new Set(evaluations.map((e) => e.evaluatee_id))];

    const isAnonymous = evaluations[0]?.evaluation_period?.is_anonymous ?? true;

    const userIdsToFetch = isAnonymous ? evaluateeIds : [...evaluatorIds, ...evaluateeIds];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, user_id')
      .in('user_id', userIdsToFetch);

    const profileMap = new Map();
    if (profiles) {
      profiles.forEach((profile) => {
        profileMap.set(profile.user_id, profile);
      });
    }

    // Enrich evaluations with profile data
    const enrichedEvaluations = evaluations.map((evaluation) => ({
      ...evaluation,
      evaluator: isAnonymous ? null : profileMap.get(evaluation.evaluator_id) || null,
      evaluatee: profileMap.get(evaluation.evaluatee_id) || null,
    }));

    const totalEvaluations = enrichedEvaluations.length;
    const sumScores = enrichedEvaluations.reduce(
      (acc, evaluation) => ({
        contribution: acc.contribution + (evaluation.contribution_score || 0),
        communication: acc.communication + (evaluation.communication_score || 0),
        collaboration: acc.collaboration + (evaluation.collaboration_score || 0),
        reliability: acc.reliability + (evaluation.reliability_score || 0),
        overall: acc.overall + (evaluation.overall_score || 0),
      }),
      { contribution: 0, communication: 0, collaboration: 0, reliability: 0, overall: 0 }
    );

    return {
      averageScores: {
        contribution: sumScores.contribution / totalEvaluations,
        communication: sumScores.communication / totalEvaluations,
        collaboration: sumScores.collaboration / totalEvaluations,
        reliability: sumScores.reliability / totalEvaluations,
        overall: sumScores.overall / totalEvaluations,
      },
      totalEvaluations,
      evaluations: enrichedEvaluations,
    };
  } catch (error: any) {
    console.error('getEvaluationResults error:', error?.message || JSON.stringify(error, null, 2));
    return {
      averageScores: {
        contribution: 0,
        communication: 0,
        collaboration: 0,
        reliability: 0,
        overall: 0,
      },
      totalEvaluations: 0,
      evaluations: [],
    };
  }
}

/**
 * Get evaluation statistics for a team
 * @param teamId - Team ID
 * @param evaluationPeriodId - Optional period ID to filter by
 * @returns Evaluation statistics
 */
export async function getEvaluationStats(teamId: string, evaluationPeriodId?: string): Promise<any> {
  try {
    let query = supabase
      .from('evaluation_periods')
      .select(
        `
        *,
        responses:evaluation_responses(count),
        submitted:evaluation_responses!inner(count),
        team:teams!inner(id, name)
      `
      )
      .eq('team_id', teamId);

    if (evaluationPeriodId) {
      query = query.eq('id', evaluationPeriodId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('getEvaluationStats error:', error?.message || JSON.stringify(error, null, 2));
    return [];
  }
}

/**
 * Get all peer evaluations for teams managed by an instructor/team leader
 * @param userId - Instructor/Leader User ID
 * @param workspaceId - Workspace ID
 * @param teamId - Optional Team ID to filter by
 * @param evaluationPeriodId - Optional Period ID to filter by
 * @returns List of evaluations with details
 */
export async function getTeamEvaluationsForInstructor(
  userId: string,
  workspaceId: string,
  teamId?: string,
  evaluationPeriodId?: string
): Promise<any[]> {
  try {
    // Get all teams where the user is a leader
    const { data: userTeams } = await supabase
      .from('team_members')
      .select('team_id, role')
      .eq('user_id', userId)
      .in('role', ['leader']);

    if (!userTeams || userTeams.length === 0) {
      return [];
    }

    const managedTeamIds = teamId ? [teamId] : userTeams.map((t) => t.team_id);

    // Check if user is workspace owner/admin
    const { data: workspaceMember } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single();

    let allTeamIds = managedTeamIds;
    if (workspaceMember && (workspaceMember.role === 'owner' || workspaceMember.role === 'admin')) {
      const { data: allWorkspaceTeams } = await supabase
        .from('teams')
        .select('id')
        .eq('workspace_id', workspaceId);

      if (allWorkspaceTeams) {
        allTeamIds = [...new Set([...managedTeamIds, ...allWorkspaceTeams.map((t) => t.id)])];
      }
    }

    if (allTeamIds.length === 0) {
      return [];
    }

    // Get all peer evaluations for these teams
    let query = supabase
      .from('peer_evaluations')
      .select(
        `
        *,
        evaluation_period:evaluation_periods!inner(
          id,
          period_name,
          period_type,
          due_date,
          is_anonymous,
          workspace_id,
          team:teams!inner(id, name),
          project:projects(id, name)
        )
      `
      )
      .in('team_id', allTeamIds);

    if (evaluationPeriodId) {
      query = query.eq('evaluation_period_id', evaluationPeriodId);
    }

    const { data, error } = await query
      .eq('evaluation_period.workspace_id', workspaceId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;

    let evaluations = (data || []) as any[];

    if (evaluations.length === 0) {
      return [];
    }

    // Get profiles for evaluators and evaluatees
    const evaluatorIds = [...new Set(evaluations.map((e) => e.evaluator_id))];
    const evaluateeIds = [...new Set(evaluations.map((e) => e.evaluatee_id))];
    const allUserIds = [...new Set([...evaluatorIds, ...evaluateeIds])];

    let profileMap = new Map();

    // Use team_members approach for better RLS access
    if (allUserIds.length > 0 && allTeamIds.length > 0) {
      try {
        const teamMembersPromises = allTeamIds.map((tid) => getTeamMembers(tid));
        const teamMembersArrays = await Promise.all(teamMembersPromises);

        const allTeamMembers = teamMembersArrays.flat();
        allTeamMembers.forEach((member: any) => {
          if (member.user_id && allUserIds.includes(member.user_id)) {
            const profile = member.user || member.profile;
            if (profile) {
              profileMap.set(member.user_id, {
                id: profile.id || profile.user_id,
                full_name: profile.full_name,
                avatar_url: profile.avatar_url,
                user_id: member.user_id,
              });
            }
          }
        });
      } catch (err) {
        console.warn('Error fetching team members for profiles:', err);
      }
    }

    // Fallback: try fetching profiles directly for missing users
    const missingUserIds = allUserIds.filter((id) => !profileMap.has(id));
    if (missingUserIds.length > 0) {
      try {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, user_id')
          .in('user_id', missingUserIds);

        if (profiles) {
          profiles.forEach((profile) => {
            if (!profileMap.has(profile.user_id)) {
              profileMap.set(profile.user_id, {
                id: profile.id,
                full_name: profile.full_name,
                avatar_url: profile.avatar_url,
                user_id: profile.user_id,
              });
            }
          });
        }
      } catch (err) {
        console.warn('Error fetching profiles directly:', err);
      }
    }

    // Enrich evaluations with profile data
    const enrichedEvaluations = evaluations.map((evaluation) => {
      const isAnonymous = evaluation.evaluation_period?.is_anonymous ?? true;
      return {
        ...evaluation,
        evaluator: profileMap.get(evaluation.evaluator_id) || null,
        evaluatee: profileMap.get(evaluation.evaluatee_id) || null,
        isAnonymous,
      };
    });

    return enrichedEvaluations;
  } catch (error: any) {
    console.error(
      'getTeamEvaluationsForInstructor error:',
      error?.message || JSON.stringify(error, null, 2)
    );
    return [];
  }
}
