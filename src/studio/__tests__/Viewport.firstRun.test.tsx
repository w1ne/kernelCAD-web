// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const state = vi.hoisted(() => ({
    geometries: [] as unknown[],
    workbench: {} as Record<string, unknown>,
    chrome: { viewerMode: false } as Record<string, unknown>,
}));

vi.mock('../components/Viewer', () => ({ __esModule: true, default: () => <div data-testid="mock-viewer" /> }));
vi.mock('../ParamChips', () => ({ ParamChips: () => null }));
vi.mock('../SelectionHighlight', () => ({ SelectionHighlight: () => null }));
vi.mock('../hooks/useRecomputeResult', () => ({ useRecomputeResult: () => ({ geometries: state.geometries }) }));
vi.mock('../context/WorkbenchContext', () => ({ useWorkbench: () => state.workbench }));
vi.mock('../context/StudioChromeContext', () => ({ useStudioChrome: () => state.chrome }));
vi.mock('../start/StudioEmptyState', () => ({ StudioEmptyState: () => <div data-testid="studio-empty-state" /> }));
vi.mock('../start/CoachMarks', () => ({ CoachMarks: () => <div data-testid="coach-marks" /> }));

import { Viewport } from '../Viewport';

const EMPTY_RUN = {
    viewMode3D: 'shadedWithEdges', isReady: true, isComputing: false, error: null, executionCount: 1,
    sketchesGeometries: [], previewGeometries: [], sketchMode: { active: false },
};

afterEach(() => {
    cleanup();
    state.geometries = [];
    state.chrome = { viewerMode: false };
    history.replaceState(null, '', '/');
});

describe('Viewport first run', () => {
    it('shows the empty state when the model ran and gave nothing', () => {
        state.workbench = EMPTY_RUN;
        render(<Viewport />);
        expect(screen.getByTestId('studio-empty-state')).toBeTruthy();
        expect(screen.getByTestId('coach-marks')).toBeTruthy();
    });

    it('keeps the model: no empty state while there is geometry or a run is pending', () => {
        state.workbench = EMPTY_RUN;
        state.geometries = [{ id: 'box_1' }];
        render(<Viewport />);
        expect(screen.queryByTestId('studio-empty-state')).toBeNull();
        cleanup();

        state.geometries = [];
        state.workbench = { ...EMPTY_RUN, isComputing: true };
        render(<Viewport />);
        expect(screen.queryByTestId('studio-empty-state')).toBeNull();
    });

    it('shows nothing on a shared model page or in viewer mode', () => {
        state.workbench = EMPTY_RUN;
        history.replaceState(null, '', '/p/abc123?view=studio');
        render(<Viewport />);
        expect(screen.queryByTestId('studio-empty-state')).toBeNull();
        expect(screen.queryByTestId('coach-marks')).toBeNull();
        cleanup();

        history.replaceState(null, '', '/');
        state.chrome = { viewerMode: true };
        render(<Viewport />);
        expect(screen.queryByTestId('studio-empty-state')).toBeNull();
        expect(screen.queryByTestId('coach-marks')).toBeNull();
    });
});
