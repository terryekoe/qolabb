'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Send, AlertCircle, FolderKanban } from 'lucide-react';
import { Button } from '@/components/Button';
import { submitPeerEvaluation } from '@/lib/db/queries';
import { toast } from 'react-hot-toast';

interface PeerEvaluationFormProps {
  evaluationPeriodId: string;
  evaluateeId: string;
  evaluateeName: string;
  evaluateeAvatar?: string;
  teamId: string;
  projectId?: string;
  projectName?: string;
  isAnonymous: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

const RATING_LABELS = {
  contribution: 'Contribution to Team',
  communication: 'Communication',
  collaboration: 'Collaboration',
  reliability: 'Reliability',
};

export function PeerEvaluationForm({
  evaluationPeriodId,
  evaluateeId,
  evaluateeName,
  evaluateeAvatar,
  teamId,
  projectId,
  projectName,
  isAnonymous,
  onSuccess,
  onCancel,
}: PeerEvaluationFormProps) {
  const [scores, setScores] = useState({
    contribution: 0,
    communication: 0,
    collaboration: 0,
    reliability: 0,
  });
  const [strengths, setStrengths] = useState('');
  const [areasForImprovement, setAreasForImprovement] = useState('');
  const [additionalComments, setAdditionalComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleScoreChange = (category: keyof typeof scores, value: number) => {
    setScores({ ...scores, [category]: value });
    // Clear error for this category
    if (errors[category]) {
      const newErrors = { ...errors };
      delete newErrors[category];
      setErrors(newErrors);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (scores.contribution === 0) newErrors.contribution = 'Please rate contribution';
    if (scores.communication === 0) newErrors.communication = 'Please rate communication';
    if (scores.collaboration === 0) newErrors.collaboration = 'Please rate collaboration';
    if (scores.reliability === 0) newErrors.reliability = 'Please rate reliability';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Please complete all rating fields');
      return;
    }

    setLoading(true);
    try {
      await submitPeerEvaluation({
        evaluationPeriodId,
        evaluateeId,
        teamId,
        projectId,
        contributionScore: scores.contribution,
        communicationScore: scores.communication,
        collaborationScore: scores.collaboration,
        reliabilityScore: scores.reliability,
        strengths: strengths.trim() || undefined,
        areasForImprovement: areasForImprovement.trim() || undefined,
        additionalComments: additionalComments.trim() || undefined,
      });

      toast.success('Evaluation submitted successfully!');
      onSuccess();
    } catch (error: any) {
      console.error('Error submitting evaluation:', error);
      toast.error(error.message || 'Failed to submit evaluation');
    } finally {
      setLoading(false);
    }
  };

  const StarRating = ({ category }: { category: keyof typeof scores }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {RATING_LABELS[category]} {errors[category] && (
          <span className="text-red-500 text-xs ml-1">*</span>
        )}
      </label>
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => handleScoreChange(category, value)}
            className={`transition-all ${
              scores[category] >= value
                ? 'text-yellow-400 scale-110'
                : 'text-gray-300 dark:text-gray-600 hover:text-yellow-300'
            }`}
            disabled={loading}
          >
            <Star
              size={32}
              className={scores[category] >= value ? 'fill-current' : ''}
            />
          </button>
        ))}
        {scores[category] > 0 && (
          <span className="ml-2 text-sm font-medium text-gray-600 dark:text-gray-400">
            {scores[category]} / 5
          </span>
        )}
      </div>
      {errors[category] && (
        <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
          <AlertCircle size={14} />
          {errors[category]}
        </p>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          {evaluateeAvatar ? (
            <img src={evaluateeAvatar} alt={evaluateeName} className="w-full h-full rounded-full" />
          ) : (
            <span className="text-blue-600 dark:text-blue-400 font-semibold">
              {evaluateeName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Evaluating {evaluateeName}
          </h3>
          {projectName && (
            <div className="flex items-center gap-1 mt-1">
              <FolderKanban size={14} className="text-gray-500 dark:text-gray-400" />
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Project: {projectName}
              </p>
            </div>
          )}
          {isAnonymous && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Your evaluation will be anonymous
            </p>
          )}
        </div>
      </div>

      {/* Ratings */}
      <div className="space-y-6">
        <StarRating category="contribution" />
        <StarRating category="communication" />
        <StarRating category="collaboration" />
        <StarRating category="reliability" />
      </div>

      {/* Feedback Fields */}
      <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div>
          <label htmlFor="strengths" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Strengths
          </label>
          <textarea
            id="strengths"
            value={strengths}
            onChange={(e) => setStrengths(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none"
            placeholder="What are this person's key strengths?"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="improvements" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Areas for Improvement
          </label>
          <textarea
            id="improvements"
            value={areasForImprovement}
            onChange={(e) => setAreasForImprovement(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none"
            placeholder="What could this person improve on?"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="comments" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Additional Comments
          </label>
          <textarea
            id="comments"
            value={additionalComments}
            onChange={(e) => setAdditionalComments(e.target.value)}
            rows={2}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none"
            placeholder="Any other feedback or comments?"
            disabled={loading}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={loading}
          className="flex items-center gap-2"
        >
          <Send size={18} />
          {loading ? 'Submitting...' : 'Submit Evaluation'}
        </Button>
      </div>
    </form>
  );
}
