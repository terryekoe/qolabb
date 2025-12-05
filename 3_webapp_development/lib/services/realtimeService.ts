// =====================================================
// Real-Time Subscription Service
// Global subscriptions for instant updates across the app
// =====================================================

import { supabase } from '@/lib/supabase';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// =====================================================
// TYPES
// =====================================================

export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export interface SubscriptionConfig {
  table: string;
  event?: RealtimeEvent;
  filter?: string;
  schema?: string;
}

export interface RealtimeCallbacks {
  onProjectChange?: (payload: RealtimePostgresChangesPayload<any>) => void;
  onTeamMemberChange?: (payload: RealtimePostgresChangesPayload<any>) => void;
  onTaskChange?: (payload: RealtimePostgresChangesPayload<any>) => void;
  onTaskAssigneeChange?: (payload: RealtimePostgresChangesPayload<any>) => void;
  onNotificationChange?: (payload: RealtimePostgresChangesPayload<any>) => void;
  onEvaluationChange?: (payload: RealtimePostgresChangesPayload<any>) => void;
  onWorkspaceChange?: (payload: RealtimePostgresChangesPayload<any>) => void;
}

// =====================================================
// REALTIME SERVICE CLASS
// =====================================================

class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private callbacks: RealtimeCallbacks = {};
  private userId: string | null = null;
  private workspaceId: string | null = null;

  /**
   * Initialize the realtime service with user context
   */
  initialize(userId: string, workspaceId: string, callbacks: RealtimeCallbacks = {}) {
    this.userId = userId;
    this.workspaceId = workspaceId;
    this.callbacks = callbacks;
    
    // Set up all subscriptions
    this.subscribeToProjects();
    this.subscribeToTeamMembers();
    this.subscribeToTasks();
    this.subscribeToTaskAssignees();
    this.subscribeToNotifications();
    this.subscribeToEvaluations();
    
    console.log('[RealtimeService] Initialized with subscriptions');
  }

  /**
   * Update callbacks without reinitializing
   */
  updateCallbacks(callbacks: Partial<RealtimeCallbacks>) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Update workspace context (e.g., when switching workspaces)
   */
  switchWorkspace(workspaceId: string) {
    if (this.workspaceId === workspaceId) return;
    
    this.workspaceId = workspaceId;
    
    // Re-subscribe to workspace-specific channels
    this.unsubscribeChannel('projects');
    this.subscribeToProjects();
    
    this.unsubscribeChannel('tasks');
    this.subscribeToTasks();
    
    this.unsubscribeChannel('evaluations');
    this.subscribeToEvaluations();
    
    console.log('[RealtimeService] Switched to workspace:', workspaceId);
  }

  /**
   * Subscribe to project changes in current workspace
   */
  private subscribeToProjects() {
    if (!this.workspaceId) return;

    const channel = supabase
      .channel(`projects:${this.workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `workspace_id=eq.${this.workspaceId}`,
        },
        (payload) => {
          console.log('[RealtimeService] Project change:', payload.eventType);
          this.callbacks.onProjectChange?.(payload);
        }
      )
      .subscribe();

    this.channels.set('projects', channel);
  }

  /**
   * Subscribe to team member changes for current user
   */
  private subscribeToTeamMembers() {
    if (!this.userId) return;

    const channel = supabase
      .channel(`team_members:${this.userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_members',
        },
        (payload) => {
          // Filter to only user's team changes
          const record = payload.new as any || payload.old as any;
          if (record?.user_id === this.userId) {
            console.log('[RealtimeService] Team member change:', payload.eventType);
            this.callbacks.onTeamMemberChange?.(payload);
          }
        }
      )
      .subscribe();

    this.channels.set('team_members', channel);
  }

  /**
   * Subscribe to task changes in current workspace
   */
  private subscribeToTasks() {
    if (!this.workspaceId) return;

    const channel = supabase
      .channel(`tasks:${this.workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          console.log('[RealtimeService] Task change:', payload.eventType);
          this.callbacks.onTaskChange?.(payload);
        }
      )
      .subscribe();

    this.channels.set('tasks', channel);
  }

  /**
   * Subscribe to task assignee changes for current user
   */
  private subscribeToTaskAssignees() {
    if (!this.userId) return;

    const channel = supabase
      .channel(`task_assignees:${this.userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_assignees',
        },
        (payload) => {
          const record = payload.new as any || payload.old as any;
          if (record?.user_id === this.userId) {
            console.log('[RealtimeService] Task assignee change:', payload.eventType);
            this.callbacks.onTaskAssigneeChange?.(payload);
          }
        }
      )
      .subscribe();

    this.channels.set('task_assignees', channel);
  }

  /**
   * Subscribe to notification changes for current user
   */
  private subscribeToNotifications() {
    if (!this.userId) return;

    const channel = supabase
      .channel(`notifications:${this.userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${this.userId}`,
        },
        (payload) => {
          console.log('[RealtimeService] New notification');
          this.callbacks.onNotificationChange?.(payload);
        }
      )
      .subscribe();

    this.channels.set('notifications', channel);
  }

  /**
   * Subscribe to evaluation period changes
   */
  private subscribeToEvaluations() {
    if (!this.workspaceId) return;

    const channel = supabase
      .channel(`evaluations:${this.workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'evaluation_periods',
        },
        (payload) => {
          console.log('[RealtimeService] Evaluation change:', payload.eventType);
          this.callbacks.onEvaluationChange?.(payload);
        }
      )
      .subscribe();

    this.channels.set('evaluations', channel);
  }

  /**
   * Unsubscribe from a specific channel
   */
  private unsubscribeChannel(name: string) {
    const channel = this.channels.get(name);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(name);
    }
  }

  /**
   * Clean up all subscriptions
   */
  cleanup() {
    this.channels.forEach((channel, name) => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();
    this.userId = null;
    this.workspaceId = null;
    this.callbacks = {};
    console.log('[RealtimeService] Cleaned up all subscriptions');
  }

  /**
   * Get subscription status
   */
  getStatus() {
    return {
      isInitialized: !!this.userId,
      userId: this.userId,
      workspaceId: this.workspaceId,
      activeChannels: Array.from(this.channels.keys()),
    };
  }
}

// Export singleton instance
export const realtimeService = new RealtimeService();

// =====================================================
// REACT HOOK FOR REALTIME
// =====================================================

import { useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook to set up global realtime subscriptions
 * Should be used once at app level (in RealtimeProvider)
 */
export function useRealtimeSubscriptions() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  // Invalidate queries when data changes
  const handleProjectChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    queryClient.invalidateQueries({ queryKey: ['workspaceProjects'] });
  }, [queryClient]);

  const handleTeamMemberChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['teams'] });
    queryClient.invalidateQueries({ queryKey: ['userTeams'] });
  }, [queryClient]);

  const handleTaskChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['projectTasks'] });
  }, [queryClient]);

  const handleTaskAssigneeChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['assignedTasks'] });
  }, [queryClient]);

  const handleNotificationChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, [queryClient]);

  const handleEvaluationChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['evaluations'] });
    queryClient.invalidateQueries({ queryKey: ['pendingEvaluations'] });
  }, [queryClient]);

  useEffect(() => {
    if (!user?.id || !currentWorkspace?.id) {
      realtimeService.cleanup();
      return;
    }

    realtimeService.initialize(user.id, currentWorkspace.id, {
      onProjectChange: handleProjectChange,
      onTeamMemberChange: handleTeamMemberChange,
      onTaskChange: handleTaskChange,
      onTaskAssigneeChange: handleTaskAssigneeChange,
      onNotificationChange: handleNotificationChange,
      onEvaluationChange: handleEvaluationChange,
    });

    return () => {
      realtimeService.cleanup();
    };
  }, [
    user?.id,
    currentWorkspace?.id,
    handleProjectChange,
    handleTeamMemberChange,
    handleTaskChange,
    handleTaskAssigneeChange,
    handleNotificationChange,
    handleEvaluationChange,
  ]);

  // Handle workspace switches
  useEffect(() => {
    if (currentWorkspace?.id) {
      realtimeService.switchWorkspace(currentWorkspace.id);
    }
  }, [currentWorkspace?.id]);

  return realtimeService.getStatus();
}
