'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, X, RefreshCw, Users, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/Button';

export interface ActionableRecommendation {
  id: string;
  type: 'task_redistribution' | 'workload_balance' | 'support_needed' | 'deadline_warning';
  title: string;
  description: string;
  specificAction: string; // e.g., "Team B is overloaded—swap Task X to Team C"
  affectedEntities: {
    from?: { type: 'team' | 'user'; name: string; id: string };
    to?: { type: 'team' | 'user'; name: string; id: string };
    task?: { title: string; id: string };
  };
  impact: 'high' | 'medium' | 'low';
  oneClickAction?: () => Promise<void>;
  onDismiss?: () => void;
}

interface ActionableRecommendationProps {
  recommendation: ActionableRecommendation;
  onApply?: (recId: string) => Promise<void>;
  onDismiss?: (recId: string) => void;
}

export function ActionableRecommendationCard({
  recommendation,
  onApply,
  onDismiss,
}: ActionableRecommendationProps) {
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  const handleApply = async () => {
    if (applying || applied) return;

    setApplying(true);
    try {
      if (recommendation.oneClickAction) {
        await recommendation.oneClickAction();
      } else if (onApply) {
        await onApply(recommendation.id);
      }
      setApplied(true);
      setTimeout(() => {
        if (onDismiss) onDismiss(recommendation.id);
      }, 2000);
    } catch (error) {
      console.error('Failed to apply recommendation:', error);
      setApplying(false);
    }
  };

  const getImpactColor = () => {
    switch (recommendation.impact) {
      case 'high':
        return 'border-red-300 bg-red-50';
      case 'medium':
        return 'border-yellow-300 bg-yellow-50';
      case 'low':
        return 'border-blue-300 bg-blue-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  if (applied) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center space-x-3"
      >
        <Check className="text-green-600" size={20} />
        <span className="text-green-800 font-medium">Recommendation applied successfully!</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border-2 p-5 ${getImpactColor()}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            {recommendation.type === 'task_redistribution' && (
              <RefreshCw className="text-blue-600" size={18} />
            )}
            {recommendation.type === 'support_needed' && (
              <AlertTriangle className="text-yellow-600" size={18} />
            )}
            {recommendation.type === 'workload_balance' && (
              <Users className="text-blue-600" size={18} />
            )}
            <h4 className="font-semibold text-gray-900">{recommendation.title}</h4>
          </div>
          <p className="text-sm text-gray-700 mb-3">{recommendation.description}</p>

          {/* Specific Action in Plain Language */}
          <div className="bg-white rounded-lg p-3 mb-3 border border-gray-200">
            <p className="text-sm font-medium text-gray-900 mb-1">Recommended Action:</p>
            <p className="text-sm text-gray-700">{recommendation.specificAction}</p>
          </div>

          {/* Affected Entities */}
          {recommendation.affectedEntities && (
            <div className="text-xs text-gray-600 space-y-1">
              {recommendation.affectedEntities.from && (
                <p>
                  <span className="font-medium">From:</span>{' '}
                  {recommendation.affectedEntities.from.name}
                </p>
              )}
              {recommendation.affectedEntities.to && (
                <p>
                  <span className="font-medium">To:</span> {recommendation.affectedEntities.to.name}
                </p>
              )}
              {recommendation.affectedEntities.task && (
                <p>
                  <span className="font-medium">Task:</span>{' '}
                  {recommendation.affectedEntities.task.title}
                </p>
              )}
            </div>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={() => onDismiss(recommendation.id)}
            className="text-gray-400 hover:text-gray-600 transition-colors ml-3"
            aria-label="Dismiss"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Action Button */}
      <div className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-200">
        {onDismiss && (
          <Button variant="ghost" size="sm" onClick={() => onDismiss(recommendation.id)}>
            Dismiss
          </Button>
        )}
        <Button
          variant="primary"
          size="sm"
          onClick={handleApply}
          disabled={applying}
          className="flex items-center space-x-2"
        >
          {applying ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Applying...</span>
            </>
          ) : (
            <>
              <span>Apply Now</span>
              <ArrowRight size={14} />
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}

interface ActionableRecommendationsPanelProps {
  recommendations: ActionableRecommendation[];
  onApply?: (recId: string) => Promise<void>;
  onDismiss?: (recId: string) => void;
}

export function ActionableRecommendationsPanel({
  recommendations,
  onApply,
  onDismiss,
}: ActionableRecommendationsPanelProps) {
  if (recommendations.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-8 text-center">
        <p className="text-gray-500">
          No recommendations at this time. Everything looks balanced! 🎉
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Actionable Recommendations</h3>
        <span className="text-sm text-gray-500">
          {recommendations.length} suggestion{recommendations.length !== 1 ? 's' : ''}
        </span>
      </div>
      {recommendations.map((rec) => (
        <ActionableRecommendationCard
          key={rec.id}
          recommendation={rec}
          onApply={onApply}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}
