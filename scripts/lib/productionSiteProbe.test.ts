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
  bodyBytes?: number;
}): ProbeResponse {
  return {
    status: opts.status,
    headers: new Headers(opts.headers ?? {}),
    json: async () => opts.json,
    arrayBuffer: async () => new ArrayBuffer(opts.bodyBytes ?? 0),
  };
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
      { ok: true, name: 'subscribe invalid-email path', detail: '/?error=invalid_email#signup' },
    ]);
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
