'use client';

import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { InstructorAnalyticsView } from '@/components/analytics/InstructorAnalyticsView';

export default function AnalyticsPage() {
  const { userRole, isInstructor } = usePermissions();

  // Route to appropriate view based on role
  // Students should see student view (they have view_own_stats and view_team_stats)
  // TAs should see TA view
  // Instructors should see instructor view
  // 'both' role defaults to instructor view
  
  // Only allow instructors
  if (!isInstructor && userRole !== 'both') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Access Restricted</h2>
            <p className="text-gray-600 dark:text-gray-400">Analytics are only available for instructors.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }
  
  // Instructor view
  return (
    <DashboardLayout>
      <InstructorAnalyticsView />
    </DashboardLayout>
  );
  
  // Fallback - should not reach here if canAccess.analytics() is true
  return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-600">You don't have permission to view analytics.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
