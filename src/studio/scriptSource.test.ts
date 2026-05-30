import { afterEach, describe, expect, it, vi } from 'vitest';

// S1: scriptSource now routes through the apiBase helper, which calls
// supabase.auth.getSession(). Stub the Supabase client so the test stays
// behavior-equivalent to today (unsigned-in → relative URL path).
vi.mock('../funnel/lib/supabaseClient', () => ({
  getSupabase: () => ({
    auth: { getSession: async () => ({ data: { session: null } }) },
  }),
}));

import { loadGalleryScriptSource, loadStudioScriptSource } from './scriptSource';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
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
