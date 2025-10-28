'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Menu, Bell, Search } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';

interface DashboardHeaderProps {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ 
  onToggleSidebar,
  sidebarCollapsed 
}) => {
  const { currentWorkspace } = useWorkspace();

  return (
    <header className="fixed top-0 right-0 left-0 md:left-64 h-16 bg-white border-b border-gray-200 z-30 transition-all duration-300"
      style={{ left: sidebarCollapsed ? '0' : '16rem' }}
    >
      <div className="h-full flex items-center justify-between px-6">
        {/* Left Side */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors md:hidden"
          >
            <Menu size={24} className="text-gray-600" />
          </button>

          <div className="hidden md:block">
            <h1 className="text-xl font-bold text-gray-900">
              {currentWorkspace?.name || 'Dashboard'}
            </h1>
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center space-x-3">
          {/* Search */}
          <button className="hidden sm:flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
            <Search size={18} className="text-gray-500" />
            <span className="text-sm text-gray-600">Search...</span>
          </button>

          {/* Notifications */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell size={22} className="text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </motion.button>
        </div>
      </div>
    </header>
  );
};
