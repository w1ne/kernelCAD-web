/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('../../components/Viewer', () => ({
    __esModule: true,
    default: (props: Record<string, unknown>) => (
        <div data-testid="mock-viewer" data-view-mode={String(props.viewMode3D)} />
    ),
}));

vi.mock('../hooks/useRecomputeResult', () => ({
    useRecomputeResult: () => ({
        features: [],
        geometries: [],
        validity: null,
        paramTable: null,
        diagnostics: [],
        recomputeMs: 0,
    }),
}));

vi.mock('../hooks/useFeatureSelection', () => ({
    useFeatureSelection: () => ({ selectedFeatureId: null, selectFeature: vi.fn() }),
}));

vi.mock('../../context/WorkbenchContext', () => ({
    useWorkbench: () => ({
        viewMode3D: 'shadedWithEdges',
        sketchesGeometries: [],
        showSketches: false,
        previewGeometries: [],
    }),
}));

import { Viewport } from '../Viewport';

afterEach(() => cleanup());

describe('Viewport', () => {
    it('renders the Viewer plus ParamChips and SelectionHighlight overlay containers', () => {
        render(<Viewport />);
        expect(screen.getByTestId('studio-viewport')).toBeDefined();
        expect(screen.getByTestId('mock-viewer')).toBeDefined();
    });

    it('passes viewMode3D through to the Viewer', () => {
        render(<Viewport />);
        const viewer = screen.getByTestId('mock-viewer');
        expect(viewer.getAttribute('data-view-mode')).toBe('shadedWithEdges');
    });
});
