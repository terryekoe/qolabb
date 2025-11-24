/**
 * Feature Flags Configuration
 * 
 * Use this to enable/disable features for MVP vs. full feature set.
 * Set to `false` to hide features that are not part of the MVP.
 * 
 * MVP Focus: Participation visibility for educational group projects
 */

export const FEATURES = {
  // CORE MVP FEATURES - Keep enabled
  DASHBOARD: true,
  STUDY_GROUPS: true,          // Teams (renamed for educational context)
  CONTRIBUTIONS: true,          // "What I Did" - core feature
  PARTICIPATION_CHART: true,    // Basic participation visibility
  PEER_EVALUATIONS: true,      // Unique educational value
  
  // HIDE FOR MVP - Set to false
  TASKS: true,                 // Too complex for first-time users
  PROJECTS: true,              // Not needed for MVP - focus on contributions
  ADVANCED_ANALYTICS: false,   // Hide complex charts, keep basic participation
  COMMUNICATION: false,         // Students use WhatsApp/Slack already
  TEAM_CHAT: false,             // Part of communication
  PROJECT_DISCUSSIONS: false,   // Part of communication
  DIRECT_MESSAGING: false,      // Part of communication
  INTEGRATIONS: false,          // Google/GitHub - too complex for MVP
  GOOGLE_DOCS_INTEGRATION: false,
  GITHUB_INTEGRATION: false,
  MOTIVATIONAL_MESSAGES: false, // Nice to have, not core
  SETTINGS_ADVANCED: false,     // Hide integrations, advanced settings
  SETTINGS_PROFILE: true,       // Keep basic profile settings
  EXPORT_REPORTS: false,        // Not needed for MVP
  NOTIFICATIONS: false,         // Too complex for MVP
  
  // FUTURE FEATURES - Keep disabled
  WORKSPACE_SWITCHING: false,   // Start with single workspace
  MULTIPLE_ROLES: false,        // Simplify role management
  ADVANCED_PERMISSIONS: false,  // Simplify permissions
  
  // EDUCATIONAL FEATURES - Keep enabled
  PEER_FEEDBACK: true,          // Core educational value
  PARTICIPATION_TRACKING: true, // Core feature
} as const;

export type FeatureKey = keyof typeof FEATURES;

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: FeatureKey): boolean {
  return FEATURES[feature] === true;
}

/**
 * Get all enabled features
 */
export function getEnabledFeatures(): FeatureKey[] {
  return (Object.keys(FEATURES) as FeatureKey[]).filter(
    key => FEATURES[key] === true
  );
}

/**
 * Get all disabled features
 */
export function getDisabledFeatures(): FeatureKey[] {
  return (Object.keys(FEATURES) as FeatureKey[]).filter(
    key => FEATURES[key] === false
  );
}

/**
 * Check multiple features (returns true if ALL are enabled)
 */
export function areFeaturesEnabled(...features: FeatureKey[]): boolean {
  return features.every(feature => isFeatureEnabled(feature));
}

/**
 * Check multiple features (returns true if ANY is enabled)
 */
export function isAnyFeatureEnabled(...features: FeatureKey[]): boolean {
  return features.some(feature => isFeatureEnabled(feature));
}
