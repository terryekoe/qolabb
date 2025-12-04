'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Users, Crown, UserMinus, Settings, Loader2, AlertTriangle, Calendar, MapPin, MessageSquare, Lock } from 'lucide-react'
import { Button } from '@/components/Button'
import Avatar from '@/components/ui/Avatar'
import { getTeamMembers, removeTeamMember, updateTeamMemberRole, isTeamLeaderOrInstructor } from '@/lib/db/queries'
import { TeamMember, Profile } from '@/lib/types/database'
import { toast } from 'react-hot-toast'
import { useAuth } from '@/lib/auth/AuthContext'
import { TeamChat } from '@/components/communication/TeamChat'

interface TeamDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  team: {
    id: string
    name: string
    description?: string
    workspace_id: string
  }
  onTeamUpdated: () => void
}

interface TeamMemberWithProfile extends TeamMember {
  user: Profile
}

export default function TeamDetailsModal({
  isOpen,
  onClose,
  team,
  onTeamUpdated
}: TeamDetailsModalProps) {
  const { user } = useAuth()
  const [members, setMembers] = useState<TeamMemberWithProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [removingMember, setRemovingMember] = useState<string | null>(null)
  const [updatingRole, setUpdatingRole] = useState<string | null>(null)
  const [canManageTeam, setCanManageTeam] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'members' | 'chat'>('members')

  useEffect(() => {
    if (isOpen && team.id) {
      loadTeamMembers()
      checkPermissions()
    }
  }, [isOpen, team.id, user?.id])

  const loadTeamMembers = async () => {
    try {
      setLoading(true)
      const teamMembers = await getTeamMembers(team.id)
      setMembers(teamMembers || [])
    } catch (error) {
      console.error('Error loading team members:', error)
      toast.error('Failed to load team members')
    } finally {
      setLoading(false)
    }
  }

  const checkPermissions = async () => {
    if (!user?.id) return
    
    try {
      const canManage = await isTeamLeaderOrInstructor(user.id, team.id, team.workspace_id)
      setCanManageTeam(canManage)
    } catch (error) {
      console.error('Error checking permissions:', error)
    }
  }

  const handleRemoveMember = async (userId: string, userName: string) => {
    try {
      setRemovingMember(userId)
      await removeTeamMember(team.id, userId)
      toast.success(`${userName} has been removed from the team`)
      setMembers(prev => prev.filter(member => member.user_id !== userId))
      setShowRemoveConfirm(null)
      onTeamUpdated()
    } catch (error) {
      console.error('Error removing team member:', error)
      toast.error('Failed to remove team member')
    } finally {
      setRemovingMember(null)
    }
  }

  const handleRoleChange = async (userId: string, newRole: 'leader' | 'member', userName: string) => {
    try {
      setUpdatingRole(userId)
      await updateTeamMemberRole(team.id, userId, newRole)
      toast.success(`${userName} is now a team ${newRole}`)
      setMembers(prev => prev.map(member => 
        member.user_id === userId ? { ...member, role: newRole } : member
      ))
      onTeamUpdated()
    } catch (error) {
      console.error('Error updating member role:', error)
      toast.error('Failed to update member role')
    } finally {
      setUpdatingRole(null)
    }
  }

  const leaders = members.filter(member => member.role === 'leader')
  const regularMembers = members.filter(member => member.role === 'member')

  const isMember = members.some(m => m.user_id === user?.id)
  const hasChatAccess = isMember || canManageTeam

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-qolabb-beige-50 dark:from-blue-900/20 dark:to-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-400 to-qolabb-beige-400 rounded-xl shadow-md">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{team.name}</h2>
                {team.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{team.description}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/80 dark:hover:bg-gray-700/80 rounded-xl transition-all duration-200 group"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <button
              onClick={() => setActiveTab('members')}
              className={`flex-1 px-4 py-3 font-medium text-sm transition-colors ${
                activeTab === 'members'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Users size={18} />
                <span>Members</span>
              </div>
            </button>
            <button
              onClick={() => hasChatAccess && setActiveTab('chat')}
              disabled={!hasChatAccess}
              title={!hasChatAccess ? "Join group to access chat" : ""}
              className={`flex-1 px-4 py-3 font-medium text-sm transition-colors ${
                activeTab === 'chat'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : !hasChatAccess
                    ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-60'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <MessageSquare size={18} />
                <span>Chat</span>
                {!hasChatAccess && <Lock size={14} className="ml-1" />}
              </div>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col bg-gray-50/50 dark:bg-gray-900/50">
            {activeTab === 'members' ? (
              <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-3" />
                      <span className="text-gray-600 dark:text-gray-400 font-medium">Loading team members...</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                {/* Group Leaders */}
                {leaders.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg shadow-sm">
                        <Crown className="w-5 h-5 text-white" />
                      </div>
                      Group Leaders ({leaders.length})
                    </h3>
                    <div className="grid gap-3">
                      {leaders.map((member) => (
                        <MemberCard
                          key={member.user_id}
                          member={member}
                          canManageTeam={canManageTeam}
                          currentUserId={user?.id}
                          onRemove={() => setShowRemoveConfirm(member.user_id)}
                          onRoleChange={handleRoleChange}
                          removingMember={removingMember}
                          updatingRole={updatingRole}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Team Members */}
                {regularMembers.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-blue-400 to-qolabb-beige-400 rounded-lg shadow-sm">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      Members ({regularMembers.length})
                    </h3>
                    <div className="grid gap-3">
                      {regularMembers.map((member) => (
                        <MemberCard
                          key={member.user_id}
                          member={member}
                          canManageTeam={canManageTeam}
                          currentUserId={user?.id}
                          onRemove={() => setShowRemoveConfirm(member.user_id)}
                          onRoleChange={handleRoleChange}
                          removingMember={removingMember}
                          updatingRole={updatingRole}
                        />
                      ))}
                    </div>
                  </div>
                )}

                  </div>
                )}

                {members.length === 0 && (
                  <div className="text-center py-12">
                    <div className="p-4 bg-gray-200 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                      <Users className="w-10 h-10 text-gray-400" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 font-medium text-lg">No team members found</p>
                    <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">Add members to get started</p>
                  </div>
                )}

                {/* No Leaders - Volunteer Option */}
                {leaders.length === 0 && members.length > 0 && (
                  <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 text-center">
                    <div className="p-3 bg-blue-100 dark:bg-blue-800 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Crown className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">No Group Leader Selected</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                      This group needs a leader to manage tasks and submit the final project. Discuss with your team and select a leader.
                    </p>
                    
                    {!canManageTeam && user?.id && (
                      <button
                        onClick={() => handleRoleChange(user.id, 'leader', 'Yourself')}
                        disabled={updatingRole === user.id}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-sm transition-all hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
                      >
                        {updatingRole === user.id ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Crown className="w-5 h-5" />
                            Volunteer as Leader
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 overflow-hidden">
                {user?.id && hasChatAccess ? (
                  <TeamChat teamId={team.id} userId={user.id} />
                ) : (
                  <div className="flex items-center justify-center h-full flex-col gap-3">
                    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full">
                      <Lock className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 font-medium">
                      {user?.id ? 'Join this group to view the chat' : 'Please log in to view chat'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Remove Confirmation Modal */}
          {showRemoveConfirm && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center rounded-2xl">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 m-4 max-w-sm w-full shadow-2xl border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl">
                    <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Remove Member</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                  Are you sure you want to remove this member from the team? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowRemoveConfirm(null)}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const member = members.find(m => m.user_id === showRemoveConfirm)
                      if (member) {
                        handleRemoveMember(member.user_id, member.user.full_name)
                      }
                    }}
                    disabled={removingMember === showRemoveConfirm}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-all duration-200 font-medium shadow-sm"
                  >
                    {removingMember === showRemoveConfirm ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

interface MemberCardProps {
  member: TeamMemberWithProfile
  canManageTeam: boolean
  currentUserId?: string
  onRemove: () => void
  onRoleChange: (userId: string, newRole: 'leader' | 'member', userName: string) => void
  removingMember: string | null
  updatingRole: string | null
}

function MemberCard({
  member,
  canManageTeam,
  currentUserId,
  onRemove,
  onRoleChange,
  removingMember,
  updatingRole
}: MemberCardProps) {
  const isCurrentUser = member.user_id === currentUserId
  const canModify = canManageTeam && !isCurrentUser

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md hover:border-blue-200 transition-all duration-200"
    >
      <div className="flex items-center gap-4">
        <Avatar
          userId={member.user_id}
          name={member.user.full_name}
          src={member.user.avatar_url}
          size="lg"
          square
          className="shadow-sm"
        />
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-gray-900">{member.user.full_name}</p>
            {member.role === 'leader' && (
              <div className="p-1 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-md">
                <Crown className="w-3 h-3 text-white" />
              </div>
            )}
            {isCurrentUser && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">You</span>
            )}
          </div>
          <p className="text-sm text-gray-600">{member.role === 'leader' ? 'Group Leader' : 'Group Member'}</p>
          {member.user.institution && (
            <p className="text-xs text-gray-500 mt-1">{member.user.institution}</p>
          )}
        </div>
      </div>

      {canModify && (
        <div className="flex items-center gap-3">
          <select
            value={member.role}
            onChange={(e) => onRoleChange(member.user_id, e.target.value as 'leader' | 'member', member.user.full_name)}
            disabled={updatingRole === member.user_id}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
          >
            <option value="member">Member</option>
            <option value="leader">Leader</option>
          </select>
          <button
            onClick={onRemove}
            disabled={removingMember === member.user_id}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 disabled:opacity-50 hover:shadow-sm"
            title="Remove member"
          >
            {removingMember === member.user_id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserMinus className="w-4 h-4" />
            )}
          </button>
        </div>
      )}
    </motion.div>
  )
}
