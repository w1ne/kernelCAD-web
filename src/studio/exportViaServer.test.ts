// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api/apiBase', () => ({
  apiCall: async () => ({ base: '', headers: {} }),
  rewritePath: (path: string) => path,
}));

vi.mock('../funnel/lib/supabaseClient', () => ({
  getSupabase: () => ({
    auth: { getSession: async () => ({ data: { session: null } }) },
  }),
}));

import { exportViaServer } from './exportViaServer';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('exportViaServer', () => {
  it('POSTs editor source for free-form scripts', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob([new Uint8Array([1, 2, 3])]),
      headers: new Headers({ 'content-disposition': 'attachment; filename="x.stl"' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { pathname: '/', search: '', hostname: 'localhost' },
    });

    const result = await exportViaServer('stl', 'return box(1,1,1);');

    expect(fetchMock).toHaveBeenCalledWith(
      '/__kernelcad/export?format=stl',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ source: 'return box(1,1,1);' }),
      }),
    );
    expect(result.downloadName).toBe('x.stl');
    expect(result.blob.size).toBe(3);
  });

  it('POSTs projectSlug + source on /p/<slug> so lib.fromSTEP assets materialize', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob([new Uint8Array([9])]),
      headers: new Headers({ 'content-disposition': 'attachment; filename="model.stl"' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        pathname: '/p/N2yYiZxy',
        search: '?version=6',
        hostname: 'app.kernelcad.com',
      },
    });

    const live = 'const s = await lib.fromSTEP("./2.0u_blank_costar.stp");\nreturn s;';
    await exportViaServer('stl', live);

    expect(JSON.parse((fetchMock.mock.calls[0]![1] as { body: string }).body)).toEqual({
      projectSlug: 'N2yYiZxy',
      projectVersion: 6,
      source: live,
    });
  });

  it('surfaces server error messages', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Bad',
        json: async () => ({ error: 'lib.fromSTEP: cannot read STEP file' }),
      }),
    );
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { pathname: '/', search: '', hostname: 'localhost' },
    });

    await expect(exportViaServer('stl', 'return box(1,1,1);')).rejects.toThrow(
      /cannot read STEP/,
    );
  });
});
