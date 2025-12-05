/**
 * Shared goals constants for consistency across onboarding and settings
 */

export const AVAILABLE_GOALS = [
  'Track team contributions',
  'Improve collaboration',
  'Fair assessment',
  'Monitor engagement',
  'Data-driven insights',
  'Better teamwork',
] as const;

export type Goal = (typeof AVAILABLE_GOALS)[number];
