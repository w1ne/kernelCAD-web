/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StudioRecomputeResult } from '../../types';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';

const mockUseRecomputeResult = vi.fn<() => StudioRecomputeResult>();
const mockUseWorkbench = vi.fn<() => { sessionToken: string | null }>();

vi.mock('../../hooks/useRecomputeResult', () => ({
    useRecomputeResult: () => mockUseRecomputeResult(),
}));
vi.mock('../../context/WorkbenchContext', () => ({
    useWorkbench: () => mockUseWorkbench(),
}));

import { AnimationTab } from './AnimationTab';

const ANIM_RECORD = {
    id: 'animationView_1',
    kind: 'animationView',
    inputs: {},
    params: {},
    transforms: [],
    suppressed: false,
    metadata: {
        name: 'dispense-cycle',
        fps: 30,
        durationMs: 4000,
        virtual: true,
        tracks: [
            { param: 'drumDeg', keys: [
                { atMs: 0, value: 0, ease: 'linear' },
                { atMs: 1200, value: 60, ease: 'easeInOut' },
                { atMs: 4000, value: 60, ease: 'linear' },
            ] },
            { param: 'meterDeg', keys: [
                { atMs: 1400, value: 0, ease: 'linear' },
                { atMs: 2200, value: 117, ease: 'easeIn' },
            ] },
        ],
    },
} as unknown as FeatureRecord;

function result(features: FeatureRecord[], updateParam?: StudioRecomputeResult['updateParam']): StudioRecomputeResult {
    return {
        features,
        geometries: [],
        validity: null,
        paramTable: null,
        diagnostics: [],
        recomputeMs: 0,
        rawInterferencePairs: [],
        joints: [],
        updateParam,
    };
}

afterEach(() => { cleanup(); });
beforeEach(() => {
    mockUseRecomputeResult.mockReset();
    mockUseWorkbench.mockReset();
});

describe('AnimationTab', () => {
    it('renders empty state when no animationView record exists', () => {
        mockUseRecomputeResult.mockReturnValue(result([]));
        mockUseWorkbench.mockReturnValue({ sessionToken: 'sess-1' });
        render(<AnimationTab />);
        expect(screen.getByTestId('animation-empty-state')).toBeTruthy();
        expect(screen.queryByTestId('animation-tab')).toBeNull();
    });

    it('renders timeline, per-track readout, and transport in script mode', () => {
        const update = vi.fn().mockResolvedValue(undefined);
        mockUseRecomputeResult.mockReturnValue(result([ANIM_RECORD], update));
        mockUseWorkbench.mockReturnValue({ sessionToken: 'sess-1' });
        render(<AnimationTab />);
        expect(screen.getByTestId('animation-tab')).toBeTruthy();
        expect(screen.getByTestId('animation-track-drumDeg')).toBeTruthy();
        expect(screen.getByTestId('animation-track-meterDeg')).toBeTruthy();
        // At tMs=0 both tracks hold-clamp to their first key value.
        expect(screen.getByTestId('animation-track-value-drumDeg').textContent).toBe('0.00');
        expect(screen.queryByTestId('animation-editor-mode-note')).toBeNull();
        // Scrubbing emits one batch through the params pipeline.
        fireEvent.change(screen.getByTestId('animation-scrubber'), { target: { value: '600' } });
        expect(update).toHaveBeenCalledOnce();
        expect(update.mock.calls[0][0]).toEqual([
            { name: 'drumDeg', value: 30 },
            { name: 'meterDeg', value: 0 },
        ]);
    });

    it('shows the editor-mode note and does not emit when no session token', () => {
        const update = vi.fn().mockResolvedValue(undefined);
        mockUseRecomputeResult.mockReturnValue(result([ANIM_RECORD], update));
        mockUseWorkbench.mockReturnValue({ sessionToken: null });
        render(<AnimationTab />);
        expect(screen.getByTestId('animation-editor-mode-note')).toBeTruthy();
        fireEvent.change(screen.getByTestId('animation-scrubber'), { target: { value: '600' } });
        expect(update).not.toHaveBeenCalled();
    });
});
