import { Project, ProjectHealth, DEFAULT_DORMANCY_THRESHOLD } from '@/types/project';
import { calculateDaysSince } from '@/lib/utils/dateUtils';

/**
 * Calculates the health status of a project based on its properties and activity.
 * 
 * Logic Priority:
 * 1. Stuck (if isStuck is true) -> 'stuck'
 * 2. Needs Attention (if Git project AND uncommittedCount > 0) -> 'attention'
 * 3. Active (if daysSinceActivity <= threshold) -> 'active'
 * 4. Dormant (otherwise) -> 'dormant'
 * 
 * @param project The project to evaluate
 * @param thresholdDays Days before a project is considered dormant (default: 14)
 * @returns ProjectHealth status
 */
export function calculateProjectHealth(
    project: Project,
    thresholdDays: number = DEFAULT_DORMANCY_THRESHOLD
): ProjectHealth {
    // Validate threshold (must be non-negative per security considerations)
    const validatedThreshold = Math.max(0, thresholdDays);

    // 1. Stuck Check (Highest Priority)
    if (project.isStuck) {
        return 'stuck';
    }

    // 2. Needs Attention Check (Git Only)
    // We treat undefined uncommittedCount as 0 (safe default)
    const uncommitted = project.uncommittedCount ?? 0;
    if (project.type === 'git' && uncommitted > 0) {
        return 'attention';
    }

    // 3. Activity Check
    // Determine the most recent activity date
    // Fallback order: lastActivityAt -> updated_at -> created_at -> now (failsafe)
    const lastActivity = project.lastActivityAt || project.updated_at || project.created_at || new Date().toISOString();

    // Use the utility to calculate days
    const days = calculateDaysSince(lastActivity);

    // Compare against threshold
    if (days <= validatedThreshold) {
        return 'active';
    }

    // 4. Fallback
    return 'dormant';
}
