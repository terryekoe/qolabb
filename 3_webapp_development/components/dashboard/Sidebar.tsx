'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  CheckSquare,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  Building2,
  X,
  Clock,
  ClipboardCheck,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import Avatar from '@/components/ui/Avatar';
import WorkspaceIcon from '@/components/ui/WorkspaceIcon';
import { getUserPendingTasksCount } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { isFeatureEnabled } from '@/lib/config/features';
import { usePermissions } from '@/lib/hooks/usePermissions';

interface SidebarProps {
  collapsed: boolean;
  onClose?: () => void;
}

/**
 * Sidebar navigation component
 * Displays navigation links, workspace switcher, and user profile
 * Adapts to mobile and desktop layouts
 */
export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onClose }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { isInstructor } = usePermissions();
  const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);

  // Load pending tasks count
  useEffect(() => {
    if (!user?.id) {
      setPendingTasksCount(0);
      return;
    }

    const loadPendingCount = async () => {
      try {
        const count = await getUserPendingTasksCount(user.id);
        setPendingTasksCount(count);
      } catch (error) {
        console.error('Error loading pending tasks count:', error);
        setPendingTasksCount(0);
      }
    };

    loadPendingCount();

    // Set up real-time subscription for tasks changes
    const channel = supabase
      .channel(`sidebar-tasks:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        () => {
          // Reload count when tasks change
          loadPendingCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_assignees',
        },
        () => {
          // Reload count when task assignments change
          loadPendingCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Build base navigation items (always visible when feature enabled)
  const baseNavigationItems = [
    {
      icon: LayoutDashboard,
      label: 'Dashboard',
      href: '/dashboard',
      feature: 'DASHBOARD' as const,
    },
    { icon: FolderKanban, label: 'Assignments', href: '/projects', feature: 'PROJECTS' as const },
    {
      icon: CheckSquare,
      label: isInstructor ? 'Contributions' : 'My Contributions',
      href: '/tasks',
      feature: 'TASKS' as const,
    },
    { icon: Users, label: 'My Group', href: '/teams', feature: 'STUDY_GROUPS' as const },
    { icon: Settings, label: 'Settings', href: '/settings', feature: 'SETTINGS_PROFILE' as const },
  ].filter((item): item is typeof item & { feature: string } => isFeatureEnabled(item.feature));

  // Analytics - only show if user has access
  // Analytics - only show for instructors
  if (isInstructor) {
    baseNavigationItems.splice(1, 0, {
      icon: BarChart3,
      label: 'Analytics',
      href: '/analytics',
      feature: 'ANALYTICS' as any,
    });
  }

  // Contextual navigation items (appear based on conditions)
  const contextualNavigationItems: any[] = [];

  // Combine base and contextual items
  const navigationItems = [...baseNavigationItems, ...contextualNavigationItems];

  const isActive = (href: string) => pathname === href;

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  // Get user initials
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{
          x: collapsed ? -256 : 0,
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed left-0 top-0 w-64 bg-blue-600 dark:bg-blue-800 border-r border-blue-700 dark:border-blue-900 h-screen z-50 flex flex-col"
      >
        {/* Logo & Workspace */}
        <div className="p-6 border-b border-blue-500 dark:border-blue-700">
          <div className="flex items-center justify-between mb-4">
            <Link href="/dashboard">
              <div className="text-2xl font-bold">
                <span className="text-white">Qol</span>
                <span className="text-white">abb</span>
              </div>
            </Link>

            {/* Mobile Close Button */}
            <button
              onClick={onClose}
              className="md:hidden p-2 hover:bg-blue-700 dark:hover:bg-blue-700 rounded-lg transition-colors"
            >
              <X size={20} className="text-white" />
            </button>
          </div>

          {/* Workspace Switcher */}
          <button
            onClick={() => setShowWorkspaceSwitcher(true)}
            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 transition-colors group"
          >
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <WorkspaceIcon
                workspaceId={currentWorkspace?.id || 'default'}
                name={currentWorkspace?.name || 'Class'}
                iconUrl={currentWorkspace?.icon_url}
                size="sm"
              />
              <span className="text-sm font-medium text-white truncate">
                {currentWorkspace?.name || 'Select Class'}
              </span>
            </div>
            <ChevronDown size={16} className="text-white flex-shrink-0" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            // Use badge from item if available, otherwise check for legacy tasks badge
            const badgeCount =
              'badge' in item
                ? item.badge
                : item.href === '/tasks' && pendingTasksCount > 0
                  ? pendingTasksCount
                  : 0;
            const showBadge = badgeCount > 0;

            return (
              <Link key={item.href} href={item.href} prefetch={true} className="block">
                <motion.div
                  whileHover={{ x: 4 }}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                    active
                      ? 'bg-blue-700 dark:bg-blue-700 text-white'
                      : 'text-white hover:bg-blue-700 dark:hover:bg-blue-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon size={20} className="text-white" />
                    <span className="font-medium text-white">{item.label}</span>
                  </div>
                  {showBadge && (
                    <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-semibold rounded-full">
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-blue-500 dark:border-blue-700">
          <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 cursor-pointer mb-2">
            <Avatar
              userId={user?.id || 'current-user'}
              name={profile?.full_name || 'User'}
              src={profile?.avatar_url}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-xs text-white truncate opacity-90">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center space-x-3 px-4 py-3 rounded-lg text-red-300 bg-transparent border border-transparent hover:border-red-400 hover:bg-red-500/10 hover:text-red-200 transition-all w-full group"
          >
            <LogOut size={20} className="transition-transform group-hover:scale-110" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </motion.div>

      {/* Workspace Switcher Modal */}
      <WorkspaceSwitcher
        isOpen={showWorkspaceSwitcher}
        onClose={() => setShowWorkspaceSwitcher(false)}
      />
    </>
  );
};
