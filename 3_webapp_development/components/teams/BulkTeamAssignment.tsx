'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter,
  Check,
  X,
  Crown,
  Loader2,
  Upload,
  Download,
  AlertCircle,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/Button'
import Avatar from '@/components/ui/Avatar'
import { useAuth } from '@/lib/auth/AuthContext'
import { useWorkspace } from '@/lib/workspace/WorkspaceContext'
import { 
  getWorkspaceMembers,
  getWorkspaceTeams,
  bulkInviteToTeam,
  bulkAddTeamMembers,
  addTeamMember,
  getTeamMembers
} from '@/lib/db/queries'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { Profile, Team, TeamMember } from '@/lib/types/database'
import { toast } from 'react-hot-toast'

interface BulkTeamAssignmentProps {
  onAssignmentComplete?: () => void
}

interface WorkspaceMemberWithTeams extends Profile {
  current_teams: string[]
  team_roles: { [teamId: string]: 'leader' | 'member' }
}

export default function BulkTeamAssignment({ onAssignmentComplete }: BulkTeamAssignmentProps) {
  const { user } = useAuth()
  const { currentWorkspace } = useWorkspace()
  const { canAccess, isInstructor } = usePermissions()
  const [members, setMembers] = useState<WorkspaceMemberWithTeams[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [selectedTeam, setSelectedTeam] = useState<string>('')
  const [assignmentRole, setAssignmentRole] = useState<'member' | 'leader'>('member')
  const [processing, setProcessing] = useState(false)
  const [showTeamFilter, setShowTeamFilter] = useState(false)
  const [teamFilter, setTeamFilter] = useState<string>('all')

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadData()
    }
  }, [currentWorkspace?.id])

  const loadData = async () => {
    if (!currentWorkspace?.id) return
    
    try {
      setLoading(true)
      const [workspaceMembers, workspaceTeams] = await Promise.all([
        getWorkspaceMembers(currentWorkspace.id),
        getWorkspaceTeams(currentWorkspace.id)
      ])

      // Enhance members with their current team information
      // Transform workspace members to match expected format
      const enhancedMembersResults = await Promise.all(
        (workspaceMembers || []).map(async (member: any): Promise<WorkspaceMemberWithTeams | null> => {
          // Extract profile data - handle both nested user and direct profile
          // Handle case where user might be an array (Supabase sometimes returns arrays)
          let profile = member.user || member;
          if (Array.isArray(profile)) {
            profile = profile[0] || member;
          }
          const memberId = member.user_id || member.id || profile?.id;
          
          const memberTeams: string[] = []
          const teamRoles: { [teamId: string]: 'leader' | 'member' } = {}
          
          // Get team memberships for each member
          for (const team of workspaceTeams || []) {
            try {
              const teamMembers = await getTeamMembers(team.id)
              const membership = teamMembers?.find(tm => tm.user_id === memberId)
              if (membership) {
                memberTeams.push(team.id)
                teamRoles[team.id] = membership.role
              }
            } catch (error) {
              console.error(`Error loading team members for team ${team.id}:`, error)
            }
          }
          
          // Ensure we have at least a valid ID and name
          if (!memberId || !profile) {
            console.warn('Skipping member with invalid data:', member)
            return null
          }
          
          return {
            id: memberId,
            full_name: profile?.full_name || profile?.fullName || 'Unknown User',
            avatar_url: profile?.avatar_url || profile?.avatarUrl || null,
            email: profile?.email || member.email || '',
            institution: profile?.institution || '',
            role: profile?.role || member.role || 'member',
            current_teams: memberTeams,
            team_roles: teamRoles
          } as WorkspaceMemberWithTeams
        })
      )

      // Filter out any null members that couldn't be processed
      const validMembers: WorkspaceMemberWithTeams[] = enhancedMembersResults
        .filter((m): m is WorkspaceMemberWithTeams => {
          if (!m) return false
          // Ensure all required properties exist
          if (!m.id || !m.full_name) {
            console.warn('Filtering out invalid member:', m)
            return false
          }
          return true
        })

      setMembers(validMembers)
      setTeams(workspaceTeams || [])
    } catch (error: any) {
      console.error('Error loading data:', error)
      const errorMessage = error?.message || 'Failed to load workspace data'
      toast.error(errorMessage)
      // Set empty arrays on error to prevent rendering issues
      setMembers([])
      setTeams([])
    } finally {
      setLoading(false)
    }
  }

  const handleBulkAssignment = async () => {
    if (!selectedTeam || selectedMembers.size === 0 || !user?.id) {
      toast.error('Please select a team and at least one member')
      return
    }

    try {
      setProcessing(true)
      const memberIds = Array.from(selectedMembers)
      
      // Check if user is instructor/admin - they can directly assign, others must invite
      const canDirectlyAssign = canAccess.instructorFeatures() || isInstructor
      
      // Check if any selected members are instructors - if so, use invitations for collaboration
      const selectedMemberProfiles = members.filter(m => memberIds.includes(m.id))
      const hasInstructors = selectedMemberProfiles.some(m => 
        m.role?.toLowerCase() === 'instructor' || 
        m.role?.toLowerCase() === 'both' ||
        m.role?.toLowerCase() === 'teaching_assistant'
      )
      
      let result
      if (canDirectlyAssign && !hasInstructors) {
        // Direct assignment for instructors/admins when assigning students
        result = await bulkAddTeamMembers(selectedTeam, memberIds, assignmentRole, user.id)
        
        // Handle validation results
        if (result.successful.length > 0) {
          toast.success(`Successfully assigned ${result.successful.length} members to the team`)
        }
        
        if (result.skipped > 0) {
          toast.error(`${result.skipped} members were skipped (already members)`, { duration: 6000 })
        }
      } else {
        // Invitation/join request for:
        // 1. Regular users
        // 2. Instructors assigning other instructors (for collaboration)
        // Note: Role will be set when the invitation is approved
        const invitationMessage = `Join as ${assignmentRole === 'leader' ? 'team leader' : 'member'}`
        result = await bulkInviteToTeam(selectedTeam, memberIds, user.id, invitationMessage)
        
        // Handle validation results
        if (result.successful.length > 0) {
          const message = hasInstructors 
            ? `Successfully sent join requests to ${result.successful.length} members (including instructors)`
            : `Successfully invited ${result.successful.length} members to the team`
          toast.success(message)
        }
        
        if (result.skipped > 0) {
          toast.error(`${result.skipped} invitations were skipped (already members or pending requests)`, { duration: 6000 })
        }
      }
      
      if (result.successful.length === 0 && result.skipped > 0) {
        toast.error('No valid assignments/invitations could be sent')
      }
      
      // Clear selections and reload data
      setSelectedMembers(new Set())
      setSelectedTeam('')
      await loadData()
      
      if (onAssignmentComplete) {
        onAssignmentComplete()
      }
    } catch (error: any) {
      console.error('Error in bulk assignment:', error)
      toast.error(error?.message || 'Failed to assign members to team')
    } finally {
      setProcessing(false)
    }
  }

  const toggleMemberSelection = (memberId: string) => {
    const newSelection = new Set(selectedMembers)
    if (newSelection.has(memberId)) {
      newSelection.delete(memberId)
    } else {
      newSelection.add(memberId)
    }
    setSelectedMembers(newSelection)
  }

  const selectAllVisible = () => {
    const visibleMemberIds = filteredMembers.map(m => m.id)
    setSelectedMembers(new Set(visibleMemberIds))
  }

  const clearSelection = () => {
    setSelectedMembers(new Set())
  }

  // Filter members based on search and team filter
  const filteredMembers = members.filter(member => {
    // Safety check: filter out any invalid members
    if (!member || !member.id || !member.full_name) {
      return false
    }
    
    const matchesSearch = (member.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (member.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (member.institution || '').toLowerCase().includes(searchQuery.toLowerCase())
    
    if (!matchesSearch) return false
    
    if (teamFilter === 'all') return true
    const currentTeams = member?.current_teams ?? []
    
    if (teamFilter === 'unassigned') return currentTeams.length === 0
    if (teamFilter === 'assigned') return currentTeams.length > 0
    
    // Specific team filter
    return currentTeams.includes(teamFilter)
  })

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Users size={64} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Workspace Selected</h2>
          <p className="text-gray-600">Select a workspace to manage team assignments</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bulk Team Assignment</h2>
          <p className="text-gray-600 mt-1">
            Efficiently assign multiple members to teams in {currentWorkspace.name}
          </p>
        </div>
        {selectedMembers.size > 0 && (
          <div className="flex items-center gap-2 px-3 py-1 bg-qolabb-navy-100 text-qolabb-navy-800 rounded-full text-sm font-medium">
            <Users className="w-4 h-4" />
            {selectedMembers.size} selected
          </div>
        )}
      </div>

      {/* Assignment Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Assignment Settings</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Team Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Team
            </label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500 focus:border-transparent"
            >
              <option value="">Select a team...</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assignment Role
            </label>
            <select
              value={assignmentRole}
              onChange={(e) => setAssignmentRole(e.target.value as 'member' | 'leader')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500 focus:border-transparent"
            >
              <option value="member">Member</option>
              <option value="leader">Leader</option>
            </select>
          </div>

          {/* Action Button */}
          <div className="flex items-end">
            <Button
              variant="primary"
              onClick={handleBulkAssignment}
              disabled={!selectedTeam || selectedMembers.size === 0 || processing}
              className="w-full flex items-center justify-center gap-2"
            >
              {processing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              Assign {selectedMembers.size > 0 ? `${selectedMembers.size} ` : ''}Members
            </Button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search members by name, email, or institution..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Team Filter */}
          <div className="relative">
            <button
              onClick={() => setShowTeamFilter(!showTeamFilter)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter size={16} />
              <span>Filter by Team</span>
              {showTeamFilter ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            
            {showTeamFilter && (
              <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[200px]">
                <div className="p-2 space-y-1">
                  <button
                    onClick={() => { setTeamFilter('all'); setShowTeamFilter(false) }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      teamFilter === 'all' ? 'bg-qolabb-navy-50 text-qolabb-navy-700' : 'hover:bg-gray-50'
                    }`}
                  >
                    All Members
                  </button>
                  <button
                    onClick={() => { setTeamFilter('unassigned'); setShowTeamFilter(false) }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      teamFilter === 'unassigned' ? 'bg-qolabb-navy-50 text-qolabb-navy-700' : 'hover:bg-gray-50'
                    }`}
                  >
                    Unassigned Members
                  </button>
                  <button
                    onClick={() => { setTeamFilter('assigned'); setShowTeamFilter(false) }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      teamFilter === 'assigned' ? 'bg-qolabb-navy-50 text-qolabb-navy-700' : 'hover:bg-gray-50'
                    }`}
                  >
                    Assigned Members
                  </button>
                  <hr className="my-1" />
                  {teams.map(team => (
                    <button
                      key={team.id}
                      onClick={() => { setTeamFilter(team.id); setShowTeamFilter(false) }}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        teamFilter === team.id ? 'bg-qolabb-navy-50 text-qolabb-navy-700' : 'hover:bg-gray-50'
                      }`}
                    >
                      {team.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Selection Controls */}
        {filteredMembers.length > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <div className="flex items-center gap-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={selectAllVisible}
                className="flex items-center gap-2"
              >
                <Check size={16} />
                Select All ({filteredMembers.length})
              </Button>
              {selectedMembers.size > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={clearSelection}
                  className="flex items-center gap-2"
                >
                  <X size={16} />
                  Clear Selection
                </Button>
              )}
            </div>
            <p className="text-sm text-gray-600">
              {filteredMembers.length} members shown
            </p>
          </div>
        )}
      </div>

      {/* Members List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-gray-200 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
                <div className="w-6 h-6 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredMembers.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-12 text-center border-2 border-dashed border-gray-300"
        >
          <Users size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Members Found</h3>
          <p className="text-gray-600">
            {searchQuery || teamFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'No members available in this workspace'
            }
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filteredMembers
            .filter((member): member is WorkspaceMemberWithTeams => {
              if (!member) return false
              if (typeof member !== 'object') return false
              if (!('id' in member) || !member.id) return false
              if (!('full_name' in member) || !member.full_name) return false
              return true
            })
            .map((member, index) => {
              // Double-check before rendering
              if (!member || !member.id || !member.full_name) {
                return null
              }
              try {
                return (
                  <MemberCard
                    key={member.id}
                    member={member}
                    teams={teams}
                    isSelected={selectedMembers.has(member.id)}
                    onToggleSelection={() => toggleMemberSelection(member.id)}
                    index={index}
                  />
                )
              } catch (error) {
                console.error('Error rendering MemberCard:', error, member)
                return null
              }
            })
            .filter(Boolean)}
        </div>
      )}
    </div>
  )
}

interface MemberCardProps {
  member: WorkspaceMemberWithTeams
  teams: Team[]
  isSelected: boolean
  onToggleSelection: () => void
  index: number
}

function MemberCard({ member, teams, isSelected, onToggleSelection, index }: MemberCardProps) {
  // Early return with comprehensive null checks
  if (!member || typeof member !== 'object') {
    return null
  }
  
  // Check for required properties
  const memberId = member.id
  if (!memberId) {
    return null
  }

  // Safely extract all values with explicit null checks
  const fullName = (member && member.full_name) ? member.full_name : 'Unknown User'
  const email = (member && member.email) ? member.email : 'No email'
  // Role can be various string values, so we cast it as string for flexibility
  const role = (member && member.role) ? String(member.role) : 'member'
  const avatarUrl = (member && member.avatar_url) ? member.avatar_url : null
  const institution = (member && member.institution) ? member.institution : null
  const currentTeams = (member && Array.isArray(member.current_teams)) ? member.current_teams : []
  const teamRoles = (member && member.team_roles && typeof member.team_roles === 'object') ? member.team_roles : {}

  const memberTeams = teams.filter(team => currentTeams.includes(team.id))

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className={`bg-white rounded-xl border p-4 transition-all duration-200 cursor-pointer hover:shadow-md ${
        isSelected 
          ? 'border-qolabb-navy-300 bg-qolabb-navy-50' 
          : 'border-gray-200 hover:border-qolabb-navy-200'
      }`}
      onClick={onToggleSelection}
    >
      <div className="flex items-center gap-4">
        {/* Selection Checkbox */}
        <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
          isSelected 
            ? 'bg-qolabb-navy-500 border-qolabb-navy-500' 
            : 'border-gray-300 hover:border-qolabb-navy-400'
        }`}>
          {isSelected && <Check size={16} className="text-white" />}
        </div>

        {/* Member Avatar */}
        <Avatar
          userId={memberId}
          name={fullName}
          src={avatarUrl}
          size="md"
          square
          className="shadow-sm"
        />

        {/* Member Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 truncate">
              {fullName}
            </h3>
            {(role.toLowerCase() === 'instructor' || role.toLowerCase() === 'teaching_assistant') && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                <Crown size={10} />
                {role.toLowerCase() === 'instructor' ? 'Instructor' : 'TA'}
              </div>
            )}
          </div>
          <p className="text-sm text-gray-600 truncate">{email}</p>
          {institution && (
            <p className="text-xs text-gray-500 truncate">{institution}</p>
          )}
        </div>

        {/* Current Teams */}
        <div className="flex flex-col items-end gap-1">
          {memberTeams.length > 0 ? (
            <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
              {memberTeams.slice(0, 2).map(team => (
                <div
                  key={team.id}
                  className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs"
                >
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: team.avatar_color }}
                  />
                  <span className="truncate max-w-[80px]">{team.name}</span>
                  {teamRoles[team.id] === 'leader' && (
                    <Crown size={10} className="text-yellow-600" />
                  )}
                </div>
              ))}
              {memberTeams.length > 2 && (
                <div className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                  +{memberTeams.length - 2}
                </div>
              )}
            </div>
          ) : (
            <div className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
              Unassigned
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
