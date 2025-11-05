/**
 * Google Docs Sync Service
 * Handles syncing document changes and creating automated contributions
 */

import { supabase } from '@/lib/supabase';
import {
  getDocumentMetadata,
  getDocumentRevisions,
  getDocumentContent,
  calculateCharacterChanges,
  type GoogleRevision,
} from './docs';
import { refreshAccessToken, isTokenExpired } from './oauth';

interface SyncResult {
  success: boolean;
  contributionsCreated: number;
  errors: string[];
}

/**
 * Sync a single linked document
 */
export async function syncLinkedDocument(
  linkedDocId: string,
  userId: string
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    contributionsCreated: 0,
    errors: [],
  };

  try {
    // Get linked document info
    const { data: linkedDoc, error: docError } = await supabase
      .from('linked_documents')
      .select('*, integration:external_integrations(*)')
      .eq('id', linkedDocId)
      .single();

    if (docError || !linkedDoc) {
      throw new Error(`Failed to get linked document: ${docError?.message}`);
    }

    const integration = (linkedDoc as any).integration;
    if (!integration) {
      throw new Error('Integration not found');
    }

    // Check and refresh token if needed
    let accessToken = integration.access_token;
    if (isTokenExpired(integration.token_expires_at)) {
      if (!integration.refresh_token) {
        throw new Error('Token expired and no refresh token available');
      }

      const tokenResponse = await refreshAccessToken(integration.refresh_token);
      accessToken = tokenResponse.access_token;

      // Update token in database
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + tokenResponse.expires_in);

      await supabase
        .from('external_integrations')
        .update({
          access_token: accessToken,
          token_expires_at: expiresAt.toISOString(),
        })
        .eq('id', integration.id);
    }

    // Get document metadata
    const docMetadata = await getDocumentMetadata(accessToken, linkedDoc.document_id);

    // Get revisions
    const revisions = await getDocumentRevisions(accessToken, linkedDoc.document_id);

    // Get last synced revision (if any)
    const lastSyncedRevision = linkedDoc.metadata?.lastSyncedRevisionId;

    // Filter revisions to sync (only new ones)
    const revisionsToSync = lastSyncedRevision
      ? revisions.filter((rev) => rev.id > lastSyncedRevision)
      : revisions.slice(-10); // Last 10 revisions if first sync

    if (revisionsToSync.length === 0) {
      return result; // Nothing to sync
    }

    // Get baseline content (revision before first one to sync)
    let baselineContent = null;
    if (lastSyncedRevision) {
      try {
        baselineContent = await getDocumentContent(accessToken, linkedDoc.document_id, lastSyncedRevision);
      } catch (error) {
        // If we can't get baseline, use current content
        console.warn('Could not get baseline content, using current');
      }
    }

    // Process each revision
    for (const revision of revisionsToSync) {
      try {
        // Get content at this revision
        const revisionContent = await getDocumentContent(
          accessToken,
          linkedDoc.document_id,
          revision.id
        );

        // Calculate changes
        if (baselineContent) {
          const changes = calculateCharacterChanges(baselineContent, revisionContent);
          const userEmail = revision.lastModifyingUser?.emailAddress;

          // Find user by email if revision has user info
          if (userEmail && changes.added > 0) {
            // Get user ID from email
            const { data: profile } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', userEmail)
              .single();

            if (profile) {
              // Estimate hours (rough estimate: 1000 characters = 1 hour)
              const estimatedHours = Math.max(0.1, changes.added / 1000);

              // Create automated contribution
              const { error: contribError } = await supabase
                .from('automated_contributions')
                .insert({
                  source_platform: 'google_docs',
                  source_id: `${linkedDoc.document_id}-${revision.id}`,
                  source_type: 'edit',
                  project_id: linkedDoc.project_id,
                  user_id: profile.id,
                  title: `Edited ${linkedDoc.document_name}`,
                  description: `Made edits to ${linkedDoc.document_name}`,
                  contribution_type: 'documentation',
                  characters_added: changes.added,
                  characters_removed: changes.removed,
                  hours_spent: estimatedHours,
                  external_created_at: revision.modifiedTime,
                  metadata: {
                    documentId: linkedDoc.document_id,
                    documentName: linkedDoc.document_name,
                    revisionId: revision.id,
                    revisionTime: revision.modifiedTime,
                    editor: revision.lastModifyingUser,
                  },
                });

              if (!contribError) {
                result.contributionsCreated++;
              } else {
                // Check if it's a duplicate (already synced)
                if (!contribError.message.includes('unique')) {
                  result.errors.push(contribError.message);
                }
              }
            }
          }
        }

        // Update baseline for next iteration
        baselineContent = revisionContent;
      } catch (error: any) {
        result.errors.push(`Error processing revision ${revision.id}: ${error.message}`);
      }
    }

    // Update last synced revision
    const lastRevision = revisionsToSync[revisionsToSync.length - 1];
    await supabase
      .from('linked_documents')
      .update({
        last_synced_at: new Date().toISOString(),
        metadata: {
          ...linkedDoc.metadata,
          lastSyncedRevisionId: lastRevision.id,
        },
      })
      .eq('id', linkedDocId);
  } catch (error: any) {
    result.success = false;
    result.errors.push(error.message);
  }

  return result;
}

/**
 * Sync all linked documents for a project
 */
export async function syncProjectDocuments(
  projectId: string
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    contributionsCreated: 0,
    errors: [],
  };

  // Get all linked documents for project
  const { data: linkedDocs, error } = await supabase
    .from('linked_documents')
    .select('id')
    .eq('project_id', projectId)
    .eq('auto_sync', true);

  if (error) {
    result.success = false;
    result.errors.push(error.message);
    return result;
  }

  // Get user ID from first document's integration
  const { data: firstDoc } = await supabase
    .from('linked_documents')
    .select('integration:external_integrations(user_id)')
    .eq('project_id', projectId)
    .limit(1)
    .single();

  const userId = (firstDoc as any)?.integration?.user_id;
  if (!userId) {
    result.success = false;
    result.errors.push('No integration found for project');
    return result;
  }

  // Sync each document
  for (const doc of linkedDocs || []) {
    const docResult = await syncLinkedDocument(doc.id, userId);
    result.contributionsCreated += docResult.contributionsCreated;
    result.errors.push(...docResult.errors);
  }

  return result;
}
