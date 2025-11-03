'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import Avatar from '@/components/ui/Avatar';

interface SidebarProps {
  collapsed: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onClose }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false);

  const navigationItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: FolderKanban, label: 'Projects', href: '/projects' },
    { icon: CheckSquare, label: 'Tasks', href: '/tasks' },
    { icon: Users, label: 'Teams', href: '/teams' },
    { icon: BarChart3, label: 'Analytics', href: '/analytics' },
    { icon: Settings, label: 'Settings', href: '/settings' },
  ];

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
      .map(n => n[0])
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
        className="fixed left-0 top-0 w-64 bg-blue-500 dark:bg-blue-800 border-r border-blue-600 dark:border-blue-900 h-screen z-50 flex flex-col"
      >
      {/* Logo & Workspace */}
      <div className="p-6 border-b border-blue-400 dark:border-blue-700">
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
            className="md:hidden p-2 hover:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-white" />
          </button>
        </div>
        
        {/* Workspace Switcher */}
        <button 
          onClick={() => setShowWorkspaceSwitcher(true)}
          className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors group"
        >
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            {currentWorkspace?.icon_url ? (
              <img
                src={currentWorkspace.icon_url}
                alt={currentWorkspace.name}
                className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                onError={(e) => {
                  // Fallback to Building2 icon if image fails to load
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector('.icon-fallback');
                  if (fallback) (fallback as HTMLElement).style.display = 'flex';
                }}
              />
            ) : null}
            <div className={`bg-blue-400 dark:bg-blue-700 p-2 rounded-lg flex-shrink-0 ${currentWorkspace?.icon_url ? 'hidden icon-fallback' : ''}`}>
              <Building2 size={16} className="text-white" />
            </div>
            <span className="text-sm font-medium text-white truncate">
              {currentWorkspace?.name || 'Select Workspace'}
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
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              prefetch={true}
              className="block"
            >
              <motion.div
                whileHover={{ x: 4 }}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  active
                    ? 'bg-blue-600 dark:bg-blue-700 text-white'
                    : 'text-white hover:bg-blue-600 dark:hover:bg-blue-700'
                }`}
              >
                <Icon size={20} className="text-white" />
                <span className="font-medium text-white">{item.label}</span>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-blue-400 dark:border-blue-700">
        <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 cursor-pointer mb-2">
          <Avatar
            userId={user?.id || 'current-user'}
            name={profile?.full_name || 'User'}
            src={profile?.avatar_url}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{profile?.full_name || 'User'}</p>
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
