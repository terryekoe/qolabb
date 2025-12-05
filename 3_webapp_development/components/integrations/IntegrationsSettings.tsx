'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Github,
  Link as LinkIcon,
  Check,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/Button';
import { useAuth } from '@/lib/auth/AuthContext';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';
import {
  getIntegrationByPlatform,
  getUserIntegrations,
  deleteIntegration,
  getLinkedDocuments,
  unlinkDocument,
  linkDocument,
  type ExternalIntegration,
  type LinkedDocument,
} from '@/lib/db/integrationQueries';
import { listUserDocuments } from '@/lib/services/google/docs';
import { syncProjectDocuments } from '@/lib/services/google/sync';
import { getWorkspaceProjects } from '@/lib/db/queries';
import { showToast } from '@/components/ui/Toast';

export function IntegrationsSettings() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [integrations, setIntegrations] = useState<ExternalIntegration[]>([]);
  const [linkedDocs, setLinkedDocs] = useState<LinkedDocument[]>([]);
  const [availableDocs, setAvailableDocs] = useState<
    Array<{ id: string; name: string; modifiedTime: string; webViewLink: string }>
  >([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id && currentWorkspace) {
      loadData();
    }
  }, [user?.id, currentWorkspace?.id]);

  // Check for success/error messages from URL params
  useEffect(() => {
    if (typeof window !== 'undefined' && user?.id && currentWorkspace) {
      const params = new URLSearchParams(window.location.search);
      const success = params.get('success');
      const error = params.get('error');

      if (success === 'google_connected') {
        showToast.success('Google account connected successfully!');
        // Clean up URL
        window.history.replaceState({}, '', '/settings?tab=integrations');
        // Reload data
        loadData();
      } else if (error) {
        showToast.error(`Connection failed: ${error}`);
        // Clean up URL
        window.history.replaceState({}, '', '/settings?tab=integrations');
      }
    }
  }, [user?.id, currentWorkspace]);

  const loadData = async () => {
    if (!user?.id || !currentWorkspace) return;

    try {
      setLoading(true);

      // Load integrations
      const userIntegrations = await getUserIntegrations(user.id, currentWorkspace.id);
      setIntegrations(userIntegrations);

      // Load projects for linking documents
      const workspaceProjects = await getWorkspaceProjects(currentWorkspace.id);
      setProjects(workspaceProjects || []);

      // Load linked documents for all projects
      const allLinkedDocs: LinkedDocument[] = [];
      for (const project of workspaceProjects || []) {
        const docs = await getLinkedDocuments(project.id);
        allLinkedDocs.push(...docs);
      }
      setLinkedDocs(allLinkedDocs);

      // If Google Docs integration exists, load available documents
      const googleIntegration = userIntegrations.find((i) => i.platform === 'google_docs');
      if (googleIntegration && !isTokenExpired(googleIntegration.token_expires_at)) {
        await loadAvailableDocuments(googleIntegration.access_token);
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      showToast.error('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const isTokenExpired = (expiresAt: string | null): boolean => {
    if (!expiresAt) return true;
    const expiry = new Date(expiresAt);
    const now = new Date();
    const buffer = 5 * 60 * 1000; // 5 minutes buffer
    return expiry.getTime() - now.getTime() < buffer;
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

  const handleConnectGoogle = () => {
    if (!user?.id || !currentWorkspace) {
      showToast.error('Please log in and select a workspace');
      return;
    }

    // Build OAuth URL
    const params = new URLSearchParams({
      workspace_id: currentWorkspace.id,
    });

    window.location.href = `/api/auth/google?${params.toString()}`;
  };

  const handleConnectGitHub = () => {
    showToast.error('GitHub integration coming soon!');
    // TODO: Implement GitHub OAuth
  };

  const handleDisconnect = async (integrationId: string, platform: string) => {
    if (!confirm(`Are you sure you want to disconnect ${platform}?`)) return;

    try {
      await deleteIntegration(integrationId, user!.id);
      showToast.success(`${platform} disconnected successfully`);
      await loadData();
    } catch (error: any) {
      console.error('Error disconnecting:', error);
      showToast.error('Failed to disconnect');
    }
  };

  const handleLinkDocument = async (docId: string, docName: string, docUrl: string) => {
    if (!selectedProject) {
      showToast.error('Please select a project first');
      return;
    }

    const googleIntegration = integrations.find((i) => i.platform === 'google_docs');
    if (!googleIntegration) {
      showToast.error('Please connect Google first');
      return;
    }

    setConnecting(true);
    try {
      await linkDocument(selectedProject, googleIntegration.id, docId, docName, docUrl);
      showToast.success('Document linked successfully!');
      setSelectedProject(null);
      await loadData();
    } catch (error: any) {
      console.error('Error linking document:', error);
      showToast.error('Failed to link document');
    } finally {
      setConnecting(false);
    }
  };

  const handleUnlinkDocument = async (docId: string, projectId: string) => {
    if (!confirm('Are you sure you want to unlink this document?')) return;

    try {
      await unlinkDocument(docId, projectId);
      showToast.success('Document unlinked');
      await loadData();
    } catch (error: any) {
      console.error('Error unlinking document:', error);
      showToast.error('Failed to unlink document');
    }
  };

  const handleSync = async (projectId: string) => {
    setSyncing(projectId);
    try {
      const result = await syncProjectDocuments(projectId);
      if (result.success) {
        showToast.success(`Synced! Created ${result.contributionsCreated} contributions.`);
      } else {
        showToast.error(`Sync completed with errors: ${result.errors.join(', ')}`);
      }
      await loadData();
    } catch (error: any) {
      console.error('Error syncing:', error);
      showToast.error('Failed to sync documents');
    } finally {
      setSyncing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  const googleIntegration = integrations.find((i) => i.platform === 'google_docs');
  const githubIntegration = integrations.find((i) => i.platform === 'github');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Integrations</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Connect external platforms to automatically track your contributions
        </p>
      </div>

      {/* Google Docs Integration */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Google Docs
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Automatically track document edits and contributions
              </p>
            </div>
          </div>
          {googleIntegration ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <Check className="w-5 h-5" />
                <span className="text-sm font-medium">Connected</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDisconnect(googleIntegration.id, 'Google Docs')}
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <Button variant="primary" onClick={handleConnectGoogle}>
              <FileText className="w-4 h-4 mr-2" />
              Connect Google
            </Button>
          )}
        </div>

        {googleIntegration && (
          <div className="mt-4 space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    Connected as {googleIntegration.external_username}
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                    {googleIntegration.external_user_id || 'Google account'}
                  </p>
                </div>
                {isTokenExpired(googleIntegration.token_expires_at) && (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs">Token expired</span>
                  </div>
                )}
              </div>
            </div>

            {/* Link Document Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Link a Document to a Project
              </h4>

              {/* Project Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Project
                </label>
                <select
                  value={selectedProject || ''}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a project...</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Available Documents */}
              {selectedProject && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Available Documents
                  </label>
                  {availableDocs.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No documents found. Make sure you have Google Docs in your account.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {availableDocs
                        .filter(
                          (doc) => !linkedDocs.some((linked) => linked.document_id === doc.id)
                        )
                        .map((doc) => (
                          <button
                            key={doc.id}
                            onClick={() => handleLinkDocument(doc.id, doc.name, doc.webViewLink)}
                            disabled={connecting}
                            className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-300 dark:hover:border-blue-700 transition-colors text-left disabled:opacity-50"
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
                            <LinkIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Linked Documents */}
            {linkedDocs.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Linked Documents ({linkedDocs.length})
                </h4>
                <div className="space-y-2">
                  {linkedDocs.map((doc) => {
                    const project = projects.find((p) => p.id === doc.project_id);
                    return (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-3"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {doc.document_name}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                              <span>Project: {project?.name || 'Unknown'}</span>
                              <span>•</span>
                              <span>
                                Last synced:{' '}
                                {doc.last_synced_at
                                  ? new Date(doc.last_synced_at).toLocaleDateString()
                                  : 'Never'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSync(doc.project_id)}
                            disabled={syncing === doc.project_id}
                          >
                            {syncing === doc.project_id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnlinkDocument(doc.id, doc.project_id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* GitHub Integration */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <Github className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">GitHub</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Track commits, pull requests, and code contributions
              </p>
            </div>
          </div>
          {githubIntegration ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <Check className="w-5 h-5" />
                <span className="text-sm font-medium">Connected</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDisconnect(githubIntegration.id, 'GitHub')}
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <Button variant="ghost" onClick={handleConnectGitHub} disabled>
              <Github className="w-4 h-4 mr-2" />
              Coming Soon
            </Button>
          )}
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Privacy & Security
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              We only request read-only access to your documents. You can disconnect any integration
              at any time. Your data is never shared with third parties.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
