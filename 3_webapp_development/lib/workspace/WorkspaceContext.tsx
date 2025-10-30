'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Workspace } from '../types/database';
import { getUserWorkspaces, getUserWorkspacesRPC, getWorkspace } from '../db/queries';

interface WorkspaceContextType {
  currentWorkspace: Workspace | null;
  workspaces: any[];
  loading: boolean;
  switchWorkspace: (workspaceId: string) => void;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadWorkspaces();
    } else {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setLoading(false);
    }
  }, [user]);

  async function loadWorkspaces() {
    if (!user) return;

    try {
      setLoading(true);
      console.log('🚀 Starting workspace loading for user:', user.id);
      
      // Try RPC approach first (bypasses RLS), fallback to regular query
      const userWorkspaces = await getUserWorkspacesRPC(user.id);
      console.log('📋 Loaded workspaces:', userWorkspaces);
      
      setWorkspaces(userWorkspaces || []);

      // Set current workspace from localStorage or first workspace
      const savedWorkspaceId = localStorage.getItem('currentWorkspaceId');
      if (savedWorkspaceId && userWorkspaces?.some((w: any) => w.workspace.id === savedWorkspaceId)) {
        const workspace = await getWorkspace(savedWorkspaceId);
        setCurrentWorkspace(workspace);
      } else if (userWorkspaces && userWorkspaces.length > 0) {
        const firstWorkspace = userWorkspaces[0] as any;
        setCurrentWorkspace(firstWorkspace.workspace);
        localStorage.setItem('currentWorkspaceId', firstWorkspace.workspace.id);
      }
    } catch (error) {
      console.error('Error loading workspaces:', error);
      // Set empty state on error to prevent undefined issues
      setWorkspaces([]);
      setCurrentWorkspace(null);
      
      // Clear any stale workspace ID from localStorage
      localStorage.removeItem('currentWorkspaceId');
    } finally {
      setLoading(false);
    }
  }

  async function switchWorkspace(workspaceId: string) {
    try {
      console.log('🔄 Switching to workspace:', workspaceId);
      const workspace = await getWorkspace(workspaceId);
      console.log('✅ Successfully fetched workspace:', workspace);
      setCurrentWorkspace(workspace);
      localStorage.setItem('currentWorkspaceId', workspaceId);
      console.log('✅ Workspace switch completed');
    } catch (error: any) {
      console.error('❌ Error switching workspace:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        fullError: error
      });
      
      // Don't update state if there's an error
      // Keep the current workspace as is
    }
  }

  async function refreshWorkspaces() {
    await loadWorkspaces();
  }

  const value = {
    currentWorkspace,
    workspaces,
    loading,
    switchWorkspace,
    refreshWorkspaces,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
