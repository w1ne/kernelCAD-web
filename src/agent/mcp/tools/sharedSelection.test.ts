// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sharedSelectionTool } from './sharedSelection';

afterEach(() => vi.unstubAllGlobals());
describe('selection MCP transport', () => {
  it('reads and writes the explicit Studio session with bounded requests', async () => {
    const selection = { shapeIndex: 0, kind: 'edge', id: 2, featureId: 'box' };
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ ok: true, selection, revision: 1, modelGeneration: 0 })));
    vi.stubGlobal('fetch', fetcher);
    const input = { studio_url: 'http://localhost:5173', session: 'token', model_generation: 0 };
    expect(await sharedSelectionTool('GET', input)).toMatchObject({ ok: true, selection });
    await sharedSelectionTool('POST', { ...input, selection });
    expect(fetcher.mock.calls[1]).toEqual([
      expect.objectContaining({ pathname: '/__kernelcad/selection', search: '?session=token' }),
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ selection, model_generation: 0, face_signature: null }), redirect: 'error', signal: expect.any(AbortSignal) }),
    ]);
  });
  it('lets the locked selection endpoint capture an agent-set face signature', async () => {
    const face = { shapeIndex: 0, kind: 'face' as const, id: 4, featureId: 'extrude_1' };
    const mesh = { features: [{ featureId: 'extrude_1', faces: [{ faceId: 4,
      vertices: [0,0,0,1,0,0,0,1,0], indices: [0,1,2], normals: [0,0,1,0,0,1,0,0,1], plane: { origin: [0,0,0], normal: [0,0,1] } }] }] };
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ ok: true, selection: face, revision: 1, modelGeneration: 0 })));
    vi.stubGlobal('fetch', fetcher);
    const result = await sharedSelectionTool('POST', { studio_url: 'http://localhost:5173', session: 'token', model_generation: 0, selection: face });
    expect(result).toMatchObject({ ok: true, selection: face });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(String(fetcher.mock.calls[0]![0])).toContain('/__kernelcad/selection');
    const body = JSON.parse((fetcher.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.face_signature).toBeNull();
  });
  it('does not sign a face when the requested generation is already stale', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ ok: true, selection: null, revision: 2, modelGeneration: 1 })));
    vi.stubGlobal('fetch', fetcher);
    const result = await sharedSelectionTool('POST', { studio_url: 'http://localhost:5173', session: 'token', model_generation: 0,
      selection: { shapeIndex: 0, kind: 'face', id: 4, featureId: 'extrude_1' } });
    expect(result).toMatchObject({ ok: true, modelGeneration: 1 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(String(fetcher.mock.calls[0]![0])).toContain('/__kernelcad/selection');
  });
  it('rejects non-local URLs and malformed picks before fetching', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    expect(await sharedSelectionTool('GET', { studio_url: 'https://example.com', session: 't' })).toMatchObject({ ok: false });
    expect(await sharedSelectionTool('POST', { studio_url: 'http://localhost:5173', session: 't', selection: {} })).toMatchObject({ ok: false });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('reports disconnected Studio and expired sessions', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'session not found' }), { status: 404 })));
    expect(await sharedSelectionTool('GET', { studio_url: 'http://127.0.0.1:5173', session: 'expired' })).toMatchObject({ ok: false, error: 'session not found' });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('connection refused'); }));
    expect(await sharedSelectionTool('GET', { studio_url: 'http://127.0.0.1:5173', session: 't' })).toMatchObject({ ok: false, error: 'connection refused' });
  });
});
