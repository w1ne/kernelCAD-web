// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterEach, describe, expect, it, vi } from 'vitest';
import { saveSourceToScript } from './saveSource';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('saveSourceToScript', () => {
  it('PUTs the source to the encoded script path', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }) as Response);
    vi.stubGlobal('fetch', fetchMock);

    await saveSourceToScript('examples/demo.kcad.ts', 'return box(1,1,1);');

    expect(fetchMock).toHaveBeenCalledWith(
      '/__kernelcad/source?script=examples%2Fdemo.kcad.ts',
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ source: 'return box(1,1,1);' }),
      },
    );
  });

  it('surfaces the server error message when the body carries one', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 400,
      json: async () => ({ error: 'script must be a repo examples/*.kcad.ts file' }),
    }) as unknown as Response));

    await expect(saveSourceToScript('x', 'y')).rejects.toThrow(
      'script must be a repo examples/*.kcad.ts file',
    );
  });

  it('falls back to the status when the body has no error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => { throw new Error('not json'); },
    }) as unknown as Response));

    await expect(saveSourceToScript('x', 'y')).rejects.toThrow('save failed (500)');
  });

  it('wraps network rejections with the save context', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));

    await expect(saveSourceToScript('x', 'y')).rejects.toThrow('save failed: network down');
  });
});
