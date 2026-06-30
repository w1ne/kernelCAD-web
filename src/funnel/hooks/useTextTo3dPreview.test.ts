// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTextTo3dPreview } from './useTextTo3dPreview';
import * as client from '../lib/previewClient';

function sseResponse(text: string): Response {
  const body = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new TextEncoder().encode(text)); c.close(); } });
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

beforeEach(() => vi.restoreAllMocks());

describe('useTextTo3dPreview', () => {
  it('reaches done with the glb url', async () => {
    vi.spyOn(client, 'startPreview').mockResolvedValue(
      sseResponse('event: preview_done\ndata: {"glbUrl":"https://t/out.glb","costUsd":0.2,"taskId":"t1"}\n\n'),
    );
    const { result } = renderHook(() => useTextTo3dPreview());
    await act(async () => { await result.current.submit('a bracket'); });
    await waitFor(() => expect(result.current.phase.state).toBe('done'));
    expect(result.current.phase).toMatchObject({ state: 'done', glbUrl: 'https://t/out.glb' });
  });

  it('maps 402 to the upgrade state', async () => {
    vi.spyOn(client, 'startPreview').mockResolvedValue(new Response('{"error":"not_paid"}', { status: 402 }));
    const { result } = renderHook(() => useTextTo3dPreview());
    await act(async () => { await result.current.submit('x'); });
    expect(result.current.phase.state).toBe('upgrade');
  });

  it('maps 503 (no provider key) to the unavailable state, not an error', async () => {
    vi.spyOn(client, 'startPreview').mockResolvedValue(new Response('{"error":"feature_unavailable"}', { status: 503 }));
    const { result } = renderHook(() => useTextTo3dPreview());
    await act(async () => { await result.current.submit('x'); });
    expect(result.current.phase.state).toBe('unavailable');
  });
});
