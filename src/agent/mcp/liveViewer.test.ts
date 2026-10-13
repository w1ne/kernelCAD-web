// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { BuiltModel } from '../../composition/buildModel';
import { createLiveViewer } from './liveViewer';

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

  it('fails clearly when the packaged Studio assets are absent', async () => {
    const viewer = createLiveViewer({ dist: '/does-not-exist' });
    await expect(viewer.update(model('first'))).rejects.toThrow('build:mcp-viewer');
    await viewer.close();
  });
});
