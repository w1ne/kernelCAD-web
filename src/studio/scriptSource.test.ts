import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadStudioScriptSource } from './scriptSource';

afterEach(() => {
  vi.restoreAllMocks();
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
