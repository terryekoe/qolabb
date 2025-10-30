/**
 * Validation utilities for team assignments and data integrity
 */

import { Profile, Team, TeamMember } from '@/lib/types/database'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Validates if a user can be added to a team
 */
export function validateTeamMemberAddition(
  user: Profile,
  team: Team,
  currentMembers: TeamMember[],
  pendingRequests?: any[]
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check if user is already a member
  const isAlreadyMember = currentMembers.some(member => member.user_id === user.id)
  if (isAlreadyMember) {
    errors.push('User is already a member of this team')
  }

  // Check if user has a pending request
  const hasPendingRequest = pendingRequests?.some(
    request => request.user_id === user.id && request.status === 'pending'
  )
  if (hasPendingRequest) {
    errors.push('User already has a pending join request for this team')
  }

  // Check team capacity
  const teamSettings = team.settings as { max_members?: number } | null
  const maxMembers = teamSettings?.max_members
  if (maxMembers && currentMembers.length >= maxMembers) {
    errors.push(`Team has reached maximum capacity of ${maxMembers} members`)
  }

  // Check if adding this member would exceed capacity
  if (maxMembers && currentMembers.length + 1 > maxMembers) {
    warnings.push('Adding this member will reach team capacity limit')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validates bulk team assignment
 */
export function validateBulkTeamAssignment(
  users: Profile[],
  team: Team,
  currentMembers: TeamMember[],
  pendingRequests?: any[]
): {
  validUsers: Profile[]
  invalidUsers: { user: Profile; reasons: string[] }[]
  warnings: string[]
} {
  const validUsers: Profile[] = []
  const invalidUsers: { user: Profile; reasons: string[] }[] = []
  const warnings: string[] = []

  for (const user of users) {
    const validation = validateTeamMemberAddition(user, team, currentMembers, pendingRequests)
    
    if (validation.isValid) {
      validUsers.push(user)
    } else {
      invalidUsers.push({
        user,
        reasons: validation.errors
      })
    }

    warnings.push(...validation.warnings)
  }

  // Check if bulk assignment would exceed team capacity
  const teamSettings = team.settings as { max_members?: number } | null
  const maxMembers = teamSettings?.max_members
  if (maxMembers) {
    const totalAfterAssignment = currentMembers.length + validUsers.length
    if (totalAfterAssignment > maxMembers) {
      const excess = totalAfterAssignment - maxMembers
      warnings.push(`Bulk assignment would exceed team capacity by ${excess} members`)
      
      // Remove excess users from valid list
      validUsers.splice(maxMembers - currentMembers.length)
    }
  }

  return {
    validUsers,
    invalidUsers,
    warnings: [...new Set(warnings)] // Remove duplicates
  }
}

/**
 * Validates team settings
 */
export function validateTeamSettings(settings: Partial<Team>): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Parse settings if it's a JSON object
  const teamSettings = settings.settings as { max_members?: number } | null
  const maxMembers = teamSettings?.max_members

  if (maxMembers !== undefined) {
    if (maxMembers < 1) {
      errors.push('Team must allow at least 1 member')
    }
    if (maxMembers > 1000) {
      warnings.push('Large team size may impact performance')
    }
  }

  if (settings.name) {
    if (settings.name.length < 2) {
      errors.push('Team name must be at least 2 characters long')
    }
    if (settings.name.length > 100) {
      errors.push('Team name must be less than 100 characters')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validates workspace member limits
 */
export function validateWorkspaceMemberLimit(
  currentMemberCount: number,
  newMemberCount: number,
  workspaceLimit?: number
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (workspaceLimit) {
    const totalAfterAddition = currentMemberCount + newMemberCount
    
    if (totalAfterAddition > workspaceLimit) {
      errors.push(`Adding ${newMemberCount} members would exceed workspace limit of ${workspaceLimit}`)
    }
    
    if (totalAfterAddition > workspaceLimit * 0.9) {
      warnings.push('Workspace is approaching member limit')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Sanitizes and validates email addresses
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim().toLowerCase())
}

/**
 * Validates role assignment
 */
export function validateRoleAssignment(
  role: string,
  allowedRoles: string[] = ['member', 'leader', 'admin']
): ValidationResult {
  const errors: string[] = []
  
  if (!allowedRoles.includes(role)) {
    errors.push(`Invalid role: ${role}. Allowed roles: ${allowedRoles.join(', ')}`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: []
  }
}