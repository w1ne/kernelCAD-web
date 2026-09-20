// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
//
// Characterisation tests for ViewerScene. The scene component is pure JSX over
// react-three-fiber intrinsics; mocking every child to a DOM marker pins the
// composition — which layers render, in what order, under which conditions —
// so later extractions cannot reorder, drop or unconditionally render a layer.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import * as THREE from 'three';
import type { GeometryResult } from '../../../shared/worker/geometryEngine';

vi.mock('@react-three/drei/core/Grid', () => ({
    Grid: () => <div data-testid="grid" />,
}));
vi.mock('@react-three/drei/core/OrbitControls', () => ({
    OrbitControls: () => <div data-testid="orbit-controls" />,
}));
vi.mock('./RendererSnapshotPublisher', () => ({
    RendererSnapshotPublisher: () => <div data-testid="snapshot-publisher" />,
}));
vi.mock('./SceneBackground', () => ({
    SceneBackground: ({ mode }: { mode: string }) => (
        <div data-testid="scene-background" data-mode={mode} />
    ),
}));
vi.mock('./controllers/InteractionHandler', () => ({
    InteractionHandler: () => <div data-testid="interaction-handler" />,
}));
vi.mock('./overlays/HighlightOverlay', () => ({
    HighlightOverlay: () => <div data-testid="highlight-overlay" />,
}));
vi.mock('./overlays/SnapIndicator', () => ({
    SnapIndicator: () => <div data-testid="snap-indicator" />,
}));
vi.mock('./overlays/SelectionOutline', () => ({
    SelectionOutline: () => <div data-testid="selection-outline" />,
}));
vi.mock('./layers/GeometryLayer', () => ({
    GeometryLayer: ({ hiddenIds }: { hiddenIds: string[] }) => (
        <div data-testid="geometry-layer" data-hidden={hiddenIds.join(',')} />
    ),
}));
vi.mock('./layers/SketchLayer', () => ({
    SketchLayer: () => <div data-testid="sketch-layer" />,
}));
vi.mock('./DirectEditGizmo', () => ({
    DirectEditGizmo: () => <div data-testid="direct-edit-gizmo" />,
}));
vi.mock('./entities/PlaneEntity', () => ({
    PlaneLayer: () => <div data-testid="plane-layer" />,
}));
vi.mock('./layers/ParametricLayer', () => ({
    ParametricLayer: () => <div data-testid="parametric-layer" />,
}));
vi.mock('./entities/ShapeGeometry', () => ({
    GhostShape: () => <div data-testid="ghost-shape" />,
}));
vi.mock('./controllers/CameraHandler', () => ({
    CameraHandler: () => <div data-testid="camera-handler" />,
}));
vi.mock('./captureViewerPng', () => ({
    CAPTURE_HIDDEN_FLAG: '__kcadCaptureHidden',
}));

import { ViewerScene } from './ViewerScene';

function baseProps(): React.ComponentProps<typeof ViewerScene> {
    return {
        geometries: [],
        previewGeometries: [],
        sketchesGeometries: [],
        showSketches: false,
        viewMode3D: 'shaded',
        gridPlacement: { z: 0, fade: 100 },
        gridVisible: true,
        sketchActive: false,
        itemNames: [],
        hiddenIds: [],
        selectedItemIds: [],
        selectedSketchName: null,
        sectionKeepWhole: new Set<string>(),
        clippingPlanes: [] as THREE.Plane[],
        hoveredItem: null,
        setHoveredItem: vi.fn(),
        snapPoint: null,
        setSnapPoint: vi.fn(),
        toggleSelection: vi.fn(),
        setSelectedFace: vi.fn(),
        setSelectedSketchName: vi.fn(),
        setSelectedItemId: vi.fn(),
        setContextMenu: vi.fn(),
        navigationRequest: null,
        focusRequest: null,
        viewportBackground: 'dark',
        planes: [],
    };
}

function renderScene(overrides: Partial<React.ComponentProps<typeof ViewerScene>> = {}) {
    return render(<ViewerScene {...baseProps()} {...overrides} />);
}

function testIds(container: HTMLElement): (string | null)[] {
    return [...container.querySelectorAll('[data-testid]')].map((el) =>
        el.getAttribute('data-testid'),
    );
}

afterEach(() => {
    cleanup();
});

describe('ViewerScene', () => {
    it('renders the working-view layer stack in order', () => {
        const { container } = renderScene();
        expect(testIds(container)).toEqual([
            'snapshot-publisher',
            'scene-background',
            'interaction-handler',
            'highlight-overlay',
            'snap-indicator',
            'selection-outline',
            'grid',
            'geometry-layer',
            'direct-edit-gizmo',
            'plane-layer',
            'orbit-controls',
            'camera-handler',
        ]);
    });

    it('hides the grid when gridVisible is false and while sketching', () => {
        expect(testIds(renderScene({ gridVisible: false }).container)).not.toContain('grid');
        expect(testIds(renderScene({ sketchActive: true }).container)).not.toContain('grid');
    });

    it('shows the sketch layer only when showSketches is set', () => {
        expect(testIds(renderScene({ showSketches: true }).container)).toContain('sketch-layer');
        expect(testIds(renderScene().container)).not.toContain('sketch-layer');
    });

    it('swaps the gizmo for the parametric layer while sketching', () => {
        const ids = testIds(renderScene({ sketchActive: true }).container);
        expect(ids).not.toContain('direct-edit-gizmo');
        expect(ids).toContain('parametric-layer');
        expect(ids).toContain('orbit-controls');
    });

    it('renders one ghost shape per preview geometry', () => {
        const previewGeometries: GeometryResult[] = [{ faces: [] }, { faces: [] }];
        const ghosts = renderScene({ previewGeometries }).container.querySelectorAll(
            '[data-testid="ghost-shape"]',
        );
        expect(ghosts.length).toBe(2);
    });

    it('passes through hiddenIds, viewport background and planes', () => {
        const { container } = renderScene({
            hiddenIds: ['box-1', 'hole-2'],
            viewportBackground: 'light',
        });
        expect(
            container.querySelector('[data-testid="geometry-layer"]')?.getAttribute('data-hidden'),
        ).toBe('box-1,hole-2');
        expect(
            container.querySelector('[data-testid="scene-background"]')?.getAttribute('data-mode'),
        ).toBe('light');
    });
});
