import { create } from 'zustand';

export interface Project {
    id: number;
    path: string;
    name: string;
    type: 'git' | 'folder';
    created_at: string;
    updated_at: string;
    // Optional fields - populated by future stories
    gitBranch?: string;
    uncommittedCount?: number;
    lastActivityAt?: string;
    healthStatus?: 'Active' | 'Dormant' | 'Stuck' | 'Attention';
}

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
