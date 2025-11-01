'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Play,
  Pause,
  Square,
  Target,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/Button';
import { createContribution } from '@/lib/db/queries';
import { supabase } from '@/lib/supabase';

interface TaskTimeTrackerProps {
  taskId: string;
  projectId: string;
  userId: string;
  taskTitle: string;
  estimatedHours?: number | null | undefined;
  onTimeLogged?: () => void;
}

interface TimeEntry {
  id: string;
  hours: number;
  startedAt: string;
  endedAt: string | null;
}

export function TaskTimeTracker({
  taskId,
  projectId,
  userId,
  taskTitle,
  estimatedHours,
  onTimeLogged,
}: TaskTimeTrackerProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [estimated, setEstimated] = useState(estimatedHours || 0);
  const [isEditingEstimate, setIsEditingEstimate] = useState(false);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const startTimeRef = useRef<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load existing time entries from contributions
  useEffect(() => {
    loadTimeEntries();
  }, [taskId]);

  // Timer logic
  useEffect(() => {
    if (isTracking && startTimeRef.current) {
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Math.floor(
            (Date.now() - startTimeRef.current.getTime()) / 1000
          );
          setElapsedSeconds(elapsed);
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isTracking]);

  async function loadTimeEntries() {
    try {
      const { data: contributions, error } = await supabase
        .from('contributions')
        .select('id, hours_spent, created_at, updated_at')
        .eq('task_id', taskId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const total = (contributions || []).reduce(
        (sum, c) => sum + (c.hours_spent || 0),
        0
      );
      setTotalHours(total);
      
      // Update time entries for display
      setTimeEntries(
        (contributions || []).map((c) => ({
          id: c.id,
          hours: c.hours_spent || 0,
          startedAt: c.created_at,
          endedAt: c.updated_at,
        }))
      );
    } catch (error) {
      console.error('Error loading time entries:', error);
    }
  }

  async function startTracking() {
    setIsTracking(true);
    startTimeRef.current = new Date();
    setElapsedSeconds(0);
  }

  async function stopTracking() {
    if (!startTimeRef.current) return;

    setIsTracking(false);
    const endTime = new Date();
    const elapsedMs = endTime.getTime() - startTimeRef.current.getTime();
    const elapsedHours = elapsedMs / (1000 * 60 * 60);

    // Auto-log the time as a contribution
    await logTime(elapsedHours);
    startTimeRef.current = null;
    setElapsedSeconds(0);
  }

  async function logTime(hours: number) {
    if (hours <= 0) return;

    setLoading(true);
    try {
      await createContribution({
        project_id: projectId,
        user_id: userId,
        task_id: taskId,
        title: `Worked on: ${taskTitle}`,
        description: `Time logged: ${hours.toFixed(2)} hours`,
        contribution_type: 'other',
        hours_spent: Math.round(hours * 100) / 100, // Round to 2 decimals
      });

      await loadTimeEntries();
      onTimeLogged?.();
    } catch (error: any) {
      console.error('Error logging time:', error);
      alert('Failed to log time. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleManualLog() {
    const hours = elapsedSeconds / 3600;
    if (hours <= 0) {
      alert('Please start tracking time first, or enter hours manually.');
      return;
    }
    await logTime(hours);
  }

  function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  }

  const displayHours = totalHours + elapsedSeconds / 3600;
  const isOverEstimate = estimated > 0 && displayHours > estimated;
  const isUnderEstimate = estimated > 0 && displayHours < estimated * 0.8;
  const percentComplete = estimated > 0 ? Math.min(100, (displayHours / estimated) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center">
          <Clock size={16} className="mr-2" />
          Time Tracking
        </h4>
      </div>

      {/* Time Display */}
      <div className="bg-gradient-to-br from-qolabb-navy-50 to-qolabb-navy-100 rounded-lg p-4 border border-qolabb-navy-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-medium text-qolabb-navy-700 uppercase tracking-wide mb-1">
              Total Time Spent
            </p>
            <p className="text-2xl font-bold text-qolabb-navy-900">
              {displayHours.toFixed(2)}h
            </p>
            {isTracking && (
              <p className="text-xs text-qolabb-navy-600 mt-1">
                Tracking: {formatTime(elapsedSeconds)}
              </p>
            )}
          </div>
          {isTracking ? (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-red-600">Recording</span>
            </div>
          ) : null}
        </div>

        {/* Timer Controls */}
        <div className="flex items-center space-x-2">
          {!isTracking ? (
            <Button
              variant="primary"
              size="sm"
              onClick={startTracking}
              disabled={loading}
              className="flex items-center space-x-2 flex-1"
            >
              <Play size={16} />
              <span>Start Timer</span>
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={stopTracking}
                disabled={loading}
                className="flex items-center space-x-2 flex-1"
              >
                <Square size={16} />
                <span>Stop & Log</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleManualLog}
                disabled={loading || elapsedSeconds === 0}
                className="flex items-center space-x-2"
              >
                <CheckCircle2 size={16} />
                <span>Log Now</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Estimated vs Actual */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Target size={14} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Estimated Time</span>
          </div>
          {isEditingEstimate ? (
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={estimated}
                onChange={(e) => setEstimated(parseFloat(e.target.value) || 0)}
                placeholder="0"
                min="0"
                step="0.5"
                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500"
                onBlur={() => setIsEditingEstimate(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setIsEditingEstimate(false);
                  }
                }}
                autoFocus
              />
              <span className="text-sm text-gray-500">h</span>
            </div>
          ) : (
            <button
              onClick={() => setIsEditingEstimate(true)}
              className="text-sm text-gray-600 hover:text-qolabb-navy-600 font-medium"
            >
              {estimated > 0 ? `${estimated}h` : 'Set estimate'}
            </button>
          )}
        </div>

        {estimated > 0 && (
          <div className="space-y-2">
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all ${
                  isOverEstimate
                    ? 'bg-red-500'
                    : isUnderEstimate
                    ? 'bg-blue-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, percentComplete)}%` }}
              />
            </div>

            {/* Comparison */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">
                {percentComplete.toFixed(0)}% of estimate
              </span>
              <div className="flex items-center space-x-1">
                {isOverEstimate && (
                  <>
                    <TrendingUp size={12} className="text-red-600" />
                    <span className="text-red-600 font-medium">
                      {((displayHours / estimated - 1) * 100).toFixed(0)}% over
                    </span>
                  </>
                )}
                {isUnderEstimate && (
                  <>
                    <TrendingDown size={12} className="text-blue-600" />
                    <span className="text-blue-600 font-medium">
                      {((1 - displayHours / estimated) * 100).toFixed(0)}% under
                    </span>
                  </>
                )}
                {!isOverEstimate && !isUnderEstimate && estimated > 0 && (
                  <span className="text-green-600 font-medium flex items-center">
                    <CheckCircle2 size={12} className="mr-1" />
                    On track
                  </span>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
              <div>
                <p className="text-xs text-gray-500">Actual</p>
                <p className="text-sm font-semibold text-gray-900">
                  {displayHours.toFixed(2)}h
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Estimated</p>
                <p className="text-sm font-semibold text-gray-900">
                  {estimated.toFixed(2)}h
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Manual Time Entry */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <p className="text-xs font-medium text-gray-700 mb-2">
          Manual Time Entry
        </p>
        <div className="flex items-center space-x-2">
          <input
            type="number"
            placeholder="0.5"
            min="0"
            step="0.25"
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500"
            id="manual-hours-input"
          />
          <span className="text-sm text-gray-500">h</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              const input = document.getElementById('manual-hours-input') as HTMLInputElement;
              const hours = parseFloat(input?.value || '0');
              if (hours > 0) {
                await logTime(hours);
                input.value = '';
              }
            }}
            disabled={loading}
            className="flex items-center space-x-1"
          >
            <Clock size={14} />
            <span>Log</span>
          </Button>
        </div>
      </div>

      {/* Time Entries Summary */}
      {totalHours > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-xs text-green-700 mb-1 font-medium">
            ✓ Total Time Logged
          </p>
          <p className="text-sm font-semibold text-green-900">
            {totalHours.toFixed(2)} hours
          </p>
        </div>
      )}
    </div>
  );
}
