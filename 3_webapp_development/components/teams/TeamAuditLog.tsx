'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  History, 
  Search, 
  Filter,
  Calendar,
  User,
  Users,
  UserPlus,
  UserMinus,
  Crown,
  Clock,
  ChevronDown,
  ChevronRight,
  Download,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/Button'
import Avatar from '@/components/ui/Avatar'
import { useAuth } from '@/lib/auth/AuthContext'
import { useWorkspace } from '@/lib/workspace/WorkspaceContext'
import { getTeamAssignmentAudit, getWorkspaceAssignmentAudit } from '@/lib/db/queries'
import { TeamAssignmentAudit, Profile, Team } from '@/lib/types/database'
import { toast } from 'react-hot-toast'

interface TeamAuditLogProps {
  teamId?: string // Optional: filter by specific team
}

interface AuditEntryWithDetails extends TeamAssignmentAudit {
  user?: Profile
  performer?: Profile
  team?: Team
}

export default function TeamAuditLog({ teamId }: TeamAuditLogProps) {
  const { user } = useAuth()
  const { currentWorkspace } = useWorkspace()
  const [auditEntries, setAuditEntries] = useState<AuditEntryWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadAuditEntries(true)
    }
  }, [currentWorkspace?.id, teamId, actionFilter, dateFilter])

  const loadAuditEntries = async (reset = false) => {
    if (!currentWorkspace?.id) return
    
    try {
      setLoading(true)
      
      let entries: AuditEntryWithDetails[] = []
      
      if (teamId) {
        // If filtering by specific team, use getTeamAssignmentAudit
        entries = await getTeamAssignmentAudit(teamId, 50)
      } else {
        // If showing all workspace audit entries, use getWorkspaceAssignmentAudit
        entries = await getWorkspaceAssignmentAudit(currentWorkspace.id, 100)
      }
      
      // Apply additional filters if needed
      if (actionFilter !== 'all') {
        entries = entries.filter(entry => entry.action === actionFilter)
      }
      
      if (dateFilter !== 'all') {
        const now = new Date()
        let startDate: Date
        
        switch (dateFilter) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            break
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1)
            break
          default:
            startDate = new Date(0)
        }
        
        entries = entries.filter(entry => new Date(entry.created_at) >= startDate)
      }
      
      if (reset) {
        setAuditEntries(entries || [])
        setPage(2)
      } else {
        setAuditEntries(prev => [...prev, ...(entries || [])])
        setPage(prev => prev + 1)
      }
      
      setHasMore((entries || []).length === 50)
    } catch (error) {
      console.error('Error loading audit entries:', error)
      toast.error('Failed to load audit log')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    loadAuditEntries(true)
  }

  const exportAuditLog = () => {
    // Create CSV content
    const headers = ['Date', 'Actor', 'Action', 'Target User', 'Team', 'Role', 'Details']
    const csvContent = [
      headers.join(','),
      ...filteredEntries.map(entry => [
        new Date(entry.created_at).toLocaleString(),
        entry.performer?.full_name || 'Unknown',
        entry.action.replace('_', ' ').toUpperCase(),
        entry.user?.full_name || 'Unknown',
        entry.team?.name || 'Unknown',
        (entry.details && typeof entry.details === 'object' && 'role' in entry.details) ? String(entry.details.role) : '',
        entry.details ? JSON.stringify(entry.details) : ''
      ].map(field => `"${field}"`).join(','))
    ].join('\n')
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `team-audit-log-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success('Audit log exported successfully')
  }

  // Filter entries based on search query
  const filteredEntries = auditEntries.filter(entry => {
    if (!searchQuery) return true
    
    const searchLower = searchQuery.toLowerCase()
    return (
      entry.performer?.full_name?.toLowerCase().includes(searchLower) ||
      entry.user?.full_name?.toLowerCase().includes(searchLower) ||
      entry.team?.name?.toLowerCase().includes(searchLower) ||
      entry.action.toLowerCase().includes(searchLower) ||
      (entry.details && typeof entry.details === 'string' && entry.details.toLowerCase().includes(searchLower))
    )
  })

  const getActionColor = (action: string) => {
    switch (action) {
      case 'added_member':
      case 'bulk_invite':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'removed_member':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'promoted_to_leader':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'demoted_from_leader':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      default:
        return 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border-gray-200'
    }
  }

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'add_member':
      case 'bulk_invite':
        return <UserPlus className="w-4 h-4 text-green-600" />
      case 'remove_member':
        return <UserMinus className="w-4 h-4 text-red-600" />
      case 'promote_to_leader':
        return <Crown className="w-4 h-4 text-yellow-600" />
      case 'demote_to_member':
        return <User className="w-4 h-4 text-blue-600" />
      default:
        return <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
    }
  }

  const getActionVerb = (action: string) => {
    switch (action) {
      case 'added_member':
        return 'added'
      case 'removed_member':
        return 'removed'
      case 'promoted_to_leader':
        return 'promoted'
      case 'demoted_from_leader':
        return 'demoted'
      default:
        return 'performed action on'
    }
  }



  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <History size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">No Class Selected</h2>
          <p className="text-gray-600 dark:text-gray-400">Select a workspace to view audit logs</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Group Assignment Audit Log</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track all group assignment activities in {currentWorkspace.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="secondary"
            onClick={exportAuditLog}
            disabled={filteredEntries.length === 0}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by user, team, action, or details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            <Filter size={16} />
            <span>Filters</span>
            {showFilters ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700"
          >
            {/* Action Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Action Type
              </label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Actions</option>
                <option value="add_member">Add Member</option>
                <option value="remove_member">Remove Member</option>
                <option value="promote_to_leader">Promote to Leader</option>
                <option value="demote_to_member">Demote to Member</option>
                <option value="bulk_invite">Bulk Invite</option>
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Time Period
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </motion.div>
        )}
      </div>

      {/* Audit Entries */}
      {loading && auditEntries.length === 0 ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                </div>
                <div className="w-20 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredEntries.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border-2 border-dashed border-gray-300 dark:border-gray-600"
        >
          <History size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No Audit Entries Found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery || actionFilter !== 'all' || dateFilter !== 'all'
              ? 'Try adjusting your search or filter criteria'
              : 'No group assignment activities have been recorded yet'
            }
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                {/* Action Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getActionIcon(entry.action)}
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {/* Action Description */}
                      <div className="flex items-center gap-2 mb-2">
                        {getActionIcon(entry.action)}
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {formatAction(entry.action)}
                        </span>
                      </div>

                      {/* Actor and Target */}
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar
                          userId={entry.performed_by}
                          name={entry.performer?.full_name || 'Unknown'}
                          src={entry.performer?.avatar_url}
                          size="sm"
                        />
                        <span className="font-medium text-gray-900">
                          {entry.performer?.full_name || 'Unknown User'}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">{getActionVerb(entry.action)}</span>
                        <Avatar
                          userId={entry.user_id}
                          name={entry.user?.full_name || 'Unknown'}
                          src={entry.user?.avatar_url}
                          size="sm"
                        />
                        <span className="font-medium text-gray-900">
                          {entry.user?.full_name || 'Unknown User'}
                        </span>
                        {entry.action.includes('leader') && (
                          <span className="text-gray-600 dark:text-gray-400">as</span>
                        )}
                        {entry.details && typeof entry.details === 'object' && 'role' in entry.details && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            entry.details.role === 'leader' 
                              ? 'bg-yellow-100 text-yellow-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {String(entry.details.role)}
                          </span>
                        )}
                        <span className="text-gray-600 dark:text-gray-400">in</span>
                        <span className="font-medium text-gray-900">
                          {entry.team?.name || 'Unknown Team'}
                        </span>
                      </div>

                      {/* Details */}
                      {entry.details && typeof entry.details === 'object' && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {(() => {
                            const details = entry.details as any;
                            // If there's a message field, display it
                            if (details.message) {
                              return details.message;
                            }
                            // If there's a bulk_invite flag, format accordingly
                            if (details.bulk_invite) {
                              return `Bulk invitation sent${details.request_id ? ` (Request: ${details.request_id.slice(0, 8)}...)` : ''}`;
                            }
                            // For other details, format key-value pairs nicely
                            return Object.entries(details)
                              .filter(([key]) => !['request_id', 'bulk_invite'].includes(key))
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(', ') || 'No additional details';
                          })()}
                        </p>
                      )}

                      {/* Timestamp */}
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <Clock size={12} />
                        <span>{new Date(entry.created_at).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Action Badge */}
                    <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getActionColor(entry.action)}`}>
                      {formatAction(entry.action)}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Load More */}
          {hasMore && !loading && (
            <div className="text-center pt-4">
              <Button
                variant="secondary"
                onClick={() => loadAuditEntries(false)}
                className="flex items-center gap-2"
              >
                Load More Entries
              </Button>
            </div>
          )}

          {loading && auditEntries.length > 0 && (
            <div className="text-center py-4">
              <div className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Loading more entries...
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
