// Types for project health status
export type ProjectHealth = 'active' | 'dormant' | 'attention' | 'stuck';

// Default dormancy threshold in days
export const DEFAULT_DORMANCY_THRESHOLD = 14;