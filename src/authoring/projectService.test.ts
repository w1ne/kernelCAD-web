// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { projectService } from './projectService';

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
        expect(project.version).toBe('1.1');
        expect(project.name).toBe('Test Project');
        expect(project.code).toBe(mockCode);
        expect(project.viewState).toEqual(mockViewState);
        expect(project.lastUpdated).toBeDefined();
    });

    it('manages multiple projects via index', () => {
        const id1 = 'id1';
        const proj1 = projectService.createProject(mockCode, mockViewState, 'Project 1');
        const id2 = 'id2';
        const proj2 = projectService.createProject(mockCode, mockViewState, 'Project 2');

        projectService.saveProject(id1, proj1);
        projectService.saveProject(id2, proj2);

        const projects = projectService.listProjects();
        expect(projects).toHaveLength(2);
        expect(projects).toContainEqual(expect.objectContaining({ id: 'id1', name: 'Project 1' }));
        expect(projects).toContainEqual(expect.objectContaining({ id: 'id2', name: 'Project 2' }));

        const loaded1 = projectService.getProject(id1);
        expect(loaded1?.name).toBe('Project 1');
    });

    it('deletes a project and updates index', () => {
        const id = 'to-delete';
        const proj = projectService.createProject(mockCode, mockViewState, 'Delete Me');
        projectService.saveProject(id, proj);

        expect(projectService.listProjects()).toHaveLength(1);
        projectService.deleteProject(id);
        expect(projectService.listProjects()).toHaveLength(0);
        expect(projectService.getProject(id)).toBeNull();
    });

    it('migrates legacy project if exists', () => {
        const legacyKey = 'kernelcad_current_project';
        localStorage.setItem(legacyKey, JSON.stringify({
            version: '1.0',
            name: 'Old Project',
            code: 'old code',
            viewState: mockViewState
        }));

        const migratedId = projectService.migrateLegacyIfNeeded();
        expect(migratedId).not.toBeNull();
        expect(localStorage.getItem(legacyKey)).toBeNull();

        const projects = projectService.listProjects();
        expect(projects).toHaveLength(1);
        expect(projects[0].name).toBe('Old Project');

        const project = projectService.getProject(migratedId!);
        expect(project?.code).toBe('old code');
    });

    it('validates a correct project', () => {
        const project = projectService.createProject(mockCode, mockViewState);
        expect(projectService.validateProject(project)).toBe(true);
    });

    it('exports to kcad via download', () => {
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
