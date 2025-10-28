'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon,
  Building2,
  Users,
  Copy,
  Check,
  UserMinus,
  Shield,
  Crown,
  Trash2,
} from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/Button';
import { useAuth } from '@/lib/auth/AuthContext';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';
import { getWorkspaceMembers } from '@/lib/db/queries';
import { supabase } from '@/lib/supabase';

export default function SettingsPage() {
  const { user } = useAuth();
  const { currentWorkspace, refreshWorkspaces } = useWorkspace();
  const [activeTab, setActiveTab] = useState<'general' | 'members'>('general');
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDescription, setWorkspaceDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentWorkspace) {
      setWorkspaceName(currentWorkspace.name);
      setWorkspaceDescription(currentWorkspace.description || '');
      loadMembers();
    }
  }, [currentWorkspace]);

  async function loadMembers() {
    if (!currentWorkspace) return;

    try {
      setLoading(true);
      const membersData = await getWorkspaceMembers(currentWorkspace.id);
      setMembers(membersData || []);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveGeneral() {
    if (!currentWorkspace) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('workspaces')
        .update({
          name: workspaceName,
          description: workspaceDescription || null,
        } as any)
        .eq('id', currentWorkspace.id);

      if (error) throw error;

      await refreshWorkspaces();
      alert('Workspace updated successfully!');
    } catch (error: any) {
      alert('Failed to update workspace: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  function copyInviteCode() {
    if (!currentWorkspace?.invite_code) return;
    navigator.clipboard.writeText(currentWorkspace.invite_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  const currentMember = members.find((m) => m.user_id === user?.id);
  const isOwnerOrAdmin = currentMember?.role === 'owner' || currentMember?.role === 'admin';

  if (!currentWorkspace) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <SettingsIcon size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Please select a workspace first</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-5xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Workspace Settings</h1>
          <p className="text-gray-600 mt-1">
            Manage {currentWorkspace.name}
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('general')}
              className={`pb-4 px-1 border-b-2 font-medium transition-colors ${
                activeTab === 'general'
                  ? 'border-qolabb-navy-600 text-qolabb-navy-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Building2 size={20} />
                <span>General</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`pb-4 px-1 border-b-2 font-medium transition-colors ${
                activeTab === 'members'
                  ? 'border-qolabb-navy-600 text-qolabb-navy-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Users size={20} />
                <span>Members</span>
                <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                  {members.length}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* General Tab */}
        {activeTab === 'general' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Workspace Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Workspace Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    disabled={!isOwnerOrAdmin}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={workspaceDescription}
                    onChange={(e) => setWorkspaceDescription(e.target.value)}
                    disabled={!isOwnerOrAdmin}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Add a description for this workspace..."
                  />
                </div>

                {isOwnerOrAdmin && (
                  <div className="flex justify-end">
                    <Button
                      variant="primary"
                      onClick={handleSaveGeneral}
                      disabled={saving || !workspaceName.trim()}
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Invite Code */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Invite Code</h2>
              <p className="text-gray-600 mb-4">
                Share this code with others to invite them to your workspace
              </p>
              
              <div className="flex items-center space-x-3">
                <div className="flex-1 px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg font-mono text-lg tracking-wider text-gray-900">
                  {currentWorkspace.invite_code}
                </div>
                <Button
                  variant="ghost"
                  onClick={copyInviteCode}
                  className="flex items-center space-x-2"
                >
                  {copiedCode ? (
                    <>
                      <Check size={20} className="text-green-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={20} />
                      <span>Copy</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Danger Zone */}
            {isOwnerOrAdmin && (
              <div className="bg-red-50 rounded-xl border border-red-200 p-6">
                <h2 className="text-lg font-semibold text-red-900 mb-2">Danger Zone</h2>
                <p className="text-red-700 text-sm mb-4">
                  Deleting a workspace is permanent and cannot be undone
                </p>
                <Button variant="ghost" className="text-red-600 hover:bg-red-100">
                  <Trash2 size={18} className="mr-2" />
                  Delete Workspace
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-200"
          >
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Members</h2>
              <p className="text-gray-600 text-sm mt-1">
                {members.length} member{members.length !== 1 ? 's' : ''} in this workspace
              </p>
            </div>

            {loading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-4 animate-pulse">
                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {members.map((member) => (
                  <div key={member.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-qolabb-navy-400 to-qolabb-beige-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {member.profile?.full_name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-semibold text-gray-900">
                            {member.profile?.full_name || 'Unknown User'}
                          </p>
                          {member.user_id === user?.id && (
                            <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {member.profile?.institution || 'No institution'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        {member.role === 'owner' && (
                          <div className="flex items-center space-x-1 bg-qolabb-navy-100 text-qolabb-navy-700 px-3 py-1 rounded-full">
                            <Crown size={14} />
                            <span className="text-sm font-semibold">Owner</span>
                          </div>
                        )}
                        {member.role === 'admin' && (
                          <div className="flex items-center space-x-1 bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
                            <Shield size={14} />
                            <span className="text-sm font-semibold">Admin</span>
                          </div>
                        )}
                        {member.role === 'member' && (
                          <span className="text-sm text-gray-500">Member</span>
                        )}
                      </div>

                      {isOwnerOrAdmin && member.user_id !== user?.id && member.role !== 'owner' && (
                        <button className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors">
                          <UserMinus size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
