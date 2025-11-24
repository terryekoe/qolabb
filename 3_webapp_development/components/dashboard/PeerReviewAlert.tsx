'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ClipboardCheck, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/Button';
import { useRouter } from 'next/navigation';

interface PendingEvaluation {
  id: string;
  evaluatee_name?: string;
  project_name?: string;
  due_date?: string;
}

interface PeerReviewAlertProps {
  pendingEvaluations: PendingEvaluation[];
}

export const PeerReviewAlert: React.FC<PeerReviewAlertProps> = ({ pendingEvaluations }) => {
  const router = useRouter();
  
  if (!pendingEvaluations || pendingEvaluations.length === 0) {
    return null;
  }

  const count = pendingEvaluations.length;
  const isUrgent = pendingEvaluations.some(evaluation => {
    if (!evaluation.due_date) return false;
    const dueDate = new Date(evaluation.due_date);
    const now = new Date();
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilDue < 24 && hoursUntilDue > 0;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border-2 p-4 sm:p-6 ${
        isUrgent
          ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
      }`}
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-lg ${
          isUrgent
            ? 'bg-red-100 dark:bg-red-800'
            : 'bg-blue-100 dark:bg-blue-800'
        }`}>
          {isUrgent ? (
            <AlertCircle className={`w-6 h-6 ${
              isUrgent
                ? 'text-red-600 dark:text-red-400'
                : 'text-blue-600 dark:text-blue-400'
            }`} />
          ) : (
            <ClipboardCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className={`text-lg font-semibold mb-1 ${
            isUrgent
              ? 'text-red-900 dark:text-red-100'
              : 'text-blue-900 dark:text-blue-100'
          }`}>
            {isUrgent ? '⚠️ Urgent: ' : ''}Peer Reviews Needed
          </h3>
          <p className={`text-sm mb-3 ${
            isUrgent
              ? 'text-red-700 dark:text-red-300'
              : 'text-blue-700 dark:text-blue-300'
          }`}>
            You have <strong>{count}</strong> peer {count === 1 ? 'review' : 'reviews'} to complete.
            {isUrgent && ' Some are due within 24 hours!'}
          </p>
          
          {/* Show first 2 pending evaluations */}
          <div className="space-y-2 mb-4">
            {pendingEvaluations.slice(0, 2).map((evaluation) => (
              <div
                key={evaluation.id}
                className={`text-sm flex items-center gap-2 ${
                  isUrgent
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-blue-600 dark:text-blue-400'
                }`}
              >
                <Clock className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">
                  Review {evaluation.evaluatee_name || 'teammate'}
                  {evaluation.project_name && ` for ${evaluation.project_name}`}
                </span>
              </div>
            ))}
            {count > 2 && (
              <p className={`text-xs ${
                isUrgent
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-blue-600 dark:text-blue-400'
              }`}>
                + {count - 2} more {count - 2 === 1 ? 'review' : 'reviews'}
              </p>
            )}
          </div>

          <Button
            onClick={() => router.push('/evaluations')}
            variant="primary"
            size="sm"
            className={isUrgent ? 'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800' : ''}
          >
            Complete Reviews
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
