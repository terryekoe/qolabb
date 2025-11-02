'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, ArrowRight, Building2, Mail } from 'lucide-react';
import { Button } from '@/components/Button';
import { useAuth } from '@/lib/auth/AuthContext';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';
import { createWorkspace } from '@/lib/db/queries';
import { joinWorkspaceByInviteCode } from '@/app/actions/workspace';

export default function WorkspacePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { refreshWorkspaces, switchWorkspace } = useWorkspace();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDescription, setWorkspaceDescription] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateWorkspace = async () => {
    if (!user || !workspaceName.trim()) return;
    
    setLoading(true);
    setError('');

    try {
      const newWorkspace = await createWorkspace({
        name: workspaceName,
        description: workspaceDescription || null,
        owner_id: user.id,
        settings: {},
      }, user.id);

      await refreshWorkspaces();
      
      // Automatically switch to the newly created workspace
      if (newWorkspace?.id) {
        switchWorkspace(newWorkspace.id);
      }
      
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Error creating workspace:', error);
      setError(error.message || 'Failed to create workspace');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWorkspace = async () => {
    if (!inviteCode.trim()) return;

    setLoading(true);
    setError('');

    try {
      const result = await joinWorkspaceByInviteCode(inviteCode.toUpperCase());
      
      if (result.success) {
        await refreshWorkspaces();
        
        // Automatically switch to the newly joined workspace
        if (result.workspaceId) {
          switchWorkspace(result.workspaceId);
        }
        
        router.push('/dashboard');
      } else {
        setError(result.error || 'Failed to join workspace. Check your invite code.');
      }
    } catch (error: any) {
      setError('Failed to join workspace. Please try again.');
    } finally {
      setLoading(false);
    }
  };



  // Function to clear expired auth cookies
  const clearExpiredCookies = () => {
    if (typeof document !== 'undefined') {
      // Get all cookies
      const cookies = document.cookie.split(';');
      
      // Find and clear Supabase auth token cookies
      cookies.forEach(cookie => {
        const [name] = cookie.trim().split('=');
        if (name.includes('sb-') && name.includes('auth-token') && !name.includes('code-verifier')) {
          console.log('🧹 Clearing expired auth cookie:', name);
          // Set cookie to expire in the past
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });
      
      // Refresh the page to reload with clean cookies
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-qolabb-beige-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
            Welcome to <span className="text-blue-600">Qolabb</span>
          </h1>
          <p className="text-xl text-gray-600">
            Create a workspace or join an existing one to get started
          </p>
        </motion.div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Create Workspace Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ y: -5 }}
            onClick={() => setShowCreateModal(true)}
            className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-blue-200"
          >
            <div className="bg-blue-100 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
              <Plus className="text-blue-700" size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-gray-900">
              Create Workspace
            </h2>
            <p className="text-gray-600 mb-6">
              Start a new workspace for your class, organization, or team projects
            </p>
            <div className="flex items-center text-blue-600 font-semibold">
              Get Started <ArrowRight className="ml-2" size={20} />
            </div>
          </motion.div>

          {/* Join Workspace Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ y: -5 }}
            onClick={() => setShowJoinModal(true)}
            className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-qolabb-beige-300"
          >
            <div className="bg-qolabb-beige-100 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
              <Users className="text-qolabb-beige-700" size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-gray-900">
              Join Workspace
            </h2>
            <p className="text-gray-600 mb-6">
              Have an invite code? Join an existing workspace to collaborate
            </p>
            <div className="flex items-center text-qolabb-beige-700 font-semibold">
              Join Now <ArrowRight className="ml-2" size={20} />
            </div>
          </motion.div>
        </div>



        {/* Create Workspace Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowCreateModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
              >
                <div className="flex items-center mb-6">
                  <div className="bg-blue-100 p-3 rounded-lg mr-4">
                    <Building2 className="text-blue-700" size={24} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Create Workspace</h2>
                </div>

                <div className="space-y-4 mb-6">
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                      <div className="flex items-start justify-between">
                        <span className="flex-1">{error}</span>
                        {(error.includes('logged in') || error.includes('authentication') || error.includes('cookies')) && (
                          <button
                            onClick={clearExpiredCookies}
                            className="ml-3 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded text-xs font-medium transition-colors"
                          >
                            Clear Cookies
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Workspace Name *
                    </label>
                    <input
                      type="text"
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      placeholder="e.g., CS101 Spring 2025"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description (optional)
                    </label>
                    <textarea
                      value={workspaceDescription}
                      onChange={(e) => setWorkspaceDescription(e.target.value)}
                      placeholder="Brief description of this workspace..."
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex space-x-3">
                  <Button
                    variant="ghost"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleCreateWorkspace}
                    disabled={!workspaceName.trim() || loading}
                    className="flex-1"
                  >
                    {loading ? 'Creating...' : 'Create Workspace'}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Join Workspace Modal */}
        <AnimatePresence>
          {showJoinModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowJoinModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
              >
                <div className="flex items-center mb-6">
                  <div className="bg-qolabb-beige-100 p-3 rounded-lg mr-4">
                    <Mail className="text-qolabb-beige-700" size={24} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Join Workspace</h2>
                </div>

                <div className="space-y-4 mb-6">
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                      <div className="flex items-start justify-between">
                        <span className="flex-1">{error}</span>
                        {(error.includes('logged in') || error.includes('authentication') || error.includes('cookies')) && (
                          <button
                            onClick={clearExpiredCookies}
                            className="ml-3 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded text-xs font-medium transition-colors"
                          >
                            Clear Cookies
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Invite Code *
                    </label>
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      placeholder="XXXX-XXXX-XXXX"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-beige-500 focus:border-transparent font-mono text-lg tracking-wider"
                    />
                    <p className="text-sm text-gray-500 mt-2">
                      Enter the invite code shared by your workspace admin
                    </p>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <Button
                    variant="ghost"
                    onClick={() => setShowJoinModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleJoinWorkspace}
                    disabled={!inviteCode.trim() || loading}
                    className="flex-1"
                  >
                    {loading ? 'Joining...' : 'Join Workspace'}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
