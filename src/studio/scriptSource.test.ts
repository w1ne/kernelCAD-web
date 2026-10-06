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

import { defaultCode } from '../shared/worker/geometryEngine';
import {
  clearStoredMeshCache,
  loadGalleryScriptSource,
  getMeshNotice,
  loadStudioScriptSource,
  meshSourceDev,
  meshSourceHosted,
  needsFullKernel,
  reviewSourceDev,
  rootVisibleFeatures,
  setHostedRevisionHint,
  storedShareMesh,
} from './scriptSource';

afterEach(() => {
  clearStoredMeshCache();
  setHostedRevisionHint(null);
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

  it('matches the default Studio script (Param .add / .divide)', () => {
    // Worker `param()` returns a plain number, so t.add(2) / w.divide(2) throw
    // `TypeError: t.add is not a function`. Route these to the node kernel
    // up front instead of relying on the throw-then-recover mesh fallback.
    expect(defaultCode).toContain('.add(');
    expect(defaultCode).toContain('.divide(');
    expect(needsFullKernel(defaultCode)).toBe(true);
    expect(needsFullKernel("const t = param('Thickness', 5, { unit: 'mm' }); t.add(2);")).toBe(true);
    expect(needsFullKernel('cylinder(t.add(2), 4).translate(w.divide(2), h.divide(2), -1)')).toBe(true);
  });

  it('does not match plain v0.1 primitive models the worker can run', () => {
    expect(needsFullKernel('const b = box(10, 20, 5); return b;')).toBe(false);
    expect(needsFullKernel('return cylinder(10, 4).translate(1, 2, 3);')).toBe(false);
    expect(needsFullKernel("const s = sketcher().lineTo([1, 0]); return s.close();")).toBe(false);
    expect(needsFullKernel("const w = param('Width', 60); return box(w, 10, 5);")).toBe(false);
  });

  it('tolerates whitespace between the token and its call/member', () => {
    expect(needsFullKernel('assembly  (\n  "x"\n)')).toBe(true);
    expect(needsFullKernel('joint . clevis({})')).toBe(true);
    expect(needsFullKernel('t . add (2)')).toBe(true);
    expect(needsFullKernel('w . divide (2)')).toBe(true);
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

describe('reviewSourceDev', () => {
  it('POSTs { source } to /__kernelcad/review and returns the review summary', async () => {
    const summary = { ok: true, diagnostics: [], rawInterferencePairs: [] };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => summary,
    } as Response);

    await expect(reviewSourceDev('return box(1,1,1);', 'examples/demo.kcad.ts')).resolves.toEqual(summary);
    expect(fetchMock).toHaveBeenCalledWith(
      '/__kernelcad/review?script=examples%2Fdemo.kcad.ts',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'return box(1,1,1);' }),
      },
    );
  });

  it('throws the endpoint error message on a non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'candidate compile failed' }),
    } as Response);
    await expect(reviewSourceDev('boom', 'examples/demo.kcad.ts')).rejects.toThrow('candidate compile failed');
  });

  it('rejects a 200 response that is not a review payload', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);
    await expect(reviewSourceDev('return box(1,1,1);', 'examples/demo.kcad.ts'))
      .rejects.toThrow(/unexpected payload/i);
  });

  it('throws the error diagnostic message on a 422 candidate failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        error: 'boom',
        diagnostics: [{ code: 'script.compile', severity: 'error', message: 'boom' }],
      }),
    } as Response);
    await expect(reviewSourceDev('return ;', 'examples/demo.kcad.ts')).rejects.toThrow('boom');
  });

  it('falls back to the HTTP status when the error body is unparseable', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => { throw new Error('not json'); },
    } as Response);
    await expect(reviewSourceDev('boom', 'examples/demo.kcad.ts')).rejects.toThrow('HTTP 502');
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

  it('meshes /p projects by slug so hosted complementary files are available', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
    vi.stubGlobal('window', {
      location: { hostname: 'app.kernelcad.com', pathname: '/p/keycap-123' },
    });
    const payload = { features: [], featureRecords: [], bounds: { min: [0, 0, 0], max: [1, 1, 1] } };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => payload,
    } as Response);

    await meshSourceHosted('source ignored for persisted project', { dishDepth: 1 });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/__kernelcad/mesh',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ projectSlug: 'keycap-123', params: { dishDepth: 1 } }),
      }),
    );
  });

  it('pins a hosted project request to the version in the URL', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
    vi.stubGlobal('window', {
      location: { hostname: 'app.kernelcad.com', pathname: '/p/keycap-123', search: '?version=7' },
    });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ features: [], featureRecords: [], bounds: { min: [0, 0, 0], max: [1, 1, 1] } }),
    } as Response);

    await meshSourceHosted('ignored', { dishDepth: 1 });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/__kernelcad/mesh',
      expect.objectContaining({
        body: JSON.stringify({ projectSlug: 'keycap-123', projectVersion: 7, params: { dishDepth: 1 } }),
      }),
    );
  });

  it('falls back to the API route when the CDN copy is missing', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
    vi.stubGlobal('window', {
      location: { hostname: 'app.kernelcad.com', pathname: '/p/BHEaiMyr', search: '?version=2' },
    });
    const stored = { revision: 2, features: [{ featureId: 'ball' }], bounds: { min: [0, 0, 0], max: [1, 1, 1] } };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith('/__kernelcad/mesh')) {
        return { ok: false, status: 500, json: async () => ({ error: 'mesh timed out after 30000 ms' }) } as Response;
      }
      if (url === 'https://api.example.com/api/v1/projects/BHEaiMyr/revisions/2/mesh-artifact') {
        return { ok: true, json: async () => stored } as Response;
      }
      return { ok: false, status: 404, json: async () => null } as Response;
    });

    await expect(meshSourceHosted('ignored')).resolves.toEqual(stored);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/v1/projects/BHEaiMyr/revisions/2/mesh-artifact',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('/__kernelcad/mesh'))).toBe(false);
  });

  it('reads the stored revision mesh from the CDN when the API answers 503', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
    vi.stubGlobal('window', {
      location: { hostname: 'app.kernelcad.com', pathname: '/p/BHEaiMyr', search: '?version=2' },
    });
    const stored = { revision: 2, features: [{ featureId: 'ball' }], bounds: { min: [0, 0, 0], max: [1, 1, 1] } };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url === 'https://mesh.kernelcad.com/mesh-artifacts/BHEaiMyr/v2.json') {
        return { ok: true, json: async () => stored } as Response;
      }
      if (url.endsWith('/mesh-artifact')) return { ok: false, status: 503, json: async () => null } as Response;
      return { ok: false, status: 500, json: async () => ({ error: 'mesh timed out after 30000 ms' }) } as Response;
    });

    await expect(meshSourceHosted('ignored')).resolves.toEqual(stored);
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining('/revisions/2/mesh-artifact'));
  });

  it('keeps a missing-artifact error when nothing is stored and does not remesh', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
    vi.stubGlobal('window', {
      location: { hostname: 'app.kernelcad.com', pathname: '/p/BHEaiMyr', search: '' },
    });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => (
      String(input).endsWith('/__kernelcad/mesh')
        ? Promise.reject(new TypeError('Failed to fetch'))
        : ({ ok: false, status: 404, json: async () => null } as Response)
    ));

    await expect(meshSourceHosted('ignored')).rejects.toThrow('stored mesh');
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('/__kernelcad/mesh'))).toBe(false);
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('/gallery/_mesh/'))).toBe(false);
  });

  it('paints a pinned revision from the CDN without a gallery lookup or a rebuild', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
    vi.stubGlobal('window', {
      location: { hostname: 'app.kernelcad.com', pathname: '/p/V4P2zJTm', search: '?version=1' },
    });
    const face = {
      vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      indices: [0, 1, 2],
      normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
      faceId: 1,
    };
    const stored = {
      revision: 1,
      features: [{
        featureId: 'solvedAssembly_1__housing',
        featureKind: 'solvedAssembly',
        predecessors: ['solvedAssembly_1'],
        assemblyPartName: 'housing',
        faces: [face],
        material: { baseColor: '#b0b4b8', metalness: 1, roughness: 0.3 },
      }],
      bounds: { min: [0, 0, 0], max: [1, 1, 1] },
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url === 'https://mesh.kernelcad.com/mesh-artifacts/V4P2zJTm/v1.json') {
        return { ok: true, json: async () => stored } as Response;
      }
      return { ok: false, status: 404, json: async () => null } as Response;
    });

    const payload = await meshSourceHosted('ignored source');
    expect(payload.features.map((feature) => feature.featureId)).toEqual(['solvedAssembly_1__housing']);
    expect(getMeshNotice().approximate).toBe(false);
    expect(getMeshNotice().meshing).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('/gallery/_mesh/'))).toBe(false);
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('/__kernelcad/mesh'))).toBe(false);
  });

  it('does not paint a newer latest.json for an older pin', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
    vi.stubGlobal('window', {
      location: { hostname: 'app.kernelcad.com', pathname: '/p/V4P2zJTm', search: '?version=1' },
    });
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith('/v1.json')) return { ok: false, status: 404, json: async () => null } as Response;
      if (url.endsWith('/latest.json') || url.endsWith('/mesh-artifact')) {
        return { ok: true, json: async () => ({ revision: 6, features: [{ featureId: 'rail' }], bounds: { min: [0, 0, 0], max: [1, 1, 1] } }) } as Response;
      }
      return { ok: false, status: 500, json: async () => ({ error: 'remeshed' }) } as Response;
    });

    await expect(meshSourceHosted('ignored')).rejects.toThrow('stored mesh');
  });

  it('does not use the stored mesh for a parameter edit', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
    vi.stubGlobal('window', {
      location: { hostname: 'app.kernelcad.com', pathname: '/p/BHEaiMyr', search: '?version=2' },
    });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      { ok: false, status: 500, json: async () => ({ error: 'mesh timed out after 30000 ms' }) } as Response,
    );

    await expect(meshSourceHosted('ignored', { diameter_mm: 200 })).rejects.toThrow('mesh timed out');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends a rewritten source instead of the stored project body when asked', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
    vi.stubGlobal('window', {
      location: { hostname: 'app.kernelcad.com', pathname: '/p/keycap-123' },
    });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ features: [], featureRecords: [], bounds: { min: [0, 0, 0], max: [1, 1, 1] } }),
    } as Response);

    await meshSourceHosted("param('Cap', 'round')", { dishDepth: 1 }, { preferSource: true });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/__kernelcad/mesh',
      expect.objectContaining({
        body: JSON.stringify({ source: "param('Cap', 'round')", params: { dishDepth: 1 } }),
      }),
    );
  });
});

describe('rootVisibleFeatures', () => {
  it('hides boolean cutters and predecessor bodies while keeping assembly fan-out', () => {
    const features = [
      { featureId: 'box_1', faces: [] },
      { featureId: 'sphere_1', faces: [] },
      { featureId: 'boolean_1', faces: [] },
      { featureId: 'part_a', assemblyFeatureId: 'scene_1', faces: [] },
    ] as never[];

    expect(rootVisibleFeatures({ features, rootFeatureIds: ['boolean_1'] }).map((f) => f.featureId))
      .toEqual(['boolean_1']);
    expect(rootVisibleFeatures({ features, rootFeatureIds: ['scene_1'] }).map((f) => f.featureId))
      .toEqual(['part_a']);
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

describe('hosted mesh: pending retry and degraded notice', () => {
  const ok = { features: [], featureRecords: [], bounds: { min: [0, 0, 0], max: [1, 1, 1] } };
  const pending = (retryAfter?: string) => ({
    ok: false,
    status: 504,
    headers: { get: (k: string) => (k === 'Retry-After' ? retryAfter ?? null : null) },
    json: async () => ({ code: 'mesh.pending', error: 'still meshing' }),
  }) as unknown as Response;

  function hosted() {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
    vi.stubGlobal('window', { location: { hostname: 'app.kernelcad.com', pathname: '/', search: '' } });
  }

  it('retries a 504 mesh.pending after Retry-After, showing the meshing notice, then succeeds', async () => {
    vi.useFakeTimers();
    hosted();
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(pending('2'))
      .mockResolvedValueOnce(pending('2'))
      .mockResolvedValueOnce({ ok: true, json: async () => ok } as Response);
    const p = meshSourceHosted('edited', { w: 1 });
    await vi.advanceTimersByTimeAsync(0);
    expect(getMeshNotice().meshing).toBe(true);
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(2000);
    await expect(p).resolves.toMatchObject({ features: [] });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(getMeshNotice().meshing).toBe(false);
    vi.useRealTimers();
  });

  it('gives up after three retries (~90 s at most) with the server error', async () => {
    vi.useFakeTimers();
    hosted();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => pending('999'));
    const p = meshSourceHosted('edited', { w: 1 });
    const assertion = expect(p).rejects.toThrow('still meshing');
    await vi.advanceTimersByTimeAsync(90_000);
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(getMeshNotice().meshing).toBe(false);
    vi.useRealTimers();
  });

  it('flags a degraded revision-artifact payload as an approximate preview', async () => {
    hosted();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ ...ok, degraded: 'revision-artifact' }) } as Response);
    await meshSourceHosted('edited', { w: 1 });
    expect(getMeshNotice().approximate).toBe(true);
    vi.mocked(globalThis.fetch).mockResolvedValue({ ok: true, json: async () => ok } as Response);
    await meshSourceHosted('edited', { w: 2 });
    expect(getMeshNotice().approximate).toBe(false);
  });
});

describe('storedShareMesh', () => {
  const face = {
    vertices: [0, 0, 0, 1, 0, 0, 0, 1, 0],
    indices: [0, 1, 2],
    normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
    faceId: 1,
  };
  const stored = {
    revision: 1,
    features: [{ featureId: 'rail', featureKind: 'box', predecessors: [], faces: [face] }],
    bounds: { min: [0, 0, 0], max: [1, 1, 1] },
  };

  it('paints a pinned artifact on localhost without remeshing', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
    vi.stubEnv('VITE_HOSTED_MESH', '');
    vi.stubGlobal('window', {
      location: { hostname: 'localhost', pathname: '/p/OGm0lP_B', search: '?version=1' },
    });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url === 'https://mesh.kernelcad.com/mesh-artifacts/OGm0lP_B/v1.json') {
        return { ok: true, json: async () => stored } as Response;
      }
      return { ok: false, status: 404, json: async () => null } as Response;
    });

    const payload = await storedShareMesh();
    expect(payload?.features.map((feature) => feature.featureId)).toEqual(['rail']);
    expect(getMeshNotice().approximate).toBe(false);
    expect(getMeshNotice().meshing).toBe(false);
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('/__kernelcad/mesh'))).toBe(false);
  });

  it('returns null off a share page', async () => {
    vi.stubGlobal('window', { location: { hostname: 'localhost', pathname: '/studio', search: '' } });
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    await expect(storedShareMesh()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
