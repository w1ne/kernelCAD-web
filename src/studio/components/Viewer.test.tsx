// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import * as THREE from 'three';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('@react-three/fiber', () => ({
    Canvas: (props: Record<string, unknown>) => (
        <div
            data-testid="mock-canvas"
            data-camera={JSON.stringify(props.camera)}
            data-tone-mapping={String((props.gl as { toneMapping?: unknown } | undefined)?.toneMapping)}
            data-color-space={String((props.gl as { outputColorSpace?: unknown } | undefined)?.outputColorSpace)}
            data-preserve-drawing={String((props.gl as { preserveDrawingBuffer?: boolean } | undefined)?.preserveDrawingBuffer)}
            data-line-threshold={String((props.raycaster as { params?: { Line?: { threshold?: number } } } | undefined)?.params?.Line?.threshold)}
            data-points-threshold={String((props.raycaster as { params?: { Points?: { threshold?: number } } } | undefined)?.params?.Points?.threshold)}
        >
            <button
                data-testid="canvas-created"
                onClick={() => (props.onCreated as (state: { gl: { localClippingEnabled?: boolean } }) => void)({ gl: mockGlState })}
            />
            <button
                data-testid="canvas-missed"
                onClick={() => (props.onPointerMissed as () => void)()}
            />
            {props.children as ReactNode}
        </div>
    ),
}));

vi.mock('./viewer/ViewerScene', () => ({
    ViewerScene: (props: Record<string, unknown>) => (
        <div
            data-testid="viewer-scene"
            data-view-mode={String(props.viewMode3D)}
            data-show-sketches={String(props.showSketches)}
            data-sketch-active={String(props.sketchActive)}
            data-item-names={JSON.stringify(props.itemNames)}
            data-hidden-ids={JSON.stringify(props.hiddenIds)}
            data-selected-ids={JSON.stringify(props.selectedItemIds)}
            data-selected-sketch={String(props.selectedSketchName)}
            data-section-keep-whole={String(props.sectionKeepWhole)}
            data-clip-count={String((props.clippingPlanes as unknown[] | undefined)?.length ?? 0)}
            data-grid-visible={String(props.gridVisible)}
            data-grid-z={String((props.gridPlacement as { z?: number } | undefined)?.z)}
            data-nav-id={String((props.navigationRequest as { id?: number } | null)?.id ?? '')}
            data-focus-id={String((props.focusRequest as { id?: number } | null)?.id ?? '')}
            data-viewport-background={String(props.viewportBackground)}
            data-planes={JSON.stringify(props.planes)}
            data-geometry-count={String(Array.isArray(props.geometries) ? props.geometries.length : -1)}
        />
    ),
}));

vi.mock('./viewer/DisplayReadySensor', () => ({
    DisplayReadySensor: (props: Record<string, unknown>) => (
        <div
            data-testid="display-ready-sensor"
            data-geometry-count={String(Array.isArray(props.geometries) ? props.geometries.length : -1)}
        />
    ),
}));

vi.mock('./viewer/overlays/ViewGizmo', () => ({
    ViewGizmo: (props: Record<string, unknown>) => (
        <button
            data-testid="view-gizmo"
            onClick={() => (props.onNavigate as (target: string) => void)('left')}
        >
            gizmo
        </button>
    ),
}));

const mockGlState: { localClippingEnabled?: boolean } = {};

const mockWorkbench: {
    setSelectedFace: ReturnType<typeof vi.fn>;
    selectedSketchName: string | null;
    setSelectedSketchName: ReturnType<typeof vi.fn>;
    sketchMode: { active: boolean };
    planes: { id: string; name: string }[];
    hiddenIds: string[];
    selectedItemIds: string[];
    setSelectedItemId: ReturnType<typeof vi.fn>;
    toggleSelection: ReturnType<typeof vi.fn>;
    codeContext: { returnedVariables: (string | null)[] } | null;
    setHoveredItemId: ReturnType<typeof vi.fn>;
} = {
    setSelectedFace: vi.fn(),
    selectedSketchName: 'sketch-1',
    setSelectedSketchName: vi.fn(),
    sketchMode: { active: false },
    planes: [{ id: 'plane-xy', name: 'XY Plane' }],
    hiddenIds: ['box1'],
    selectedItemIds: ['box1'],
    setSelectedItemId: vi.fn(),
    toggleSelection: vi.fn(),
    codeContext: { returnedVariables: ['box1', 'cyl1'] },
    setHoveredItemId: vi.fn(),
};

const mockUI = {
    setContextMenu: vi.fn(),
    viewportBackground: 'bg-grid',
    gridVisible: true,
};

const mockShell: Record<string, unknown> = {
    sectionMode: false,
    sectionAxesEnabled: { x: true, y: false, z: false },
    sectionSides: { x: true, y: true, z: true },
    sectionOffsets: { x: 0, y: 0, z: 0 },
    sectionKeepWhole: false,
    viewportFocusTarget: null,
    viewportFocusTargetVersion: 0,
};

vi.mock('../context/WorkbenchContext', () => ({ useWorkbench: () => mockWorkbench }));
vi.mock('../context/UIContext', () => ({ useUI: () => mockUI }));
vi.mock('../store/useShellStore', () => ({ useShellStore: () => mockShell }));

import Viewer from './Viewer';

function renderViewer(props: Partial<Parameters<typeof Viewer>[0]> = {}) {
    return render(
        <Viewer
            geometries={[]}
            previewGeometries={[]}
            sketchesGeometries={[]}
            showSketches
            viewMode3D="shadedWithEdges"
            {...props}
        />,
    );
}

beforeEach(() => {
    vi.clearAllMocks();
    mockGlState.localClippingEnabled = false;
    mockWorkbench.sketchMode = { active: false };
    mockWorkbench.selectedSketchName = 'sketch-1';
    mockWorkbench.codeContext = { returnedVariables: ['box1', 'cyl1'] };
    Object.assign(mockShell, {
        sectionMode: false,
        sectionAxesEnabled: { x: true, y: false, z: false },
        sectionSides: { x: true, y: true, z: true },
        sectionOffsets: { x: 0, y: 0, z: 0 },
        sectionKeepWhole: false,
        viewportFocusTarget: null,
        viewportFocusTargetVersion: 0,
    });
});

afterEach(() => cleanup());

describe('Viewer', () => {
    it('renders the viewer container and the version banner', () => {
        renderViewer();
        expect(screen.getByTestId('viewer-container')).toBeDefined();
        expect(screen.getByText(/kernelCAD v/)).toBeDefined();
    });

    it('wires the Canvas camera, gl options and raycaster thresholds', () => {
        renderViewer();
        const canvas = screen.getByTestId('mock-canvas');
        expect(canvas.getAttribute('data-camera')).toBe(JSON.stringify({ position: [40, 40, 40], fov: 40 }));
        expect(canvas.getAttribute('data-preserve-drawing')).toBe('true');
        expect(canvas.getAttribute('data-tone-mapping')).toBe(String(THREE.NeutralToneMapping));
        expect(canvas.getAttribute('data-color-space')).toBe(String(THREE.SRGBColorSpace));
        expect(canvas.getAttribute('data-line-threshold')).toBe('0.4');
        expect(canvas.getAttribute('data-points-threshold')).toBe('0.2');
    });

    it('enables local clipping on the renderer when the Canvas is created', () => {
        renderViewer();
        fireEvent.click(screen.getByTestId('canvas-created'));
        expect(mockGlState.localClippingEnabled).toBe(true);
    });

    it('clears selection, sketch and context menu on a missed pointer', () => {
        renderViewer();
        fireEvent.click(screen.getByTestId('canvas-missed'));

        expect(mockWorkbench.setSelectedFace).toHaveBeenCalledWith(null);
        expect(mockWorkbench.setSelectedSketchName).toHaveBeenCalledWith(null);
        expect(mockWorkbench.setSelectedItemId).toHaveBeenCalledWith(null);
        expect(mockUI.setContextMenu).toHaveBeenCalledWith({ visible: false, position: null, type: 'FACE' });
    });

    it('passes workbench and shell state through to ViewerScene', () => {
        renderViewer();
        const scene = screen.getByTestId('viewer-scene');

        expect(scene.getAttribute('data-view-mode')).toBe('shadedWithEdges');
        expect(scene.getAttribute('data-show-sketches')).toBe('true');
        expect(scene.getAttribute('data-sketch-active')).toBe('false');
        expect(scene.getAttribute('data-item-names')).toBe(JSON.stringify(['box1', 'cyl1']));
        expect(scene.getAttribute('data-hidden-ids')).toBe(JSON.stringify(['box1']));
        expect(scene.getAttribute('data-selected-ids')).toBe(JSON.stringify(['box1']));
        expect(scene.getAttribute('data-selected-sketch')).toBe('sketch-1');
        expect(scene.getAttribute('data-section-keep-whole')).toBe('false');
        expect(scene.getAttribute('data-clip-count')).toBe('0');
        expect(scene.getAttribute('data-grid-visible')).toBe('true');
        expect(scene.getAttribute('data-grid-z')).toBe('0');
        expect(scene.getAttribute('data-viewport-background')).toBe('bg-grid');
        expect(scene.getAttribute('data-planes')).toBe(JSON.stringify(mockWorkbench.planes));
        expect(scene.getAttribute('data-geometry-count')).toBe('0');
    });

    it('derives the cursor from sketch mode', () => {
        renderViewer();
        expect(screen.getByTestId('viewer-container').style.cursor).toBe('default');

        mockWorkbench.sketchMode = { active: true };
        renderViewer();
        expect(screen.getAllByTestId('viewer-container')[1].style.cursor).toBe('crosshair');
    });

    it('applies section clipping planes when the section tool is active', () => {
        mockShell.sectionMode = true;
        renderViewer();
        expect(screen.getByTestId('viewer-scene').getAttribute('data-clip-count')).toBe('1');
    });

    it('maps the shell focus target version onto the focus request', () => {
        mockShell.viewportFocusTarget = { kind: 'item', id: 'box1' };
        mockShell.viewportFocusTargetVersion = 3;
        renderViewer();
        expect(screen.getByTestId('viewer-scene').getAttribute('data-focus-id')).toBe('3');
    });

    it('renders DisplayReadySensor only when onDisplayReady is provided', () => {
        renderViewer();
        expect(screen.queryByTestId('display-ready-sensor')).toBeNull();

        renderViewer({ onDisplayReady: vi.fn() });
        expect(screen.getByTestId('display-ready-sensor').getAttribute('data-geometry-count')).toBe('0');
    });

    it('increments the navigation request id on every gizmo navigation', () => {
        renderViewer();
        expect(screen.getByTestId('viewer-scene').getAttribute('data-nav-id')).toBe('');

        fireEvent.click(screen.getByTestId('view-gizmo'));
        expect(screen.getByTestId('viewer-scene').getAttribute('data-nav-id')).toBe('1');

        fireEvent.click(screen.getByTestId('view-gizmo'));
        expect(screen.getByTestId('viewer-scene').getAttribute('data-nav-id')).toBe('2');
    });
});
