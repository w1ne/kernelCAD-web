// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserKernelClient, BrowserKernelError } from './browserKernelClient';
import type { KernelWorkerHooks, SpawnKernelWorker } from './kernelWorkerHost';
import type { RebuildJobRequest, RebuildJobResult, RebuildJobError } from './protocol';

/** A scripted worker: the test answers each posted job by hand. */
function fakeWorkers() {
  const spawned: Array<{ hooks: KernelWorkerHooks; posted: RebuildJobRequest[]; terminated: boolean }> = [];
  const spawn: SpawnKernelWorker = async (hooks) => {
    const worker = { hooks, posted: [] as RebuildJobRequest[], terminated: false };
    spawned.push(worker);
    return {
      ready: { type: 'ready', v: 1, origin: 'null', locked: ['fetch'], initMs: 1 },
      post: (request) => { worker.posted.push(request); },
      terminate: () => { worker.terminated = true; },
    };
  };
  const last = () => spawned[spawned.length - 1]!;
  const result = (request: RebuildJobRequest): RebuildJobResult => ({
    type: 'result', jobId: request.jobId, scope: request.scope, generation: request.generation, quality: request.quality,
    payload: { features: [], featureRecords: [], bounds: { min: [0, 0, 0], max: [1, 1, 1] }, params: {} },
    fingerprints: {}, timings: { buildMs: 1, meshMs: 1, serializeMs: 0, totalMs: 2, path: 'incremental' }, memoryBytes: 0,
  });
  const failure = (request: RebuildJobRequest, fields: Partial<RebuildJobError>): RebuildJobError => ({
    type: 'error', jobId: request.jobId, scope: request.scope, generation: request.generation,
    code: 'script', message: 'boom', fatal: false, firstBuild: false, ...fields,
  });
  return { spawn, spawned, last, result, failure };
}

function client(spawn: SpawnKernelWorker, overrides: Partial<ConstructorParameters<typeof BrowserKernelClient>[0]> = {}) {
  return new BrowserKernelClient({
    spawn,
    spawnOptions: { memoryCapBytes: 1 << 30, startTimeoutMs: 1000, requireIsolation: true },
    jobTimeoutMs: 1000,
    backgroundTimeoutMs: 5000,
    maxInfraFailures: 3,
    ...overrides,
  });
}

const edit = (generation: number, source = 'return box(1,1,1);') => ({
  scope: 'doc-1', generation, source, params: { w: generation }, quality: 'display' as const, have: null,
});

async function flush(): Promise<void> {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

describe('BrowserKernelClient', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('keeps one job in flight and only the latest pending one', async () => {
    const w = fakeWorkers();
    const kernel = client(w.spawn);
    const first = kernel.rebuild(edit(1));
    const second = kernel.rebuild(edit(2));
    const third = kernel.rebuild(edit(3));
    await flush();
    expect(w.last().posted.map((r) => r.generation)).toEqual([1]);
    await expect(second).rejects.toMatchObject({ name: 'AbortError' });
    w.last().hooks.onMessage(w.result(w.last().posted[0]!));
    await expect(first).resolves.toMatchObject({ generation: 1 });
    await flush();
    expect(w.last().posted.map((r) => r.generation)).toEqual([1, 3]);
    w.last().hooks.onMessage(w.result(w.last().posted[1]!));
    await expect(third).resolves.toMatchObject({ generation: 3 });
  });

  it('drops a reply that is not for the running job', async () => {
    const w = fakeWorkers();
    const kernel = client(w.spawn);
    const job = kernel.rebuild(edit(1));
    await flush();
    const posted = w.last().posted[0]!;
    w.last().hooks.onMessage(w.result({ ...posted, jobId: posted.jobId + 99 }));
    let settled = false;
    void job.then(() => { settled = true; }, () => { settled = true; });
    await flush();
    expect(settled).toBe(false);
    w.last().hooks.onMessage(w.result(posted));
    await expect(job).resolves.toMatchObject({ jobId: posted.jobId });
  });

  it('terminates a job past its deadline, respawns, and sends that model to the server', async () => {
    const w = fakeWorkers();
    const kernel = client(w.spawn);
    const runaway = kernel.rebuild(edit(1, 'while (true) {}'));
    const next = kernel.rebuild(edit(2));
    await flush();
    vi.advanceTimersByTime(1001);
    await expect(runaway).rejects.toMatchObject({ failure: 'timeout', fallback: true });
    expect(w.spawned[0]!.terminated).toBe(true);
    await flush();
    expect(w.spawned).toHaveLength(2);
    w.last().hooks.onMessage(w.result(w.last().posted[0]!));
    await expect(next).resolves.toMatchObject({ generation: 2 });
    expect(kernel.isServerOnly('while (true) {}')).toBe(true);
    await expect(kernel.rebuild(edit(3, 'while (true) {}'))).rejects.toMatchObject({ failure: 'server-only' });
  });

  it('falls back when the worker crashes and turns itself off after repeated failures', async () => {
    const w = fakeWorkers();
    const kernel = client(w.spawn);
    for (let i = 1; i <= 3; i++) {
      const job = kernel.rebuild(edit(i));
      await flush();
      w.last().hooks.onCrash('wasm abort');
      await expect(job).rejects.toBeInstanceOf(BrowserKernelError);
    }
    expect(kernel.usable()).toBe(false);
    expect(kernel.status().state).toBe('disabled');
    await expect(kernel.rebuild(edit(4))).rejects.toMatchObject({ failure: 'unavailable', fallback: true });
  });

  it('a memory-cap failure throws the worker away and keeps that model on the server', async () => {
    const w = fakeWorkers();
    const kernel = client(w.spawn);
    const job = kernel.rebuild(edit(1, 'return hugeModel();'));
    await flush();
    w.last().hooks.onMessage(w.failure(w.last().posted[0]!, { code: 'memory', fatal: true, message: 'cap' }));
    await expect(job).rejects.toMatchObject({ failure: 'memory', fallback: true });
    expect(w.spawned[0]!.terminated).toBe(true);
    expect(kernel.isServerOnly('return hugeModel();')).toBe(true);
    expect(kernel.usable()).toBe(true);
  });

  it('gives a different document a fresh worker', async () => {
    const w = fakeWorkers();
    const kernel = client(w.spawn);
    const a = kernel.rebuild(edit(1));
    await flush();
    w.last().hooks.onMessage(w.result(w.last().posted[0]!));
    await a;
    const b = kernel.rebuild({ ...edit(2), scope: 'doc-2' });
    await flush();
    expect(w.spawned).toHaveLength(2);
    expect(w.spawned[0]!.terminated).toBe(true);
    w.last().hooks.onMessage(w.result(w.last().posted[0]!));
    await expect(b).resolves.toMatchObject({ scope: 'doc-2' });
  });

  it('is warm for a source only after it built there', async () => {
    const w = fakeWorkers();
    const kernel = client(w.spawn);
    const warming = kernel.warm('doc-1', 'return box(1,1,1);', 0);
    await flush();
    expect(kernel.isWarm('doc-1', 'return box(1,1,1);')).toBe(false);
    expect(w.last().posted[0]).toMatchObject({ params: {}, quality: 'display' });
    w.last().hooks.onMessage(w.result(w.last().posted[0]!));
    await warming;
    expect(kernel.isWarm('doc-1', 'return box(1,1,1);')).toBe(true);
    expect(kernel.isWarm('doc-2', 'return box(1,1,1);')).toBe(false);
  });

  it('falls back to the server when the worker never finishes starting', async () => {
    const stalled: SpawnKernelWorker = () => new Promise(() => undefined);
    const kernel = client(stalled);
    const job = kernel.rebuild(edit(1));
    const outcome = job.then(() => 'resolved', (error: unknown) => error);
    await flush();
    vi.advanceTimersByTime(1000 + 2000 + 1);
    await expect(outcome).resolves.toMatchObject({ failure: 'unavailable', fallback: true });
  });

  it('counts a failed start once', async () => {
    const failing: SpawnKernelWorker = async () => { throw new Error('start-failed: lockdown'); };
    const kernel = client(failing);
    await expect(kernel.rebuild(edit(1))).rejects.toMatchObject({ failure: 'unavailable' });
    expect(kernel.status().infraFailures).toBe(1);
    expect(kernel.usable()).toBe(true);
  });
});
