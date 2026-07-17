// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { PAGES_WORKER } from './workerTemplate';

// The served _worker.js must support the faceted /v1 API that the MCP
// remote client (remoteClient.ts) and agents navigate by. This is a smoke
// guard so the facet/browse handling can't silently regress out of the template.
describe('PAGES_WORKER served catalog API', () => {
  it('routes the browse endpoints', () => {
    expect(PAGES_WORKER).toContain("/v1/categories");
    expect(PAGES_WORKER).toContain("/v1/families");
  });

  it('honors the faceted search params agents send', () => {
    for (const facet of ['category', 'family', 'standard', 'tag', 'licenseClass', 'pageSize', 'q']) {
      expect(PAGES_WORKER).toContain(`'${facet}'`);
    }
  });

  it('still excludes legal-hold by default', () => {
    expect(PAGES_WORKER).toContain('legal-hold');
    expect(PAGES_WORKER).toContain('includeLegalHold');
  });
});

// Behavioral guard: actually execute the template. The checks above are
// string-contains smoke tests, which is precisely why a missing CORS header
// went unnoticed — /v1 shipped with no Access-Control-Allow-Origin, so every
// browser app on another origin (app.labwired.com) had its fetch rejected.
// Because that caller swallows the error into null, every real 3D model
// silently degraded to placeholder geometry with an empty console. Assert the
// header on the real responses, not on the source text.
describe('PAGES_WORKER CORS', () => {
  const INDEX = {
    items: [
      { id: 'nucleo64-board', name: 'ST Nucleo-64', category: 'Electronics', family: 'STM32', tags: ['nucleo'], glbUrl: 'https://example.invalid/glb/nucleo64-board.glb' },
      { id: 'held-part', name: 'Held', category: 'X', family: 'Y', tags: ['legal-hold'] },
    ],
  };

  const loadWorker = async () =>
    (await import(/* @vite-ignore */ 'data:text/javascript,' + encodeURIComponent(PAGES_WORKER))).default;

  const env = {
    ASSETS: {
      fetch: async () => new Response(JSON.stringify(INDEX), { headers: { 'content-type': 'application/json' } }),
    },
  };

  const call = async (path: string) => {
    const worker = await loadWorker();
    return worker.fetch(new Request('https://catalog.invalid' + path), env);
  };

  it.each([
    ['/v1/parts/nucleo64-board', 200],
    ['/v1/parts/does-not-exist', 404],
    ['/v1/parts?q=nucleo', 200],
    ['/v1/categories', 200],
    ['/v1/families', 200],
  ])('%s responds %i with ACAO:*', async (path, status) => {
    const res = await call(path as string);
    expect(res.status).toBe(status);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('preserves glbUrl on the detail record a 3D client needs', async () => {
    const res = await call('/v1/parts/nucleo64-board');
    expect((await res.json()).glbUrl).toBe('https://example.invalid/glb/nucleo64-board.glb');
  });

  it('keeps filtering legal-hold out of search results', async () => {
    const res = await call('/v1/parts');
    const ids = (await res.json()).items.map((i: { id: string }) => i.id);
    expect(ids).toContain('nucleo64-board');
    expect(ids).not.toContain('held-part');
  });
});
