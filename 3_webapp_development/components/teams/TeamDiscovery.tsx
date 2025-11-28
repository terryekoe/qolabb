'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, 
  Search, 
  Filter, 
  UserPlus, 
  Clock, 
  CheckCircle, 
  XCircle,
  Loader2,
  Eye,
  Settings,
  Lock,
  Globe,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/Button'
import Avatar from '@/components/ui/Avatar'
import { AvatarGroup } from '@/components/ui/Avatar'
import { useAuth } from '@/lib/auth/AuthContext'
import { useWorkspace } from '@/lib/workspace/WorkspaceContext'
import { 
  getDiscoverableTeams, 
  createJoinRequest, 
  getUserJoinRequests,
  getTeamMembers 
} from '@/lib/db/queries'
import { DiscoverableTeam, TeamJoinRequest } from '@/lib/types/database'
import { toast } from 'react-hot-toast'

interface TeamDiscoveryProps {
  onTeamJoined?: () => void
}

export default function TeamDiscovery({ onTeamJoined }: TeamDiscoveryProps) {
  const { user } = useAuth()
  const { currentWorkspace } = useWorkspace()
  const [teams, setTeams] = useState<DiscoverableTeam[]>([])
  const [joinRequests, setJoinRequests] = useState<TeamJoinRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'public' | 'joinable'>('all')
  const [requestingTeam, setRequestingTeam] = useState<string | null>(null)

  useEffect(() => {
    if (currentWorkspace?.id && user?.id) {
      loadDiscoverableTeams()
      loadUserJoinRequests()
    }
  }, [currentWorkspace?.id, user?.id])

  const loadDiscoverableTeams = async () => {
    if (!currentWorkspace?.id || !user?.id) return
    
    try {
      setLoading(true)
      const discoverableTeams = await getDiscoverableTeams(currentWorkspace.id, user.id)
      setTeams(discoverableTeams || [])
    } catch (error) {
      console.error('Error loading discoverable teams:', error)
      toast.error('Failed to load teams')
    } finally {
      setLoading(false)
    }
  }

  const loadUserJoinRequests = async () => {
    if (!user?.id) return
    
    try {
      const requests = await getUserJoinRequests(user.id)
      setJoinRequests(requests || [])
    } catch (error) {
      console.error('Error loading join requests:', error)
    }
  }

  const handleJoinRequest = async (teamId: string, teamName: string) => {
    if (!user?.id) return
    
    try {
      setRequestingTeam(teamId)
      await createJoinRequest(
        teamId,
        user.id,
        user.id,
        'self_request'
      )
      
      toast.success(`Join request sent for ${teamName}`)
      await loadUserJoinRequests()
      await loadDiscoverableTeams()
    } catch (error) {
      console.error('Error creating join request:', error)
      toast.error('Failed to send join request')
    } finally {
      setRequestingTeam(null)
    }
  }

  // Filter teams based on search and filter type
  const filteredTeams = teams.filter(team => {
    const matchesSearch = (team.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         team.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'public' && team.is_public) ||
                         (filterType === 'joinable' && team.can_join)
    
    return matchesSearch && matchesFilter
  })

  const getJoinRequestStatus = (teamId: string) => {
    return joinRequests.find(req => req.team_id === teamId && req.status === 'pending')
  }

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Users size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">No Workspace Selected</h2>
          <p className="text-gray-600 dark:text-gray-400">Select a workspace to discover teams</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Discover Teams</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Find and join teams in {currentWorkspace.name}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="text-gray-400" size={20} />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'public' | 'joinable')}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Teams</option>
              <option value="public">Public Teams</option>
              <option value="joinable">Joinable Teams</option>
            </select>
          </div>
        </div>
      </div>

      {/* Teams Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 animate-pulse">
              <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
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
            {searchQuery || filterType !== 'all' ? 'No teams found' : 'No teams available'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {searchQuery || filterType !== 'all'
              ? 'Try adjusting your search or filter criteria'
              : 'There are no teams available to join at the moment'}
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              joinRequest={getJoinRequestStatus(team.id)}
              onJoinRequest={handleJoinRequest}
              isRequesting={requestingTeam === team.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface TeamCardProps {
  team: DiscoverableTeam
  joinRequest?: TeamJoinRequest
  onJoinRequest: (teamId: string, teamName: string) => void
  isRequesting: boolean
}

function TeamCard({ team, joinRequest, onJoinRequest, isRequesting }: TeamCardProps) {
  const [members, setMembers] = useState<any[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)

  useEffect(() => {
    loadTeamMembers()
  }, [team.id])

  const loadTeamMembers = async () => {
    try {
      setLoadingMembers(true)
      const teamMembers = await getTeamMembers(team.id)
      setMembers(teamMembers?.slice(0, 4) || []) // Show only first 4 members
    } catch (error) {
      console.error('Error loading team members:', error)
    } finally {
      setLoadingMembers(false)
    }
  }

  const getStatusIcon = () => {
    if (team.join_status === 'member') {
      return <CheckCircle className="w-5 h-5 text-green-500" />
    }
    if (joinRequest) {
      return <Clock className="w-5 h-5 text-yellow-500" />
    }
    if (!team.can_join) {
      return <XCircle className="w-5 h-5 text-red-500" />
    }
    return null
  }

  const getStatusText = () => {
    if (team.join_status === 'member') return 'Member'
    if (joinRequest) return 'Request Pending'
    if (!team.can_join) return 'Cannot Join'
    return null
  }

  const getActionButton = () => {
    if (team.join_status === 'member') {
      return (
        <Button
          variant="secondary"
          disabled
          className="w-full flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          Already a Member
        </Button>
      )
    }

    if (joinRequest) {
      return (
        <Button
          variant="secondary"
          disabled
          className="w-full flex items-center justify-center gap-2"
        >
          <Clock className="w-4 h-4" />
          Request Pending
        </Button>
      )
    }

    if (!team.can_join) {
      return (
        <Button
          variant="secondary"
          disabled
          className="w-full flex items-center justify-center gap-2"
        >
          <Lock className="w-4 h-4" />
          Cannot Join
        </Button>
      )
    }

    return (
      <Button
        variant="primary"
        onClick={() => onJoinRequest(team.id, team.name)}
        disabled={isRequesting}
        className="w-full flex items-center justify-center gap-2"
      >
        {isRequesting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Requesting...
          </>
        ) : (
          <>
            <UserPlus className="w-4 h-4" />
            Request to Join
          </>
        )}
      </Button>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-700 transition-all duration-200"
    >
      {/* Team Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md"
            style={{ backgroundColor: team.avatar_color }}
          >
            {team.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{team.name}</h3>
              {team.is_public ? (
                <Globe className="w-4 h-4 text-green-500" />
              ) : (
                <Lock className="w-4 h-4 text-gray-400" />
              )}
            </div>
            {getStatusText() && (
              <div className="flex items-center gap-1 mt-1">
                {getStatusIcon()}
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{getStatusText()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {team.description && (
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">{team.description}</p>
      )}

      {/* Team Settings Info */}
      {team.settings && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <Settings className="w-3 h-3" />
            <span>
              {team.settings.allow_self_join ? 'Self-join enabled' : 'Approval required'}
              {team.settings.max_members && ` • Max ${team.settings.max_members} members`}
            </span>
          </div>
        </div>
      )}

      {/* Members */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Members</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">{team.member_count}</span>
        </div>
        {loadingMembers ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
          </div>
        ) : members.length > 0 ? (
          <AvatarGroup
            users={members.map(member => ({
              userId: member.user_id,
              name: member.user.full_name,
              src: member.user.avatar_url
            }))}
            max={4}
            size="sm"
          />
        ) : (
          <div className="text-sm text-gray-500 dark:text-gray-400">No members yet</div>
        )}
      </div>

      {/* Action Button */}
      {getActionButton()}
    </motion.div>
  )
}
