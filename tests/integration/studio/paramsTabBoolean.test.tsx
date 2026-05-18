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

describe('ParamsTab interactive bool checkbox', () => {
    it('toggling checkbox calls updateParam with new value', async () => {
        const updateMock = vi.fn().mockResolvedValue(undefined);
        const table = new ParamTable();
        table.declare('show_holes', 'boolean', true);
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
        const checkbox = screen.getByTestId('param-checkbox-show_holes') as HTMLInputElement;
        expect(checkbox.disabled).toBe(false);
        fireEvent.click(checkbox);
        await waitFor(() =>
            expect(updateMock).toHaveBeenCalledWith([{ name: 'show_holes', value: false }]),
        );
    });

    it('toggling checkbox from false to true emits true', async () => {
        const updateMock = vi.fn().mockResolvedValue(undefined);
        const table = new ParamTable();
        table.declare('show_holes', 'boolean', false);
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
        const checkbox = screen.getByTestId('param-checkbox-show_holes') as HTMLInputElement;
        fireEvent.click(checkbox);
        await waitFor(() =>
            expect(updateMock).toHaveBeenCalledWith([{ name: 'show_holes', value: true }]),
        );
    });
});
