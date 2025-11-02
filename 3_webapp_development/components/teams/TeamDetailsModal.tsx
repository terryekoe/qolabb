'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Users, Crown, UserMinus, Settings, Loader2, AlertTriangle, Calendar, MapPin } from 'lucide-react'
import { Button } from '@/components/Button'
import Avatar from '@/components/ui/Avatar'
import { getTeamMembers, removeTeamMember, updateTeamMemberRole, isTeamLeaderOrInstructor } from '@/lib/db/queries'
import { TeamMember, Profile } from '@/lib/types/database'
import { toast } from 'react-hot-toast'
import { useAuth } from '@/lib/auth/AuthContext'

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
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-qolabb-beige-50">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-400 to-qolabb-beige-400 rounded-xl shadow-md">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{team.name}</h2>
                {team.description && (
                  <p className="text-sm text-gray-600 mt-1">{team.description}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/80 rounded-xl transition-all duration-200 group"
            >
              <X className="w-5 h-5 text-gray-500 group-hover:text-gray-700" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-3" />
                  <span className="text-gray-600 font-medium">Loading team members...</span>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Team Leaders */}
                {leaders.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg shadow-sm">
                        <Crown className="w-5 h-5 text-white" />
                      </div>
                      Team Leaders ({leaders.length})
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
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-3">
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

                {members.length === 0 && (
                  <div className="text-center py-12">
                    <div className="p-4 bg-gray-200 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                      <Users className="w-10 h-10 text-gray-400" />
                    </div>
                    <p className="text-gray-600 font-medium text-lg">No team members found</p>
                    <p className="text-gray-500 text-sm mt-1">Add members to get started</p>
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
                className="bg-white rounded-2xl p-6 m-4 max-w-sm w-full shadow-2xl border border-gray-200"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 rounded-xl">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Remove Member</h3>
                </div>
                <p className="text-gray-600 mb-6 leading-relaxed">
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
          <p className="text-sm text-gray-600">{member.role === 'leader' ? 'Team Leader' : 'Team Member'}</p>
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
