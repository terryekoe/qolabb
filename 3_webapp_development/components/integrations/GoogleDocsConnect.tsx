'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/Button';
import { FileText, Link2, Check, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  getIntegrationByPlatform,
  linkDocument,
  getLinkedDocuments,
  unlinkDocument,
} from '@/lib/db/integrationQueries';
import { listUserDocuments } from '@/lib/services/google/docs';
import { toast } from 'react-hot-toast';
import type { ExternalIntegration, LinkedDocument } from '@/lib/db/integrationQueries';

interface GoogleDocsConnectProps {
  projectId: string;
  workspaceId?: string;
}

export function GoogleDocsConnect({ projectId, workspaceId }: GoogleDocsConnectProps) {
  const { user } = useAuth();
  const [integration, setIntegration] = useState<ExternalIntegration | null>(null);
  const [linkedDocs, setLinkedDocs] = useState<LinkedDocument[]>([]);
  const [availableDocs, setAvailableDocs] = useState<
    Array<{ id: string; name: string; modifiedTime: string; webViewLink: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id, projectId]);

  const loadData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Check for existing integration
      const existingIntegration = await getIntegrationByPlatform(
        user.id,
        'google_docs',
        workspaceId
      );
      setIntegration(existingIntegration);

      // Load linked documents
      const linked = await getLinkedDocuments(projectId);
      setLinkedDocs(linked);

      // If integration exists, load available documents
      if (existingIntegration) {
        await loadAvailableDocuments(existingIntegration.access_token);
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Failed to load integration data');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableDocuments = async (accessToken: string) => {
    try {
      const docs = await listUserDocuments(accessToken);
      setAvailableDocs(docs);
    } catch (error: any) {
      console.error('Error loading documents:', error);
      // Don't show error - might be rate limit or token issue
    }
  };

  const handleConnect = () => {
    if (!user?.id) {
      toast.error('Please log in to connect Google');
      return;
    }

    // Build OAuth URL
    const params = new URLSearchParams({
      workspace_id: workspaceId || '',
      project_id: projectId,
    });

    window.location.href = `/api/auth/google?${params.toString()}`;
  };

  const handleLinkDocument = async (docId: string, docName: string, docUrl: string) => {
    if (!integration) return;

    setConnecting(true);
    try {
      await linkDocument(projectId, integration.id, docId, docName, docUrl);
      toast.success('Document linked successfully!');
      await loadData();
    } catch (error: any) {
      console.error('Error linking document:', error);
      toast.error('Failed to link document');
    } finally {
      setConnecting(false);
    }
  };

  const handleUnlinkDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to unlink this document?')) return;

    try {
      await unlinkDocument(docId, projectId);
      toast.success('Document unlinked');
      await loadData();
    } catch (error: any) {
      console.error('Error unlinking document:', error);
      toast.error('Failed to unlink document');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!integration) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Connect Google Docs
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Automatically track document edits and contributions
            </p>
          </div>
        </div>

        <Button variant="primary" onClick={handleConnect} className="w-full">
          <FileText className="w-4 h-4 mr-2" />
          Connect Google Account
        </Button>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          We'll only request read access to track your contributions. You can disconnect anytime.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                Connected as {integration.external_username}
              </p>
              <p className="text-xs text-green-700 dark:text-green-300">
                {integration.external_user_id || 'Google account connected'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
            Disconnect
          </Button>
        </div>
      </div>

      {/* Linked Documents */}
      {linkedDocs.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Linked Documents ({linkedDocs.length})
          </h4>
          <div className="space-y-2">
            {linkedDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-3"
              >
                <div className="flex items-center gap-3 flex-1">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {doc.document_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Last synced:{' '}
                      {doc.last_synced_at
                        ? new Date(doc.last_synced_at).toLocaleDateString()
                        : 'Never'}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleUnlinkDocument(doc.id)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Link New Document */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Link a Document
        </h4>
        {availableDocs.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No documents found. Make sure you have Google Docs in your account.
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {availableDocs
              .filter((doc) => !linkedDocs.some((linked) => linked.document_id === doc.id))
              .map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => handleLinkDocument(doc.id, doc.name, doc.webViewLink)}
                  disabled={connecting}
                  className="w-full flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-700 transition-colors text-left disabled:opacity-50"
                >
                  <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {doc.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Modified: {new Date(doc.modifiedTime).toLocaleDateString()}
                    </p>
                  </div>
                  <Link2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
