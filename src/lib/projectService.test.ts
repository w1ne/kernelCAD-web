/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { projectService, type KernelCADProject } from './projectService';

describe('projectService', () => {
    const mockCode = 'const box = show(makeBox(10, 10, 10));';
    const mockViewState = {
        viewMode: 'code' as const,
        viewMode3D: 'shadedWithEdges',
        sidePanelVisible: true,
        showSketches: true,
    };

    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('creates a project with correct version and metadata', () => {
        const project = projectService.createProject(mockCode, mockViewState, 'Test Project');
        expect(project.version).toBe('1.0');
        expect(project.name).toBe('Test Project');
        expect(project.code).toBe(mockCode);
        expect(project.viewState).toEqual(mockViewState);
        expect(project.lastUpdated).toBeDefined();
    });

    it('validates a correct project', () => {
        const project = projectService.createProject(mockCode, mockViewState);
        expect(projectService.validateProject(project)).toBe(true);
    });

    it('invalidates an incorrect project', () => {
        expect(projectService.validateProject({})).toBe(false);
        expect(projectService.validateProject({ version: '1.0' })).toBe(false);
        expect(projectService.validateProject({ version: '1.0', code: '' })).toBe(false);
    });

    it('persists and loads from localStorage', () => {
        const project = projectService.createProject(mockCode, mockViewState);
        projectService.persistToLocalStorage(project);

        const loaded = projectService.loadFromLocalStorage();
        expect(loaded).toEqual(project);
    });

    it('returns null when loading from empty localStorage', () => {
        expect(projectService.loadFromLocalStorage()).toBe(null);
    });

    it('clears localStorage', () => {
        const project = projectService.createProject(mockCode, mockViewState);
        projectService.persistToLocalStorage(project);
        projectService.clearLocalStorage();
        expect(projectService.loadFromLocalStorage()).toBe(null);
    });

    it('exports to kcad via download (mock verify)', () => {
        // Mock document.createElement and URL.createObjectURL
        const mockLink = {
            href: '',
            download: '',
            click: vi.fn()
        } as any;

        const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink);
        const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
        const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => { });

        const project = projectService.createProject(mockCode, mockViewState, 'My Part');
        projectService.exportToKcad(project);

        expect(createElementSpy).toHaveBeenCalledWith('a');
        expect(mockLink.download).toBe('My_Part.kcad');
        expect(mockLink.href).toBe('blob:test');
        expect(mockLink.click).toHaveBeenCalled();
        expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:test');
    });
});
