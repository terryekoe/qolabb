// =====================================================
// Project Submissions Database Functions
// Final assignment submission management
// =====================================================

import { supabase } from '../supabase';
import type { ProjectSubmission, ProjectResource } from '../types/database';

// Re-export types for convenience
export type { ProjectSubmission, ProjectResource };


// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Check if user is team leader or instructor for a project
 * @param userId - User ID
 * @param teamId - Team ID
 * @param workspaceId - Workspace ID
 * @returns True if user has elevated privileges
 */
async function isTeamLeaderOrInstructor(
  userId: string,
  teamId: string,
  workspaceId: string
): Promise<boolean> {
  try {
    // Check if user is team leader
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single();

    if (teamMember?.role === 'leader') {
      return true;
    }

    // Check if user is workspace owner/admin
    const { data: workspaceMember } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single();

    if (workspaceMember?.role === 'owner' || workspaceMember?.role === 'admin') {
      return true;
    }

    // Check if user is instructor by profile role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    const userRole = profile?.role?.toLowerCase();
    return userRole === 'instructor' || userRole === 'teaching_assistant';
  } catch (error) {
    console.error('isTeamLeaderOrInstructor error:', error);
    return false;
  }
}

// =====================================================
// FUNCTIONS
// =====================================================

/**
 * Upload a project submission file
 * @param projectId - Project ID
 * @param file - File to upload
 * @returns Public URL of the uploaded file
 */
export async function uploadProjectFile(projectId: string, file: File): Promise<string> {
  try {
    // Create unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${projectId}-${Date.now()}.${fileExt}`;
    const filePath = `${projectId}/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('project-submissions')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage.from('project-submissions').getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error: any) {
    console.error('uploadProjectFile error:', error?.message || JSON.stringify(error, null, 2));
    throw error;
  }
}

/**
 * Submit a project (Final Assignment)
 * Only group leaders or instructors can submit
 * @param projectId - Project ID
 * @param userId - User ID submitting
 * @param content - Submission content/notes
 * @param resources - List of resources/files
 * @returns Submission record
 */
export async function submitProject(
  projectId: string,
  userId: string,
  content: string | null,
  resources: ProjectResource[] = []
): Promise<ProjectSubmission | null> {
  try {
    // Fetch project to get team_id and workspace_id
    const { data: project } = await supabase
      .from('projects')
      .select('team_id, workspace_id')
      .eq('id', projectId)
      .single();

    if (!project) throw new Error('Project not found');

    const canSubmit = await isTeamLeaderOrInstructor(userId, project.team_id, project.workspace_id);
    if (!canSubmit) {
      throw new Error('Only group leaders can submit the project');
    }

    // Fetch completed tasks to generate a contribution report
    const { data: completedTasks } = await supabase
      .from('tasks')
      .select(
        `
        title,
        status,
        assignees:task_assignees(
          user:profiles(full_name)
        )
      `
      )
      .eq('project_id', projectId)
      .eq('status', 'completed');

    let contributionReport = '';
    if (completedTasks && completedTasks.length > 0) {
      contributionReport = '\n\n--- Team Contribution Report ---\n';
      completedTasks.forEach((task: any) => {
        const assignees =
          task.assignees?.map((a: any) => a.user?.full_name).join(', ') || 'Unassigned';
        contributionReport += `- ${task.title} (Completed by: ${assignees})\n`;
      });
      contributionReport += `Total Completed Tasks: ${completedTasks.length}\n----------------------------------`;
    }

    const finalContent = content ? content + contributionReport : contributionReport;

    const { data, error } = await supabase
      .from('project_submissions')
      .insert({
        project_id: projectId,
        submitted_by: userId,
        content: finalContent,
        resources,
        status: 'submitted',
      })
      .select('*')
      .single();

    if (error) throw error;
    return data as ProjectSubmission;
  } catch (error: any) {
    console.error('submitProject error:', error?.message || JSON.stringify(error, null, 2));
    throw error;
  }
}

/**
 * Get project submission details
 * @param projectId - Project ID
 * @returns Submission record or null
 */
export async function getProjectSubmission(projectId: string): Promise<ProjectSubmission | null> {
  try {
    const { data, error } = await supabase
      .from('project_submissions')
      .select('*')
      .eq('project_id', projectId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data as ProjectSubmission;
  } catch (error: any) {
    console.error('getProjectSubmission error:', error?.message || JSON.stringify(error, null, 2));
    return null;
  }
}

/**
 * Get all teams and their submissions for a project (Instructor View)
 * @param projectId - Project ID
 * @returns List of teams with members and submission details
 */
export async function getProjectTeamsAndSubmissions(projectId: string) {
  try {
    // Get the project to find the workspace
    const { data: project } = await supabase
      .from('projects')
      .select('workspace_id, team_id')
      .eq('id', projectId)
      .single();

    if (!project) throw new Error('Project not found');

    // Get the team assigned to this project
    const { data: team } = await supabase
      .from('teams')
      .select(
        `
        id,
        name,
        members:team_members(
          user:profiles(
            id,
            full_name,
            avatar_url
          )
        )
      `
      )
      .eq('id', project.team_id)
      .single();

    if (!team) return [];

    // Get the submission for this project
    const { data: submission, error: submissionError } = await supabase
      .from('project_submissions')
      .select('*')
      .eq('project_id', projectId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (submissionError) {
      console.error('Error fetching submission:', submissionError);
    }

    // Return as a list (even if just one for now)
    return [
      {
        team,
        project,
        submission,
      },
    ];
  } catch (error) {
    console.error('Error fetching project teams:', error);
    return [];
  }
}
