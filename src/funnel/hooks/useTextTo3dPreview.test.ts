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

  it('rewrites Tripo glb urls through the API asset relay', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
    const glb = 'https://tripo-data.rg1.data.tripo3d.com/a/model.glb?sig=x';
    vi.spyOn(client, 'startPreview').mockResolvedValue(
      sseResponse(`event: preview_done\ndata: ${JSON.stringify({ glbUrl: glb, costUsd: null, taskId: 't2' })}\n\n`),
    );
    const { result } = renderHook(() => useTextTo3dPreview());
    await act(async () => { await result.current.submit('a bracket'); });
    await waitFor(() => expect(result.current.phase.state).toBe('done'));
    expect(result.current.phase).toMatchObject({
      state: 'done',
      glbUrl: `https://api.example.com/api/v1/preview/asset?src=${encodeURIComponent(glb)}`,
    });
    vi.unstubAllEnvs();
  });

  it('surfaces renderImageUrl and proportions from preview_done', async () => {
    vi.spyOn(client, 'startPreview').mockResolvedValue(
      sseResponse('event: preview_done\ndata: {"glbUrl":"https://t/o.glb","costUsd":null,"taskId":"t1","renderImageUrl":"https://t/r.png","proportions":[1,0.7,0.6]}\n\n'),
    );
    const { result } = renderHook(() => useTextTo3dPreview());
    await act(async () => { await result.current.submit('a bracket'); });
    await waitFor(() => expect(result.current.phase.state).toBe('done'));
    expect(result.current.phase).toMatchObject({ renderImageUrl: 'https://t/r.png', proportions: [1, 0.7, 0.6] });
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
