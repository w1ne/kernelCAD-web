// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it, vi } from 'vitest';
import { buildStudioCommands, type StudioCommandActions, type StudioCommandState } from './useStudioCommands';

function state(overrides: Partial<StudioCommandState> = {}): StudioCommandState {
    return {
        viewerMode: false,
        hasGeometry: true,
        hasPlanarGeometry: true,
        visibleTabs: ['scene', 'code', 'params', 'export'],
        viewMode3D: 'shadedWithEdges',
        viewportBackground: 'dark',
        gridVisible: true,
        markingMode: false,
        sectionMode: false,
        inspectorOpen: true,
        codeLinkFeature: null,
        hasSelection: false,
        projects: [],
        activeProjectId: null,
        ...overrides,
    };
}

function actions(): StudioCommandActions {
    return {
        run: vi.fn(), validate: vi.fn(), setViewMode3D: vi.fn(), setViewportBackground: vi.fn(),
        setGridVisible: vi.fn(), toggleMarkingMode: vi.fn(), toggleSectionMode: vi.fn(), toggleInspector: vi.fn(),
        showTab: vi.fn(), viewTarget: vi.fn(), exportFormat: vi.fn(), savePng: vi.fn(), clearSelection: vi.fn(),
        openProjectManager: vi.fn(), openProject: vi.fn(), newFromStarter: vi.fn(), showShortcuts: vi.fn(),
    };
}

const byId = (list: ReturnType<typeof buildStudioCommands>, id: string) => list.find((c) => c.id === id);

describe('buildStudioCommands', () => {
    it('offers selection actions only while something is picked', () => {
        expect(buildStudioCommands(state(), actions()).some((c) => c.section === 'Selection')).toBe(false);

        const a = actions();
        const list = buildStudioCommands(state({ codeLinkFeature: 'cylinder_1', hasSelection: true }), a);
        const reveal = byId(list, 'selection.reveal-in-code');
        expect(reveal?.description).toContain('cylinder_1');
        reveal?.action();
        expect(a.showTab).toHaveBeenCalledWith('code');
        byId(list, 'selection.clear')?.action();
        expect(a.clearSelection).toHaveBeenCalled();
    });

    it('lists every export format and disables what cannot run', () => {
        const ids = buildStudioCommands(state(), actions()).filter((c) => c.section === 'Export').map((c) => c.id);
        expect(ids).toEqual(['export.stl', 'export.step', 'export.dxf', 'export.3mf', 'export.glb']);

        const noPlanar = buildStudioCommands(state({ hasPlanarGeometry: false }), actions());
        expect(byId(noPlanar, 'export.dxf')?.disabled).toBe(true);
        expect(byId(noPlanar, 'export.stl')?.disabled).toBe(false);

        const empty = buildStudioCommands(state({ hasGeometry: false }), actions());
        expect(empty.filter((c) => c.section === 'Export').every((c) => c.disabled)).toBe(true);
        expect(byId(empty, 'view.save-png')?.disabled).toBe(true);
    });

    it('runs an export with its format and label', () => {
        const a = actions();
        byId(buildStudioCommands(state(), a), 'export.3mf')?.action();
        expect(a.exportFormat).toHaveBeenCalledWith('3mf', '3MF');
    });

    it('opens only the inspector tabs the model has', () => {
        const a = actions();
        const list = buildStudioCommands(state({ visibleTabs: ['scene', 'code', 'params'] }), a);
        expect(byId(list, 'panels.tab.params')?.label).toBe('Customize parameters');
        expect(byId(list, 'panels.tab.joints')).toBeUndefined();
        expect(byId(list, 'panels.tab.export')).toBeUndefined();
        byId(list, 'panels.tab.params')?.action();
        expect(a.showTab).toHaveBeenCalledWith('params');
    });

    it('hides the current display mode and background', () => {
        const list = buildStudioCommands(state({ viewMode3D: 'wireframe', viewportBackground: 'light' }), actions());
        expect(byId(list, 'view.display.wireframe')).toBeUndefined();
        expect(byId(list, 'view.display.shaded')).toBeDefined();
        expect(byId(list, 'view.background.light')).toBeUndefined();
        expect(byId(list, 'view.background.dark')).toBeDefined();
    });

    it('sends camera presets to the viewer', () => {
        const a = actions();
        byId(buildStudioCommands(state(), a), 'view.camera.xy')?.action();
        expect(a.viewTarget).toHaveBeenCalledWith('xy');
    });

    it('labels toggles by what they will do', () => {
        const off = buildStudioCommands(state(), actions());
        expect(byId(off, 'view.section')?.label).toBe('Section view');
        expect(byId(off, 'panels.inspector')?.label).toBe('Hide inspector');
        expect(byId(off, 'panels.inspector')?.shortcut).toEqual(['Mod', '\\']);
        const on = buildStudioCommands(state({ sectionMode: true, inspectorOpen: false }), actions());
        expect(byId(on, 'view.section')?.label).toBe('Close section view');
        expect(byId(on, 'panels.inspector')?.label).toBe('Show inspector');
    });

    it('drops editing commands on a read-only page', () => {
        const list = buildStudioCommands(state({ viewerMode: true }), actions());
        expect(byId(list, 'model.run')).toBeUndefined();
        expect(list.some((c) => c.id.startsWith('file.new.'))).toBe(false);
        expect(byId(list, 'export.stl')).toBeDefined();
    });

    it('lists other local projects, newest first, without the open one', () => {
        const a = actions();
        const list = buildStudioCommands(state({
            activeProjectId: 'p1',
            projects: [
                { id: 'p1', name: 'Open one', lastUpdated: '2026-09-29T10:00:00Z' },
                { id: 'p2', name: 'Older', lastUpdated: '2026-09-01T10:00:00Z' },
                { id: 'p3', name: 'Newer', lastUpdated: '2026-09-28T10:00:00Z' },
            ],
        }), a);
        const switches = list.filter((c) => c.id.startsWith('file.switch.'));
        expect(switches.map((c) => c.label)).toEqual(['Switch to Newer', 'Switch to Older']);
        switches[0].action();
        expect(a.openProject).toHaveBeenCalledWith('p3');
    });

    it('opens a starter with its generated code', () => {
        const a = actions();
        byId(buildStudioCommands(state(), a), 'file.new.bracket')?.action();
        expect(a.newFromStarter).toHaveBeenCalledWith(expect.objectContaining({ id: 'bracket' }), expect.stringContaining('param('));
    });

    it('keeps the palette open for the shortcuts list', () => {
        expect(byId(buildStudioCommands(state(), actions()), 'help.shortcuts')?.keepOpen).toBe(true);
    });
});
