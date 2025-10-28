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
        className="fixed left-0 top-0 w-64 bg-white border-r border-gray-200 h-screen z-50 flex flex-col"
      >
      {/* Logo & Workspace */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <Link href="/dashboard">
            <div className="text-2xl font-bold">
              <span className="text-black">Qol</span>
              <span className="text-qolabb-navy-600">abb</span>
            </div>
          </Link>
          
          {/* Mobile Close Button */}
          <button
            onClick={onClose}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        
        {/* Workspace Switcher */}
        <button 
          onClick={() => setShowWorkspaceSwitcher(true)}
          className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
        >
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <div className="bg-qolabb-navy-100 p-2 rounded-lg flex-shrink-0">
              <Building2 size={16} className="text-qolabb-navy-700" />
            </div>
            <span className="text-sm font-medium text-gray-700 truncate">
              {currentWorkspace?.name || 'Select Workspace'}
            </span>
          </div>
          <ChevronDown size={16} className="text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 4 }}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  active
                    ? 'bg-qolabb-navy-50 text-qolabb-navy-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-qolabb-navy-400 to-qolabb-beige-400 rounded-full flex items-center justify-center text-white font-bold">
            {getInitials(profile?.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{profile?.full_name || 'User'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          className="flex items-center space-x-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors w-full"
        >
          <LogOut size={20} />
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
