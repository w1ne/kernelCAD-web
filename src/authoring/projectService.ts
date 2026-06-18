// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { z } from 'zod';

export interface KernelCADProject {
    version: string;
    name: string;
    code: string;
    viewState: ViewState;
    lastUpdated: string;
}

export interface ViewState {
    viewMode: 'code' | 'gui';
    viewMode3D: string;
    sidePanelVisible: boolean;
    showSketches: boolean;
    /** Studio shell — agent rail toggle. Persisted per project so the user
     *  sees their last layout on reload. Optional in older project files;
     *  defaults to false on hydration. */
    agentRailOpen?: boolean;
}

export interface ProjectMetadata {
    id: string;
    name: string;
    lastUpdated: string;
}

/** A single point-in-time snapshot of a project's code. Stored client-side
 *  only (localStorage); newest revision is the last element of the array. */
export interface ProjectRevision {
    v: number;
    code: string;
    ts: string;
}

const CURRENT_PROJECT_VERSION = '1.1';
const INDEX_KEY = 'kernelcad_project_index';
const LEGACY_STORAGE_KEY = 'kernelcad_current_project';

/** Max revisions retained per project; oldest are dropped past this. */
const MAX_REVISIONS = 50;
/** Window within which rapid editor autosaves coalesce into one revision. */
const REVISION_COALESCE_MS = 10000;

function revisionsKey(id: string): string {
    return `kernelcad_project_revisions_${id}`;
}

const ViewModeSchema = z.enum(['code', 'gui']);

const ViewStateSchema = z.object({
    viewMode: ViewModeSchema,
    viewMode3D: z.string().min(1),
    sidePanelVisible: z.boolean(),
    showSketches: z.boolean(),
    agentRailOpen: z.boolean().optional(),
});

const ProjectSchema = z.object({
    version: z.literal(CURRENT_PROJECT_VERSION),
    name: z.string().min(1),
    code: z.string(),
    viewState: ViewStateSchema,
    lastUpdated: z.string().datetime(),
});

const LegacyProjectSchemaV10 = z.object({
    version: z.literal('1.0').optional(),
    name: z.string().optional(),
    code: z.string(),
    viewState: z.object({
        viewMode: ViewModeSchema.optional(),
        viewMode3D: z.string().optional(),
        sidePanelVisible: z.boolean().optional(),
        showSketches: z.boolean().optional(),
    }).optional(),
    lastUpdated: z.string().optional(),
});

function migrateLegacyProject(input: unknown): KernelCADProject {
    const legacy = LegacyProjectSchemaV10.parse(input);
    const viewState = legacy.viewState ?? {};
    return {
        version: CURRENT_PROJECT_VERSION,
        name: legacy.name?.trim() ? legacy.name : 'Untitled',
        code: legacy.code,
        viewState: {
            viewMode: viewState.viewMode ?? 'code',
            viewMode3D: viewState.viewMode3D ?? 'shadedWithEdges',
            sidePanelVisible: viewState.sidePanelVisible ?? true,
            showSketches: viewState.showSketches ?? true,
        },
        lastUpdated: legacy.lastUpdated && !Number.isNaN(Date.parse(legacy.lastUpdated))
            ? legacy.lastUpdated
            : new Date().toISOString(),
    };
}

function parseProjectWithMigration(project: unknown): KernelCADProject {
    const strictParsed = ProjectSchema.safeParse(project);
    if (strictParsed.success) return strictParsed.data;

    const maybe = project as { version?: unknown } | null;
    if (maybe && typeof maybe === 'object' && 'version' in maybe) {
        const version = maybe.version;
        if (version !== undefined && version !== '1.0' && version !== CURRENT_PROJECT_VERSION) {
            throw new Error(`Unsupported project version: ${String(version)}`);
        }
    }

    return migrateLegacyProject(project);
}

export const projectService = {
    generateId(): string {
        return Math.random().toString(36).substring(2, 11);
    },

    createProject(code: string, viewState: ViewState, name: string = 'Untitled'): KernelCADProject {
        return {
            version: CURRENT_PROJECT_VERSION,
            name,
            code,
            viewState,
            lastUpdated: new Date().toISOString(),
        };
    },

    listProjects(): ProjectMetadata[] {
        const raw = localStorage.getItem(INDEX_KEY);
        if (!raw) return [];
        try {
            return JSON.parse(raw);
        } catch {
            return [];
        }
    },

    getProject(id: string): KernelCADProject | null {
        const data = localStorage.getItem(`kernelcad_project_${id}`);
        if (!data) return null;
        try {
            const raw = JSON.parse(data);
            return parseProjectWithMigration(raw);
        } catch {
            return null;
        }
    },

    saveProject(id: string, project: KernelCADProject) {
        const updatedProject = { ...project, lastUpdated: new Date().toISOString() };
        localStorage.setItem(`kernelcad_project_${id}`, JSON.stringify(updatedProject));
        this.updateIndex(id, updatedProject.name, updatedProject.lastUpdated);
        this.snapshotRevision(id, updatedProject.code);
        return updatedProject;
    },

    listRevisions(id: string): ProjectRevision[] {
        const raw = localStorage.getItem(revisionsKey(id));
        if (!raw) return [];
        try {
            return JSON.parse(raw);
        } catch {
            return [];
        }
    },

    /** Append/coalesce a code snapshot into the project's revision history.
     *  Identical-code saves are skipped; rapid saves (<10s) replace the last
     *  revision in place so editor autosaves don't explode into hundreds. */
    snapshotRevision(id: string, code: string) {
        const revs = this.listRevisions(id);
        const last = revs[revs.length - 1];

        if (last && last.code === code) return;

        if (last && (Date.now() - Date.parse(last.ts)) < REVISION_COALESCE_MS) {
            last.code = code;
            last.ts = new Date().toISOString();
        } else {
            revs.push({ v: (last?.v ?? 0) + 1, code, ts: new Date().toISOString() });
        }

        while (revs.length > MAX_REVISIONS) {
            revs.shift();
        }

        localStorage.setItem(revisionsKey(id), JSON.stringify(revs));
    },

    updateIndex(id: string, name: string, lastUpdated: string) {
        const index = this.listProjects();
        const existing = index.find(p => p.id === id);
        if (existing) {
            existing.name = name;
            existing.lastUpdated = lastUpdated;
        } else {
            index.push({ id, name, lastUpdated });
        }
        localStorage.setItem(INDEX_KEY, JSON.stringify(index));
    },

    deleteProject(id: string) {
        localStorage.removeItem(`kernelcad_project_${id}`);
        localStorage.removeItem(revisionsKey(id));
        const index = this.listProjects().filter(p => p.id !== id);
        localStorage.setItem(INDEX_KEY, JSON.stringify(index));
    },

    migrateLegacyIfNeeded(): string | null {
        const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (!legacyData) return null;

        try {
            const raw = JSON.parse(legacyData);
            const project = parseProjectWithMigration(raw);
            const id = this.generateId();
            this.saveProject(id, { ...project, name: project.name === 'Untitled' ? 'Imported Project' : project.name });
            localStorage.removeItem(LEGACY_STORAGE_KEY);
            return id;
        } catch (e) {
            console.error("Migration failed:", e);
            localStorage.removeItem(LEGACY_STORAGE_KEY);
            return null;
        }
    },

    saveProjectToFile(project: KernelCADProject) {
        const json = JSON.stringify(project, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.name.replace(/[^a-z0-9]/gi, '_')}.kcad`;
        a.click();
        URL.revokeObjectURL(url);
    },

    exportToKcad(project: KernelCADProject) {
        this.saveProjectToFile(project);
    },

    async loadProjectFromFile(file: File): Promise<KernelCADProject> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const raw = JSON.parse(e.target?.result as string);
                    const project = parseProjectWithMigration(raw);
                    resolve(project);
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    if (message.startsWith('Unsupported project version:')) {
                        reject(new Error(message));
                    } else {
                        reject(new Error('Failed to parse project file'));
                    }
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    },

    validateProject(project: unknown): project is KernelCADProject {
        try {
            parseProjectWithMigration(project);
            return true;
        } catch {
            return false;
        }
    }
};
