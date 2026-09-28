// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api/apiBase', () => ({
  apiCall: async () => ({ base: '', headers: {} }),
  rewritePath: (path: string) => path,
}));

vi.mock('../funnel/lib/supabaseClient', () => ({
  getSupabase: () => ({
    auth: { getSession: async () => ({ data: { session: null } }) },
  }),
}));

import {
  exportErrorText,
  exportViaServer,
  isExportAbort,
  ServerExportError,
} from './exportViaServer';

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
      '/__kernelcad/export?format=stl&async=1',
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

describe('exportViaServer response classes', () => {
  const bytes = new Uint8Array([1, 2, 3]);
  const file = (headers: Record<string, string> = {}) => new Response(bytes, {
    status: 200,
    headers: { 'content-disposition': 'attachment; filename="part.3mf"', ...headers },
  });
  const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

  function stubFetch(...responses: Response[]) {
    const fetchMock = vi.fn();
    for (const r of responses) fetchMock.mockResolvedValueOnce(r);
    vi.stubGlobal('fetch', fetchMock);
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { pathname: '/', search: '', hostname: 'localhost' },
    });
    return fetchMock;
  }

  /** Run an export to completion with fake timers (retry waits, polling). */
  async function settle<T>(promise: Promise<T>): Promise<T> {
    const caught = promise.catch((e: unknown) => ({ __error: e }));
    await vi.runAllTimersAsync();
    const out = await caught;
    if (out && typeof out === 'object' && '__error' in out) throw (out as { __error: unknown }).__error;
    return out as T;
  }

  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('422: throws the server message and hint, not a bare failure', async () => {
    stubFetch(json(422, {
      error: 'DXF exports a flat pattern or a planar outline, and this model is a 3D solid or an assembly.',
      code: 'export.dxf.non-planar',
      hint: 'DXF needs a Region, a sheetMetal(...) part or flattenPattern(); use STEP or STL for 3D parts.',
      alternatives: ['step', 'stl'],
    }));
    const err = await settle(exportViaServer('dxf', 'return box(1,1,1);')).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ServerExportError);
    const e = err as ServerExportError;
    expect(e.status).toBe(422);
    expect(e.code).toBe('export.dxf.non-planar');
    expect(exportErrorText(e)).toEqual({
      message: 'DXF exports a flat pattern or a planar outline, and this model is a 3D solid or an assembly.',
      hint: 'DXF needs a Region, a sheetMetal(...) part or flattenPattern(); use STEP or STL for 3D parts.',
    });
  });

  it('200 + warning header: returns the file and a warning naming the open edges', async () => {
    stubFetch(file({
      'X-KernelCAD-Export-Warning': 'export.mesh.not-watertight',
      'X-KernelCAD-Mesh-Open-Edges': '4',
    }));
    const result = await settle(exportViaServer('stl', 'return box(1,1,1);'));
    expect(result.blob.size).toBe(3);
    expect(result.warning).toEqual({
      code: 'export.mesh.not-watertight',
      openEdges: 4,
      message: 'The STL has a small mesh gap (4 open edges). Slicers close gaps this small; check the print preview.',
    });
  });

  it('200 without a warning header: no warning', async () => {
    stubFetch(file());
    const result = await settle(exportViaServer('stl', 'return box(1,1,1);'));
    expect(result.warning).toBeUndefined();
    expect(result.downloadName).toBe('part.3mf');
  });

  it('504: throws the timeout message with its hint', async () => {
    stubFetch(json(504, {
      error: 'The export did not finish within 150 s. Simplify the model or lower mesh resolution, then retry.',
      code: 'export.timeout',
      hint: 'Large assemblies export faster as STEP; STL/3MF tessellate every curved face.',
    }));
    const err = await settle(exportViaServer('stl', 'return box(1,1,1);')).catch((e: unknown) => e) as ServerExportError;
    expect(err.status).toBe(504);
    expect(exportErrorText(err).hint).toMatch(/STEP/);
  });

  it('429 with a short Retry-After: waits it out once and retries', async () => {
    const fetchMock = stubFetch(
      json(429, { error: 'Too many exports. Retry in 3 s.', code: 'rate_limited', retryAfterSec: 3 }, { 'Retry-After': '3' }),
      file(),
    );
    const phases: string[] = [];
    const result = await settle(exportViaServer('stl', 'return box(1,1,1);', {
      onProgress: (p) => phases.push(p.phase === 'waiting' ? `waiting:${p.retryInSec}` : p.phase),
    }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.blob.size).toBe(3);
    expect(phases).toEqual(['running', 'waiting:3', 'running']);
  });

  it('503 twice: retries once, then throws with the wait', async () => {
    const busy = () => json(503, { error: 'The export queue is full. Retry in 15 s.', code: 'export.busy', retryAfterSec: 15 }, { 'Retry-After': '15' });
    const fetchMock = stubFetch(busy(), busy());
    const err = await settle(exportViaServer('stl', 'return box(1,1,1);')).catch((e: unknown) => e) as ServerExportError;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(err.status).toBe(503);
    expect(err.retryAfterSec).toBe(15);
    expect(exportErrorText(err).message).toBe('The export queue is full. Retry in 15 s.');
  });

  it('429 with a long Retry-After: does not wait, tells the user when to retry', async () => {
    const fetchMock = stubFetch(json(429, { error: 'Too many exports.', code: 'rate_limited' }, { 'Retry-After': '45' }));
    const err = await settle(exportViaServer('stl', 'return box(1,1,1);')).catch((e: unknown) => e) as ServerExportError;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(exportErrorText(err).message).toBe('Too many exports. Try again in 45 s.');
  });

  it('202: polls the job, then downloads the file with its warning', async () => {
    const fetchMock = stubFetch(
      json(202, { jobId: 'j1', status: 'queued', statusUrl: '/__kernelcad/export/jobs/j1', downloadUrl: '/__kernelcad/export/jobs/j1/download' }),
      json(200, { jobId: 'j1', status: 'running', retryAfterSec: 2 }),
      json(200, { jobId: 'j1', status: 'done', downloadUrl: '/__kernelcad/export/jobs/j1/download', warning: 'export.3mf.not-watertight' }),
      file({ 'X-KernelCAD-Export-Warning': 'export.3mf.not-watertight' }),
    );
    const phases: string[] = [];
    const result = await settle(exportViaServer('3mf', 'return box(1,1,1);', { onProgress: (p) => phases.push(p.phase) }));
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      '/__kernelcad/export?format=3mf&async=1',
      '/__kernelcad/export/jobs/j1',
      '/__kernelcad/export/jobs/j1',
      '/__kernelcad/export/jobs/j1/download',
    ]);
    expect(result.blob.size).toBe(3);
    expect(result.warning?.message).toMatch(/^The 3MF has a small mesh gap\./);
    expect(phases).toEqual(['running', 'downloading']);
  });

  it('202 then a failed job: throws the job error with its hint', async () => {
    stubFetch(
      json(202, { jobId: 'j2', status: 'queued', statusUrl: '/__kernelcad/export/jobs/j2' }),
      json(200, {
        jobId: 'j2', status: 'failed', httpStatus: 422,
        error: 'The 3MF mesh is not watertight, and 3MF requires a closed mesh.',
        code: 'export.3mf.not-watertight',
        hint: 'Export STEP for the exact geometry.',
      }),
    );
    const err = await settle(exportViaServer('3mf', 'return box(1,1,1);')).catch((e: unknown) => e) as ServerExportError;
    expect(err.status).toBe(422);
    expect(err.code).toBe('export.3mf.not-watertight');
    expect(exportErrorText(err)).toEqual({
      message: 'The 3MF mesh is not watertight, and 3MF requires a closed mesh.',
      hint: 'Export STEP for the exact geometry.',
    });
  });

  it('202 then an expired job (404): tells the user to export again', async () => {
    stubFetch(
      json(202, { jobId: 'j3', status: 'queued', statusUrl: '/__kernelcad/export/jobs/j3' }),
      json(404, { code: 'export.job.not-found' }),
    );
    const err = await settle(exportViaServer('stl', 'return box(1,1,1);')).catch((e: unknown) => e) as ServerExportError;
    expect(err.status).toBe(404);
    expect(err.message).toMatch(/Export again/);
  });

  it('cancel during polling: rejects with an abort and stops fetching', async () => {
    const fetchMock = stubFetch(
      json(202, { jobId: 'j4', status: 'queued', statusUrl: '/__kernelcad/export/jobs/j4' }),
    );
    const controller = new AbortController();
    const run = exportViaServer('stl', 'return box(1,1,1);', { signal: controller.signal })
      .catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(100);
    controller.abort();
    const err = await run;
    expect(isExportAbort(err)).toBe(true);
    await vi.runAllTimersAsync();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
