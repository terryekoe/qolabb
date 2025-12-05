// =====================================================
// Role-Based Access Control (RBAC) System
// Comprehensive permissions for Qolabb platform
// =====================================================

import { UserRole, WorkspaceMemberRole } from './database';

// =====================================================
// ENHANCED USER ROLES
// =====================================================

export type EnhancedUserRole =
  | 'student' // Regular student user
  | 'instructor' // Course instructor/professor
  | 'teaching_assistant' // TA with limited instructor privileges
  | 'admin' // Platform administrator
  | 'both'; // Student who can also instruct

// =====================================================
// PERMISSION CATEGORIES
// =====================================================

export interface Permissions {
  // Profile & Account
  profile: {
    view_own: boolean;
    edit_own: boolean;
    view_others: boolean;
    edit_others: boolean;
  };

  // Workspace Management
  workspace: {
    create: boolean;
    view_all: boolean;
    edit_settings: boolean;
    delete: boolean;
    invite_members: boolean;
    remove_members: boolean;
    view_analytics: boolean;
  };

  // Team Management
  team: {
    create: boolean;
    join: boolean;
    view_all_in_workspace: boolean;
    edit_any: boolean;
    delete_any: boolean;
    assign_members: boolean;
    view_team_analytics: boolean;
  };

  // Project Management
  project: {
    create: boolean;
    view_all_in_workspace: boolean;
    edit_any: boolean;
    delete_any: boolean;
    assign_tasks: boolean;
    view_project_analytics: boolean;
  };

  // Task Management
  task: {
    create: boolean;
    view_all_in_project: boolean;
    edit_any: boolean;
    delete_any: boolean;
    assign_to_others: boolean;
  };

  // Contributions & Logging
  contribution: {
    log_own: boolean;
    view_all_in_team: boolean;
    edit_any: boolean;
    delete_any: boolean;
    approve_submissions: boolean;
  };

  // Analytics & Reporting
  analytics: {
    view_own_stats: boolean;
    view_team_stats: boolean;
    view_workspace_stats: boolean;
    export_data: boolean;
    generate_reports: boolean;
  };

  // Administrative
  admin: {
    manage_users: boolean;
    view_system_logs: boolean;
    manage_platform_settings: boolean;
    access_all_workspaces: boolean;
  };
}

// =====================================================
// ROLE-BASED PERMISSION DEFINITIONS
// =====================================================

export const ROLE_PERMISSIONS: Record<EnhancedUserRole, Permissions> = {
  student: {
    profile: {
      view_own: true,
      edit_own: true,
      view_others: true, // Can see team member profiles
      edit_others: false,
    },
    workspace: {
      create: false,
      view_all: false,
      edit_settings: false,
      delete: false,
      invite_members: false,
      remove_members: false,
      view_analytics: false,
    },
    team: {
      create: true, // Students can create study groups
      join: true,
      view_all_in_workspace: false, // Only see their teams
      edit_any: false,
      delete_any: false,
      assign_members: false,
      view_team_analytics: true, // Can see their team's progress
    },
    project: {
      create: true, // Within their teams
      view_all_in_workspace: false,
      edit_any: false,
      delete_any: false,
      assign_tasks: false,
      view_project_analytics: true, // Their projects only
    },
    task: {
      create: true,
      view_all_in_project: true,
      edit_any: false, // Only their own tasks
      delete_any: false,
      assign_to_others: false,
    },
    contribution: {
      log_own: true,
      view_all_in_team: true,
      edit_any: false, // Only their own
      delete_any: false,
      approve_submissions: false,
    },
    analytics: {
      view_own_stats: true,
      view_team_stats: true, // Their teams only
      view_workspace_stats: false,
      export_data: false,
      generate_reports: false,
    },
    admin: {
      manage_users: false,
      view_system_logs: false,
      manage_platform_settings: false,
      access_all_workspaces: false,
    },
  },

  instructor: {
    profile: {
      view_own: true,
      edit_own: true,
      view_others: true,
      edit_others: false,
    },
    workspace: {
      create: true, // Can create course workspaces
      view_all: true, // Their workspaces
      edit_settings: true,
      delete: true,
      invite_members: true,
      remove_members: true,
      view_analytics: true,
    },
    team: {
      create: true,
      join: true,
      view_all_in_workspace: true, // All teams in their courses
      edit_any: true,
      delete_any: true,
      assign_members: true,
      view_team_analytics: true,
    },
    project: {
      create: true,
      view_all_in_workspace: true,
      edit_any: true,
      delete_any: true,
      assign_tasks: true,
      view_project_analytics: true,
    },
    task: {
      create: true,
      view_all_in_project: true,
      edit_any: true,
      delete_any: true,
      assign_to_others: true,
    },
    contribution: {
      log_own: true,
      view_all_in_team: true,
      edit_any: true, // Can moderate contributions
      delete_any: true,
      approve_submissions: true,
    },
    analytics: {
      view_own_stats: true,
      view_team_stats: true,
      view_workspace_stats: true,
      export_data: true,
      generate_reports: true,
    },
    admin: {
      manage_users: false,
      view_system_logs: false,
      manage_platform_settings: false,
      access_all_workspaces: false,
    },
  },

  teaching_assistant: {
    profile: {
      view_own: true,
      edit_own: true,
      view_others: true,
      edit_others: false,
    },
    workspace: {
      create: false,
      view_all: false, // Only assigned workspaces
      edit_settings: false,
      delete: false,
      invite_members: true, // Limited invitation rights
      remove_members: false,
      view_analytics: true,
    },
    team: {
      create: true,
      join: true,
      view_all_in_workspace: true,
      edit_any: true, // Limited editing
      delete_any: false,
      assign_members: true,
      view_team_analytics: true,
    },
    project: {
      create: true,
      view_all_in_workspace: true,
      edit_any: true,
      delete_any: false,
      assign_tasks: true,
      view_project_analytics: true,
    },
    task: {
      create: true,
      view_all_in_project: true,
      edit_any: true,
      delete_any: false,
      assign_to_others: true,
    },
    contribution: {
      log_own: true,
      view_all_in_team: true,
      edit_any: false, // Cannot edit others' contributions
      delete_any: false,
      approve_submissions: true,
    },
    analytics: {
      view_own_stats: true,
      view_team_stats: true,
      view_workspace_stats: true,
      export_data: false,
      generate_reports: false,
    },
    admin: {
      manage_users: false,
      view_system_logs: false,
      manage_platform_settings: false,
      access_all_workspaces: false,
    },
  },

  admin: {
    profile: {
      view_own: true,
      edit_own: true,
      view_others: true,
      edit_others: true,
    },
    workspace: {
      create: true,
      view_all: true,
      edit_settings: true,
      delete: true,
      invite_members: true,
      remove_members: true,
      view_analytics: true,
    },
    team: {
      create: true,
      join: true,
      view_all_in_workspace: true,
      edit_any: true,
      delete_any: true,
      assign_members: true,
      view_team_analytics: true,
    },
    project: {
      create: true,
      view_all_in_workspace: true,
      edit_any: true,
      delete_any: true,
      assign_tasks: true,
      view_project_analytics: true,
    },
    task: {
      create: true,
      view_all_in_project: true,
      edit_any: true,
      delete_any: true,
      assign_to_others: true,
    },
    contribution: {
      log_own: true,
      view_all_in_team: true,
      edit_any: true,
      delete_any: true,
      approve_submissions: true,
    },
    analytics: {
      view_own_stats: true,
      view_team_stats: true,
      view_workspace_stats: true,
      export_data: true,
      generate_reports: true,
    },
    admin: {
      manage_users: true,
      view_system_logs: true,
      manage_platform_settings: true,
      access_all_workspaces: true,
    },
  },

  both: {
    // Inherits student permissions + limited instructor capabilities
    profile: {
      view_own: true,
      edit_own: true,
      view_others: true,
      edit_others: false,
    },
    workspace: {
      create: true, // Can create workspaces when acting as instructor
      view_all: false,
      edit_settings: true, // Only for workspaces they own
      delete: true, // Only their own
      invite_members: true,
      remove_members: true,
      view_analytics: true,
    },
    team: {
      create: true,
      join: true,
      view_all_in_workspace: true, // Context-dependent
      edit_any: true, // When in instructor role
      delete_any: false,
      assign_members: true,
      view_team_analytics: true,
    },
    project: {
      create: true,
      view_all_in_workspace: true,
      edit_any: true,
      delete_any: false,
      assign_tasks: true,
      view_project_analytics: true,
    },
    task: {
      create: true,
      view_all_in_project: true,
      edit_any: true,
      delete_any: false,
      assign_to_others: true,
    },
    contribution: {
      log_own: true,
      view_all_in_team: true,
      edit_any: false,
      delete_any: false,
      approve_submissions: true, // When in instructor context
    },
    analytics: {
      view_own_stats: true,
      view_team_stats: true,
      view_workspace_stats: true, // Context-dependent
      export_data: true,
      generate_reports: true,
    },
    admin: {
      manage_users: false,
      view_system_logs: false,
      manage_platform_settings: false,
      access_all_workspaces: false,
    },
  },
};

// =====================================================
// PERMISSION HELPER FUNCTIONS
// =====================================================

/**
 * Get permissions for a user role
 */
export function getPermissions(role: EnhancedUserRole): Permissions {
  return ROLE_PERMISSIONS[role];
}

/**
 * Check if user has specific permission
 */
export function hasPermission(
  userRole: EnhancedUserRole,
  category: keyof Permissions,
  action: string
): boolean {
  const permissions = getPermissions(userRole);
  const categoryPerms = permissions[category] as Record<string, boolean>;
  return categoryPerms[action] || false;
}

/**
 * Check if user can access workspace-level features
 */
export function canAccessWorkspace(
  userRole: EnhancedUserRole,
  workspaceMemberRole: WorkspaceMemberRole
): boolean {
  const permissions = getPermissions(userRole);

  // Admin can access everything
  if (userRole === 'admin') return true;

  // Workspace owners and admins have elevated access
  if (workspaceMemberRole === 'owner' || workspaceMemberRole === 'admin') {
    return true;
  }

  // Instructors can access their workspaces
  if (userRole === 'instructor' || userRole === 'both') {
    return permissions.workspace.view_all;
  }

  return false;
}

/**
 * Get role display information
 */
export function getRoleInfo(role: EnhancedUserRole) {
  const roleInfo = {
    student: {
      label: 'Student',
      description: 'Participate in teams and projects',
      color: 'blue',
      icon: '🎓',
    },
    instructor: {
      label: 'Instructor',
      description: 'Manage courses and monitor student progress',
      color: 'purple',
      icon: '👨‍🏫',
    },
    teaching_assistant: {
      label: 'Teaching Assistant',
      description: 'Assist with course management and student support',
      color: 'green',
      icon: '👨‍🎓',
    },
    admin: {
      label: 'Administrator',
      description: 'Full platform access and management',
      color: 'red',
      icon: '⚙️',
    },
    both: {
      label: 'Student & Instructor',
      description: 'Dual role with context-based permissions',
      color: 'indigo',
      icon: '🎭',
    },
  };

  return roleInfo[role];
}

/**
 * Convert legacy UserRole to EnhancedUserRole
 */
export function mapLegacyRole(legacyRole: UserRole): EnhancedUserRole {
  switch (legacyRole) {
    case 'student':
      return 'student';
    case 'instructor':
      return 'instructor';
    case 'both':
      return 'both';
    default:
      return 'student'; // Default fallback
  }
}
