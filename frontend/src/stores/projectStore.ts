import { create } from 'zustand';
import { Project, ProjectStats } from '../types';
import { projectApi } from '../services/api';

interface ProjectState {
    projects: Project[];
    archivedProjects: Project[];
    currentProject: Project | null;
    currentStats: ProjectStats | null;
    loading: boolean;
    fetchProjects: () => Promise<void>;
    fetchArchivedProjects: () => Promise<void>;
    fetchProjectStats: (id: string) => Promise<void>;
    setCurrentProject: (project: Project | null) => void;
    createProject: (data: { name: string; description?: string; color?: string; startDate?: string; endDate?: string }) => Promise<Project>;
    updateProject: (id: string, data: Partial<Project>) => Promise<Project>;
    archiveProject: (id: string) => Promise<void>;
    restoreProject: (id: string) => Promise<void>;
    deleteProject: (id: string) => Promise<void>;
    addMember: (projectId: string, userId: string, role?: string) => Promise<void>;
    updateMember: (projectId: string, memberId: string, role: string) => Promise<void>;
    removeMember: (projectId: string, memberId: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, _get) => ({
    projects: [],
    archivedProjects: [],
    currentProject: null,
    currentStats: null,
    loading: false,

    fetchProjects: async () => {
        set({ loading: true });
        try {
            const { data } = await projectApi.getAll(false);
            set({ projects: data, loading: false });
        } catch { set({ loading: false }); }
    },

    fetchArchivedProjects: async () => {
        try {
            const { data } = await projectApi.getAll(true);
            set({ archivedProjects: data.filter(p => p.isArchived) });
        } catch { /* ignore */ }
    },

    fetchProjectStats: async (id: string) => {
        try {
            const { data } = await projectApi.getStats(id);
            set({ currentStats: data });
        } catch { /* ignore */ }
    },

    setCurrentProject: (project) => set({ currentProject: project, currentStats: null }),

    createProject: async (data) => {
        const { data: project } = await projectApi.create(data);
        set(s => ({ projects: [project, ...s.projects] }));
        return project;
    },

    updateProject: async (id, data) => {
        const { data: project } = await projectApi.update(id, data);
        set(s => ({
            projects: s.projects.map(p => p.id === id ? project : p),
            currentProject: s.currentProject?.id === id ? project : s.currentProject,
        }));
        return project;
    },

    archiveProject: async (id) => {
        const { data: project } = await projectApi.archive(id);
        set(s => ({
            projects: s.projects.filter(p => p.id !== id),
            archivedProjects: [project, ...s.archivedProjects],
            currentProject: s.currentProject?.id === id ? null : s.currentProject,
        }));
    },

    restoreProject: async (id) => {
        const { data: project } = await projectApi.restore(id);
        set(s => ({
            projects: [project, ...s.projects],
            archivedProjects: s.archivedProjects.filter(p => p.id !== id),
        }));
    },

    deleteProject: async (id) => {
        await projectApi.delete(id);
        set(s => ({
            projects: s.projects.filter(p => p.id !== id),
            archivedProjects: s.archivedProjects.filter(p => p.id !== id),
            currentProject: s.currentProject?.id === id ? null : s.currentProject,
        }));
    },

    addMember: async (projectId, userId, role) => {
        const { data: project } = await projectApi.addMember(projectId, userId, role);
        set(s => ({
            projects: s.projects.map(p => p.id === projectId ? project : p),
            currentProject: s.currentProject?.id === projectId ? project : s.currentProject,
        }));
    },

    updateMember: async (projectId, memberId, role) => {
        const { data: project } = await projectApi.updateMember(projectId, memberId, role);
        set(s => ({
            projects: s.projects.map(p => p.id === projectId ? project : p),
            currentProject: s.currentProject?.id === projectId ? project : s.currentProject,
        }));
    },

    removeMember: async (projectId, memberId) => {
        const { data: project } = await projectApi.removeMember(projectId, memberId);
        set(s => ({
            projects: s.projects.map(p => p.id === projectId ? project : p),
            currentProject: s.currentProject?.id === projectId ? project : s.currentProject,
        }));
    },
}));

if (import.meta.hot) {
  import.meta.hot.accept();
}
