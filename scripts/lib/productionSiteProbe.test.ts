// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import {
  buildProductionSiteChecks,
  normalizeSiteBaseUrl,
  type ProbeResponse,
} from './productionSiteProbe';

function response(opts: {
  status: number;
  headers?: Record<string, string>;
  json?: unknown;
  body?: string;
  bodyBytes?: number;
}): ProbeResponse {
  return {
    status: opts.status,
    headers: new Headers(opts.headers ?? {}),
    json: async () => opts.json,
    arrayBuffer: async () => {
      if (opts.body !== undefined) return new TextEncoder().encode(opts.body).buffer;
      return new ArrayBuffer(opts.bodyBytes ?? 0);
    },
  };
}

function galleryEntry(slug: string) {
  return {
    slug,
    title: slug,
    videoUrl: `/gallery/${slug}/video.mp4`,
    posterUrl: `/gallery/${slug}/poster.jpg`,
    modelUrl: `/gallery/${slug}/model.glb`,
    promptUrl: `/gallery/${slug}/prompt.md`,
  };
}

function galleryAssetResponse(path: string): ProbeResponse {
  if (path.endsWith('/model.glb')) {
    return response({
      status: 200,
      headers: { 'content-type': 'model/gltf-binary' },
      bodyBytes: 2048,
    });
  }
  if (path.endsWith('/video.mp4')) {
    return response({
      status: 206,
      headers: { 'content-type': 'video/mp4' },
      bodyBytes: 1024,
    });
  }
  if (path.endsWith('/poster.jpg')) {
    return response({
      status: 200,
      headers: { 'content-type': 'image/jpeg' },
      bodyBytes: 1024,
    });
  }
  if (path.endsWith('/prompt.md')) {
    return response({
      status: 200,
      headers: { 'content-type': 'text/markdown' },
      bodyBytes: 256,
    });
  }
  throw new Error(`unexpected gallery asset ${path}`);
}

describe('normalizeSiteBaseUrl', () => {
  it('normalizes trailing slashes', () => {
    expect(normalizeSiteBaseUrl('https://kernelcad.com///')).toBe('https://kernelcad.com');
  });

  it('rejects non-http URLs', () => {
    expect(() => normalizeSiteBaseUrl('file:///tmp/site')).toThrow(/http/i);
  });
});

describe('buildProductionSiteChecks', () => {
  it('checks linked app css and js assets in app mode', async () => {
    const fetched: string[] = [];
    const checks = buildProductionSiteChecks({
      baseUrl: 'https://app.kernelcad.com/',
      expectedVersion: 'v0.2.1',
      mode: 'app',
      fetch: async (url) => {
        fetched.push(url);
        const path = new URL(url).pathname;
        if (path === '/') {
          return response({
            status: 200,
            headers: { 'content-type': 'text/html; charset=utf-8' },
            body: [
              '<!doctype html>',
              '<link rel="stylesheet" href="/assets/index-abc123.css">',
              '<script type="module" src="/assets/index-def456.js"></script>',
            ].join(''),
          });
        }
        if (path === '/assets/index-abc123.css') {
          return response({
            status: 200,
            headers: { 'content-type': 'text/css' },
            bodyBytes: 128,
          });
        }
        if (path === '/assets/index-def456.js') {
          return response({
            status: 200,
            headers: { 'content-type': 'application/javascript' },
            bodyBytes: 256,
          });
        }
        throw new Error(`unexpected URL ${url}`);
      },
    });

    await expect(Promise.all(checks.map((check) => check.run()))).resolves.toEqual([
      { ok: true, name: 'app built assets', detail: '1 css, 1 js assets ok' },
    ]);
    expect(fetched).toEqual([
      'https://app.kernelcad.com/',
      'https://app.kernelcad.com/assets/index-abc123.css',
      'https://app.kernelcad.com/assets/index-def456.js',
    ]);
  });

  it('fails app mode when a linked css asset is empty', async () => {
    const checks = buildProductionSiteChecks({
      baseUrl: 'https://app.kernelcad.com/',
      expectedVersion: 'v0.2.1',
      mode: 'app',
      fetch: async (url) => {
        const path = new URL(url).pathname;
        if (path === '/') {
          return response({
            status: 200,
            headers: { 'content-type': 'text/html' },
            body: '<link rel="stylesheet" href="/assets/index-empty.css">',
          });
        }
        return response({
          status: 200,
          headers: { 'content-type': 'text/css' },
          bodyBytes: 0,
        });
      },
    });

    await expect(checks[0].run()).resolves.toEqual({
      ok: false,
      name: 'app built assets',
      detail: '/assets/index-empty.css expected non-empty body, got 0 bytes',
    });
  });

  it('accepts the current patch release pointing at its minor demo iteration', async () => {
    const checks = buildProductionSiteChecks({
      baseUrl: 'https://kernelcad.com/',
      expectedVersion: 'v0.2.1',
      expectedDemoIteration: 'v0.2',
      fetch: async (url, init) => {
        const path = new URL(url).pathname;
        if (path === '/demo.json') {
          return response({
            status: 200,
            json: {
              version: 'v0.2.1',
              demoIteration: 'v0.2',
              task: 'subtract-then-fillet-rim',
              source: 'docs/demos/v0.2/subtract-then-fillet-rim/demo.mp4',
            },
          });
        }
        if (path === '/demo.mp4') {
          expect(init?.headers).toEqual({ Range: 'bytes=0-1023' });
          return response({
            status: 206,
            headers: {
              'content-type': 'video/mp4',
              'content-range': 'bytes 0-1023/276295',
            },
            bodyBytes: 1024,
          });
        }
        if (path === '/gallery.json') {
          return response({
            status: 200,
            json: { entries: [galleryEntry('one'), galleryEntry('two'), galleryEntry('three')] },
          });
        }
        if (path.startsWith('/gallery/')) {
          return galleryAssetResponse(path);
        }
        if (path === '/api/subscribe') {
          expect(init?.method).toBe('POST');
          return response({
            status: 303,
            headers: { location: '/?error=invalid_email#signup' },
          });
        }
        throw new Error(`unexpected URL ${url}`);
      },
    });

    await expect(Promise.all(checks.map((check) => check.run()))).resolves.toEqual([
      { ok: true, name: 'demo metadata', detail: 'v0.2.1 -> v0.2/subtract-then-fillet-rim' },
      { ok: true, name: 'demo mp4', detail: 'video/mp4 bytes 0-1023/276295' },
      { ok: true, name: 'gallery assets', detail: '2 entries, 8 assets ok' },
      { ok: true, name: 'subscribe invalid-email path', detail: '/?error=invalid_email#signup' },
    ]);
  });

  it('probes every gallery asset when allGalleryAssets is enabled', async () => {
    const fetchedAssetPaths: string[] = [];
    const checks = buildProductionSiteChecks({
      baseUrl: 'https://kernelcad.com',
      expectedVersion: 'v0.2.1',
      allGalleryAssets: true,
      fetch: async (url) => {
        const path = new URL(url).pathname;
        if (path === '/gallery.json') {
          return response({
            status: 200,
            json: {
              entries: [
                galleryEntry('one'),
                galleryEntry('two'),
                galleryEntry('three'),
              ],
            },
          });
        }
        fetchedAssetPaths.push(path);
        return galleryAssetResponse(path);
      },
    });

    await expect(checks.find((check) => check.name === 'gallery assets')?.run()).resolves.toEqual({
      ok: true,
      name: 'gallery assets',
      detail: '3 entries, 12 assets ok',
    });
    expect(fetchedAssetPaths).toHaveLength(12);
    expect(fetchedAssetPaths).toContain('/gallery/three/prompt.md');
  });

  it('fails marketing checks when gallery asset content type is wrong', async () => {
    const checks = buildProductionSiteChecks({
      baseUrl: 'https://kernelcad.com',
      expectedVersion: 'v0.2.1',
      fetch: async (url) => {
        const path = new URL(url).pathname;
        if (path === '/gallery.json') {
          return response({
            status: 200,
            json: { entries: [galleryEntry('fixture')] },
          });
        }
        return response({
          status: 200,
          headers: { 'content-type': 'text/html' },
          bodyBytes: 1024,
        });
      },
    });

    await expect(checks.find((check) => check.name === 'gallery assets')?.run()).resolves.toEqual({
      ok: false,
      name: 'gallery assets',
      detail:
        '/gallery/fixture/model.glb expected model/gltf-binary or application/octet-stream, got 200 text/html',
    });
  });

  it('fails when live demo metadata reports the wrong version', async () => {
    const checks = buildProductionSiteChecks({
      baseUrl: 'https://kernelcad.com',
      expectedVersion: 'v0.2.1',
      fetch: async () =>
        response({
          status: 200,
          json: {
            version: 'v0.2',
            demoIteration: 'v0.2',
            task: 'subtract-then-fillet-rim',
          },
        }),
    });

    await expect(checks[0].run()).resolves.toEqual({
      ok: false,
      name: 'demo metadata',
      detail: 'expected version v0.2.1, got v0.2',
    });
  });

  it('defaults expected demo iteration from the expected patch version', async () => {
    const checks = buildProductionSiteChecks({
      baseUrl: 'https://kernelcad.com/',
      expectedVersion: 'v0.2.1',
      fetch: async () =>
        response({
          status: 200,
          json: {
            version: 'v0.2.1',
            demoIteration: 'v0.3',
            task: 'subtract-then-fillet-rim',
            source: 'docs/demos/v0.2/subtract-then-fillet-rim/demo.mp4',
          },
        }),
    });

    await expect(checks[0].run()).resolves.toEqual({
      ok: false,
      name: 'demo metadata',
      detail: 'expected demoIteration v0.2, got v0.3',
    });
  });

  it('fails when demo.mp4 is not served as video', async () => {
    const checks = buildProductionSiteChecks({
      baseUrl: 'https://kernelcad.com',
      expectedVersion: 'v0.2.1',
      fetch: async () =>
        response({
          status: 200,
          headers: { 'content-type': 'text/html' },
          bodyBytes: 512,
        }),
    });

    await expect(checks[1].run()).resolves.toEqual({
      ok: false,
      name: 'demo mp4',
      detail: 'expected 200/206 video/mp4 response, got 200 text/html',
    });
  });
});
