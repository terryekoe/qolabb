'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Check, Users, Briefcase, GraduationCap } from 'lucide-react';
import { Button } from '@/components/Button';

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    role: '',
    institution: '',
    goals: [] as string[],
  });

  const steps = [
    {
      title: 'Welcome to Qolabb!',
      description: 'Let\'s get you set up in just a few steps.',
    },
    {
      title: 'What\'s your role?',
      description: 'Help us personalize your experience.',
    },
    {
      title: 'Tell us about yourself',
      description: 'We\'ll customize Qolabb for your needs.',
    },
    {
      title: 'What are your goals?',
      description: 'Select all that apply.',
    },
  ];

  const roles = [
    { id: 'student', label: 'Student', icon: GraduationCap, description: 'I work on team projects' },
    { id: 'instructor', label: 'Instructor', icon: Briefcase, description: 'I manage and assess teams' },
    { id: 'both', label: 'Both', icon: Users, description: 'I do both' },
  ];

  const goals = [
    'Track team contributions',
    'Improve collaboration',
    'Fair assessment',
    'Monitor engagement',
    'Data-driven insights',
    'Better teamwork',
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      router.push('/dashboard');
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
      ? formData.goals.filter(g => g !== goal)
      : [...formData.goals, goal];
    setFormData({ ...formData, goals: newGoals });
  };

  const canProceed = () => {
    if (currentStep === 1) return formData.role !== '';
    if (currentStep === 2) return formData.institution !== '';
    if (currentStep === 3) return formData.goals.length > 0;
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-qolabb-beige-50 flex items-center justify-center p-4">
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
              className="bg-qolabb-navy-600 h-2 rounded-full"
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
              <p className="text-lg text-gray-600 mb-8">
                {steps[currentStep].description}
              </p>

              {/* Step Content */}
              <div className="mb-8">
                {currentStep === 0 && (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-qolabb-navy-50 to-qolabb-beige-50 rounded-xl p-6">
                      <p className="text-lg text-gray-700">
                        Qolabb helps you track contributions, visualize engagement, and promote fair collaboration in team projects.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {['Track', 'Analyze', 'Collaborate'].map((feature, i) => (
                        <div key={feature} className="text-center">
                          <div className="bg-qolabb-navy-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                            <span className="text-qolabb-navy-700 font-bold">{i + 1}</span>
                          </div>
                          <p className="font-medium text-gray-700">{feature}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {currentStep === 1 && (
                  <div className="grid grid-cols-1 gap-4">
                    {roles.map((role) => (
                      <motion.button
                        key={role.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleRoleSelect(role.id)}
                        className={`p-6 rounded-xl border-2 transition-all text-left ${
                          formData.role === role.id
                            ? 'border-qolabb-navy-600 bg-qolabb-navy-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`p-3 rounded-lg ${
                            formData.role === role.id ? 'bg-qolabb-navy-600' : 'bg-gray-100'
                          }`}>
                            <role.icon className={formData.role === role.id ? 'text-white' : 'text-gray-600'} size={24} />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-gray-900">{role.label}</h3>
                            <p className="text-gray-600">{role.description}</p>
                          </div>
                          {formData.role === role.id && (
                            <Check className="text-qolabb-navy-600" size={24} />
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}

                {currentStep === 2 && (
                  <div>
                    <label htmlFor="institution" className="block text-sm font-medium text-gray-700 mb-2">
                      School/University/Institution
                    </label>
                    <input
                      id="institution"
                      type="text"
                      value={formData.institution}
                      onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                      placeholder="e.g., MIT, Harvard University"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500 focus:border-transparent"
                    />
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="grid grid-cols-2 gap-3">
                    {goals.map((goal) => (
                      <motion.button
                        key={goal}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleGoalToggle(goal)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          formData.goals.includes(goal)
                            ? 'border-qolabb-navy-600 bg-qolabb-navy-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">{goal}</span>
                          {formData.goals.includes(goal) && (
                            <Check className="text-qolabb-navy-600" size={18} />
                          )}
                        </div>
                      </motion.button>
                    ))}
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
              <ArrowLeft className="inline-block mr-2 group-hover:-translate-x-1 transition-transform" size={20} />
              Back
            </Button>

            <Button
              variant="primary"
              onClick={handleNext}
              disabled={!canProceed()}
              className="group"
            >
              {currentStep === steps.length - 1 ? 'Get Started' : 'Continue'}
              <ArrowRight className="inline-block ml-2 group-hover:translate-x-1 transition-transform" size={20} />
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
