// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { clearBomCache, useBom } from './useBom';
import type { BomRow } from '../../agent/script-runtime/bom';

function bomRow(name: string): BomRow {
    return {
        item: 1,
        name,
        quantity: 1,
        kind: 'fabricated',
        material: 'aluminum',
        density: 2700,
        massGPerUnit: 1,
        massGTotal: 1,
        bboxMm: { min: [0, 0, 0], max: [1, 1, 1] },
        process: 'cnc',
        processSource: 'declared',
        instancePaths: [name],
    };
}

function bomBody(name: string): unknown {
    return {
        ok: true,
        featureCount: 1,
        assembly: 'main',
        rows: [bomRow(name)],
        totals: { partCount: 1, uniquePartCount: 1, totalMassG: 1 },
        diagnostics: [],
    };
}

const READY_BODY = bomBody('plate');

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

interface PendingFetch {
    url: string;
    init: RequestInit;
    resolve: (body: unknown) => void;
    reject: (err: unknown) => void;
}

/** Serve fetches from a manual queue so a test controls settle order.
 *  `'reject'` mimics real fetch (the request rejects with an AbortError when
 *  its signal fires); `'ignore'` lets a fetch resolve later even after its
 *  signal aborted — a response that was already in flight when the abort
 *  landed. */
function installDeferredFetch(abortBehavior: 'reject' | 'ignore' = 'ignore'): PendingFetch[] {
    const pending: PendingFetch[] = [];
    fetchMock.mockImplementation((url: string, init: RequestInit = {}) => new Promise<Response>((resolve, reject) => {
        pending.push({ url, init, resolve: (body) => resolve(jsonResponse(body)), reject });
        if (abortBehavior === 'reject' && init.signal) {
            init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }
    }));
    return pending;
}

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
        // The same array reference is handed to every consumer — read-only.
        expect(second.result.current.rows).toBe(first.result.current.rows);
    });

    it('refetches when the source prop changes (rerender)', async () => {
        fetchMock
            .mockImplementationOnce(async () => jsonResponse(bomBody('plate')))
            .mockImplementationOnce(async () => jsonResponse(bomBody('bracket')));
        const { result, rerender } = renderHook(
            ({ src }: { src: string }) => useBom(src, true),
            { initialProps: { src: 'return 1;' } },
        );
        await waitFor(() => expect(result.current.rows[0]?.name).toBe('plate'));
        rerender({ src: 'return 2;' });
        // The new source must not reuse the previous source's rows.
        expect(result.current.status).toBe('loading');
        expect(result.current.rows).toEqual([]);
        await waitFor(() => expect(result.current.rows[0]?.name).toBe('bracket'));
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('never serves a replaced source\'s late result to the new source (deferred race)', async () => {
        const pending = installDeferredFetch('ignore');
        const { result, rerender } = renderHook(
            ({ src }: { src: string }) => useBom(src, true),
            { initialProps: { src: 'return A;' } },
        );
        await waitFor(() => expect(pending).toHaveLength(1));
        rerender({ src: 'return B;' });
        await waitFor(() => expect(pending).toHaveLength(2));

        // A settles only after B replaced it: its subscriber is gone and its
        // rows must never surface under B.
        await act(async () => { pending[0]!.resolve(bomBody('plate')); });
        expect(result.current.rows).toEqual([]);

        await act(async () => { pending[1]!.resolve(bomBody('bracket')); });
        await waitFor(() => expect(result.current.status).toBe('ready'));
        expect(result.current.rows[0]!.name).toBe('bracket');
    });

    it('shares one in-flight evaluation between concurrent mounts of the same source', async () => {
        const pending = installDeferredFetch('ignore');
        const first = renderHook(() => useBom('return 1;', true));
        const second = renderHook(() => useBom('return 1;', true));
        await waitFor(() => expect(pending).toHaveLength(1));
        expect(fetchMock).toHaveBeenCalledTimes(1);
        await act(async () => { pending[0]!.resolve(READY_BODY); });
        await waitFor(() => expect(first.result.current.status).toBe('ready'));
        await waitFor(() => expect(second.result.current.status).toBe('ready'));
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does not share an evaluation between different script contexts of the same source', async () => {
        const first = renderHook(() => useBom('return 1;', true, 'examples/a.kcad.ts'));
        await waitFor(() => expect(first.result.current.status).toBe('ready'));
        const second = renderHook(() => useBom('return 1;', true, 'examples/b.kcad.ts'));
        await waitFor(() => expect(second.result.current.status).toBe('ready'));
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('keeps a shared fetch alive when one of two subscribers unmounts', async () => {
        const pending = installDeferredFetch('ignore');
        const first = renderHook(() => useBom('return 1;', true));
        const second = renderHook(() => useBom('return 1;', true));
        await waitFor(() => expect(pending).toHaveLength(1));
        const signal = pending[0]!.init.signal;
        first.unmount();
        expect(signal?.aborted).toBe(false);
        await act(async () => { pending[0]!.resolve(READY_BODY); });
        await waitFor(() => expect(second.result.current.status).toBe('ready'));
        expect(second.result.current.rows[0]!.process).toBe('cnc');
    });

    it('aborts when the last subscriber unmounts, and a remount refetches (nothing settled)', async () => {
        const pending = installDeferredFetch('reject');
        const { unmount } = renderHook(() => useBom('return 1;', true));
        await waitFor(() => expect(pending).toHaveLength(1));
        const signal = pending[0]!.init.signal;
        unmount();
        expect(signal?.aborted).toBe(true);
        await act(async () => {}); // let the AbortError rejection settle
        const remount = renderHook(() => useBom('return 1;', true));
        await waitFor(() => expect(pending).toHaveLength(2));
        expect(fetchMock).toHaveBeenCalledTimes(2);
        await act(async () => { pending[1]!.resolve(READY_BODY); });
        await waitFor(() => expect(remount.result.current.status).toBe('ready'));
        expect(remount.result.current.rows[0]!.process).toBe('cnc');
    });

    it('caps the settled cache at 16 entries, evicting the oldest on insert', async () => {
        for (let i = 0; i < 17; i++) {
            const { result, unmount } = renderHook(() => useBom(`return ${i};`, true));
            await waitFor(() => expect(result.current.status).toBe('ready'));
            unmount();
        }
        expect(fetchMock).toHaveBeenCalledTimes(17);
        const evicted = renderHook(() => useBom('return 0;', true));
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(18));
        await waitFor(() => expect(evicted.result.current.status).toBe('ready'));
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
});
