// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { StudioRecomputeResult } from '../../types';

let recompute: StudioRecomputeResult = {
    features: [],
    geometries: [],
    validity: null,
    paramTable: null,
    diagnostics: [],
    recomputeMs: 0,
};

vi.mock('../../hooks/useRecomputeResult', () => ({
    useRecomputeResult: () => recompute,
}));

beforeEach(() => {
    recompute = {
        features: [],
        geometries: [],
        validity: null,
        paramTable: null,
        diagnostics: [],
        recomputeMs: 0,
    };
    Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...window.location, search: '?script=examples/foo.kcad.ts' },
    });
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('ExportTab', () => {
    it('renders the empty state when no geometries are present', async () => {
        const { ExportTab } = await import('../../tabs/ExportTab');
        render(<ExportTab />);
        expect(screen.getByTestId('export-tab-empty')).toBeDefined();
    });

    it('renders STL + STEP buttons when geometries exist', async () => {
        recompute = { ...recompute, geometries: [{ faces: [] }] };
        const { ExportTab } = await import('../../tabs/ExportTab');
        render(<ExportTab />);
        expect(screen.getByTestId('export-stl')).toBeDefined();
        expect(screen.getByTestId('export-step')).toBeDefined();
    });

    it('shows an error when the script param is missing', async () => {
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: { ...window.location, search: '' },
        });
        recompute = { ...recompute, geometries: [{ faces: [] }] };

        const { ExportTab } = await import('../../tabs/ExportTab');
        render(<ExportTab />);
        fireEvent.click(screen.getByTestId('export-stl'));
        await waitFor(() => {
            expect(screen.getByTestId('export-tab-error')).toBeDefined();
        });
    });

    it('fetches the export endpoint with the right query and triggers a download', async () => {
        recompute = { ...recompute, geometries: [{ faces: [] }] };

        const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'model/stl' });
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            blob: async () => blob,
            headers: new Headers({ 'content-disposition': 'attachment; filename="x.stl"' }),
        });
        vi.stubGlobal('fetch', fetchMock);

        const clickSpy = vi.fn();
        // Stub HTMLAnchorElement.click so we can assert without navigating.
        const originalClick = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = clickSpy;

        const { ExportTab } = await import('../../tabs/ExportTab');
        render(<ExportTab />);
        fireEvent.click(screen.getByTestId('export-stl'));

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });
        expect(fetchMock).toHaveBeenCalledWith(
            '/__kernelcad/export?script=examples%2Ffoo.kcad.ts&format=stl',
        );
        expect(clickSpy).toHaveBeenCalled();

        HTMLAnchorElement.prototype.click = originalClick;
    });
});
