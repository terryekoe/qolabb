'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  CheckCircle2,
  MessageSquare,
  Users,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/Button';

interface RetroTemplate {
  id: string;
  name: string;
  questions: string[];
}

const RETRO_TEMPLATES: RetroTemplate[] = [
  {
    id: 'start-stop-continue',
    name: 'Start / Stop / Continue',
    questions: [
      'What should we start doing?',
      'What should we stop doing?',
      'What should we continue doing?',
    ],
  },
  {
    id: 'rose-thorn-bud',
    name: 'Rose / Thorn / Bud',
    questions: [
      'Rose: What went well this week?',
      'Thorn: What challenges did we face?',
      'Bud: What are we looking forward to?',
    ],
  },
  {
    id: 'what-went-well',
    name: 'What Went Well',
    questions: [
      'What went well this week?',
      'What could be improved?',
      'What did we learn?',
      'What are our action items?',
    ],
  },
];

interface RetroResponse {
  questionId: string;
  response: string;
}

interface WeeklyRetrospectiveProps {
  teamId: string;
  teamName: string;
  onComplete?: (responses: RetroResponse[]) => void;
  onSkip?: () => void;
}

export function WeeklyRetrospective({
  teamId,
  teamName,
  onComplete,
  onSkip,
}: WeeklyRetrospectiveProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<RetroTemplate | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTemplateSelect = (template: RetroTemplate) => {
    setSelectedTemplate(template);
    // Initialize responses
    const initialResponses: Record<string, string> = {};
    template.questions.forEach((_, index) => {
      initialResponses[`q${index}`] = '';
    });
    setResponses(initialResponses);
    setCurrentQuestionIndex(0);
  };

  const handleResponseChange = (value: string) => {
    setResponses((prev) => ({
      ...prev,
      [`q${currentQuestionIndex}`]: value,
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < (selectedTemplate?.questions.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (!selectedTemplate) return;

    setIsSubmitting(true);
    try {
      const retroResponses: RetroResponse[] = selectedTemplate.questions.map((question, index) => ({
        questionId: `q${index}`,
        response: responses[`q${index}`] || '',
      }));

      // Here you would save to database
      // await saveRetrospective(teamId, retroResponses, selectedTemplate.id);

      if (onComplete) {
        onComplete(retroResponses);
      }
    } catch (error) {
      console.error('Failed to save retrospective:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQuestion = selectedTemplate?.questions[currentQuestionIndex];
  const currentResponse = responses[`q${currentQuestionIndex}`] || '';
  const isLastQuestion =
    selectedTemplate && currentQuestionIndex === selectedTemplate.questions.length - 1;
  const allResponsesFilled =
    selectedTemplate &&
    selectedTemplate.questions.every((_, index) => responses[`q${index}`]?.trim());

  if (!selectedTemplate) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Calendar className="text-blue-600" size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Weekly Retrospective</h3>
            <p className="text-sm text-gray-600">Time for {teamName} to reflect on the week</p>
          </div>
        </div>

        <p className="text-gray-700 mb-6">Choose a template to get started:</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {RETRO_TEMPLATES.map((template) => (
            <motion.button
              key={template.id}
              onClick={() => handleTemplateSelect(template)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
            >
              <h4 className="font-semibold text-gray-900 mb-2">{template.name}</h4>
              <p className="text-xs text-gray-600">{template.questions.length} questions</p>
            </motion.button>
          ))}
        </div>

        {onSkip && (
          <div className="mt-6 flex justify-end">
            <Button variant="ghost" onClick={onSkip}>
              Skip this week
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">{selectedTemplate.name}</h3>
          <span className="text-sm text-gray-500">
            Question {currentQuestionIndex + 1} of {selectedTemplate.questions.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{
              width: `${((currentQuestionIndex + 1) / selectedTemplate.questions.length) * 100}%`,
            }}
            className="bg-blue-500 h-2 rounded-full"
          />
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-gray-900 font-medium mb-3">{currentQuestion}</label>
        <textarea
          value={currentResponse}
          onChange={(e) => handleResponseChange(e.target.value)}
          placeholder="Share your thoughts..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={6}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          {currentQuestionIndex > 0 && (
            <Button variant="secondary" onClick={handleBack}>
              Back
            </Button>
          )}
        </div>
        <div className="flex space-x-2">
          {onSkip && (
            <Button variant="ghost" onClick={onSkip}>
              Skip
            </Button>
          )}
          {isLastQuestion ? (
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!allResponsesFilled || isSubmitting}
              className="flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Complete Retrospective</span>
                </>
              )}
            </Button>
          ) : (
            <Button variant="primary" onClick={handleNext} disabled={!currentResponse.trim()}>
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
