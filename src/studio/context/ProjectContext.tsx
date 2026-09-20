// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { projectService, type KernelCADProject, type ProjectMetadata, type ProjectRevision } from '../../authoring/projectService';
import { defaultCode } from '../../shared/worker/geometryEngine';

interface ProjectContextType {
    activeProjectId: string | null;
    projects: ProjectMetadata[];
    activeProject: KernelCADProject | null;
    isSaving: boolean;
    openProject: (id: string) => void;
    createProject: (name?: string, code?: string) => string;
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

/** State setters the project mutation helpers drive. */
interface ProjectStateSetters {
    setActiveProjectId: Dispatch<SetStateAction<string | null>>;
    setProjects: Dispatch<SetStateAction<ProjectMetadata[]>>;
    setEphemeralProject: Dispatch<SetStateAction<KernelCADProject | null>>;
    setProjectVersion: Dispatch<SetStateAction<number>>;
    setIsSaving: Dispatch<SetStateAction<boolean>>;
}

type ProjectListSetters = Pick<ProjectStateSetters, 'setActiveProjectId' | 'setProjects'>;

/** Initial load and migration: funnel route builds an in-memory project, the
 *  normal route hydrates from (and persists to) localStorage. */
function initializeProjectState(
    initialCode: string | undefined,
    projectName: string | undefined,
    setters: ProjectListSetters & Pick<ProjectStateSetters, 'setEphemeralProject'>,
): void {
    if (initialCode !== undefined) {
        // Funnel route: do NOT hydrate from localStorage. Build an in-memory
        // project so the editor + header still work, but never persist.
        const proj = projectService.createProject(initialCode, {
            viewMode: 'code',
            viewMode3D: 'shadedWithEdges',
            sidePanelVisible: true,
            showSketches: true,
        }, projectName ?? 'Generated');
        setters.setEphemeralProject(proj);
        setters.setActiveProjectId(EPHEMERAL_ID);
        return;
    }

    const migratedId = projectService.migrateLegacyIfNeeded();
    const list = projectService.listProjects();
    setters.setProjects(list);

    if (migratedId) {
        setters.setActiveProjectId(migratedId);
    } else if (list.length > 0) {
        const lastId = localStorage.getItem('kernelcad_last_project_id');
        if (lastId && list.some(p => p.id === lastId)) {
            setters.setActiveProjectId(lastId);
        } else {
            setters.setActiveProjectId(list[0].id);
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
        setters.setProjects(projectService.listProjects());
        setters.setActiveProjectId(id);
    }
}

/** Create and persist a fresh project, then make it active. Returns its id. */
function createNewProject(name: string, setters: ProjectListSetters, code = defaultCode): string {
    const id = projectService.generateId();
    const newProj = projectService.createProject(code, {
        viewMode: 'code',
        viewMode3D: 'shadedWithEdges',
        sidePanelVisible: true,
        showSketches: true
    }, name);
    projectService.saveProject(id, newProj);
    setters.setProjects(projectService.listProjects());
    setters.setActiveProjectId(id);
    return id;
}

/** Delete a project, falling back to the first remaining one (or a fresh
 *  project when the list empties) if the deleted project was active. */
function deleteProjectById(
    id: string,
    activeProjectId: string | null,
    setters: ProjectListSetters,
    createProject: (name?: string, code?: string) => string,
): void {
    projectService.deleteProject(id);
    const newList = projectService.listProjects();
    setters.setProjects(newList);

    if (activeProjectId === id) {
        if (newList.length > 0) {
            setters.setActiveProjectId(newList[0].id);
        } else {
            createProject();
        }
    }
}

/** Rename the active project (in memory for the ephemeral funnel project). */
function renameProjectById(
    activeProjectId: string | null,
    activeProject: KernelCADProject | null,
    newName: string,
    setters: Pick<ProjectStateSetters, 'setEphemeralProject' | 'setProjects' | 'setProjectVersion'>,
): void {
    if (!activeProjectId || !activeProject) return;
    if (activeProjectId === EPHEMERAL_ID) {
        setters.setEphemeralProject(p => (p ? { ...p, name: newName } : p));
        return;
    }
    const updated = { ...activeProject, name: newName };
    projectService.saveProject(activeProjectId, updated);
    setters.setProjects(projectService.listProjects());
    setters.setProjectVersion(v => v + 1);
}

/** Persist a partial update to the active project. */
function persistActiveProject(
    activeProjectId: string | null,
    activeProject: KernelCADProject | null,
    updates: Partial<KernelCADProject>,
    setters: Pick<ProjectStateSetters, 'setEphemeralProject' | 'setIsSaving' | 'setProjects' | 'setProjectVersion'>,
): void {
    if (!activeProjectId || !activeProject) return;
    if (activeProjectId === EPHEMERAL_ID) {
        // Funnel route: keep edits in memory; never write to localStorage.
        setters.setEphemeralProject(p => (p ? { ...p, ...updates } : p));
        return;
    }
    setters.setIsSaving(true);
    const updated = { ...activeProject, ...updates };
    projectService.saveProject(activeProjectId, updated);

    if (updates.name) {
        setters.setProjects(projectService.listProjects());
    }
    setters.setProjectVersion(v => v + 1);
    setTimeout(() => setters.setIsSaving(false), 500);
}

/** Restore a revision's code into the active project. */
function restoreProjectRevision(
    v: number,
    activeProjectId: string | null,
    revisions: ProjectRevision[],
    saveActiveProject: (project: Partial<KernelCADProject>) => void,
): void {
    if (!activeProjectId || activeProjectId === EPHEMERAL_ID) return;
    const rev = revisions.find(r => r.v === v);
    if (!rev) return;
    saveActiveProject({ code: rev.code });
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
        initializeProjectState(initialCode, projectName, {
            setEphemeralProject,
            setActiveProjectId,
            setProjects,
        });
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

    const createProject = useCallback((name: string = 'Untitled Project', code = defaultCode) => {
        return createNewProject(name, { setProjects, setActiveProjectId }, code);
    }, []);

    const deleteProject = useCallback((id: string) => {
        deleteProjectById(id, activeProjectId, { setProjects, setActiveProjectId }, createProject);
    }, [activeProjectId, createProject]);

    const renameActiveProject = useCallback((newName: string) => {
        renameProjectById(activeProjectId, activeProject, newName, {
            setEphemeralProject,
            setProjects,
            setProjectVersion,
        });
    }, [activeProjectId, activeProject]);

    const saveActiveProject = useCallback((updates: Partial<KernelCADProject>) => {
        persistActiveProject(activeProjectId, activeProject, updates, {
            setEphemeralProject,
            setIsSaving,
            setProjects,
            setProjectVersion,
        });
    }, [activeProjectId, activeProject]);

    const restoreRevision = useCallback((v: number) => {
        restoreProjectRevision(v, activeProjectId, revisions, saveActiveProject);
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
