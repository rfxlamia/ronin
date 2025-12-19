export type ProjectType = 'git' | 'folder';

export type ProjectHealth = 'active' | 'dormant' | 'stuck' | 'attention';

export interface Project {
    id: number;
    path: string;
    name: string;
    type: ProjectType;
    created_at: string;
    updated_at: string;
    // Optional fields
    gitBranch?: string;
    uncommittedCount?: number;
    lastActivityAt?: string;
    healthStatus?: ProjectHealth;
    isStuck?: boolean; // Reserved for Epic 6
    fileCount?: number; // For folder projects
    isArchived?: boolean; // For archive functionality
}

export const DEFAULT_DORMANCY_THRESHOLD = 14;
