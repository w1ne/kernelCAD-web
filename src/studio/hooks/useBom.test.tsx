// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { clearBomCache, useBom } from './useBom';
import type { BomRow } from '../../agent/script-runtime/bom';

const ROWS: BomRow[] = [{
    item: 1,
    name: 'plate',
    quantity: 1,
    kind: 'fabricated',
    material: 'aluminum',
    density: 2700,
    massGPerUnit: 1,
    massGTotal: 1,
    bboxMm: { min: [0, 0, 0], max: [1, 1, 1] },
    process: 'cnc',
    processSource: 'declared',
    instancePaths: ['plate'],
}];

const READY_BODY = {
    ok: true,
    featureCount: 1,
    assembly: 'main',
    rows: ROWS,
    totals: { partCount: 1, uniquePartCount: 1, totalMassG: 1 },
    diagnostics: [],
};

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
    });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
    clearBomCache();
    fetchMock = vi.fn(async () => jsonResponse(READY_BODY));
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    clearBomCache();
});

describe('useBom', () => {
    it('does not fetch while disabled', () => {
        renderHook(() => useBom('return 1;', false));
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('does not fetch while enabled but the source is empty', () => {
        renderHook(() => useBom('   ', true));
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('GETs ?script= on the bom endpoint when a script context exists (viewport parity)', async () => {
        const { result } = renderHook(() => useBom('return 1;', true, 'examples/foo.kcad.ts'));
        await waitFor(() => expect(result.current.status).toBe('ready'));
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0]! as [string, RequestInit];
        expect(url).toBe('/__kernelcad/bom?script=examples%2Ffoo.kcad.ts');
        expect(init.method).toBeUndefined();
        expect(init.body).toBeUndefined();
        expect(result.current.rows[0]!.process).toBe('cnc');
        expect(result.current.totals?.partCount).toBe(1);
    });

    it('POSTs { source } to the bom endpoint when there is no script context', async () => {
        const { result } = renderHook(() => useBom('return 1;', true));
        await waitFor(() => expect(result.current.status).toBe('ready'));
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith('/__kernelcad/bom', expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ source: 'return 1;' }),
        }));
        expect(result.current.rows[0]!.process).toBe('cnc');
    });

    it('serves a second mount from the source cache without refetching', async () => {
        const first = renderHook(() => useBom('return 1;', true));
        await waitFor(() => expect(first.result.current.status).toBe('ready'));
        const second = renderHook(() => useBom('return 1;', true));
        await waitFor(() => expect(second.result.current.status).toBe('ready'));
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(second.result.current.rows).toBe(first.result.current.rows);
    });

    it('refetches when the source changes', async () => {
        const first = renderHook(() => useBom('return 1;', true));
        await waitFor(() => expect(first.result.current.status).toBe('ready'));
        const { result: second } = renderHook(() => useBom('return 2;', true));
        await waitFor(() => expect(second.current.status).toBe('ready'));
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('turns a 200 ok:false payload into an error state', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ ok: false, featureCount: 0, error: 'Script evaluation failed.' }));
        const { result } = renderHook(() => useBom('return 1;', true));
        await waitFor(() => expect(result.current.status).toBe('error'));
        expect(result.current.error).toBe('Script evaluation failed.');
        expect(result.current.rows).toEqual([]);
    });

    it('reports the server message on a non-2xx response', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ error: 'script must be a repo examples/*.kcad.ts file' }, 400));
        const { result } = renderHook(() => useBom('return 1;', true, 'not-an-example.ts'));
        await waitFor(() => expect(result.current.status).toBe('error'));
        expect(result.current.error).toBe('script must be a repo examples/*.kcad.ts file');
    });

    it('aborts the in-flight request on unmount', async () => {
        let signal: AbortSignal | undefined;
        fetchMock.mockImplementation((_url: string, init: RequestInit) => {
            signal = init.signal ?? undefined;
            return new Promise(() => {});
        });
        const { unmount } = renderHook(() => useBom('return 1;', true));
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
        unmount();
        expect(signal?.aborted).toBe(true);
    });
});
