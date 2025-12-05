'use client';

import React from 'react';
import { useFeatureFlag } from '@/lib/hooks/useFeatureFlag';
import { FeatureDisabled } from './FeatureDisabled';
import type { FeatureKey } from '@/lib/config/features';

interface FeatureGuardProps {
  feature: FeatureKey;
  featureName: string;
  description?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * FeatureGuard component - Conditionally renders children based on feature flag
 *
 * Usage:
 * <FeatureGuard feature="TASKS" featureName="Task Management">
 *   <TaskPage />
 * </FeatureGuard>
 */
export function FeatureGuard({
  feature,
  featureName,
  description,
  children,
  fallback,
}: FeatureGuardProps) {
  const isEnabled = useFeatureFlag(feature);

  if (!isEnabled) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <FeatureDisabled featureName={featureName} description={description} />;
  }

  return <>{children}</>;
}
