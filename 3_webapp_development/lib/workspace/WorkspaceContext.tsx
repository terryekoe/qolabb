'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Workspace } from '../types/database';
import { getUserWorkspaces, getWorkspace } from '../db/queries';

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
      const userWorkspaces = await getUserWorkspaces(user.id);
      setWorkspaces(userWorkspaces);

      // Set current workspace from localStorage or first workspace
      const savedWorkspaceId = localStorage.getItem('currentWorkspaceId');
      if (savedWorkspaceId && userWorkspaces.some((w: any) => w.workspace.id === savedWorkspaceId)) {
        const workspace = await getWorkspace(savedWorkspaceId);
        setCurrentWorkspace(workspace);
      } else if (userWorkspaces.length > 0) {
        const firstWorkspace = userWorkspaces[0] as any;
        setCurrentWorkspace(firstWorkspace.workspace);
        localStorage.setItem('currentWorkspaceId', firstWorkspace.workspace.id);
      }
    } catch (error) {
      console.error('Error loading workspaces:', error);
    } finally {
      setLoading(false);
    }
  }

  async function switchWorkspace(workspaceId: string) {
    try {
      const workspace = await getWorkspace(workspaceId);
      setCurrentWorkspace(workspace);
      localStorage.setItem('currentWorkspaceId', workspaceId);
    } catch (error) {
      console.error('Error switching workspace:', error);
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
