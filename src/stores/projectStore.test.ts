import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useProjectStore, useFilteredProjects } from './projectStore';
import type { Project } from '@/types/project';

// Mock Tauri invoke (untuk archiveProject/removeProject jika dipanggil)
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

const mockProject = (overrides: Partial<Project> = {}): Project => ({
    id: 1,
    name: 'test-project',
    path: '/path/to/project',
    type: 'git',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    isArchived: false,
    healthStatus: 'active',
    lastActivityAt: '2026-01-01',
    ...overrides,
});

describe('useFilteredProjects', () => {
    beforeEach(() => {
        useProjectStore.setState({
            projects: [],
            searchQuery: '',
            filterStatus: 'all',
        });
    });

    it('returns non-archived projects when filterStatus is all', () => {
        useProjectStore.setState({
            projects: [
                mockProject({ id: 1, name: 'active-one', isArchived: false }),
                mockProject({ id: 2, name: 'archived-one', isArchived: true }),
            ],
        });

        const { result } = renderHook(() => useFilteredProjects());
        expect(result.current).toHaveLength(1);
        expect(result.current[0].name).toBe('active-one');
    });

    it('returns only archived when filterStatus is archived', () => {
        useProjectStore.setState({
            projects: [
                mockProject({ id: 1, name: 'active-one', isArchived: false }),
                mockProject({ id: 2, name: 'archived-one', isArchived: true }),
            ],
            filterStatus: 'archived',
        });

        const { result } = renderHook(() => useFilteredProjects());
        expect(result.current).toHaveLength(1);
        expect(result.current[0].name).toBe('archived-one');
    });

    it('filters by searchQuery case-insensitively', () => {
        useProjectStore.setState({
            projects: [
                mockProject({ id: 1, name: 'MyProject', isArchived: false }),
                mockProject({ id: 2, name: 'OtherProject', isArchived: false }),
            ],
            searchQuery: 'myp',
        });

        const { result } = renderHook(() => useFilteredProjects());
        expect(result.current).toHaveLength(1);
        expect(result.current[0].name).toBe('MyProject');
    });

    it('returns active projects when filterStatus is active', () => {
        useProjectStore.setState({
            projects: [
                mockProject({ id: 1, name: 'active-proj', isArchived: false, healthStatus: 'active' }),
                mockProject({ id: 2, name: 'dormant-proj', isArchived: false, healthStatus: 'dormant' }),
            ],
            filterStatus: 'active',
        });

        const { result } = renderHook(() => useFilteredProjects());
        expect(result.current).toHaveLength(1);
        expect(result.current[0].name).toBe('active-proj');
    });
});
