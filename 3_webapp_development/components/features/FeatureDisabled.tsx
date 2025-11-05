'use client';

import React from 'react';
import { Lock, Info } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/Button';

interface FeatureDisabledProps {
  featureName: string;
  description?: string;
  showBackButton?: boolean;
}

export function FeatureDisabled({ 
  featureName, 
  description = 'This feature is not available in the current version.',
  showBackButton = true 
}: FeatureDisabledProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-8">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
            <Lock className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {featureName} Not Available
        </h2>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {description}
        </p>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Focused on Core Features
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                We're keeping the MVP simple to help students focus on participation tracking. 
                This feature may be added in a future update based on user feedback.
              </p>
            </div>
          </div>
        </div>
        
        {showBackButton && (
          <Link href="/dashboard">
            <Button variant="primary" className="w-full">
              Back to Dashboard
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
