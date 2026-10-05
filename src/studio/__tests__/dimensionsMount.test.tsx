// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
//
// Studio, the public /p/<slug> page (LiveModelViewport) and the ChatGPT widget
// (FunnelViewer, source and stored-artifact paths) all render the same Viewer.
// Each must show the Dimensions toggle and draw one graphic per dimension.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ViewerDimension } from '../../shared/intent/viewerDimension';

vi.mock('@react-three/fiber', () => ({
    Canvas: (props: { children: ReactNode }) => <div data-testid="mock-canvas">{props.children}</div>,
    useFrame: () => {},
}));
vi.mock('@react-three/drei/core/Line', () => ({ Line: () => null }));
vi.mock('../components/viewer/ViewerScene', () => ({ ViewerScene: () => null }));
vi.mock('../components/viewer/DisplayReadySensor', () => ({ DisplayReadySensor: () => null }));
vi.mock('../components/viewer/overlays/ViewGizmo', () => ({ ViewGizmo: () => null }));
vi.mock('../components/viewer/measure/MeasureTool', () => ({ MeasureTool: () => null }));
vi.mock('../components/viewer/overlays/DimensionGraphic', () => ({
    DimensionGraphic: (p: { label: string; color?: string }) => (
        <div data-testid="dimension-graphic" data-color={p.color}>{p.label}</div>
    ),
}));

const declared: ViewerDimension = { id: 'declared:0', kind: 'linear', a: [0, 0, 10], b: [40, 0, 10], text: '40', source: 'declared' };
const auto = (i: number, text: string): ViewerDimension => ({
    id: `auto:overall:root:${i}`, kind: 'linear', a: [0, 0, 0], b: [Number(text), 0, 0], text, source: 'auto',
});
const BOUNDS = { min: [0, 0, 0] as [number, number, number], max: [40, 20, 10] as [number, number, number] };

const state = vi.hoisted(() => ({ meshDimensions: null as unknown }));
const workbench = {
    geometries: [], previewGeometries: [], sketchesGeometries: [], showSketches: false, viewMode3D: 'shadedWithEdges',
    isReady: true, isComputing: false, error: null,
    setSelectedFace: vi.fn(), selectedSketchName: null, setSelectedSketchName: vi.fn(),
    sketchMode: { active: false }, planes: [], hiddenIds: [], selectedItemIds: [],
    setSelectedItemId: vi.fn(), toggleSelection: vi.fn(), codeContext: null, setHoveredItemId: vi.fn(),
    get meshDimensions() { return state.meshDimensions; },
};
vi.mock('../context/WorkbenchContext', () => ({
    useWorkbench: () => workbench,
    WorkbenchProvider: (props: { children: ReactNode }) => <>{props.children}</>,
}));
vi.mock('../context/UIContext', () => ({
    useUI: () => ({ setContextMenu: vi.fn(), viewportBackground: 'dark', gridVisible: true }),
}));
vi.mock('../store/useShellStore', () => ({
    useShellStore: () => ({
        sectionMode: false, sectionAxesEnabled: { x: false, y: false, z: true },
        sectionSides: { x: true, y: true, z: true }, sectionOffsets: { x: 0, y: 0, z: 0 },
        sectionKeepWhole: new Set(), viewportFocusTarget: null, viewportFocusTargetVersion: 0,
    }),
}));

import Viewer from '../components/Viewer';
import { LiveModelViewport } from '../ViewerPageShell';
import { FunnelViewer } from '../../funnel/components/FunnelViewer';
import { LEGACY_DIMENSIONS_HINT } from '../components/viewer/dimensions/DimensionsButton';

beforeEach(() => {
    state.meshDimensions = { dimensions: [auto(0, '40'), auto(1, '20'), declared], bounds: BOUNDS };
});
afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

const graphics = () => screen.queryAllByTestId('dimension-graphic');

function expectDeclaredDefaultsOn() {
    const toggle = screen.getByTestId('dimensions-toggle');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(graphics().map((g) => g.textContent)).toEqual(['40', '40', '20']);
    // Declared uses the accent, auto the neutral grey.
    expect(graphics()[0].getAttribute('data-color')).not.toBe(graphics()[1].getAttribute('data-color'));
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(graphics()).toHaveLength(0);
}

describe('Dimensions toggle in every viewer', () => {
    it('Studio viewer', () => {
        render(<Viewer geometries={[]} previewGeometries={[]} sketchesGeometries={[]} showSketches={false} viewMode3D="shadedWithEdges" />);
        expectDeclaredDefaultsOn();
    });

    it('Studio viewer: auto-only defaults off, toggles on', () => {
        state.meshDimensions = { dimensions: [auto(0, '40'), auto(1, '20')], bounds: BOUNDS };
        render(<Viewer geometries={[]} previewGeometries={[]} sketchesGeometries={[]} showSketches={false} viewMode3D="shadedWithEdges" />);
        expect(graphics()).toHaveLength(0);
        fireEvent.click(screen.getByTestId('dimensions-toggle'));
        expect(graphics()).toHaveLength(2);
        expect(screen.queryByTestId('dimensions-legacy-hint')).toBeNull();
    });

    it('public project page viewport', () => {
        render(<LiveModelViewport onDisplayReady={() => {}} label="Model" />);
        expectDeclaredDefaultsOn();
    });

    it('public project page: legacy payload shows bounds dimensions and the hint', () => {
        state.meshDimensions = { bounds: BOUNDS };
        render(<LiveModelViewport onDisplayReady={() => {}} label="Model" />);
        fireEvent.click(screen.getByTestId('dimensions-toggle'));
        expect(graphics().map((g) => g.textContent)).toEqual(['40', '20', '10']);
        expect(screen.getByTestId('dimensions-legacy-hint').textContent).toBe(LEGACY_DIMENSIONS_HINT);
    });

    it('ChatGPT widget viewer (source)', () => {
        render(<FunnelViewer code="return box(1, 1, 1);" />);
        expectDeclaredDefaultsOn();
    });

    const artifact = (extra: object) => ({
        revision: 3,
        bounds: BOUNDS,
        features: [{
            featureId: 'plate', featureKind: 'solid', predecessors: [],
            faces: [{ vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0], indices: [0, 1, 2], normals: [0, 0, 1, 0, 0, 1, 0, 0, 1], faceId: 1 }],
        }],
        ...extra,
    });
    const stubFetch = (body: object) => vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => body })));

    it('ChatGPT widget viewer (stored artifact with dimensions)', async () => {
        state.meshDimensions = null;
        stubFetch(artifact({ dimensions: [auto(0, '40'), auto(1, '20'), declared] }));
        render(<FunnelViewer code="" meshUrl="https://cdn.example/mesh-artifacts/p/v3.json" revision={3} />);
        await waitFor(() => expect(screen.getByTestId('dimensions-toggle')).toBeTruthy());
        expectDeclaredDefaultsOn();
    });

    it('ChatGPT widget viewer (legacy stored artifact)', async () => {
        state.meshDimensions = null;
        stubFetch(artifact({}));
        render(<FunnelViewer code="" meshUrl="https://cdn.example/mesh-artifacts/p/v3.json" revision={3} />);
        await waitFor(() => expect(screen.getByTestId('dimensions-toggle')).toBeTruthy());
        expect(graphics()).toHaveLength(0);
        fireEvent.click(screen.getByTestId('dimensions-toggle'));
        expect(graphics().map((g) => g.textContent)).toEqual(['40', '20', '10']);
        expect(screen.getByTestId('dimensions-legacy-hint')).toBeTruthy();
    });
});
