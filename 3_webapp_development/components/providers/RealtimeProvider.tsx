'use client';

// =====================================================
// Realtime Provider
// Wraps app to provide global realtime subscriptions
// =====================================================

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRealtimeSubscriptions } from '@/lib/services/realtimeService';
import { useAuth } from '@/lib/auth/AuthContext';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';

interface RealtimeContextType {
  isConnected: boolean;
  activeChannels: string[];
}

const RealtimeContext = createContext<RealtimeContextType>({
  isConnected: false,
  activeChannels: [],
});

export function useRealtime() {
  return useContext(RealtimeContext);
}

interface RealtimeProviderProps {
  children: React.ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [isReady, setIsReady] = useState(false);
  
  // Initialize realtime subscriptions
  const status = useRealtimeSubscriptions();

  // Wait for auth and workspace to be ready
  useEffect(() => {
    if (user?.id && currentWorkspace?.id) {
      setIsReady(true);
    }
  }, [user?.id, currentWorkspace?.id]);

  const value: RealtimeContextType = {
    isConnected: status.isInitialized && isReady,
    activeChannels: status.activeChannels,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}
