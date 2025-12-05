'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { DashboardHeader } from './DashboardHeader';
import { useAuth } from '@/lib/auth/AuthContext';
import { InAppNotificationManager } from '@/components/notifications/InAppNotificationManager';
import { MotivationalMessageBanner } from '@/components/motivation/MotivationalMessageBanner';
import { markNotificationAsRead } from '@/lib/db';
import { isFeatureEnabled } from '@/lib/config/features';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * Main layout for the dashboard
 * Includes Sidebar, Header, and main content area
 * Handles authentication checks and responsive layout logic
 */
export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // Start expanded on desktop
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Handle mobile sidebar state on mount and resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
      }
    };

    // Set initial state
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleNotificationClick = (notification: any) => {
    // Navigate based on notification type
    if (notification.type === 'task_assignment' && notification.data?.task_id) {
      router.push('/tasks');
    } else if (notification.data?.project_id) {
      router.push('/projects');
    } else if (notification.data?.team_id || notification.data?.team_name) {
      router.push('/teams');
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    if (!user?.id) return;
    try {
      await markNotificationAsRead(notificationId, user.id);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Sidebar collapsed={sidebarCollapsed} onClose={() => setSidebarCollapsed(true)} />
      <DashboardHeader onToggleSidebar={toggleSidebar} sidebarCollapsed={sidebarCollapsed} />

      {/* In-App Notifications */}
      {user?.id && (
        <InAppNotificationManager
          userId={user.id}
          onNotificationClick={handleNotificationClick}
          onMarkAsRead={handleMarkAsRead}
        />
      )}

      {/* Motivational Messages Banner */}
      {user?.id && isFeatureEnabled('MOTIVATIONAL_MESSAGES') && (
        <MotivationalMessageBanner userId={user.id} sidebarCollapsed={sidebarCollapsed} />
      )}

      {/* Main Content */}
      <main
        className={`flex-1 pt-16 overflow-y-auto transition-all duration-300 ${
          sidebarCollapsed ? 'ml-0' : 'ml-0 md:ml-64'
        }`}
      >
        {children}
      </main>
    </div>
  );
};
