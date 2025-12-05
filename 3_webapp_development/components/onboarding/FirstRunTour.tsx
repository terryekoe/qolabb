'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Check,
  ArrowRight,
  Target,
  Users,
  FolderKanban,
  BarChart3,
  Settings,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/Button';
import { useAuth } from '@/lib/auth/AuthContext';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';
import { updateProfile } from '@/lib/db/queries';
import { useRouter } from 'next/navigation';

interface TourStep {
  id: string;
  title: string;
  description: string;
  checklist: Array<{ id: string; label: string; action?: () => void }>;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const STUDENT_TOUR: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Qolabb! 🎉',
    description: "Let's get you started with your first steps as a student.",
    checklist: [
      { id: 'join-team', label: 'Join or create a group', action: () => {} },
      { id: 'view-tasks', label: 'Check your assigned tasks', action: () => {} },
      { id: 'log-contribution', label: 'Log your first contribution', action: () => {} },
    ],
    icon: Target,
  },
  {
    id: 'tasks',
    title: 'Manage Your Tasks',
    description: 'Tasks help you track what needs to be done. Here’s what you can do:',
    checklist: [
      { id: 'view-board', label: 'View your task board', action: () => {} },
      { id: 'update-status', label: 'Update task status as you work', action: () => {} },
      { id: 'log-time', label: 'Track time spent on tasks', action: () => {} },
    ],
    icon: FolderKanban,
  },
  {
    id: 'teamwork',
    title: 'Collaborate with Your Group',
    description: 'Work together effectively with your group members:',
    checklist: [
      { id: 'view-team', label: 'See your group members', action: () => {} },
      { id: 'view-workload', label: 'Check group workload balance', action: () => {} },
      { id: 'communicate', label: 'Use comments on tasks', action: () => {} },
    ],
    icon: Users,
  },
];

const INSTRUCTOR_TOUR: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome, Instructor! 👋',
    description: "Let's set up your class for managing student groups.",
    checklist: [
      { id: 'create-project', label: 'Create your first project', action: () => {} },
      { id: 'view-teams', label: 'Review group structure', action: () => {} },
      { id: 'set-expectations', label: 'Set participation expectations', action: () => {} },
    ],
    icon: Target,
  },
  {
    id: 'analytics',
    title: 'Monitor Participation',
    description: 'Track how groups are performing:',
    checklist: [
      { id: 'view-analytics', label: 'Check analytics dashboard', action: () => {} },
      { id: 'identify-imbalance', label: 'Identify workload imbalances', action: () => {} },
      { id: 'provide-support', label: 'Support struggling students', action: () => {} },
    ],
    icon: BarChart3,
  },
  {
    id: 'management',
    title: 'Manage Groups & Tasks',
    description: 'Keep everything organized:',
    checklist: [
      { id: 'assign-tasks', label: 'Assign tasks to group members', action: () => {} },
      { id: 'balance-workload', label: 'Balance group workloads', action: () => {} },
      { id: 'review-contributions', label: 'Review contributions', action: () => {} },
    ],
    icon: Settings,
  },
];

interface FirstRunTourProps {
  onComplete: () => void;
}

export function FirstRunTour({ onComplete }: FirstRunTourProps) {
  const { profile, user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState(false);

  const role = profile?.role?.toLowerCase() || 'student';
  const isInstructor = role === 'instructor' || role === 'both';
  const tourSteps = isInstructor ? INSTRUCTOR_TOUR : STUDENT_TOUR;

  // Debug logging to help identify role issues
  useEffect(() => {
    console.log('FirstRunTour - Profile role:', profile?.role);
    console.log('FirstRunTour - Normalized role:', role);
    console.log('FirstRunTour - Is instructor:', isInstructor);
    console.log('FirstRunTour - Using tour:', isInstructor ? 'INSTRUCTOR' : 'STUDENT');
  }, [profile?.role, role, isInstructor]);

  const handleCheckItem = async (itemId: string, action?: () => void) => {
    if (action) {
      action();
    }
    setCompletedItems((prev) => new Set([...prev, itemId]));
  };

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    // Save completion to localStorage first
    if (typeof window !== 'undefined') {
      localStorage.setItem('first_tour_completed', 'true');
    }

    if (user) {
      try {
        // Mark tour as completed in profile
        await updateProfile(user.id, {
          onboarding_completed: true,
          first_tour_completed: true,
        });
      } catch (error) {
        console.error('Failed to save tour completion:', error);
      }
    }
    setDismissed(true);
    setTimeout(() => onComplete(), 300);
  };

  const handleDismiss = async () => {
    // Save dismissal to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('first_tour_completed', 'true');
    }

    // Also try to update profile if user exists
    if (user) {
      try {
        await updateProfile(user.id, {
          first_tour_completed: true,
        });
      } catch (error) {
        console.error('Failed to save tour dismissal:', error);
      }
    }

    setDismissed(true);
    setTimeout(() => onComplete(), 300);
  };

  const currentTourStep = tourSteps[currentStep];
  const Icon = currentTourStep.icon;

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
        onClick={handleDismiss}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Icon size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{currentTourStep.title}</h2>
                  <p className="text-blue-100 text-sm mt-1">
                    Step {currentStep + 1} of {tourSteps.length}
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Skip tour"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            <p className="text-gray-600 text-lg mb-6">{currentTourStep.description}</p>

            {/* Checklist */}
            <div className="space-y-3">
              {currentTourStep.checklist.map((item) => {
                const isCompleted = completedItems.has(item.id);
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => handleCheckItem(item.id, item.action)}
                    className={`w-full flex items-center space-x-3 p-4 rounded-xl border-2 transition-all ${
                      isCompleted
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-gray-50 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isCompleted ? 'bg-blue-500 text-white' : 'bg-white border-2 border-gray-300'
                      }`}
                    >
                      {isCompleted && <Check size={14} />}
                    </div>
                    <span
                      className={`flex-1 text-left font-medium ${isCompleted ? 'text-gray-700' : 'text-gray-900'}`}
                    >
                      {item.label}
                    </span>
                    {isCompleted && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-blue-500"
                      >
                        <Sparkles size={16} />
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Progress Indicator */}
            <div className="mt-6 flex space-x-2 justify-center">
              {tourSteps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index === currentStep
                      ? 'w-8 bg-blue-500'
                      : index < currentStep
                        ? 'w-2 bg-blue-300'
                        : 'w-2 bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-6 flex items-center justify-between">
            <button
              onClick={handleDismiss}
              className="text-gray-600 hover:text-gray-900 font-medium px-4 py-2"
            >
              Skip Tour
            </button>
            <Button onClick={handleNext} variant="primary" className="flex items-center space-x-2">
              <span>{currentStep < tourSteps.length - 1 ? 'Next' : 'Get Started'}</span>
              <ArrowRight size={18} />
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
