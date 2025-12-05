'use client';

import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DirectMessaging } from '@/components/communication/DirectMessaging';
import { useAuth } from '@/lib/auth/AuthContext';
import { FeatureGuard } from '@/components/features/FeatureGuard';

function MessagesPageContent() {
  const { user } = useAuth();

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">Please log in to view messages</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 h-[calc(100vh-8rem)]">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Messages</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Send direct messages to your teammates
          </p>
        </div>
        <div className="h-full">
          <DirectMessaging userId={user.id} />
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function MessagesPage() {
  return (
    <FeatureGuard
      feature="COMMUNICATION"
      featureName="Messaging"
      description="In-app messaging is not available in the MVP. Students can use WhatsApp, Slack, or other communication tools they're already familiar with."
    >
      <MessagesPageContent />
    </FeatureGuard>
  );
}
