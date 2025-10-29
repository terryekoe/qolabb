// =====================================================
// Role-Based Navigation Components
// Adaptive navigation based on user roles and permissions
// =====================================================

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Home,
  Users,
  FolderOpen,
  BarChart3,
  Settings,
  GraduationCap,
  BookOpen,
  UserCheck,
  Calendar,
  MessageSquare,
  Award,
  TrendingUp,
  FileText,
  Shield,
  UserPlus,
  Target,
  Clock,
  CheckSquare,
  PieChart,
  Activity
} from 'lucide-react';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { cn } from '@/lib/utils';

// =====================================================
// NAVIGATION ITEM TYPES
// =====================================================

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  badge?: string | number;
  requiredPermissions?: {
    category: string;
    action: string;
  }[];
  allowedRoles?: string[];
  children?: NavItem[];
}

// =====================================================
// ROLE-BASED NAVIGATION ITEMS
// =====================================================

const NAVIGATION_ITEMS: NavItem[] = [
  // Universal items (all users)
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    description: 'Overview and quick actions'
  },
  
  // Student-focused items
  {
    id: 'my-teams',
    label: 'My Teams',
    href: '/teams',
    icon: Users,
    description: 'Your team memberships and projects',
    allowedRoles: ['student', 'both']
  },
  {
    id: 'my-projects',
    label: 'My Projects',
    href: '/projects',
    icon: FolderOpen,
    description: 'Projects you\'re working on',
    allowedRoles: ['student', 'both']
  },
  {
    id: 'my-tasks',
    label: 'My Tasks',
    href: '/tasks',
    icon: CheckSquare,
    description: 'Your assigned tasks and deadlines',
    allowedRoles: ['student', 'both']
  },
  {
    id: 'my-contributions',
    label: 'My Work Log',
    href: '/contributions',
    icon: Clock,
    description: 'Track and log your contributions',
    allowedRoles: ['student', 'both']
  },
  
  // Instructor-focused items
  {
    id: 'course-management',
    label: 'Course Management',
    href: '/courses',
    icon: BookOpen,
    description: 'Manage your courses and workspaces',
    allowedRoles: ['instructor', 'teaching_assistant', 'both', 'admin'],
    requiredPermissions: [
      { category: 'workspace', action: 'view_all' }
    ]
  },
  {
    id: 'student-monitoring',
    label: 'Student Progress',
    href: '/monitoring',
    icon: UserCheck,
    description: 'Monitor student participation and progress',
    allowedRoles: ['instructor', 'teaching_assistant', 'both', 'admin'],
    requiredPermissions: [
      { category: 'analytics', action: 'view_team_stats' }
    ]
  },
  {
    id: 'team-analytics',
    label: 'Team Analytics',
    href: '/analytics/teams',
    icon: TrendingUp,
    description: 'Detailed team performance analytics',
    allowedRoles: ['instructor', 'teaching_assistant', 'both', 'admin'],
    requiredPermissions: [
      { category: 'analytics', action: 'view_workspace_stats' }
    ]
  },
  {
    id: 'reports',
    label: 'Reports',
    href: '/reports',
    icon: FileText,
    description: 'Generate and export reports',
    allowedRoles: ['instructor', 'both', 'admin'],
    requiredPermissions: [
      { category: 'analytics', action: 'generate_reports' }
    ]
  },
  
  // Shared items with role-based features
  {
    id: 'analytics',
    label: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    description: 'Performance insights and metrics',
    children: [
      {
        id: 'personal-analytics',
        label: 'Personal Stats',
        href: '/analytics/personal',
        icon: Activity,
        description: 'Your personal performance metrics'
      },
      {
        id: 'team-analytics-detailed',
        label: 'Team Insights',
        href: '/analytics/teams',
        icon: PieChart,
        description: 'Team performance and collaboration metrics',
        requiredPermissions: [
          { category: 'analytics', action: 'view_team_stats' }
        ]
      }
    ]
  },
  
  // Administrative items
  {
    id: 'user-management',
    label: 'User Management',
    href: '/admin/users',
    icon: UserPlus,
    description: 'Manage platform users',
    allowedRoles: ['admin'],
    requiredPermissions: [
      { category: 'admin', action: 'manage_users' }
    ]
  },
  {
    id: 'system-settings',
    label: 'System Settings',
    href: '/admin/settings',
    icon: Shield,
    description: 'Platform configuration and settings',
    allowedRoles: ['admin'],
    requiredPermissions: [
      { category: 'admin', action: 'manage_platform_settings' }
    ]
  },
  
  // Universal settings (always last)
  {
    id: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    description: 'Account and preferences'
  }
];

// =====================================================
// NAVIGATION COMPONENTS
// =====================================================

interface RoleBasedNavigationProps {
  className?: string;
  variant?: 'sidebar' | 'horizontal' | 'mobile';
  showLabels?: boolean;
  showDescriptions?: boolean;
}

export function RoleBasedNavigation({
  className,
  variant = 'sidebar',
  showLabels = true,
  showDescriptions = false
}: RoleBasedNavigationProps) {
  const { userRole, can } = usePermissions();
  const pathname = usePathname();
  
  // Filter navigation items based on permissions and roles
  const filteredItems = NAVIGATION_ITEMS.filter(item => {
    // Check role-based access
    if (item.allowedRoles && !item.allowedRoles.includes(userRole)) {
      return false;
    }
    
    // Check permission-based access
    if (item.requiredPermissions) {
      return item.requiredPermissions.every(perm => 
        can(perm.category as any, perm.action)
      );
    }
    
    return true;
  });
  
  const baseClasses = cn(
    'flex',
    variant === 'sidebar' && 'flex-col space-y-1',
    variant === 'horizontal' && 'flex-row space-x-1',
    variant === 'mobile' && 'flex-col space-y-1',
    className
  );
  
  return (
    <nav className={baseClasses}>
      {filteredItems.map(item => (
        <NavItemComponent
          key={item.id}
          item={item}
          pathname={pathname}
          variant={variant}
          showLabels={showLabels}
          showDescriptions={showDescriptions}
        />
      ))}
    </nav>
  );
}

// =====================================================
// NAVIGATION ITEM COMPONENT
// =====================================================

interface NavItemComponentProps {
  item: NavItem;
  pathname: string;
  variant: 'sidebar' | 'horizontal' | 'mobile';
  showLabels: boolean;
  showDescriptions: boolean;
}

function NavItemComponent({
  item,
  pathname,
  variant,
  showLabels,
  showDescriptions
}: NavItemComponentProps) {
  const { can } = usePermissions();
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
  
  // Filter children based on permissions
  const filteredChildren = item.children?.filter(child => {
    if (child.requiredPermissions) {
      return child.requiredPermissions.every(perm => 
        can(perm.category as any, perm.action)
      );
    }
    return true;
  });
  
  const hasChildren = filteredChildren && filteredChildren.length > 0;
  
  const itemClasses = cn(
    'group relative flex items-center rounded-lg transition-all duration-200',
    variant === 'sidebar' && 'px-3 py-2',
    variant === 'horizontal' && 'px-4 py-2',
    variant === 'mobile' && 'px-3 py-2',
    isActive
      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500'
      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
  );
  
  const iconClasses = cn(
    'flex-shrink-0',
    variant === 'sidebar' && 'w-5 h-5',
    variant === 'horizontal' && 'w-4 h-4',
    variant === 'mobile' && 'w-5 h-5',
    showLabels && 'mr-3'
  );
  
  return (
    <div>
      <Link href={item.href} className={itemClasses}>
        <item.icon className={iconClasses} />
        
        {showLabels && (
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium truncate">
                {item.label}
              </span>
              {item.badge && (
                <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                  {item.badge}
                </span>
              )}
            </div>
            
            {showDescriptions && item.description && (
              <p className="text-xs text-gray-500 mt-1 truncate">
                {item.description}
              </p>
            )}
          </div>
        )}
        
        {isActive && (
          <motion.div
            className="absolute inset-0 bg-blue-50 rounded-lg -z-10"
            layoutId="activeNavItem"
            initial={false}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
      </Link>
      
      {/* Render children if they exist */}
      {hasChildren && variant === 'sidebar' && (
        <div className="ml-6 mt-1 space-y-1">
          {filteredChildren!.map(child => (
            <Link
              key={child.id}
              href={child.href}
              className={cn(
                'flex items-center px-3 py-2 text-sm rounded-lg transition-colors',
                pathname === child.href
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              )}
            >
              <child.icon className="w-4 h-4 mr-3" />
              <span className="truncate">{child.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// =====================================================
// ROLE INDICATOR COMPONENT
// =====================================================

export function RoleIndicator({ className }: { className?: string }) {
  const { roleInfo, userRole } = usePermissions();
  
  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <span className="text-lg">{roleInfo.icon}</span>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-900">
          {roleInfo.label}
        </span>
        <span className="text-xs text-gray-500">
          {roleInfo.description}
        </span>
      </div>
    </div>
  );
}

// =====================================================
// QUICK ACTIONS COMPONENT
// =====================================================

export function QuickActions({ className }: { className?: string }) {
  const { can, isInstructor, isStudent } = usePermissions();
  
  const quickActions = [
    // Student actions
    ...(isStudent ? [
      {
        label: 'Log Work',
        href: '/contributions/new',
        icon: Clock,
        color: 'blue'
      },
      {
        label: 'View Tasks',
        href: '/tasks',
        icon: CheckSquare,
        color: 'green'
      }
    ] : []),
    
    // Instructor actions
    ...(isInstructor && can('workspace', 'create') ? [
      {
        label: 'Create Course',
        href: '/courses/new',
        icon: BookOpen,
        color: 'purple'
      },
      {
        label: 'View Reports',
        href: '/reports',
        icon: FileText,
        color: 'orange'
      }
    ] : []),
    
    // Universal actions
    {
      label: 'Settings',
      href: '/settings',
      icon: Settings,
      color: 'gray'
    }
  ];
  
  return (
    <div className={cn('grid grid-cols-2 gap-2', className)}>
      {quickActions.map(action => (
        <Link
          key={action.label}
          href={action.href}
          className={cn(
            'flex items-center space-x-2 p-3 rounded-lg border transition-colors',
            `hover:bg-${action.color}-50 hover:border-${action.color}-200`
          )}
        >
          <action.icon className="w-4 h-4" />
          <span className="text-sm font-medium">{action.label}</span>
        </Link>
      ))}
    </div>
  );
}