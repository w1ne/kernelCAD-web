/** @vitest-environment jsdom */
import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ParamsTab } from '../../../src/studio/tabs/ParamsTab';
import * as useRecomputeResultModule from '../../../src/studio/hooks/useRecomputeResult';
import { ParamTable } from '../../../src/shared/runtime/paramTable';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('ParamsTab interactive numeric scrub', () => {
    it('slider change calls updateParam with name + value', async () => {
        const updateMock = vi.fn().mockResolvedValue(undefined);
        const table = new ParamTable();
        table.declare('width', 'number', 50, { min: 10, max: 100 });
        vi.spyOn(useRecomputeResultModule, 'useRecomputeResult').mockReturnValue({
            features: [],
            geometries: [],
            validity: null,
            paramTable: table,
            diagnostics: [],
            recomputeMs: 0,
            updateParam: updateMock,
        } as unknown as ReturnType<typeof useRecomputeResultModule.useRecomputeResult>);
        render(<ParamsTab />);
        const slider = screen.getByTestId('scrub-slider-width') as HTMLInputElement;
        fireEvent.change(slider, { target: { value: '75' } });
        await waitFor(() =>
            expect(updateMock).toHaveBeenCalledWith([{ name: 'width', value: 75 }]),
        );
    });

    it('input edit + blur calls updateParam', async () => {
        const updateMock = vi.fn().mockResolvedValue(undefined);
        const table = new ParamTable();
        table.declare('width', 'number', 50, { min: 10, max: 100 });
        vi.spyOn(useRecomputeResultModule, 'useRecomputeResult').mockReturnValue({
            features: [],
            geometries: [],
            validity: null,
            paramTable: table,
            diagnostics: [],
            recomputeMs: 0,
            updateParam: updateMock,
        } as unknown as ReturnType<typeof useRecomputeResultModule.useRecomputeResult>);
        render(<ParamsTab />);
        const input = screen.getByTestId('scrub-input-width') as HTMLInputElement;
        fireEvent.change(input, { target: { value: '42' } });
        fireEvent.blur(input);
        await waitFor(() =>
            expect(updateMock).toHaveBeenCalledWith([{ name: 'width', value: 42 }]),
        );
    });

    it('renders empty state when no params declared', () => {
        vi.spyOn(useRecomputeResultModule, 'useRecomputeResult').mockReturnValue({
            features: [],
            geometries: [],
            validity: null,
            paramTable: null,
            diagnostics: [],
            recomputeMs: 0,
        } as unknown as ReturnType<typeof useRecomputeResultModule.useRecomputeResult>);
        render(<ParamsTab />);
        expect(screen.getByTestId('params-empty-state')).toBeTruthy();
    });

    it('hides params that are exposed as joint poses', () => {
        const table = new ParamTable();
        table.declare('shoulder', 'number', 15, { min: -30, max: 110 });
        table.declare('width', 'number', 50);
        vi.spyOn(useRecomputeResultModule, 'useRecomputeResult').mockReturnValue({
            features: [],
            geometries: [],
            validity: null,
            paramTable: table,
            diagnostics: [],
            recomputeMs: 0,
            joints: [
                {
                    mate: {
                        name: 'shoulder',
                        a: 'base.connA',
                        b: 'arm.connB',
                        type: 'revolute',
                        limitsDeg: [-30, 110] as const,
                    },
                    pose: 15,
                    poseParamNames: ['shoulder'],
                },
            ],
            updateParam: vi.fn(),
        } as unknown as ReturnType<typeof useRecomputeResultModule.useRecomputeResult>);
        render(<ParamsTab />);
        expect(screen.queryByTestId('param-row-shoulder')).toBeNull();
        expect(screen.queryByTestId('param-row-width')).toBeTruthy();
    });

    it('keeps params with null poseParamNames entries visible', () => {
        // Numeric-literal poses surface as `null` in `poseParamNames` — the
        // filter must ignore `null` entries so unrelated params keep rendering.
        const table = new ParamTable();
        table.declare('width', 'number', 50);
        vi.spyOn(useRecomputeResultModule, 'useRecomputeResult').mockReturnValue({
            features: [],
            geometries: [],
            validity: null,
            paramTable: table,
            diagnostics: [],
            recomputeMs: 0,
            joints: [
                {
                    mate: {
                        name: 'shoulder',
                        a: 'base.connA',
                        b: 'arm.connB',
                        type: 'revolute',
                        limitsDeg: [-30, 110] as const,
                    },
                    pose: 15,
                    poseParamNames: [null],
                },
            ],
            updateParam: vi.fn(),
        } as unknown as ReturnType<typeof useRecomputeResultModule.useRecomputeResult>);
        render(<ParamsTab />);
        expect(screen.queryByTestId('param-row-width')).toBeTruthy();
    });
});
