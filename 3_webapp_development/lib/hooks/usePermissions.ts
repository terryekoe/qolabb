// =====================================================
// Permission Management Hook
// Provides easy access to user permissions throughout the app
// =====================================================

import React from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { 
  EnhancedUserRole, 
  Permissions, 
  getPermissions, 
  hasPermission, 
  canAccessWorkspace,
  mapLegacyRole,
  getRoleInfo
} from '@/lib/types/permissions';
import { WorkspaceMemberRole } from '@/lib/types/database';

export interface UsePermissionsReturn {
  // Current user permissions
  permissions: Permissions;
  userRole: EnhancedUserRole;
  
  // Permission checking functions
  can: (category: keyof Permissions, action: string) => boolean;
  canAccess: {
    workspace: (workspaceMemberRole?: WorkspaceMemberRole) => boolean;
    adminPanel: () => boolean;
    instructorFeatures: () => boolean;
    analytics: () => boolean;
  };
  
  // Role information
  roleInfo: {
    label: string;
    description: string;
    color: string;
    icon: string;
  };
  
  // Utility functions
  isStudent: boolean;
  isInstructor: boolean;
  isAdmin: boolean;
  isTA: boolean;
  hasDualRole: boolean;
}

/**
 * Hook for managing user permissions
 */
export function usePermissions(): UsePermissionsReturn {
  const { user, profile } = useAuth();
  
  // Map legacy role to enhanced role
  const userRole: EnhancedUserRole = profile?.role 
    ? mapLegacyRole(profile.role)
    : 'student';
  
  // Get permissions for current role
  const permissions = getPermissions(userRole);
  
  // Get role information
  const roleInfo = getRoleInfo(userRole);
  
  // Permission checking function
  const can = (category: keyof Permissions, action: string): boolean => {
    return hasPermission(userRole, category, action);
  };
  
  // Specific access checks
  const canAccess = {
    workspace: (workspaceMemberRole: WorkspaceMemberRole = 'member'): boolean => {
      return canAccessWorkspace(userRole, workspaceMemberRole);
    },
    
    adminPanel: (): boolean => {
      return userRole === 'admin';
    },
    
    instructorFeatures: (): boolean => {
      return ['instructor', 'teaching_assistant', 'both', 'admin'].includes(userRole);
    },
    
    analytics: (): boolean => {
      return can('analytics', 'view_workspace_stats') || 
             can('analytics', 'generate_reports');
    }
  };
  
  // Role type checks
  const isStudent = userRole === 'student' || userRole === 'both';
  const isInstructor = userRole === 'instructor' || userRole === 'both';
  const isAdmin = userRole === 'admin';
  const isTA = userRole === 'teaching_assistant';
  const hasDualRole = userRole === 'both';
  
  return {
    permissions,
    userRole,
    can,
    canAccess,
    roleInfo,
    isStudent,
    isInstructor,
    isAdmin,
    isTA,
    hasDualRole
  };
}

/**
 * Hook for checking specific permissions
 * Useful for conditional rendering
 */
export function usePermission(
  category: keyof Permissions, 
  action: string
): boolean {
  const { can } = usePermissions();
  return can(category, action);
}

/**
 * Hook for workspace-specific permissions
 */
export function useWorkspacePermissions(workspaceMemberRole?: WorkspaceMemberRole) {
  const { userRole, can, canAccess } = usePermissions();
  
  const workspacePermissions = {
    // Basic workspace access
    canView: canAccess.workspace(workspaceMemberRole),
    canEdit: can('workspace', 'edit_settings') && 
             (workspaceMemberRole === 'owner' || workspaceMemberRole === 'admin'),
    canDelete: can('workspace', 'delete') && workspaceMemberRole === 'owner',
    
    // Member management
    canInviteMembers: can('workspace', 'invite_members'),
    canRemoveMembers: can('workspace', 'remove_members') && 
                      (workspaceMemberRole === 'owner' || workspaceMemberRole === 'admin'),
    
    // Team management
    canCreateTeams: can('team', 'create'),
    canViewAllTeams: can('team', 'view_all_in_workspace'),
    canEditAnyTeam: can('team', 'edit_any') && 
                    (workspaceMemberRole === 'owner' || workspaceMemberRole === 'admin'),
    canDeleteAnyTeam: can('team', 'delete_any') && 
                      (workspaceMemberRole === 'owner' || workspaceMemberRole === 'admin'),
    
    // Analytics
    canViewAnalytics: can('analytics', 'view_workspace_stats'),
    canExportData: can('analytics', 'export_data'),
    canGenerateReports: can('analytics', 'generate_reports'),
    
    // Context-based permissions
    isWorkspaceOwner: workspaceMemberRole === 'owner',
    isWorkspaceAdmin: workspaceMemberRole === 'admin',
    isWorkspaceMember: workspaceMemberRole === 'member'
  };
  
  return workspacePermissions;
}

/**
 * Permission-based component wrapper
 */
export function withPermission<T extends object>(
  Component: React.ComponentType<T>,
  requiredPermission: {
    category: keyof Permissions;
    action: string;
  }
): React.ComponentType<T> {
  return function PermissionWrappedComponent(props: T) {
    const { can } = usePermissions();
    
    if (!can(requiredPermission.category, requiredPermission.action)) {
      return null;
    }
    
    return React.createElement(Component, props);
  };
}

/**
 * Role-based component wrapper
 */
export function withRole<T extends object>(
  Component: React.ComponentType<T>,
  allowedRoles: EnhancedUserRole[]
): React.ComponentType<T> {
  return function RoleWrappedComponent(props: T) {
    const { userRole } = usePermissions();
    
    if (!allowedRoles.includes(userRole)) {
      return null;
    }
    
    return React.createElement(Component, props);
  };
}