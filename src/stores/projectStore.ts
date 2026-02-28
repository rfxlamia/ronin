import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { invoke } from '@tauri-apps/api/core';

import type { Project } from '@/types/project';

export type FilterStatus = 'all' | 'active' | 'dormant' | 'archived';

interface ProjectStore {
    projects: Project[];
    isLoading: boolean;
    error: string | null;
    searchQuery: string;
    filterStatus: FilterStatus;

    // Actions
    addProject: (project: Project) => void;
    setProjects: (projects: Project[]) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setSearchQuery: (query: string) => void;
    setFilterStatus: (status: FilterStatus) => void;
    archiveProject: (id: number) => Promise<void>;
    restoreProject: (id: number) => Promise<void>;
    removeProject: (id: number) => Promise<void>;
}

export const useProjectStore = create<ProjectStore>((set) => ({
    projects: [],
    isLoading: false,
    error: null,
    searchQuery: '',
    filterStatus: 'all',

    addProject: (project) =>
        set((state) => ({
            projects: [...state.projects, project],
            error: null,
        })),

    setProjects: (projects) =>
        set({
            projects,
            isLoading: false,
            error: null
        }),

    setLoading: (loading) =>
        set({ isLoading: loading }),

    setError: (error) =>
        set({ error, isLoading: false }),

    setSearchQuery: (query) =>
        set({ searchQuery: query }),

    setFilterStatus: (status) =>
        set({ filterStatus: status }),

    archiveProject: async (id) => {
        try {
            await invoke('archive_project', { projectId: id });
            // Update local state
            set((state) => ({
                projects: state.projects.map(p =>
                    p.id === id ? { ...p, isArchived: true } : p
                ),
            }));
        } catch (error) {
            set({ error: `Failed to archive project: ${String(error)}` });
        }
    },

    restoreProject: async (id) => {
        try {
            await invoke('restore_project', { projectId: id });
            // Update local state
            set((state) => ({
                projects: state.projects.map(p =>
                    p.id === id ? { ...p, isArchived: false } : p
                ),
            }));
        } catch (error) {
            set({ error: `Failed to restore project: ${String(error)}` });
        }
    },

    removeProject: async (id) => {
        try {
            await invoke('remove_project', { projectId: id });
            // Update local state by filtering out the removed project
            set((state) => ({
                projects: state.projects.filter(p => p.id !== id),
            }));
        } catch (error) {
            set({ error: `Failed to remove project: ${String(error)}` });
        }
    },
}));

/**
 * Selector hook that returns filtered projects based on search query and filter status
 * Performs client-side filtering for <100ms response time (NFR5)
 * Uses useShallow to prevent unnecessary re-renders from multiple subscriptions
 */
export const useFilteredProjects = (): Project[] =>
    useProjectStore(
        useShallow(({ projects, searchQuery, filterStatus }) =>
            projects.filter((p) => {
                // Search filter (case-insensitive name matching)
                const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());

                // Status filter logic
                const matchesStatus =
                    filterStatus === 'all'
                        ? !p.isArchived // All = non-archived projects
                        : filterStatus === 'archived'
                          ? p.isArchived // Archived = only archived
                          : !p.isArchived && p.healthStatus === filterStatus; // Active/Dormant

                return matchesSearch && matchesStatus;
            })
        )
    );
