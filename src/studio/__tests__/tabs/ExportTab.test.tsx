// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
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

const mockCode = { code: 'return box(10, 10, 10);' };

vi.mock('../../hooks/useRecomputeResult', () => ({
    useRecomputeResult: () => recompute,
}));

vi.mock('../../context/CodeContext', () => ({
    useCode: () => mockCode,
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
    mockCode.code = 'return box(10, 10, 10);';
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

    it('shows the shop price and opens that shop payment page', async () => {
        recompute = { ...recompute, geometries: [{ faces: [] }] };
        const { ExportTab } = await import('../../tabs/ExportTab');
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
            const url = String(input);
            if (url.endsWith('/shops/order')) {
                return new Response(JSON.stringify({
                    ok: true,
                    checkout_url: 'https://checkout.stripe.com/c/pay/cs_test',
                }), { status: 200, headers: { 'content-type': 'application/json' } });
            }
            return new Response(JSON.stringify({
                ok: true,
                fabrication_file: 'step',
                recommended: {
                    shop: 'SendCutSend',
                    process: 'sheetmetal',
                    material: 'aluminum_5052',
                    thickness_mm: 2.03,
                    total_cents: 3221,
                    shipping_label: 'Standard',
                    offer_id: 'of_scs',
                    shipping_option_id: 'standard',
                },
            }), { status: 200, headers: { 'content-type': 'application/json' } });
        });
        const tab = { opener: {}, location: { href: '' }, close: vi.fn() };
        const opened = vi.spyOn(window, 'open').mockImplementation(() => tab as unknown as Window);
        render(<ExportTab />);
        fireEvent.click(screen.getByTestId('export-order'));
        expect((await screen.findByTestId('shop-offer')).textContent).toContain('SendCutSend');
        expect(screen.getByTestId('shop-offer').textContent).toContain('aluminum 5052, 2.03 mm sheet, from $32.21');
        fireEvent.click(screen.getByTestId('shop-pay'));
        // The tab opens inside the click, before the request, so it is not a blocked popup.
        expect(opened).toHaveBeenCalledWith('about:blank', '_blank');
        expect(tab.opener).toBeNull();
        await waitFor(() => expect(tab.location.href).toBe('https://checkout.stripe.com/c/pay/cs_test'));
        const orderCall = fetchMock.mock.calls.map((call) => String(call[0])).find((url) => url.endsWith('/shops/order'));
        expect(orderCall?.endsWith('/__kernelcad/manufacture/shops/order')).toBe(true);
        fetchMock.mockRestore();
        opened.mockRestore();
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

    it('POSTs current editor source when the script param is missing', async () => {
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: { ...window.location, pathname: '/', search: '', hostname: 'localhost' },
        });
        recompute = { ...recompute, geometries: [{ faces: [] }] };
        mockCode.code = 'return cylinder(5, 20);';

        const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'model/stl' });
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            blob: async () => blob,
            headers: new Headers({ 'content-disposition': 'attachment; filename="studio-export.stl"' }),
        });
        vi.stubGlobal('fetch', fetchMock);

        const clickSpy = vi.fn();
        const originalClick = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = clickSpy;

        const { ExportTab } = await import('../../tabs/ExportTab');
        render(<ExportTab />);
        fireEvent.click(screen.getByTestId('export-stl'));

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });
        expect(fetchMock).toHaveBeenCalledWith(
            '/__kernelcad/export?format=stl&async=1',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ source: 'return cylinder(5, 20);' }),
            }),
        );
        expect(clickSpy).toHaveBeenCalled();
        expect(screen.queryByTestId('export-tab-status-error')).toBeNull();

        HTMLAnchorElement.prototype.click = originalClick;
    });

    it('POSTs editor source even when a ?script= param is present (exports live edits)', async () => {
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: {
                ...window.location,
                pathname: '/',
                search: '?script=examples/foo.kcad.ts',
                hostname: 'localhost',
            },
        });
        recompute = { ...recompute, geometries: [{ faces: [] }] };
        mockCode.code = 'return box(1, 2, 3); // edited';

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
            '/__kernelcad/export?format=stl&async=1',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ source: 'return box(1, 2, 3); // edited' }),
            }),
        );
        expect(clickSpy).toHaveBeenCalled();

        HTMLAnchorElement.prototype.click = originalClick;
    });

    it('POSTs projectSlug for hosted /p/<slug> so complementary STEP assets materialize', async () => {
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: {
                ...window.location,
                pathname: '/p/N2yYiZxy',
                search: '?version=6',
                hostname: 'app.kernelcad.com',
            },
        });
        recompute = { ...recompute, geometries: [{ faces: [] }] };
        mockCode.code = 'return await lib.fromSTEP("./2.0u_blank_costar.stp");';

        const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'model/stl' });
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            blob: async () => blob,
            headers: new Headers({ 'content-disposition': 'attachment; filename="model.stl"' }),
        });
        vi.stubGlobal('fetch', fetchMock);

        const clickSpy = vi.fn();
        const originalClick = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = clickSpy;

        const { ExportTab } = await import('../../tabs/ExportTab');
        render(<ExportTab />);
        fireEvent.click(screen.getByTestId('export-stl'));

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });
        const call = fetchMock.mock.calls[0]!;
        expect(call[0] as string).toContain('/__kernelcad/export?format=stl&async=1');
        expect(JSON.parse((call[1] as { body: string }).body)).toEqual({
            projectSlug: 'N2yYiZxy',
            projectVersion: 6,
            source: 'return await lib.fromSTEP("./2.0u_blank_costar.stp");',
        });
        expect(clickSpy).toHaveBeenCalled();

        HTMLAnchorElement.prototype.click = originalClick;
    });

    it('shows an error when the editor has no source', async () => {
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: { ...window.location, pathname: '/', search: '', hostname: 'localhost' },
        });
        recompute = { ...recompute, geometries: [{ faces: [] }] };
        mockCode.code = '   ';

        const { ExportTab } = await import('../../tabs/ExportTab');
        render(<ExportTab />);
        fireEvent.click(screen.getByTestId('export-stl'));
        await waitFor(() => {
            expect(screen.getByTestId('export-tab-status-error')).toBeDefined();
        });
        expect(screen.getByTestId('export-tab-status-error').textContent).toMatch(/script source/i);
    });

    describe('server responses', () => {
        beforeEach(() => {
            Object.defineProperty(window, 'location', {
                configurable: true,
                value: { ...window.location, pathname: '/', search: '', hostname: 'localhost' },
            });
            recompute = { ...recompute, geometries: [{ faces: [] }] };
        });

        it('422: shows the server message and its hint', async () => {
            vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
                error: 'The 3MF mesh is not watertight, and 3MF requires a closed mesh.',
                code: 'export.3mf.not-watertight',
                hint: 'Export STEP for the exact geometry.',
            }), { status: 422, headers: { 'content-type': 'application/json' } })));
            const { ExportTab } = await import('../../tabs/ExportTab');
            render(<ExportTab />);
            fireEvent.click(screen.getByTestId('export-3mf'));
            await waitFor(() => expect(screen.getByTestId('export-tab-status-error')).toBeDefined());
            expect(screen.getByTestId('export-tab-status-error').textContent)
                .toBe('The 3MF mesh is not watertight, and 3MF requires a closed mesh.');
            expect(screen.getByTestId('export-tab-status-hint').textContent).toBe('Export STEP for the exact geometry.');
        });

        it('200 + warning header: downloads, then shows a dismissible notice', async () => {
            vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new Uint8Array([1]), {
                status: 200,
                headers: {
                    'content-disposition': 'attachment; filename="x.stl"',
                    'X-KernelCAD-Export-Warning': 'export.mesh.not-watertight',
                    'X-KernelCAD-Mesh-Open-Edges': '2',
                },
            })));
            const clickSpy = vi.fn();
            const originalClick = HTMLAnchorElement.prototype.click;
            HTMLAnchorElement.prototype.click = clickSpy;
            const { ExportTab } = await import('../../tabs/ExportTab');
            render(<ExportTab />);
            fireEvent.click(screen.getByTestId('export-stl'));
            await waitFor(() => expect(screen.getByTestId('export-tab-status-notice')).toBeDefined());
            expect(clickSpy).toHaveBeenCalled();
            expect(screen.getByTestId('export-tab-status-notice').textContent).toMatch(/small mesh gap \(2 open edges\)/);
            fireEvent.click(screen.getByTestId('export-tab-status-dismiss'));
            expect(screen.queryByTestId('export-tab-status')).toBeNull();
            HTMLAnchorElement.prototype.click = originalClick;
        });

        it('shows progress with elapsed time while exporting and cancels the request', async () => {
            let signal: AbortSignal | undefined;
            vi.stubGlobal('fetch', vi.fn((_url: string, init: { signal?: AbortSignal }) => {
                signal = init.signal;
                return new Promise((_resolve, reject) => {
                    init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
                });
            }));
            const { ExportTab } = await import('../../tabs/ExportTab');
            render(<ExportTab />);
            fireEvent.click(screen.getByTestId('export-glb'));
            await waitFor(() => expect(screen.getByTestId('export-tab-status-progress')).toBeDefined());
            expect(screen.getByTestId('export-tab-status-progress').textContent).toBe('Exporting GLB… 0 s');
            expect((screen.getByTestId('export-stl') as HTMLButtonElement).disabled).toBe(true);
            fireEvent.click(screen.getByTestId('export-tab-status-cancel'));
            expect(signal?.aborted).toBe(true);
            await waitFor(() => expect(screen.queryByTestId('export-tab-status')).toBeNull());
            expect((screen.getByTestId('export-stl') as HTMLButtonElement).disabled).toBe(false);
        });
    });
});
