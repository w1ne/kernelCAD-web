// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterEach, describe, expect, it, vi } from 'vitest';

// S1: scriptSource now routes through the apiBase helper, which calls
// supabase.auth.getSession(). Stub the Supabase client so the test stays
// behavior-equivalent to today (unsigned-in → relative URL path).
vi.mock('../funnel/lib/supabaseClient', () => ({
  getSupabase: () => ({
    auth: { getSession: async () => ({ data: { session: null } }) },
  }),
}));

import { loadGalleryScriptSource, loadStudioScriptSource, meshSourceDev, meshSourceHosted, needsFullKernel } from './scriptSource';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('needsFullKernel', () => {
  it('matches assembly / joint / tendon / solvedModel / lib.fromSTEP models', () => {
    expect(needsFullKernel("const arm = assembly('luxo');")).toBe(true);
    expect(needsFullKernel('const j = joint.clevis({})')).toBe(true);
    expect(needsFullKernel('arm.tendon("spring", {})')).toBe(true);
    expect(needsFullKernel('return arm.solvedModel({});')).toBe(true);
    expect(needsFullKernel('const s = lib.fromSTEP(url)')).toBe(true);
  });

  it('does not match plain v0.1 primitive models the worker can run', () => {
    expect(needsFullKernel('const b = box(10, 20, 5); return b;')).toBe(false);
    expect(needsFullKernel('return cylinder(10, 4).translate(1, 2, 3);')).toBe(false);
    expect(needsFullKernel("const s = sketcher().lineTo([1, 0]); return s.close();")).toBe(false);
  });

  it('tolerates whitespace between the token and its call/member', () => {
    expect(needsFullKernel('assembly  (\n  "x"\n)')).toBe(true);
    expect(needsFullKernel('joint . clevis({})')).toBe(true);
  });
});

describe('meshSourceDev', () => {
  it('POSTs { source } to /__kernelcad/mesh and returns the bridge payload', async () => {
    const payload = {
      features: [{ featureId: 'f0' }],
      featureRecords: [],
      bounds: { min: [0, 0, 0], max: [1, 1, 1] },
      params: {},
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => payload,
    } as Response);

    await expect(meshSourceDev('return box(1,1,1);')).resolves.toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith('/__kernelcad/mesh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'return box(1,1,1);' }),
    });
  });

  it('throws the endpoint error message on a non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'assembly compile failed' }),
    } as Response);
    await expect(meshSourceDev('boom')).rejects.toThrow('assembly compile failed');
  });

  it('throws when the response is not a bridge payload (no features array)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ notFeatures: true }),
    } as Response);
    await expect(meshSourceDev('x')).rejects.toThrow(/did not return features/);
  });
});

describe('param overrides (stateless re-run path)', () => {
  it('meshSourceDev includes params in the POST body when overrides are given', async () => {
    const payload = { features: [], featureRecords: [], bounds: { min: [0, 0, 0], max: [1, 1, 1] }, params: { w: 5 } };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => payload } as Response);
    await meshSourceDev('return box(w,1,1);', { w: 5 });
    expect(fetchMock).toHaveBeenCalledWith('/__kernelcad/mesh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'return box(w,1,1);', params: { w: 5 } }),
    });
  });

  it('meshSourceDev omits params when overrides are empty', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ features: [] }) } as Response);
    await meshSourceDev('x', {});
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({ source: 'x' });
  });

  it('meshSourceHosted skips the static precompute and posts params to the backend when overrides are given', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
    const payload = { features: [], featureRecords: [], bounds: { min: [0, 0, 0], max: [1, 1, 1] }, params: { w: 7 } };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => payload } as Response);

    await meshSourceHosted('return box(w,1,1);', { w: 7 });

    // First (and only) fetch must be the backend POST — proving the precompute
    // GET was skipped (it cannot reflect an override).
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://api.example.com/__kernelcad/mesh');
    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/__kernelcad/mesh', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ source: 'return box(w,1,1);', params: { w: 7 } }),
    }));
  });
});

describe('loadStudioScriptSource', () => {
  it('loads source from the lightweight source endpoint instead of mesh', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ source: 'return box(1, 1, 1);' }),
    } as Response);

    await expect(loadStudioScriptSource('examples/gallery/ratchet-stool.kcad.ts'))
      .resolves.toBe('return box(1, 1, 1);');

    expect(fetchMock).toHaveBeenCalledWith(
      '/__kernelcad/source?script=examples%2Fgallery%2Fratchet-stool.kcad.ts',
      expect.objectContaining({ headers: {} }),
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/__kernelcad/mesh'),
      expect.anything(),
    );
  });

  it('resolves hosted curated script links through the marketing gallery manifest', async () => {
    vi.stubGlobal('window', { location: { hostname: 'app.kernelcad.com' } });
    const fetchMock = vi.fn(async (url: string) => {
      if (url === 'https://kernelcad.com/gallery.json') {
        return {
          ok: true,
          json: async () => ({
            entries: [
              {
                slug: 'ratchet-height-adjust-stool',
                sourceUrl: '/gallery/ratchet-height-adjust-stool/source.kcad.ts',
                scriptPath: 'examples/gallery/ratchet-stool.kcad.ts',
              },
            ],
          }),
        };
      }

      return {
        ok: true,
        text: async () => 'export default box(3, 3, 3);',
      };
    }) as unknown as typeof fetch;

    vi.stubGlobal('fetch', fetchMock);

    await expect(loadStudioScriptSource('examples/gallery/ratchet-stool.kcad.ts'))
      .resolves.toContain('box(3');

    expect(fetchMock).toHaveBeenCalledWith('https://kernelcad.com/gallery.json');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://kernelcad.com/gallery/ratchet-height-adjust-stool/source.kcad.ts',
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/__kernelcad/source?script=examples%2Fgallery%2Fratchet-stool.kcad.ts'),
      expect.anything(),
    );
  });
});

describe('loadGalleryScriptSource', () => {
  it('loads static gallery source by slug', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/gallery.json') {
        return {
          ok: true,
          json: async () => ({
            entries: [
              {
                slug: 'first-build',
                sourceUrl: '/gallery/first-build/source.kcad.ts',
              },
              {
                slug: 'fixture-build',
                sourceUrl: '/gallery/fixture-build/source.kcad.ts',
              },
            ],
          }),
        };
      }

      return {
        ok: true,
        text: async () => 'export default box(1, 1, 1);',
      };
    }) as unknown as typeof fetch;

    vi.stubGlobal('fetch', fetchMock);

    await expect(loadGalleryScriptSource('fixture-build')).resolves.toContain('box');
    expect(fetchMock).toHaveBeenCalledWith('/gallery.json');
    expect(fetchMock).toHaveBeenCalledWith('/gallery/fixture-build/source.kcad.ts');
    expect(fetchMock).not.toHaveBeenCalledWith('/gallery/first-build/source.kcad.ts');
  });

  it('loads app-hosted Studio gallery source from the marketing gallery origin', async () => {
    vi.stubGlobal('window', { location: { hostname: 'app.kernelcad.com' } });
    const fetchMock = vi.fn(async (url: string) => {
      if (url === 'https://kernelcad.com/gallery.json') {
        return {
          ok: true,
          json: async () => ({
            entries: [
              {
                slug: 'fixture-build',
                sourceUrl: '/gallery/fixture-build/source.kcad.ts',
              },
            ],
          }),
        };
      }

      return {
        ok: true,
        text: async () => 'export default box(2, 2, 2);',
      };
    }) as unknown as typeof fetch;

    vi.stubGlobal('fetch', fetchMock);

    await expect(loadGalleryScriptSource('fixture-build')).resolves.toContain('box(2');
    expect(fetchMock).toHaveBeenCalledWith('https://kernelcad.com/gallery.json');
    expect(fetchMock).toHaveBeenCalledWith('https://kernelcad.com/gallery/fixture-build/source.kcad.ts');
  });

  it('rejects gallery entries without sourceUrl', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        entries: [
          {
            slug: 'studio-project',
            sourceUrl: null,
          },
        ],
      }),
    })) as unknown as typeof fetch);

    await expect(loadGalleryScriptSource('studio-project')).rejects.toThrow(/source/i);
  });
});
