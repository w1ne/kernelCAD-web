// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { useSharedSelection } from './useSharedSelection';
import { selectionCodeStore } from './selectionCodeStore';
vi.mock('../api/apiBase', () => ({ apiCall: async () => ({ base: '', headers: {} }), rewritePath: (path: string) => path }));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); selectionCodeStore.reset(); });
describe('shared selection hook lifetime', () => {
  it('keeps queued clicks when the viewer face callback changes', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(async (_url: unknown, init: RequestInit) => new Response(JSON.stringify({
      ok: true, selection: init.method === 'POST' ? JSON.parse(init.body as string).selection : null,
      revision: 0, modelGeneration: 0,
    })));
    vi.stubGlobal('fetch', fetcher);
    const hook = renderHook(({ setter }) => useSharedSelection('token', setter), { initialProps: { setter: vi.fn() } });
    await vi.advanceTimersByTimeAsync(1);
    selectionCodeStore.linkFromGeometry({ shapeIndex: 0, kind: 'edge', id: 2 }, 'box', null);
    hook.rerender({ setter: vi.fn() });
    await vi.advanceTimersByTimeAsync(300);
    expect(fetcher.mock.calls.filter(([, init]) => init.method === 'POST')).toHaveLength(1);
    expect(selectionCodeStore.getSnapshot().link?.pick.id).toBe(2);
    hook.unmount();
    const calls = fetcher.mock.calls.length;
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetcher).toHaveBeenCalledTimes(calls);
  });
});
