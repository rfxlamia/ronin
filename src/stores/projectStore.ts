import { create } from 'zustand';

import type { Project } from '@/types/project';

interface ProjectStore {
    projects: Project[];
    isLoading: boolean;
    error: string | null;

    // Actions
    addProject: (project: Project) => void;
    setProjects: (projects: Project[]) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
    projects: [],
    isLoading: false,
    error: null,

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
}));
