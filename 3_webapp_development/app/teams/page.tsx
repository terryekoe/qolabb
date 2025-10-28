'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Plus, 
  MoreVertical, 
  UserPlus, 
  Crown, 
  X, 
  Trash2,
  Search,
  Filter,
  AlertCircle,
} from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/Button';
import { useAuth } from '@/lib/auth/AuthContext';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';
import { createTeam, getWorkspaceTeams } from '@/lib/db/queries';

export default function TeamsPage() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [teamColor, setTeamColor] = useState('#334e68');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const colors = [
    { name: 'Navy', value: '#334e68' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#10b981' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Orange', value: '#f59e0b' },
  ];

  useEffect(() => {
    if (currentWorkspace) {
      loadTeams();
    }
  }, [currentWorkspace]);

  async function loadTeams() {
    if (!currentWorkspace) return;

    try {
      setLoading(true);
      const teamsData = await getWorkspaceTeams(currentWorkspace.id);
      setTeams(teamsData || []);
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTeam() {
    if (!user || !currentWorkspace || !teamName.trim()) return;

    setCreating(true);
    setError('');

    try {
      await createTeam({
        workspace_id: currentWorkspace.id,
        name: teamName,
        description: teamDescription || null,
        avatar_color: teamColor,
      }, user.id);

      await loadTeams();
      setShowCreateModal(false);
      setTeamName('');
      setTeamDescription('');
      setTeamColor('#334e68');
    } catch (error: any) {
      setError(error.message || 'Failed to create team');
    } finally {
      setCreating(false);
    }
  }

  if (!currentWorkspace) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Users size={64} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Workspace Selected</h2>
            <p className="text-gray-600">Select a workspace to view teams</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Filter teams based on search
  const filteredTeams = teams.filter(team => 
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Teams</h1>
            <p className="text-gray-600 mt-1">
              Manage teams in {currentWorkspace.name}
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>New Team</span>
          </Button>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Teams Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-gray-200 animate-pulse">
                <div className="h-12 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : filteredTeams.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-12 text-center border-2 border-dashed border-gray-300"
          >
            <Users size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery ? 'No teams found' : 'No teams yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery
                ? 'Try adjusting your search query'
                : 'Create your first team to start collaborating on projects'}
            </p>
            {!searchQuery && (
              <Button
                variant="primary"
                onClick={() => setShowCreateModal(true)}
                className="flex items-center space-x-2 mx-auto"
              >
                <Plus size={20} />
                <span>Create First Team</span>
              </Button>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeams.map((team, index) => (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4 }}
                className="bg-white rounded-xl overflow-hidden border border-gray-200 hover:shadow-lg transition-all group"
              >
                {/* Team Header */}
                <div
                  className="h-24 flex items-center justify-center relative"
                  style={{ backgroundColor: team.avatar_color }}
                >
                  <Users size={32} className="text-white" />
                  <button className="absolute top-3 right-3 p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                    <MoreVertical size={18} className="text-white" />
                  </button>
                </div>

                {/* Team Info */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {team.name}
                  </h3>
                  {team.description && (
                    <p className="text-gray-600 text-sm mb-4">{team.description}</p>
                  )}

                  {/* Members Count */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Users size={16} />
                      <span className="text-sm">
                        {team.members?.length || 0} member{team.members?.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {team.members?.some((m: any) => m.role === 'leader' && m.user_id === user?.id) && (
                      <div className="flex items-center space-x-1 text-qolabb-navy-600">
                        <Crown size={14} />
                        <span className="text-xs font-semibold">Leader</span>
                      </div>
                    )}
                  </div>

                  {/* Members Avatars */}
                  {team.members && team.members.length > 0 && (
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="flex -space-x-2">
                        {team.members.slice(0, 4).map((member: any, i: number) => (
                          <div
                            key={i}
                            className="w-8 h-8 rounded-full bg-gradient-to-br from-qolabb-navy-400 to-qolabb-beige-400 border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                            title={member.user?.full_name || 'User'}
                          >
                            {member.user?.full_name?.charAt(0) || 'U'}
                          </div>
                        ))}
                        {team.members.length > 4 && (
                          <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-gray-600 text-xs font-semibold">
                            +{team.members.length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm" className="flex-1">
                      View Details
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center space-x-1"
                    >
                      <UserPlus size={16} />
                      <span>Add</span>
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create Team Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            style={{ zIndex: 9999 }}
            onClick={() => {
              setShowCreateModal(false);
              setTeamName('');
              setTeamDescription('');
              setTeamColor('#334e68');
              setError('');
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="bg-qolabb-navy-100 p-3 rounded-lg mr-4">
                    <Users className="text-qolabb-navy-700" size={24} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Create Team</h2>
                </div>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setTeamName('');
                    setTeamDescription('');
                    setTeamColor('#334e68');
                    setError('');
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team Name *
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g., Frontend Development Team"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={teamDescription}
                    onChange={(e) => setTeamDescription(e.target.value)}
                    placeholder="What does this team do?"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team Color
                  </label>
                  <div className="grid grid-cols-6 gap-3">
                    {colors.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setTeamColor(color.value)}
                        className={`w-full aspect-square rounded-lg transition-all ${
                          teamColor === color.value
                            ? 'ring-2 ring-offset-2 ring-gray-900 scale-110'
                            : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowCreateModal(false);
                    setTeamName('');
                    setTeamDescription('');
                    setTeamColor('#334e68');
                    setError('');
                  }}
                  className="flex-1"
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleCreateTeam}
                  disabled={!teamName.trim() || creating}
                  className="flex-1"
                >
                  {creating ? 'Creating...' : 'Create Team'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
