/**
 * Integration-related database queries
 * Handles external integrations (GitHub, Google Docs, etc.)
 */

import { supabase } from '../supabase';

// =====================================================
// EXTERNAL INTEGRATIONS
// =====================================================

export interface ExternalIntegration {
  id: string;
  user_id: string;
  workspace_id: string | null;
  team_id: string | null;
  platform: 'github' | 'google_docs' | 'google_drive';
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  external_user_id: string | null;
  external_username: string | null;
  external_avatar_url: string | null;
  metadata: Record<string, any>;
  is_active: boolean;
  last_synced_at: string | null;
  sync_status: 'active' | 'error' | 'paused';
  sync_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface LinkedRepository {
  id: string;
  project_id: string;
  integration_id: string;
  repository_full_name: string;
  repository_id: string;
  repository_url: string;
  is_private: boolean;
  auto_sync: boolean;
  sync_commits: boolean;
  sync_pull_requests: boolean;
  sync_issues: boolean;
  webhook_id: string | null;
  webhook_secret: string | null;
  metadata: Record<string, any>;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LinkedDocument {
  id: string;
  project_id: string;
  integration_id: string;
  document_id: string;
  document_name: string;
  document_url: string;
  document_type: 'document' | 'spreadsheet' | 'presentation';
  auto_sync: boolean;
  sync_edits: boolean;
  sync_comments: boolean;
  metadata: Record<string, any>;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get user's integrations
 */
export async function getUserIntegrations(
  userId: string,
  workspaceId?: string
): Promise<ExternalIntegration[]> {
  let query = supabase
    .from('external_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as ExternalIntegration[];
}

/**
 * Get integration by platform
 */
export async function getIntegrationByPlatform(
  userId: string,
  platform: 'github' | 'google_docs' | 'google_drive',
  workspaceId?: string
): Promise<ExternalIntegration | null> {
  let query = supabase
    .from('external_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', platform)
    .eq('is_active', true);

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId);
  }

  const { data, error } = await query.single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
  return data as ExternalIntegration | null;
}

/**
 * Delete integration
 */
export async function deleteIntegration(integrationId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('external_integrations')
    .delete()
    .eq('id', integrationId)
    .eq('user_id', userId);

  if (error) throw error;
  return true;
}

// =====================================================
// LINKED DOCUMENTS
// =====================================================

/**
 * Get linked documents for a project
 */
export async function getLinkedDocuments(projectId: string): Promise<LinkedDocument[]> {
  const { data, error } = await supabase
    .from('linked_documents')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as LinkedDocument[];
}

/**
 * Link a Google Doc to a project
 */
export async function linkDocument(
  projectId: string,
  integrationId: string,
  documentId: string,
  documentName: string,
  documentUrl: string
): Promise<LinkedDocument> {
  const { data, error } = await supabase
    .from('linked_documents')
    .insert({
      project_id: projectId,
      integration_id: integrationId,
      document_id: documentId,
      document_name: documentName,
      document_url: documentUrl,
      document_type: 'document',
      auto_sync: true,
      sync_edits: true,
      sync_comments: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data as LinkedDocument;
}

/**
 * Unlink a document
 */
export async function unlinkDocument(documentId: string, projectId: string): Promise<boolean> {
  const { error } = await supabase
    .from('linked_documents')
    .delete()
    .eq('id', documentId)
    .eq('project_id', projectId);

  if (error) throw error;
  return true;
}

/**
 * Update linked document sync settings
 */
export async function updateLinkedDocument(
  documentId: string,
  updates: {
    auto_sync?: boolean;
    sync_edits?: boolean;
    sync_comments?: boolean;
  }
): Promise<LinkedDocument> {
  const { data, error } = await supabase
    .from('linked_documents')
    .update(updates)
    .eq('id', documentId)
    .select()
    .single();

  if (error) throw error;
  return data as LinkedDocument;
}

// =====================================================
// AUTOMATED CONTRIBUTIONS
// =====================================================

export interface AutomatedContribution {
  id: string;
  contribution_id: string | null;
  source_platform: 'github' | 'google_docs';
  source_id: string;
  source_type: string;
  project_id: string;
  user_id: string;
  task_id: string | null;
  title: string;
  description: string | null;
  contribution_type: string;
  lines_added: number;
  lines_removed: number;
  files_changed: number;
  characters_added: number;
  characters_removed: number;
  hours_spent: number | null;
  external_created_at: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
  is_merged: boolean;
  is_verified: boolean;
}

/**
 * Get automated contributions for a project
 */
export async function getAutomatedContributions(
  projectId: string,
  userId?: string
): Promise<AutomatedContribution[]> {
  let query = supabase
    .from('automated_contributions')
    .select('*')
    .eq('project_id', projectId)
    .order('external_created_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as AutomatedContribution[];
}

/**
 * Merge automated contribution with manual contribution
 */
export async function mergeAutomatedContribution(
  automatedContributionId: string,
  contributionId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('automated_contributions')
    .update({
      contribution_id: contributionId,
      is_merged: true,
    })
    .eq('id', automatedContributionId);

  if (error) throw error;
  return true;
}
