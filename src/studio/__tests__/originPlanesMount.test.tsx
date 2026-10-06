// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
//
// Studio draws its origin XY/XZ/YZ planes; the public viewers (the /p/<slug>
// LiveModelViewport and FunnelViewer, used by the ChatGPT widget and /embed)
// do not.
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import type { SketchPlaneEntity } from '../../shared/types/plane';

vi.mock('@react-three/fiber', () => ({
    Canvas: (props: { children: ReactNode }) => <div data-testid="mock-canvas">{props.children}</div>,
    useFrame: () => {},
}));
vi.mock('../components/viewer/ViewerScene', () => ({
    ViewerScene: (p: { planes: SketchPlaneEntity[] }) => (
        <>{p.planes.map((plane) => <div key={plane.id} data-testid="scene-plane">{plane.id}</div>)}</>
    ),
}));
vi.mock('../components/viewer/DisplayReadySensor', () => ({ DisplayReadySensor: () => null }));
vi.mock('../components/viewer/overlays/ViewGizmo', () => ({ ViewGizmo: () => null }));
vi.mock('../components/viewer/measure/MeasureTool', () => ({ MeasureTool: () => null }));

const PLANES: SketchPlaneEntity[] = [
    { id: 'base-xy', name: 'Origin XY', type: 'base', origin: [0, 0, 0], normal: [0, 0, 1] },
    { id: 'base-xz', name: 'Origin XZ', type: 'base', origin: [0, 0, 0], normal: [0, 1, 0] },
    { id: 'base-yz', name: 'Origin YZ', type: 'base', origin: [0, 0, 0], normal: [1, 0, 0] },
];
const workbench = {
    geometries: [], previewGeometries: [], sketchesGeometries: [], showSketches: false, viewMode3D: 'shadedWithEdges',
    isReady: true, isComputing: false, error: null, meshDimensions: null,
    setSelectedFace: vi.fn(), selectedSketchName: null, setSelectedSketchName: vi.fn(),
    sketchMode: { active: false }, planes: PLANES, hiddenIds: [], selectedItemIds: [],
    setSelectedItemId: vi.fn(), toggleSelection: vi.fn(), codeContext: null, setHoveredItemId: vi.fn(),
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

afterEach(() => cleanup());

const planes = () => screen.queryAllByTestId('scene-plane').map((p) => p.textContent);

describe('origin planes', () => {
    it('Studio viewer draws them', () => {
        render(<Viewer geometries={[]} previewGeometries={[]} sketchesGeometries={[]} showSketches={false} viewMode3D="shadedWithEdges" />);
        expect(planes()).toEqual(['base-xy', 'base-xz', 'base-yz']);
    });

    it('public project page viewport does not', () => {
        render(<LiveModelViewport onDisplayReady={() => {}} label="Model" />);
        expect(screen.getByTestId('mock-canvas')).toBeTruthy();
        expect(planes()).toEqual([]);
    });

    it('FunnelViewer (ChatGPT widget, embed) does not', () => {
        render(<FunnelViewer code="return box(1, 1, 1);" />);
        expect(screen.getByTestId('mock-canvas')).toBeTruthy();
        expect(planes()).toEqual([]);
    });
});
