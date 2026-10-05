// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
//
// Studio, the public /p/<slug> page (LiveModelViewport) and the ChatGPT widget
// (FunnelViewer) all render the same Viewer. The Measure toggle must be there
// in each and mount/unmount the measure tool.
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('@react-three/fiber', () => ({
    Canvas: (props: { children: ReactNode }) => <div data-testid="mock-canvas">{props.children}</div>,
}));
vi.mock('../components/viewer/ViewerScene', () => ({ ViewerScene: () => null }));
vi.mock('../components/viewer/DisplayReadySensor', () => ({ DisplayReadySensor: () => null }));
vi.mock('../components/viewer/overlays/ViewGizmo', () => ({ ViewGizmo: () => null }));
vi.mock('../components/viewer/measure/MeasureTool', () => ({
    MeasureTool: () => <div data-testid="measure-tool" />,
}));

const workbench = {
    geometries: [], previewGeometries: [], sketchesGeometries: [], showSketches: false, viewMode3D: 'shadedWithEdges',
    isReady: true, isComputing: false, error: null,
    setSelectedFace: vi.fn(), selectedSketchName: null, setSelectedSketchName: vi.fn(),
    sketchMode: { active: false }, planes: [], hiddenIds: [], selectedItemIds: [],
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

afterEach(cleanup);

function expectToggleMountsTool() {
    expect(screen.queryByTestId('measure-tool')).toBeNull();
    const toggle = screen.getByTestId('measure-toggle');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(toggle);
    expect(screen.getByTestId('measure-tool')).toBeTruthy();
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(toggle);
    expect(screen.queryByTestId('measure-tool')).toBeNull();
}

describe('Measure toggle in every viewer', () => {
    it('Studio viewer', () => {
        render(<Viewer geometries={[]} previewGeometries={[]} sketchesGeometries={[]} showSketches={false} viewMode3D="shadedWithEdges" />);
        expectToggleMountsTool();
    });
    it('public project page viewport', () => {
        render(<LiveModelViewport onDisplayReady={() => {}} label="Model" />);
        expectToggleMountsTool();
    });
    it('ChatGPT widget viewer', () => {
        render(<FunnelViewer code="return box(1, 1, 1);" />);
        expectToggleMountsTool();
    });
});
