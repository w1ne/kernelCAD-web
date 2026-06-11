// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StudioRecomputeResult } from '../../types';
import { ParamTable } from '../../../shared/runtime/paramTable';

const mockUseRecomputeResult = vi.fn<() => StudioRecomputeResult>();

vi.mock('../../hooks/useRecomputeResult', () => ({
    useRecomputeResult: () => mockUseRecomputeResult(),
}));

import { ParamsTab } from '../../tabs/ParamsTab';

function emptyResult(): StudioRecomputeResult {
    return {
        features: [],
        geometries: [],
        validity: null,
        paramTable: null,
        diagnostics: [],
        recomputeMs: 0,
        rawInterferencePairs: [],
        joints: [],
    };
}

function withTable(table: ParamTable): StudioRecomputeResult {
    return { ...emptyResult(), paramTable: table };
}

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

beforeEach(() => {
    mockUseRecomputeResult.mockReset();
});

describe('ParamsTab', () => {
    it('renders the empty state when paramTable is null', () => {
        mockUseRecomputeResult.mockReturnValue(emptyResult());

        render(<ParamsTab />);

        expect(screen.getByTestId('params-empty-state').textContent).toContain(
            'No script-declared params',
        );
        expect(screen.queryByTestId('params-tab')).toBeNull();
    });

    it('renders the empty state when paramTable is empty', () => {
        const table = new ParamTable();
        mockUseRecomputeResult.mockReturnValue(withTable(table));

        render(<ParamsTab />);

        expect(screen.getByTestId('params-empty-state')).toBeTruthy();
        expect(screen.queryByTestId('params-tab')).toBeNull();
    });

    it('renders one row per number param with a scrub slider when min/max set', () => {
        const table = new ParamTable();
        table.declare('wallThickness', 'number', 2.5, { min: 1, max: 5 });
        table.declare('boreRadius', 'number', 4, { min: 0, max: 10 });
        mockUseRecomputeResult.mockReturnValue(withTable(table));

        render(<ParamsTab />);

        expect(screen.getByTestId('params-tab')).toBeTruthy();
        expect(screen.queryAllByTestId(/^param-row-/)).toHaveLength(2);
        expect(screen.getByTestId('scrub-slider-wallThickness')).toBeTruthy();
        expect(screen.getByTestId('scrub-slider-boreRadius')).toBeTruthy();

        const row1 = screen.getByTestId('param-row-wallThickness');
        expect(row1.textContent).toContain('wallThickness');
        const input1 = screen.getByTestId('scrub-input-wallThickness') as HTMLInputElement;
        expect(input1.value).toBe('2.5');

        const row2 = screen.getByTestId('param-row-boreRadius');
        expect(row2.textContent).toContain('boreRadius');
        const input2 = screen.getByTestId('scrub-input-boreRadius') as HTMLInputElement;
        expect(input2.value).toBe('4');
    });

    it('renders an interactive checkbox for boolean params', () => {
        const table = new ParamTable();
        table.declare('chamfered', 'boolean', true);
        mockUseRecomputeResult.mockReturnValue(withTable(table));

        render(<ParamsTab />);

        const checkbox = screen.getByTestId('param-checkbox-chamfered') as HTMLInputElement;
        expect(checkbox).toBeTruthy();
        expect(checkbox.disabled).toBe(false);
        expect(checkbox.checked).toBe(true);
        expect(screen.getByTestId('param-row-chamfered').textContent).toContain('chamfered');
    });

    it('keeps joint-bound params visible in the Params tab', () => {
        const table = new ParamTable();
        table.declare('heightAdjustMm', 'number', 0, { min: 0, max: 6.12 });
        mockUseRecomputeResult.mockReturnValue({
            ...withTable(table),
            joints: [
                {
                    mate: {
                        name: 'height-adjust',
                        a: 'sleeve.rail',
                        b: 'post.slide',
                        type: 'prismatic',
                        limitsMm: [0, 6.12],
                    },
                    pose: 0,
                    poseParamNames: ['heightAdjustMm'],
                },
            ],
        });

        render(<ParamsTab />);

        expect(screen.getByTestId('param-row-heightAdjustMm')).toBeTruthy();
        expect(screen.getByTestId('scrub-slider-heightAdjustMm')).toBeTruthy();
    });

    describe('interference indicator', () => {
        const headArmPair = { a: 'head', b: 'upper-arm', volumeMm3: 142 };

        function joint(name: string, a: string, b: string, paramName: string): import('../../adapters/featureRecordsToMates').JointPoseSnapshot {
            return {
                mate: {
                    name,
                    a,
                    b,
                    type: 'revolute',
                    limitsDeg: [-90, 90],
                },
                pose: 0,
                poseParamNames: [paramName],
            };
        }

        it('marks the slider implicated in an interference with a red track + "!" badge', () => {
            const table = new ParamTable();
            table.declare('shoulderDeg', 'number', 45, { min: -90, max: 90 });
            table.declare('twistDeg', 'number', 0, { min: -90, max: 90 });
            mockUseRecomputeResult.mockReturnValue({
                ...withTable(table),
                rawInterferencePairs: [headArmPair],
                joints: [
                    // shoulder joint: head ↔ upper-arm — implicated by interference
                    joint('shoulder', 'head.bottom', 'upper-arm.top', 'shoulderDeg'),
                    // twist joint on an unrelated subassembly — NOT implicated
                    joint('twist', 'cap.top', 'mount.base', 'twistDeg'),
                ],
            });

            render(<ParamsTab />);

            // The implicated slider should carry the badge.
            expect(screen.getByTestId('scrub-interference-badge-shoulderDeg')).toBeTruthy();
            expect(screen.getByTestId('scrub-shoulderDeg').getAttribute('data-colliding')).toBe('true');

            // The unrelated slider should NOT carry it (neither cap nor mount appears in the pair).
            expect(screen.queryByTestId('scrub-interference-badge-twistDeg')).toBeNull();
            expect(screen.getByTestId('scrub-twistDeg').getAttribute('data-colliding')).toBeNull();

            // No banner fallback when at least one param could be implicated.
            expect(screen.queryByTestId('params-interference-banner')).toBeNull();
        });

        it('implicates every joint that touches a colliding part (loose heuristic, lamp-chain case)', () => {
            // Lamp-style kinematic chain: base ↔ arm ↔ head. Collision is
            // arm ↔ head. The arm-joint connects base↔arm, the head-joint
            // connects arm↔head. Both joints touch a colliding part, so
            // both sliders flag as potentially-implicated.
            const table = new ParamTable();
            table.declare('armDeg', 'number', 0, { min: -90, max: 90 });
            table.declare('headDeg', 'number', 0, { min: -90, max: 90 });
            mockUseRecomputeResult.mockReturnValue({
                ...withTable(table),
                rawInterferencePairs: [{ a: 'arm', b: 'head', volumeMm3: 50 }],
                joints: [
                    joint('armPivot', 'base.top', 'arm.bottom', 'armDeg'),
                    joint('headPivot', 'arm.top', 'head.base', 'headDeg'),
                ],
            });

            render(<ParamsTab />);

            expect(screen.getByTestId('scrub-interference-badge-armDeg')).toBeTruthy();
            expect(screen.getByTestId('scrub-interference-badge-headDeg')).toBeTruthy();
        });

        it('falls back to a top-of-panel banner when interferences exist but no joint binds to a slider', () => {
            const table = new ParamTable();
            table.declare('wallThickness', 'number', 2.5, { min: 1, max: 5 });
            mockUseRecomputeResult.mockReturnValue({
                ...withTable(table),
                rawInterferencePairs: [headArmPair],
                joints: [],
            });

            render(<ParamsTab />);

            const banner = screen.getByTestId('params-interference-banner');
            expect(banner).toBeTruthy();
            expect(banner.textContent).toContain('1 interference in current pose');
            // No per-slider badge — banner is the only signal here.
            expect(screen.queryByTestId('scrub-interference-badge-wallThickness')).toBeNull();
        });

        it('clears the indicator when there are no interference pairs', () => {
            const table = new ParamTable();
            table.declare('shoulderDeg', 'number', 45, { min: -90, max: 90 });
            mockUseRecomputeResult.mockReturnValue({
                ...withTable(table),
                rawInterferencePairs: [],
                joints: [joint('shoulder', 'head.bottom', 'upper-arm.top', 'shoulderDeg')],
            });

            render(<ParamsTab />);

            expect(screen.queryByTestId('scrub-interference-badge-shoulderDeg')).toBeNull();
            expect(screen.queryByTestId('params-interference-banner')).toBeNull();
        });
    });

    it('does not rebuild on every slider tick and flushes the final value on release', () => {
        vi.useFakeTimers();
        const table = new ParamTable();
        table.declare('heightAdjustMm', 'number', 0, { min: 0, max: 6.12 });
        const updateParam = vi.fn().mockResolvedValue(undefined);
        mockUseRecomputeResult.mockReturnValue({ ...withTable(table), updateParam });

        render(<ParamsTab />);

        const slider = screen.getByTestId('scrub-slider-heightAdjustMm') as HTMLInputElement;
        fireEvent.change(slider, { target: { value: '1' } });
        fireEvent.change(slider, { target: { value: '2' } });
        fireEvent.change(slider, { target: { value: '3' } });
        vi.advanceTimersByTime(699);
        expect(updateParam).not.toHaveBeenCalled();

        fireEvent.pointerUp(slider);

        expect(updateParam).toHaveBeenCalledExactlyOnceWith([
            { name: 'heightAdjustMm', value: 3 },
        ]);
    });
});
