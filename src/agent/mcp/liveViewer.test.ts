// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as fs from 'node:fs';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BuiltModel } from '../../composition/buildModel';
import { clearActiveMcpSession, setActiveMcpSession } from './activeSession';
import { createLiveViewer } from './liveViewer';

vi.mock('node:fs', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, existsSync: vi.fn(actual.existsSync) };
});

const closers: Array<() => Promise<void>> = [];
afterEach(async () => { await Promise.all(closers.splice(0).map(close => close())); });

async function fixture() {
  const dist = await mkdtemp(join(tmpdir(), 'kcad-viewer-'));
  await writeFile(join(dist, 'index.html'), '<html>Studio</html>');
  const viewer = createLiveViewer({ dist, mesh: async model => ({ source: model.code, features: [], bounds: { min: [0, 0, 0], max: [1, 1, 1] } }) });
  closers.push(async () => { await viewer.close(); await rm(dist, { recursive: true, force: true }); });
  return viewer;
}
function model(code: string) { return { code } as BuiltModel; }
function endpoint(link: string, name: string) {
  const url = new URL(link);
  url.pathname = `/__kernelcad/${name}`;
  return url;
}

describe('live MCP Studio viewer', () => {
  it('returns a working first-build link and replaces source/mesh behind the same link', async () => {
    const viewer = await fixture();
    const first = await viewer.update(model('first'));
    expect(await (await fetch(first)).text()).toContain('Studio');
    expect(await (await fetch(endpoint(first, 'source'))).json()).toEqual({ source: 'first' });
    expect(await viewer.update(model('second'))).toBe(first);
    expect(await (await fetch(endpoint(first, 'source'))).json()).toEqual({ source: 'second' });
    const session = await (await fetch(endpoint(first, 'session'))).json();
    const mesh = endpoint(first, 'mesh');
    mesh.searchParams.set('session', session.sessionToken);
    expect((await (await fetch(mesh)).json()).source).toBe('second');
  });

  it('serves the evaluate_script mechanism verdict on the review endpoint', async () => {
    const viewer = await fixture();
    const failure = {
      target: 'export-occt' as const, code: 'mechanism.motion-on-fixed-joint' as const, severity: 'error' as const,
      message: "Param 'a' is animated and turns part 'link', but 'shoulder' is fastened.", hint: 'h', mateName: 'shoulder',
    };
    const summary = { verdict: 'broken' as const, maxLevel: 'error' as const, statement: 'Mechanism broken: x', checked: [], skipped: [], failures: [{ code: failure.code, reason: failure.message, joint: 'shoulder' }] };
    const link = await viewer.update({ code: 'x', diagnostics: [] } as unknown as BuiltModel, { mechanism: 'broken', mechanismFailures: [failure], mechanismSummary: summary });
    const session = await (await fetch(endpoint(link, 'session'))).json();
    const review = endpoint(link, 'review');
    review.searchParams.set('session', session.sessionToken);
    const body = await (await fetch(review)).json();
    expect(body.ok).toBe(false);
    expect(body.mechanism).toBe('broken');
    expect(body.mechanismSummary).toEqual(summary);
    expect(body.diagnostics.map((d: { mateName?: string }) => d.mateName)).toEqual(['shoulder']);
  });

  it('notifies an already-open viewer and a reconnect of the current model', async () => {
    const viewer = await fixture();
    const link = await viewer.update(model('first'));
    const session = await (await fetch(endpoint(link, 'session'))).json();
    const events = endpoint(link, 'events');
    events.searchParams.set('session', session.sessionToken);
    const abort = new AbortController();
    const stream = await fetch(events, { signal: abort.signal });
    const reader = stream.body!.getReader();
    expect(new TextDecoder().decode((await reader.read()).value)).toContain('event: relower');
    await viewer.update(model('second'));
    expect(new TextDecoder().decode((await reader.read()).value)).toContain('event: relower');
    abort.abort();
  });

  it('rejects missing/wrong tokens and cross-origin requests', async () => {
    const viewer = await fixture();
    const link = await viewer.update(model('secret'));
    const url = endpoint(link, 'source');
    url.search = '';
    expect((await fetch(url)).status).toBe(404);
    url.searchParams.set('script', 'wrong');
    expect((await fetch(url)).status).toBe(404);
    expect((await fetch(endpoint(link, 'source'), { headers: { Origin: 'https://evil.example' } })).status).toBe(403);
  });

  it('does not auto-detect stale packaged or checkout viewer bundles', async () => {
    vi.stubEnv('KERNELCAD_VIEWER_DIST', undefined);
    // Simulate every legacy bundle path existing. No implicit path may be consulted.
    const exists = vi.mocked(fs.existsSync).mockClear().mockReturnValue(true);
    const viewer = createLiveViewer();
    try {
      await expect(viewer.update(model('geometry still built'))).rejects.toThrow('KERNELCAD_VIEWER_DIST');
      expect(exists).not.toHaveBeenCalled();
    } finally {
      await viewer.close();
      const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
      exists.mockImplementation(actual.existsSync);
      vi.unstubAllEnvs();
    }
  });

  it('fails clearly when the packaged Studio assets are absent', async () => {
    const viewer = createLiveViewer({ dist: '/does-not-exist' });
    await expect(viewer.update(model('first'))).rejects.toThrow('KERNELCAD_VIEWER_DIST');
    await viewer.close();
  });

  it('close disposes a model whose session the viewer no longer shares', async () => {
    const disposed: string[] = [];
    const shape = { dispose() { disposed.push('shape'); }, isDeleted: () => false };
    const session = { cachedShapes: { values: () => [] as object[], clear() { disposed.push('clear'); } } };
    const viewer = await fixture();
    await viewer.update({ code: 'old', shapes: new Map([['a', shape]]), session } as unknown as BuiltModel);
    setActiveMcpSession({ session: { cachedShapes: { values: () => [], clear() {} } } as never });
    try {
      await viewer.close();
      expect(disposed).toContain('shape');
    } finally {
      clearActiveMcpSession();
    }
  });

  it('close keeps a solid the active session cache still owns and drops one it does not', async () => {
    const disposed: string[] = [];
    const stale = { dispose() { disposed.push('stale'); }, isDeleted: () => false };
    const live = { dispose() { disposed.push('live'); }, isDeleted: () => false };
    const session = { cachedShapes: { values: () => [live], clear() { disposed.push('clear'); } } };
    const viewer = await fixture();
    await viewer.update({
      code: 'old',
      shapes: new Map([['a', stale]]),
      rootShape: stale,
      session,
    } as unknown as BuiltModel);
    setActiveMcpSession({ session: session as never });
    try {
      await viewer.close();
      expect(disposed).toEqual(['stale']);
    } finally {
      clearActiveMcpSession();
    }
  });
});
