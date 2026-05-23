import { afterEach, describe, expect, it, vi } from 'vitest';
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
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/__kernelcad/mesh'),
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
