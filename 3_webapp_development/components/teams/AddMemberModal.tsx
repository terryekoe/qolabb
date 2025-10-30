'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, UserPlus, Search, Loader2, Users } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import { addTeamMember, getAvailableWorkspaceMembers, debugWorkspaceMembers } from '@/lib/db/queries'
import { Profile } from '@/lib/types/database'
import { toast } from 'react-hot-toast'

interface AddMemberModalProps {
  isOpen: boolean
  onClose: () => void
  teamId: string
  workspaceId: string
  onMemberAdded: () => void
}

interface WorkspaceMember {
  user_id: string
  user: Profile
}

export default function AddMemberModal({
  isOpen,
  onClose,
  teamId,
  workspaceId,
  onMemberAdded
}: AddMemberModalProps) {
  const [availableMembers, setAvailableMembers] = useState<WorkspaceMember[]>([])
  const [filteredMembers, setFilteredMembers] = useState<WorkspaceMember[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [addingMember, setAddingMember] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadAvailableMembers()
    }
  }, [isOpen, teamId, workspaceId])

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredMembers(availableMembers)
    } else {
      const filtered = availableMembers.filter(member =>
        member.user.full_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredMembers(filtered)
    }
  }, [searchQuery, availableMembers])

  const loadAvailableMembers = async () => {
    try {
      setLoading(true)
      console.log('🚀 AddMemberModal: Loading available members for team:', teamId, 'in workspace:', workspaceId)
      
      // First, debug all workspace members
      await debugWorkspaceMembers(workspaceId)
      
      // Then get available members (excluding current team members)
      const members = await getAvailableWorkspaceMembers(workspaceId, teamId)
      console.log('📥 AddMemberModal: Received members:', members)
      
      // Type assertion to handle the database response structure
      setAvailableMembers((members as any) || [])
      console.log('✅ AddMemberModal: Set available members, count:', (members as any)?.length || 0)
    } catch (error) {
      console.error('❌ AddMemberModal: Error loading available members:', error)
      toast.error('Failed to load available members')
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = async (userId: string, userName: string) => {
    try {
      setAddingMember(userId)
      await addTeamMember(teamId, userId)
      toast.success(`${userName} has been added to the team`)
      onMemberAdded()
      
      // Remove the added member from the available list
      setAvailableMembers(prev => prev.filter(member => member.user_id !== userId))
    } catch (error) {
      console.error('Error adding team member:', error)
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('already a member')) {
          toast.error(`${userName} is already a member of this team`)
        } else if (error.message.includes('duplicate key value')) {
          toast.error(`${userName} is already a member of this team`)
        } else {
          toast.error(`Failed to add ${userName}: ${error.message}`)
        }
      } else {
        toast.error('Failed to add team member')
      }
    } finally {
      setAddingMember(null)
    }
  }

  const handleClose = () => {
    setSearchQuery('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden border border-gray-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-qolabb-navy-50 to-qolabb-beige-50">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-qolabb-navy-400 to-qolabb-beige-400 rounded-xl shadow-md">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Add Team Member</h2>
                <p className="text-sm text-gray-600">Invite workspace members to join this team</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/80 rounded-xl transition-all duration-200 group"
            >
              <X className="w-5 h-5 text-gray-500 group-hover:text-gray-700" />
            </button>
          </div>

          {/* Search */}
          <div className="p-6 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search workspace members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-qolabb-navy-500 focus:border-qolabb-navy-500 transition-all duration-200 bg-gray-50 focus:bg-white"
              />
            </div>
          </div>

          {/* Members List */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-qolabb-navy-500"></div>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">No available members found</p>
                <p className="text-gray-400 text-sm mt-1">All workspace members may already be in this team</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMembers.map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gradient-to-r hover:from-qolabb-navy-50 hover:to-qolabb-beige-50 hover:border-qolabb-navy-200 transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar
                        userId={member.user_id}
                        name={member.user.full_name}
                        src={member.user.avatar_url}
                        size="lg"
                        className="shadow-md"
                      />
                      <div>
                        <p className="font-semibold text-gray-900 group-hover:text-qolabb-navy-700">{member.user.full_name}</p>
                        <p className="text-sm text-gray-500">{member.user.role || 'Member'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddMember(member.user_id, member.user.full_name)}
                      disabled={addingMember === member.user_id}
                      className="px-6 py-2.5 bg-gradient-to-r from-qolabb-navy-500 to-qolabb-navy-600 text-white rounded-xl hover:from-qolabb-navy-600 hover:to-qolabb-navy-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                      {addingMember === member.user_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserPlus className="w-4 h-4" />
                      )}
                      {addingMember === member.user_id ? 'Adding...' : 'Add'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}