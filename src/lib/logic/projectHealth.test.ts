import { describe, it, expect } from 'vitest';
import { calculateProjectHealth } from './projectHealth';
import { Project } from '@/types/project';
import { DEFAULT_DORMANCY_THRESHOLD } from '@/types/health';

// Helper to create a partial project for testing
const createProject = (overrides: Partial<Project>): Project => ({
    id: 1,
    path: '/tmp/test',
    name: 'test-project',
    type: 'folder',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
});

describe('calculateProjectHealth', () => {
    it('returns stuck if project is marked stuck', () => {
        const project = createProject({ isStuck: true });
        expect(calculateProjectHealth(project)).toBe('stuck');
    });

    it('returns attention for git project with uncommitted changes', () => {
        const project = createProject({
            type: 'git',
            uncommittedCount: 1,
        });
        expect(calculateProjectHealth(project)).toBe('attention');
    });

    it('returns active for git project with 0 uncommitted changes and recent activity', () => {
        const recentDate = new Date(); // now
        const project = createProject({
            type: 'git',
            uncommittedCount: 0,
            lastActivityAt: recentDate.toISOString(),
        });
        expect(calculateProjectHealth(project)).toBe('active');
    });

    it('does NOT return attention for folder project even if uncommittedCount > 0 (data/logic error handling)', () => {
        const project = createProject({
            type: 'folder',
            uncommittedCount: 5,
            lastActivityAt: new Date().toISOString(),
        });
        // Should fall through to active/dormant based on date
        expect(calculateProjectHealth(project)).toBe('active');
    });

    it('returns active if days since activity <= threshold', () => {
        const now = new Date();
        const project = createProject({
            lastActivityAt: now.toISOString(),
        });
        expect(calculateProjectHealth(project)).toBe('active');
    });

    it('returns dormant if days since activity > threshold', () => {
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - (DEFAULT_DORMANCY_THRESHOLD + 1));

        const project = createProject({
            lastActivityAt: oldDate.toISOString(),
        });
        expect(calculateProjectHealth(project)).toBe('dormant');
    });

    it('uses custom threshold', () => {
        const threshold = 5;
        const borderDate = new Date();
        borderDate.setDate(borderDate.getDate() - 6); // 6 days ago > 5

        const project = createProject({
            lastActivityAt: borderDate.toISOString(),
        });
        expect(calculateProjectHealth(project, threshold)).toBe('dormant');
    });

    it('returns active when days since activity equals threshold exactly (boundary)', () => {
        const threshold = 14;
        const exactBoundaryDate = new Date();
        exactBoundaryDate.setDate(exactBoundaryDate.getDate() - threshold); // exactly 14 days ago

        const project = createProject({
            lastActivityAt: exactBoundaryDate.toISOString(),
        });
        expect(calculateProjectHealth(project, threshold)).toBe('active');
    });

    it('treats negative threshold as 0 (security validation)', () => {
        const today = new Date();
        const project = createProject({
            lastActivityAt: today.toISOString(),
        });
        // With threshold 0, activity today (0 days) should be active (0 <= 0)
        expect(calculateProjectHealth(project, -5)).toBe('active');

        // With 1 day old activity and threshold of -5 (becomes 0), should be dormant
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const oldProject = createProject({
            lastActivityAt: yesterday.toISOString(),
        });
        expect(calculateProjectHealth(oldProject, -5)).toBe('dormant');
    });

    it('handles undefined uncommittedCount as 0', () => {
        const project = createProject({
            type: 'git',
            uncommittedCount: undefined,
            lastActivityAt: new Date().toISOString(),
        });
        expect(calculateProjectHealth(project)).toBe('active');
    });

    it('handles missing lastActivityAt (uses updated_at or assumes dormant? logic says verify)', () => {
        // Logic spec says: "Activity Check: const days = calculateDaysSince(project.lastActivityAt);"
        // Types say lastActivityAt is optional.
        // Usually fallback to updated_at logic is inside components, but if logic function takes project, it should handle it.
        // Story doesn't strictly specify fallback in pseudo-code, but ProjectCard does: `project.lastActivityAt || project.updated_at`.
        // I will assume the function should handle it or I should be explicit in passing it?
        // "Status calculation happens on the frontend using available project data"
        // Let's implement robustly: use lastActivityAt ?? updated_at ?? created_at

        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 20);

        const project = createProject({
            lastActivityAt: undefined,
            updated_at: oldDate.toISOString(),
        });
        // If it falls back to updated_at, it should be dormant
        expect(calculateProjectHealth(project)).toBe('dormant');
    });

    // Regression test: Epic 2 bug fix - git projects should be dormant when inactive >threshold
    it('returns dormant for git project inactive for 15 days with no uncommitted changes', () => {
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

        const project = createProject({
            type: 'git',
            uncommittedCount: 0,
            lastActivityAt: fifteenDaysAgo.toISOString(),
        });

        expect(calculateProjectHealth(project)).toBe('dormant');
    });

    // Regression test: uncommitted changes should take priority over dormancy
    it('returns attention for git project inactive for 15 days WITH uncommitted changes (priority override)', () => {
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

        const project = createProject({
            type: 'git',
            uncommittedCount: 5,
            lastActivityAt: fifteenDaysAgo.toISOString(),
        });

        // Even though inactive >14 days, uncommitted changes have higher priority
        expect(calculateProjectHealth(project)).toBe('attention');
    });
});
