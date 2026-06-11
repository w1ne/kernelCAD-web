// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StudioRecomputeResult } from '../../types';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';

const mockUseRecomputeResult = vi.fn<() => StudioRecomputeResult>();
const mockUseWorkbench = vi.fn<() => { sessionToken: string | null; kernelEpoch?: number }>();

vi.mock('../../hooks/useRecomputeResult', () => ({
    useRecomputeResult: () => mockUseRecomputeResult(),
}));
vi.mock('../../context/WorkbenchContext', () => ({
    useWorkbench: () => mockUseWorkbench(),
}));

// The playback hook is exercised directly in useAnimationPlayback.test.ts.
// Here we override its return only for the collision-banner test; every other
// test delegates to the real implementation.
const mockPlayback = vi.fn();
vi.mock('./useAnimationPlayback', async (importActual) => {
    const actual = await importActual<typeof import('./useAnimationPlayback')>();
    return {
        ...actual,
        useAnimationPlayback: (opts: Parameters<typeof actual.useAnimationPlayback>[0]) => {
            const override = mockPlayback();
            return override ?? actual.useAnimationPlayback(opts);
        },
    };
});

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
        setGeometryTransformOverride: vi.fn(),
        clearGeometryTransformOverrides: vi.fn(),
    };
}

afterEach(() => { cleanup(); });
beforeEach(() => {
    mockUseRecomputeResult.mockReset();
    mockUseWorkbench.mockReset();
    // Default: no override → real useAnimationPlayback runs.
    mockPlayback.mockReset();
    mockPlayback.mockReturnValue(undefined);
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
        // Scrubbing emits exactly ONE param edit — the kernel pose-sync (state
        // coherence), carrying the sampled values at the scrubbed time.
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

    // I1: when the bake reports advisory collisions, the tab shows a warning
    // banner near the honesty caption; a clean timeline shows none.
    function playbackState(over: Record<string, unknown>) {
        return {
            durationMs: 4000, fps: 30, name: 'x', tMs: 0, isPlaying: false,
            mode: 'loop', speed: 1, trackValues: [], canDrive: true,
            bakeState: 'ready', bakeFrames: 2, bakeError: null, collisions: [],
            setMode: vi.fn(), setSpeed: vi.fn(), scrubTo: vi.fn(),
            play: vi.fn(), pause: vi.fn(), toggle: vi.fn(),
            ...over,
        };
    }

    it('renders the collision warning banner when the bake reports collisions', () => {
        mockUseRecomputeResult.mockReturnValue(result([ANIM_RECORD]));
        mockUseWorkbench.mockReturnValue({ sessionToken: 'sess-1' });
        mockPlayback.mockReturnValue(playbackState({
            collisions: [
                { tMs: 500, a: 'arm', b: 'post', volumeMm3: 312.5 },
                { tMs: 600, a: 'arm', b: 'post', volumeMm3: 120.0 },
            ],
        }));
        render(<AnimationTab />);
        const banner = screen.getByTestId('animation-collision-warning');
        expect(banner).toBeTruthy();
        expect(banner.textContent).toContain('2 pose collisions');
        expect(banner.textContent).toContain('kernelcad animate');
    });

    it('renders NO collision banner for a clean timeline', () => {
        mockUseRecomputeResult.mockReturnValue(result([ANIM_RECORD]));
        mockUseWorkbench.mockReturnValue({ sessionToken: 'sess-1' });
        mockPlayback.mockReturnValue(playbackState({ collisions: [] }));
        render(<AnimationTab />);
        expect(screen.queryByTestId('animation-collision-warning')).toBeNull();
    });
});
