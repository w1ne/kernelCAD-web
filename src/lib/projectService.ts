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

export const projectService = {
    createProject(code: string, viewState: ViewState, name: string = 'Untitled'): KernelCADProject {
        return {
            version: '1.0',
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
                    const project = JSON.parse(e.target?.result as string);
                    if (this.validateProject(project)) {
                        resolve(project);
                    } else {
                        reject(new Error('Invalid project file format'));
                    }
                } catch {
                    reject(new Error('Failed to parse project file'));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    },

    validateProject(project: unknown): project is KernelCADProject {
        const p = project as Record<string, unknown>;
        if (!p || typeof p.version !== 'string' || typeof p.code !== 'string' || !p.viewState || typeof p.viewState !== 'object') {
            return false;
        }
        const vs = p.viewState as Record<string, unknown>;
        return typeof vs.viewMode === 'string';
    },

    persistToLocalStorage(project: KernelCADProject) {
        localStorage.setItem('kernelcad_current_project', JSON.stringify(project));
    },

    loadFromLocalStorage(): KernelCADProject | null {
        const data = localStorage.getItem('kernelcad_current_project');
        if (!data) return null;
        try {
            const project = JSON.parse(data);
            return this.validateProject(project) ? project : null;
        } catch {
            return null;
        }
    },

    clearLocalStorage() {
        localStorage.removeItem('kernelcad_current_project');
    }
};
