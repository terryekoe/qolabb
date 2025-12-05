'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, X, Users, FolderKanban, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/Button';

interface OnboardingChecklistProps {
  hasGroups: boolean;
  hasAssignments: boolean;
  hasContributions: boolean;
}

export const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({
  hasGroups,
  hasAssignments,
  hasContributions,
}) => {
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showClassCodeInput, setShowClassCodeInput] = useState(false);
  const [classCode, setClassCode] = useState('');

  // Check if checklist should be shown
  useEffect(() => {
    const dismissed = localStorage.getItem(`onboarding-dismissed-${user?.id}`);
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, [user?.id]);

  // Auto-dismiss if all steps are complete
  useEffect(() => {
    if (currentWorkspace && hasGroups && hasAssignments) {
      handleDismiss();
    }
  }, [currentWorkspace, hasGroups, hasAssignments]);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (user?.id) {
      localStorage.setItem(`onboarding-dismissed-${user.id}`, 'true');
    }
  };

  const handleJoinClass = () => {
    router.push('/workspace');
  };

  const handleJoinGroup = () => {
    router.push('/teams');
  };

  const handleViewAssignments = () => {
    router.push('/projects');
  };

  // Don't show if dismissed or if user already has a workspace
  if (isDismissed || currentWorkspace) {
    return null;
  }

  const steps = [
    {
      id: 'join-class',
      label: 'Join a Class',
      description: 'Enter your class code to get started',
      icon: Users,
      completed: !!currentWorkspace,
      action: handleJoinClass,
    },
    {
      id: 'join-group',
      label: 'Join a Group',
      description: 'Collaborate with your teammates',
      icon: UserPlus,
      completed: hasGroups,
      action: handleJoinGroup,
      disabled: !currentWorkspace,
    },
    {
      id: 'view-assignments',
      label: 'View Assignments',
      description: 'See what you need to work on',
      icon: FolderKanban,
      completed: hasAssignments,
      action: handleViewAssignments,
      disabled: !currentWorkspace,
    },
  ];

  const completedCount = steps.filter((step) => step.completed).length;
  const progress = (completedCount / steps.length) * 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 mb-6 relative overflow-hidden"
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full -mr-16 -mt-16 opacity-50" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-100 rounded-full -ml-12 -mb-12 opacity-50" />

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 hover:bg-white/50 rounded-lg transition-colors z-10"
          aria-label="Dismiss checklist"
        >
          <X size={20} className="text-gray-600" />
        </button>

        {/* Header */}
        <div className="relative z-10 mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">👋 Welcome to Qolabb!</h3>
          <p className="text-gray-700">Let's get you started in just a few steps</p>
        </div>

        {/* Progress bar */}
        <div className="relative z-10 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              {completedCount} of {steps.length} completed
            </span>
            <span className="text-sm text-gray-600">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-white rounded-full h-3 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full"
            />
          </div>
        </div>

        {/* Steps */}
        <div className="relative z-10 space-y-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                  step.completed
                    ? 'bg-white/80 border-2 border-green-200'
                    : step.disabled
                      ? 'bg-white/40 border-2 border-gray-200 opacity-60'
                      : 'bg-white border-2 border-blue-200 hover:border-blue-300 cursor-pointer hover:shadow-md'
                }`}
                onClick={() => !step.disabled && !step.completed && step.action()}
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div
                    className={`p-3 rounded-lg ${
                      step.completed
                        ? 'bg-green-100'
                        : step.disabled
                          ? 'bg-gray-100'
                          : 'bg-blue-100'
                    }`}
                  >
                    <Icon
                      size={24}
                      className={
                        step.completed
                          ? 'text-green-600'
                          : step.disabled
                            ? 'text-gray-400'
                            : 'text-blue-600'
                      }
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{step.label}</h4>
                    <p className="text-sm text-gray-600">{step.description}</p>
                  </div>
                </div>
                <div>
                  {step.completed ? (
                    <CheckCircle2 className="text-green-600" size={28} />
                  ) : (
                    <Circle
                      className={step.disabled ? 'text-gray-300' : 'text-blue-400'}
                      size={28}
                    />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        {!currentWorkspace && (
          <div className="relative z-10 mt-6 p-4 bg-white rounded-xl border-2 border-blue-200">
            <p className="text-sm font-medium text-gray-700 mb-3">
              Have a class code? Enter it here to join your class:
            </p>
            <div className="flex space-x-2">
              <input
                type="text"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
              <Button variant="primary" onClick={handleJoinClass} disabled={!classCode.trim()}>
                Join
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
