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
}

const CURRENT_PROJECT_VERSION = '1.1';

const ViewModeSchema = z.enum(['code', 'gui']);

const ViewStateSchema = z.object({
    viewMode: ViewModeSchema,
    viewMode3D: z.string().min(1),
    sidePanelVisible: z.boolean(),
    showSketches: z.boolean(),
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
    createProject(code: string, viewState: ViewState, name: string = 'Untitled'): KernelCADProject {
        return {
            version: CURRENT_PROJECT_VERSION,
            name,
            code,
            viewState,
            lastUpdated: new Date().toISOString(),
        };
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

    /**
     * Formal method to export a project to a .kcad file.
     * This is used by the UI to trigger a download.
     */
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
    },

    persistToLocalStorage(project: KernelCADProject) {
        localStorage.setItem('kernelcad_current_project', JSON.stringify(project));
    },

    loadFromLocalStorage(): KernelCADProject | null {
        const data = localStorage.getItem('kernelcad_current_project');
        if (!data) return null;
        try {
            const raw = JSON.parse(data);
            const migrated = parseProjectWithMigration(raw);
            if (migrated.version !== (raw as { version?: unknown })?.version) {
                this.persistToLocalStorage(migrated);
            }
            return migrated;
        } catch {
            return null;
        }
    },

    clearLocalStorage() {
        localStorage.removeItem('kernelcad_current_project');
    }
};
