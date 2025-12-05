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
  Compass,
  Bell,
  UserCog,
  History,
} from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/Button';
import { AvatarGroup } from '@/components/ui/Avatar';
import { useAuth } from '@/lib/auth/AuthContext';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';
import { createTeam, getWorkspaceTeams } from '@/lib/db/queries';
import { supabase } from '@/lib/supabase';
import AddMemberModal from '@/components/teams/AddMemberModal';
import TeamDetailsModal from '@/components/teams/TeamDetailsModal';
import TeamDiscovery from '@/components/teams/TeamDiscovery';
import JoinRequestManager from '@/components/teams/JoinRequestManager';
import BulkTeamAssignment from '@/components/teams/BulkTeamAssignment';
import TeamAuditLog from '@/components/teams/TeamAuditLog';
import { usePermissions } from '@/lib/hooks/usePermissions';

export default function TeamsPage() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { canAccess } = usePermissions();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [teamColor, setTeamColor] = useState('#334e68');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showTeamDetailsModal, setShowTeamDetailsModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'my-teams' | 'discover' | 'requests' | 'bulk-assign' | 'audit-log'>('my-teams');

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

  // Real-time subscriptions for teams and team_members
  useEffect(() => {
    if (!currentWorkspace?.id) return;

    // Subscribe to teams changes
    const teamsChannel = supabase
      .channel(`teams:workspace:${currentWorkspace.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams',
          filter: `workspace_id=eq.${currentWorkspace.id}`,
        },
        () => {
          loadTeams();
        }
      )
      .subscribe();

    // Subscribe to team_members changes (affects team counts and membership)
    const teamMembersChannel = supabase
      .channel(`team_members:workspace:${currentWorkspace.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_members',
        },
        () => {
          // Reload teams to get updated member counts and membership
          loadTeams();
        }
      )
      .subscribe();

    // Subscribe to team_join_requests changes
    const joinRequestsChannel = supabase
      .channel(`team_join_requests:workspace:${currentWorkspace.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_join_requests',
        },
        () => {
          // Reload teams as join requests might affect discoverable teams
          loadTeams();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(teamsChannel);
      supabase.removeChannel(teamMembersChannel);
      supabase.removeChannel(joinRequestsChannel);
    };
  }, [currentWorkspace?.id]);

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
        settings: {
          allow_self_join: false,
          require_approval: true,
          max_members: null
        },
        is_public: false,
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

  function handleAddMember(team: any) {
    setSelectedTeam(team);
    setShowAddMemberModal(true);
  }

  function handleViewDetails(team: any) {
    setSelectedTeam(team);
    setShowTeamDetailsModal(true);
  }

  function handleTeamUpdated() {
    loadTeams();
  }

  if (!currentWorkspace) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Users size={64} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Class Selected</h2>
            <p className="text-gray-600">Select a class to view groups</p>
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Groups</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage groups in {currentWorkspace.name}
            </p>
          </div>
          {activeTab === 'my-teams' && (
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2"
            >
              <Plus size={20} />
              <span>New Group</span>
            </Button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-1 overflow-hidden">
          <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveTab('my-teams')}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'my-teams'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Users size={18} />
              <span className="hidden sm:inline">My Groups</span>
              <span className="sm:hidden">Groups</span>
            </button>
            <button
              onClick={() => setActiveTab('discover')}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'discover'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Compass size={18} />
              <span className="hidden sm:inline">Find Groups</span>
              <span className="sm:hidden">Find</span>
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'requests'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Bell size={18} />
              <span className="hidden sm:inline">Membership Requests</span>
              <span className="sm:hidden">Requests</span>
            </button>
            <button
              onClick={() => setActiveTab('bulk-assign')}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'bulk-assign'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <UserCog size={18} />
              <span className="hidden sm:inline">Class Assignments</span>
              <span className="sm:hidden">Class</span>
            </button>
            <button
              onClick={() => setActiveTab('audit-log')}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'audit-log'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <History size={18} />
              <span className="hidden sm:inline">Group History</span>
              <span className="sm:hidden">History</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'my-teams' && (
          <>
            {/* Search Bar */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search groups..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Teams Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 animate-pulse">
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
            className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border-2 border-dashed border-gray-300 dark:border-gray-600"
          >
            <Users size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {searchQuery ? 'No groups found' : 'No groups yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery
                ? 'Try adjusting your search query'
                : 'Create your first group to start collaborating on assignments'}
            </p>
            {!searchQuery && (
              <Button
                variant="primary"
                onClick={() => setShowCreateModal(true)}
                className="flex items-center space-x-2 mx-auto"
              >
                <Plus size={20} />
                <span>Create First Group</span>
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
                whileHover={{ y: -6, scale: 1.02 }}
                className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 group"
              >
                {/* Team Header */}
                <div
                  className="h-28 flex items-center justify-center relative bg-gradient-to-br"
                  style={{ 
                    background: `linear-gradient(135deg, ${team.avatar_color}, ${team.avatar_color}dd)` 
                  }}
                >
                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                    <Users size={28} className="text-white drop-shadow-sm" />
                  </div>
                  <button className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100 backdrop-blur-sm">
                    <MoreVertical size={16} className="text-white" />
                  </button>
                </div>

                {/* Team Info */}
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex-1">
                      {team.name}
                    </h3>
                    {team.members?.some((m: any) => m.role === 'leader' && m.user_id === user?.id) && (
                      <div className="flex items-center space-x-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full ml-2">
                        <Crown size={12} />
                        <span className="text-xs font-semibold">Group Leader</span>
                      </div>
                    )}
                  </div>
                  
                  {team.description && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">{team.description}</p>
                  )}

                  {/* Members Count */}
                  <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                    <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700/50 rounded-full px-3 py-1">
                      <Users size={14} />
                      <span className="text-sm font-medium">
                        {team.members?.length || 0} member{team.members?.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Members Avatars */}
                  {team.members && team.members.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Group Members</span>
                      <AvatarGroup
                        users={team.members.map((member: any) => ({
                          userId: member.user?.id || member.user_id || `member-${member.id}`,
                          name: member.user?.full_name || 'User',
                          src: member.user?.avatar_url
                        }))}
                        max={4}
                        size="sm"
                        className="hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex space-x-2 pt-4 border-t border-gray-100">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 flex items-center justify-center space-x-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 hover:text-gray-900 transition-all duration-200 font-medium shadow-sm"
                      onClick={() => handleViewDetails(team)}
                    >
                      <Users size={16} />
                      <span>View Details</span>
                    </Button>
                    {canAccess.instructorFeatures() && (
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200 border-0"
                        onClick={() => handleAddMember(team)}
                      >
                        <UserPlus size={16} />
                        <span>Add</span>
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
          </>
        )}

        {activeTab === 'discover' && (
          <TeamDiscovery onTeamJoined={loadTeams} />
        )}

        {activeTab === 'requests' && (
          <JoinRequestManager onRequestProcessed={loadTeams} />
        )}

        {activeTab === 'bulk-assign' && (
          <BulkTeamAssignment onAssignmentComplete={loadTeams} />
        )}

        {activeTab === 'audit-log' && (
          <TeamAuditLog />
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
              className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg mr-4">
                    <Users className="text-blue-700 dark:text-blue-400" size={24} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create Group</h2>
                </div>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setTeamName('');
                    setTeamDescription('');
                    setTeamColor('#334e68');
                    setError('');
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-800 dark:text-red-300">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g., Study Group A"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={teamDescription}
                    onChange={(e) => setTeamDescription(e.target.value)}
                    placeholder="What does this group do?"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Group Color
                  </label>
                  <div className="grid grid-cols-6 gap-3">
                    {colors.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setTeamColor(color.value)}
                        className={`w-full aspect-square rounded-lg transition-all ${
                          teamColor === color.value
                            ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-blue-400 scale-110'
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
                  {creating ? 'Creating...' : 'Create Group'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Member Modal */}
      {selectedTeam && (
        <AddMemberModal
          isOpen={showAddMemberModal}
          onClose={() => {
            setShowAddMemberModal(false);
            setSelectedTeam(null);
          }}
          teamId={selectedTeam.id}
          workspaceId={currentWorkspace.id}
          onMemberAdded={handleTeamUpdated}
        />
      )}

      {/* Team Details Modal */}
      {selectedTeam && (
        <TeamDetailsModal
          isOpen={showTeamDetailsModal}
          onClose={() => {
            setShowTeamDetailsModal(false);
            setSelectedTeam(null);
          }}
          team={selectedTeam}
          onTeamUpdated={handleTeamUpdated}
        />
      )}
    </DashboardLayout>
  );
}
