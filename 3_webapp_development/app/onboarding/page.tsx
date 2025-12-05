'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Check, Users, Briefcase, GraduationCap } from 'lucide-react';
import { Button } from '@/components/Button';
import { useAuth } from '@/lib/auth/AuthContext';
import { updateProfile } from '@/lib/db';
import { AVAILABLE_GOALS } from '@/lib/constants/goals';
import { joinWorkspaceByInviteCode } from '@/app/actions/workspace';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { refreshWorkspaces, switchWorkspace } = useWorkspace();
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [joiningClass, setJoiningClass] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    role: '',
    institution: '',
    goals: [] as string[],
  });

  // Pre-populate form data from user auth or profile
  useEffect(() => {
    if (user || profile) {
      const existingFullName =
        profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || '';

      if (existingFullName && !formData.fullName) {
        setFormData((prev) => ({
          ...prev,
          fullName: existingFullName,
        }));
      }
    }
  }, [user, profile, formData.fullName]);

  // Check for pending class code and auto-join
  useEffect(() => {
    const handlePendingClassCode = async () => {
      if (!user) return;

      const pendingCode = sessionStorage.getItem('pendingClassCode');
      if (pendingCode) {
        setJoiningClass(true);
        try {
          const result = await joinWorkspaceByInviteCode(pendingCode);

          if (result.success && result.workspaceId) {
            // Clear the pending code
            sessionStorage.removeItem('pendingClassCode');

            // Refresh workspaces and switch to the new one
            await refreshWorkspaces();
            switchWorkspace(result.workspaceId);

            // Skip onboarding and go directly to dashboard
            router.push('/dashboard');
          } else {
            // If join failed, clear the code and continue with normal onboarding
            sessionStorage.removeItem('pendingClassCode');
            setJoiningClass(false);
          }
        } catch (error) {
          console.error('Failed to auto-join with class code:', error);
          sessionStorage.removeItem('pendingClassCode');
          setJoiningClass(false);
        }
      }
    };

    handlePendingClassCode();
  }, [user, router, refreshWorkspaces, switchWorkspace]);

  const steps = [
    {
      title: "What's your role?",
      description: 'Help us personalize your experience.',
    },
    {
      title: 'Tell us about yourself',
      description: "We'll customize Qolabb for your needs. All fields are optional.",
    },
  ];

  const roles = [
    {
      id: 'student',
      label: 'Student',
      icon: GraduationCap,
      description: 'I work on team projects',
    },
    {
      id: 'instructor',
      label: 'Instructor',
      icon: Briefcase,
      description: 'I manage and assess teams',
    },
    { id: 'both', label: 'Both', icon: Users, description: 'I do both' },
  ];

  const goals = AVAILABLE_GOALS;

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding - save data and redirect to workspace selection
      if (user) {
        setSaving(true);
        try {
          const finalFullName =
            formData.fullName ||
            profile?.full_name ||
            user?.user_metadata?.full_name ||
            user?.user_metadata?.name ||
            undefined;

          await updateProfile(user.id, {
            full_name: finalFullName,
            role: formData.role as 'student' | 'instructor' | 'both',
            institution: formData.institution || null,
            goals: formData.goals.length > 0 ? formData.goals : null,
          });
          console.log('Onboarding data saved to profile');
          console.log('Saved role:', formData.role);

          // Force a small delay to ensure profile is updated in the database
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          console.error('Failed to save onboarding data:', error);
          // Continue anyway - user can update in settings
        } finally {
          setSaving(false);
        }
      }
      router.push('/workspace');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleRoleSelect = (roleId: string) => {
    setFormData({ ...formData, role: roleId });
  };

  const handleGoalToggle = (goal: string) => {
    const newGoals = formData.goals.includes(goal)
      ? formData.goals.filter((g) => g !== goal)
      : [...formData.goals, goal];
    setFormData({ ...formData, goals: newGoals });
  };

  const canProceed = () => {
    // Step 0 (Role selection): Must select a role
    if (currentStep === 0) return formData.role !== '';
    // Step 1 (Personal info + goals): All fields are optional, can always proceed
    if (currentStep === 1) return true;
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-qolabb-beige-50 flex items-center justify-center p-4">
      {joiningClass ? (
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Joining Your Class...</h2>
          <p className="text-gray-600">
            We're setting up your account. This will only take a moment.
          </p>
        </div>
      ) : (
        <div className="max-w-2xl w-full">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">
                Step {currentStep + 1} of {steps.length}
              </span>
              <span className="text-sm text-gray-500">
                {Math.round(((currentStep + 1) / steps.length) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-blue-600 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Content Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl p-8 md:p-12"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
                  {steps[currentStep].title}
                </h2>
                <p className="text-lg text-gray-600 mb-8">{steps[currentStep].description}</p>

                {/* Step Content */}
                <div className="mb-8">
                  {currentStep === 0 && (
                    <div className="grid grid-cols-1 gap-4">
                      {roles.map((role) => (
                        <motion.button
                          key={role.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleRoleSelect(role.id)}
                          className={`p-6 rounded-xl border-2 transition-all text-left ${
                            formData.role === role.id
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center space-x-4">
                            <div
                              className={`p-3 rounded-lg ${
                                formData.role === role.id ? 'bg-blue-600' : 'bg-gray-100'
                              }`}
                            >
                              <role.icon
                                className={
                                  formData.role === role.id ? 'text-white' : 'text-gray-600'
                                }
                                size={24}
                              />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg text-gray-900">{role.label}</h3>
                              <p className="text-gray-600">{role.description}</p>
                            </div>
                            {formData.role === role.id && (
                              <Check className="text-blue-600" size={24} />
                            )}
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}

                  {currentStep === 1 && (
                    <div className="space-y-6">
                      {/* Personal Info Section */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                          Personal Information
                        </h3>
                        <div>
                          <label
                            htmlFor="fullName"
                            className="block text-sm font-medium text-gray-700 mb-2"
                          >
                            Full Name (optional)
                          </label>
                          <input
                            id="fullName"
                            type="text"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            placeholder={
                              profile?.full_name ||
                              user?.user_metadata?.full_name ||
                              user?.user_metadata?.name
                                ? `Currently: ${profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name}`
                                : 'e.g., John Doe'
                            }
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          {(profile?.full_name ||
                            user?.user_metadata?.full_name ||
                            user?.user_metadata?.name) && (
                            <p className="text-sm text-gray-500 mt-1">
                              We found your name from your account. You can leave this blank to keep
                              it, or enter a new name.
                            </p>
                          )}
                        </div>
                        <div>
                          <label
                            htmlFor="institution"
                            className="block text-sm font-medium text-gray-700 mb-2"
                          >
                            School/University/Institution (optional)
                          </label>
                          <input
                            id="institution"
                            type="text"
                            value={formData.institution}
                            onChange={(e) =>
                              setFormData({ ...formData, institution: e.target.value })
                            }
                            placeholder="e.g., MIT, Harvard University"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      {/* Goals Section */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                          Your Goals (optional)
                        </h3>
                        <p className="text-sm text-gray-600">
                          Select any that apply - you can change these later in settings.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          {goals.map((goal) => (
                            <motion.button
                              key={goal}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleGoalToggle(goal)}
                              className={`p-4 rounded-lg border-2 transition-all ${
                                formData.goals.includes(goal)
                                  ? 'border-blue-600 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-900">{goal}</span>
                                {formData.goals.includes(goal) && (
                                  <Check className="text-blue-600" size={18} />
                                )}
                              </div>
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={currentStep === 0}
                className="group"
              >
                <ArrowLeft
                  className="inline-block mr-2 group-hover:-translate-x-1 transition-transform"
                  size={20}
                />
                Back
              </Button>

              <Button
                variant="primary"
                onClick={handleNext}
                disabled={!canProceed() || saving}
                className="group"
              >
                {saving
                  ? 'Saving...'
                  : currentStep === steps.length - 1
                    ? 'Get Started'
                    : 'Continue'}
                {!saving && (
                  <ArrowRight
                    className="inline-block ml-2 group-hover:translate-x-1 transition-transform"
                    size={20}
                  />
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
