// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { projectService, type KernelCADProject, type ProjectMetadata, type ProjectRevision } from '../../authoring/projectService';
import { defaultCode } from '../../shared/worker/geometryEngine';

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
    revisions: ProjectRevision[];
    restoreRevision: (v: number) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const EPHEMERAL_ID = '__funnel_ephemeral__';

/** Returns true when the active project id belongs to the in-memory funnel
 * project created by ProjectProvider for /g/$genId and /p/$slug routes.
 * Ephemeral projects must seed the workbench once but must never overwrite
 * live code afterward. */
// eslint-disable-next-line react-refresh/only-export-components
export function isEphemeralProjectId(id: string | null): boolean {
    return id === EPHEMERAL_ID;
}

export function ProjectProvider({ children, initialCode, projectName }: {
    children: React.ReactNode;
    initialCode?: string;
    projectName?: string;
}) {
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
    const [projects, setProjects] = useState<ProjectMetadata[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [projectVersion, setProjectVersion] = useState(0);
    const [ephemeralProject, setEphemeralProject] = useState<KernelCADProject | null>(null);

    // Initial load and migration
    useEffect(() => {
        if (initialCode !== undefined) {
            // Funnel route: do NOT hydrate from localStorage. Build an in-memory
            // project so the editor + header still work, but never persist.
            const proj = projectService.createProject(initialCode, {
                viewMode: 'code',
                viewMode3D: 'shadedWithEdges',
                sidePanelVisible: true,
                showSketches: true,
            }, projectName ?? 'Generated');
            setEphemeralProject(proj);
            setActiveProjectId(EPHEMERAL_ID);
            return;
        }

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
    }, [initialCode, projectName]);

    // Derive active project data
    const activeProject = useMemo(() => {
        if (!activeProjectId) return null;
        if (activeProjectId === EPHEMERAL_ID) return ephemeralProject;
        // projectVersion is used to force re-memoization on save
        const proj = projectService.getProject(activeProjectId);
        if (activeProjectId) {
            localStorage.setItem('kernelcad_last_project_id', activeProjectId);
        }
        return proj;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeProjectId, projectVersion, ephemeralProject]);

    // Revision history for the active, persisted project. Ephemeral funnel
    // projects never persist, so they have no revisions. Recomputes on save
    // (projectVersion) and on project switch (activeProjectId).
    const revisions = useMemo<ProjectRevision[]>(() => {
        if (!activeProjectId || activeProjectId === EPHEMERAL_ID) return [];
        return projectService.listRevisions(activeProjectId);
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
        if (activeProjectId === EPHEMERAL_ID) {
            setEphemeralProject(p => (p ? { ...p, name: newName } : p));
            return;
        }
        const updated = { ...activeProject, name: newName };
        projectService.saveProject(activeProjectId, updated);
        setProjects(projectService.listProjects());
        setProjectVersion(v => v + 1);
    }, [activeProjectId, activeProject]);

    const saveActiveProject = useCallback((updates: Partial<KernelCADProject>) => {
        if (!activeProjectId || !activeProject) return;
        if (activeProjectId === EPHEMERAL_ID) {
            // Funnel route: keep edits in memory; never write to localStorage.
            setEphemeralProject(p => (p ? { ...p, ...updates } : p));
            return;
        }
        setIsSaving(true);
        const updated = { ...activeProject, ...updates };
        projectService.saveProject(activeProjectId, updated);

        if (updates.name) {
            setProjects(projectService.listProjects());
        }
        setProjectVersion(v => v + 1);
        setTimeout(() => setIsSaving(false), 500);
    }, [activeProjectId, activeProject]);

    const restoreRevision = useCallback((v: number) => {
        if (!activeProjectId || activeProjectId === EPHEMERAL_ID) return;
        const rev = revisions.find(r => r.v === v);
        if (!rev) return;
        saveActiveProject({ code: rev.code });
    }, [activeProjectId, revisions, saveActiveProject]);

    const value = useMemo(() => ({
        activeProjectId,
        projects,
        activeProject,
        isSaving,
        openProject,
        createProject,
        deleteProject,
        renameActiveProject,
        saveActiveProject,
        revisions,
        restoreRevision
    }), [activeProjectId, projects, activeProject, isSaving, openProject, createProject, deleteProject, renameActiveProject, saveActiveProject, revisions, restoreRevision]);

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
