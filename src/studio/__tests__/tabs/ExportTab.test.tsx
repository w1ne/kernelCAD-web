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

// S1: ExportTab now routes through the apiBase helper, which calls
// supabase.auth.getSession(). Stub the Supabase client so the test stays
// behavior-equivalent to today (unsigned-in → relative URL).
vi.mock('../../../funnel/lib/supabaseClient', () => ({
    getSupabase: () => ({
        auth: { getSession: async () => ({ data: { session: null } }) },
    }),
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

    it('renders five format buttons (stl, step, dxf, 3mf, glb) when geometries exist', async () => {
        recompute = { ...recompute, geometries: [{ faces: [] }] };
        const { ExportTab } = await import('../../tabs/ExportTab');
        render(<ExportTab />);
        for (const f of ['stl', 'step', 'dxf', '3mf', 'glb']) {
            expect(screen.getByTestId(`export-${f}`)).toBeDefined();
        }
    });

    it('disables DXF when no planar face geometry is present', async () => {
        // Non-planar: a face with no `plane` property.
        recompute = {
            ...recompute,
            geometries: [{
                faces: [{
                    vertices: new Float32Array(),
                    indices: new Uint32Array(),
                    normals: new Float32Array(),
                    faceId: 0,
                }],
            }],
        };
        const { ExportTab } = await import('../../tabs/ExportTab');
        render(<ExportTab />);
        const dxf = screen.getByTestId('export-dxf') as HTMLButtonElement;
        expect(dxf.disabled).toBe(true);
    });

    it('enables DXF when at least one face has a planar tag', async () => {
        recompute = {
            ...recompute,
            geometries: [{
                faces: [{
                    vertices: new Float32Array(),
                    indices: new Uint32Array(),
                    normals: new Float32Array(),
                    faceId: 0,
                    plane: { origin: [0, 0, 0], normal: [0, 0, 1] },
                }],
            }],
        };
        const { ExportTab } = await import('../../tabs/ExportTab');
        render(<ExportTab />);
        const dxf = screen.getByTestId('export-dxf') as HTMLButtonElement;
        expect(dxf.disabled).toBe(false);
    });

    it('clicks the GLB button and issues a /__kernelcad/export?format=glb fetch', async () => {
        recompute = { ...recompute, geometries: [{ faces: [] }] };

        const blob = new Blob([new Uint8Array([0x67, 0x6c, 0x54, 0x46])], { type: 'model/gltf-binary' });
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            blob: async () => blob,
            headers: new Headers({ 'content-disposition': 'attachment; filename="x.glb"' }),
        });
        vi.stubGlobal('fetch', fetchMock);

        const clickSpy = vi.fn();
        const originalClick = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = clickSpy;

        const { ExportTab } = await import('../../tabs/ExportTab');
        render(<ExportTab />);
        fireEvent.click(screen.getByTestId('export-glb'));

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });
        const url = fetchMock.mock.calls[0][0] as string;
        expect(url).toContain('format=glb');

        HTMLAnchorElement.prototype.click = originalClick;
    });

    it('clicks the 3MF button and issues a /__kernelcad/export?format=3mf fetch', async () => {
        recompute = { ...recompute, geometries: [{ faces: [] }] };

        const blob = new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], { type: 'application/3mf' });
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            blob: async () => blob,
            headers: new Headers({ 'content-disposition': 'attachment; filename="x.3mf"' }),
        });
        vi.stubGlobal('fetch', fetchMock);

        const clickSpy = vi.fn();
        const originalClick = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = clickSpy;

        const { ExportTab } = await import('../../tabs/ExportTab');
        render(<ExportTab />);
        fireEvent.click(screen.getByTestId('export-3mf'));

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });
        const url = fetchMock.mock.calls[0][0] as string;
        expect(url).toContain('format=3mf');

        HTMLAnchorElement.prototype.click = originalClick;
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
            expect.objectContaining({ headers: {} }),
        );
        expect(clickSpy).toHaveBeenCalled();

        HTMLAnchorElement.prototype.click = originalClick;
    });
});
