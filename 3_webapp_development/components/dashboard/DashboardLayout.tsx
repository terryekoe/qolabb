'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { DashboardHeader } from './DashboardHeader';
import { useAuth } from '@/lib/auth/AuthContext';
import { InAppNotificationManager } from '@/components/notifications/InAppNotificationManager';
import { MotivationalMessageBanner } from '@/components/motivation/MotivationalMessageBanner';
import { markNotificationAsRead } from '@/lib/db/queries';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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
      {user?.id && <MotivationalMessageBanner userId={user.id} sidebarCollapsed={sidebarCollapsed} />}
      
      {/* Main Content */}
      <main
        className="pt-16 transition-all duration-300"
        style={{ marginLeft: sidebarCollapsed ? '0' : '16rem' }}
      >
        {children}
      </main>
    </div>
  );
};
