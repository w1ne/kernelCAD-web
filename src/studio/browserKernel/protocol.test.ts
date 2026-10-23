// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { isPageToWorker, isWorkerToPage } from './protocol';

const result = {
  type: 'result', jobId: 3, scope: 'doc', generation: 7, quality: 'display',
  payload: { features: [], featureRecords: [], bounds: { min: [0, 0, 0], max: [1, 1, 1] }, params: {} },
  fingerprints: {}, timings: { buildMs: 0, meshMs: 0, serializeMs: 0, totalMs: 0, path: 'cache' }, memoryBytes: 0,
};

describe('browser kernel protocol guards', () => {
  it('accepts the messages the worker sends', () => {
    expect(isWorkerToPage(result)).toBe(true);
    expect(isWorkerToPage({ type: 'ready', v: 1, origin: 'null', locked: [], initMs: 3 })).toBe(true);
    expect(isWorkerToPage({ type: 'error', jobId: 1, scope: 'doc', generation: 1, code: 'script', message: 'x', fatal: false, firstBuild: true })).toBe(true);
  });

  it('drops anything malformed or forged', () => {
    for (const forged of [
      null, 'result', [], { type: 'result' },
      { ...result, jobId: '3' },
      { ...result, payload: { features: 'nope' } },
      { ...result, quality: 'ultra' },
      { type: 'error', jobId: 1, scope: 'doc', generation: 1, code: 'pwned', message: 'x', fatal: false },
      { type: 'ready', v: 2, origin: 'null', locked: [] },
      { type: 'fetch', jobId: 1, url: '/__kernelcad/mesh' },
    ]) {
      expect(isWorkerToPage(forged)).toBe(false);
    }
  });

  it('checks job requests on the worker side', () => {
    const request = { type: 'rebuild', jobId: 1, scope: 'doc', generation: 1, source: 'x', params: {}, quality: 'coarse', have: null };
    expect(isPageToWorker(request)).toBe(true);
    expect(isPageToWorker({ ...request, source: 42 })).toBe(false);
    expect(isPageToWorker({ ...request, have: 'all' })).toBe(false);
  });
});
