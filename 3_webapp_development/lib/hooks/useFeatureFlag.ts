/**
 * Hook to check if a feature is enabled
 * 
 * Usage:
 * const canUseTasks = useFeatureFlag('TASKS');
 * if (canUseTasks) { ... }
 */

import { isFeatureEnabled, type FeatureKey } from '@/lib/config/features';

export function useFeatureFlag(feature: FeatureKey): boolean {
  return isFeatureEnabled(feature);
}

/**
 * Hook to check multiple features
 */
export function useFeatureFlags(...features: FeatureKey[]): boolean {
  return features.every(feature => isFeatureEnabled(feature));
}
