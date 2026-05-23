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
