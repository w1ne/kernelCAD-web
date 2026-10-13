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
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ selection, model_generation: 0 }), redirect: 'error', signal: expect.any(AbortSignal) }),
    ]);
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
