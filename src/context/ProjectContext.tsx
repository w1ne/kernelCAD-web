import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { projectService, type KernelCADProject, type ProjectMetadata } from '../lib/projectService';
import { defaultCode } from '../lib/geometryEngine';

interface ProjectContextType {
    activeProjectId: string | null;
    projects: ProjectMetadata[];
    activeProject: KernelCADProject | null;
    isSaving: boolean;
    openProject: (id: string) => void;
    createProject: (name?: string) => string;
    deleteProject: (id: string) => void;
    renameActiveProject: (newName: string) => void;
    saveActiveProject: (project: Partial<KernelCADProject>) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
    const [projects, setProjects] = useState<ProjectMetadata[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [projectVersion, setProjectVersion] = useState(0);

    // Initial load and migration
    useEffect(() => {
        const migratedId = projectService.migrateLegacyIfNeeded();
        const list = projectService.listProjects();
        setProjects(list);

        if (migratedId) {
            setActiveProjectId(migratedId);
        } else if (list.length > 0) {
            const lastId = localStorage.getItem('kernelcad_last_project_id');
            if (lastId && list.some(p => p.id === lastId)) {
                setActiveProjectId(lastId);
            } else {
                setActiveProjectId(list[0].id);
            }
        } else {
            const id = projectService.generateId();
            const defaultProj = projectService.createProject(defaultCode, {
                viewMode: 'code',
                viewMode3D: 'shadedWithEdges',
                sidePanelVisible: true,
                showSketches: true
            }, 'Untitled Project');
            projectService.saveProject(id, defaultProj);
            setProjects(projectService.listProjects());
            setActiveProjectId(id);
        }
    }, []);

    // Derive active project data
    const activeProject = useMemo(() => {
        if (!activeProjectId) return null;
        // projectVersion is used to force re-memoization on save
        const proj = projectService.getProject(activeProjectId);
        if (activeProjectId) {
            localStorage.setItem('kernelcad_last_project_id', activeProjectId);
        }
        return proj;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeProjectId, projectVersion]);

    const openProject = useCallback((id: string) => {
        setActiveProjectId(id);
    }, []);

    const createProject = useCallback((name: string = 'Untitled Project') => {
        const id = projectService.generateId();
        const newProj = projectService.createProject(defaultCode, {
            viewMode: 'code',
            viewMode3D: 'shadedWithEdges',
            sidePanelVisible: true,
            showSketches: true
        }, name);
        projectService.saveProject(id, newProj);
        setProjects(projectService.listProjects());
        setActiveProjectId(id);
        return id;
    }, []);

    const deleteProject = useCallback((id: string) => {
        projectService.deleteProject(id);
        const newList = projectService.listProjects();
        setProjects(newList);

        if (activeProjectId === id) {
            if (newList.length > 0) {
                setActiveProjectId(newList[0].id);
            } else {
                createProject();
            }
        }
    }, [activeProjectId, createProject]);

    const renameActiveProject = useCallback((newName: string) => {
        if (!activeProjectId || !activeProject) return;
        const updated = { ...activeProject, name: newName };
        projectService.saveProject(activeProjectId, updated);
        setProjects(projectService.listProjects());
        setProjectVersion(v => v + 1);
    }, [activeProjectId, activeProject]);

    const saveActiveProject = useCallback((updates: Partial<KernelCADProject>) => {
        if (!activeProjectId || !activeProject) return;
        setIsSaving(true);
        const updated = { ...activeProject, ...updates };
        projectService.saveProject(activeProjectId, updated);

        if (updates.name) {
            setProjects(projectService.listProjects());
        }
        setProjectVersion(v => v + 1);
        setTimeout(() => setIsSaving(false), 500);
    }, [activeProjectId, activeProject]);

    const value = useMemo(() => ({
        activeProjectId,
        projects,
        activeProject,
        isSaving,
        openProject,
        createProject,
        deleteProject,
        renameActiveProject,
        saveActiveProject
    }), [activeProjectId, projects, activeProject, isSaving, openProject, createProject, deleteProject, renameActiveProject, saveActiveProject]);

    return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProject() {
    const context = useContext(ProjectContext);
    if (!context) {
        throw new Error("useProject must be used within a ProjectProvider");
    }
    return context;
}
