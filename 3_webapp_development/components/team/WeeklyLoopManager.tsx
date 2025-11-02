'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, CheckCircle2, Clock, ArrowRight, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/Button';
import { WeeklyRetrospective } from './WeeklyRetrospective';

interface WeeklyLoopStep {
  id: 'update' | 'review' | 'retro';
  label: string;
  description: string;
  completed: boolean;
  component?: React.ReactNode;
}

interface WeeklyLoopManagerProps {
  teamId: string;
  teamName: string;
  onComplete?: () => void;
}

export function WeeklyLoopManager({ teamId, teamName, onComplete }: WeeklyLoopManagerProps) {
  const [currentStep, setCurrentStep] = useState<WeeklyLoopStep['id']>('update');
  const [completedSteps, setCompletedSteps] = useState<Set<WeeklyLoopStep['id']>>(new Set());

  // Get current week start (Monday)
  const getWeekStart = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const weekStart = getWeekStart();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const steps: WeeklyLoopStep[] = [
    {
      id: 'update',
      label: 'Weekly Update',
      description: 'Review progress and update status on tasks and contributions',
      completed: completedSteps.has('update'),
    },
    {
      id: 'review',
      label: 'Team Review',
      description: 'Review team performance, participation metrics, and workload balance',
      completed: completedSteps.has('review'),
    },
    {
      id: 'retro',
      label: 'Retrospective',
      description: 'Reflect on the week, share feedback, and identify improvements',
      completed: completedSteps.has('retro'),
    },
  ];

  const handleStepComplete = (stepId: WeeklyLoopStep['id']) => {
    setCompletedSteps((prev) => new Set([...prev, stepId]));
    
    // Move to next step
    const currentIndex = steps.findIndex((s) => s.id === stepId);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id);
    } else {
      // All steps completed
      if (onComplete) onComplete();
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'update':
        return (
          <WeeklyUpdateStep
            teamId={teamId}
            onComplete={() => handleStepComplete('update')}
          />
        );
      case 'review':
        return (
          <WeeklyReviewStep
            teamId={teamId}
            onComplete={() => handleStepComplete('review')}
          />
        );
      case 'retro':
        return (
          <WeeklyRetrospective
            teamId={teamId}
            teamName={teamName}
            onComplete={() => handleStepComplete('retro')}
            onSkip={() => handleStepComplete('retro')}
          />
        );
      default:
        return null;
    }
  };

  const allCompleted = completedSteps.size === steps.length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="text-blue-600" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Weekly Team Loop</h3>
              <p className="text-sm text-gray-600">
                {weekStart.toLocaleDateString()} - {weekEnd.toLocaleDateString()}
              </p>
            </div>
          </div>
          {allCompleted && (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle2 size={20} />
              <span className="text-sm font-medium">Completed</span>
            </div>
          )}
        </div>

        {/* Progress Steps */}
        <div className="flex items-center space-x-2 mt-4">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex items-center space-x-2">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    step.completed
                      ? 'bg-green-500 text-white'
                      : currentStep === step.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step.completed ? (
                    <CheckCircle2 size={20} />
                  ) : (
                    <span className="font-semibold">{index + 1}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${currentStep === step.id ? 'text-blue-600' : 'text-gray-600'}`}>
                    {step.label}
                  </p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <ArrowRight className="text-gray-400 mx-2" size={16} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Current Step Content */}
      <div className="mt-6">{renderCurrentStep()}</div>
    </div>
  );
}

// Weekly Update Step Component
function WeeklyUpdateStep({ teamId, onComplete }: { teamId: string; onComplete: () => void }) {
  const [updates, setUpdates] = useState({
    tasksCompleted: 0,
    contributionsLogged: 0,
    blockers: '',
  });

  const handleComplete = () => {
    // Here you would save the update
    onComplete();
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold text-gray-900 mb-4">What did you accomplish this week?</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Tasks Completed</label>
            <input
              type="number"
              value={updates.tasksCompleted}
              onChange={(e) => setUpdates({ ...updates, tasksCompleted: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Contributions Logged</label>
            <input
              type="number"
              value={updates.contributionsLogged}
              onChange={(e) => setUpdates({ ...updates, contributionsLogged: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Any blockers or challenges?</label>
        <textarea
          value={updates.blockers}
          onChange={(e) => setUpdates({ ...updates, blockers: e.target.value })}
          placeholder="Share any challenges you faced..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={4}
        />
      </div>

      <div className="flex justify-end">
        <Button variant="primary" onClick={handleComplete}>
          Complete Update
        </Button>
      </div>
    </div>
  );
}

// Weekly Review Step Component
function WeeklyReviewStep({ teamId, onComplete }: { teamId: string; onComplete: () => void }) {
  const handleComplete = () => {
    // Here you would show analytics/review
    onComplete();
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold text-gray-900 mb-4">Review Team Performance</h4>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            Review your team's participation metrics, workload distribution, and progress this week.
          </p>
          <p className="text-xs text-blue-700 mt-2">
            Check the Analytics page for detailed insights and recommendations.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="primary" onClick={handleComplete}>
          Mark Review Complete
        </Button>
      </div>
    </div>
  );
}
