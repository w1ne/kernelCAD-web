// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/kernel/browserKernelClient.test.ts
//
// The client's lifecycle against a controllable fake worker: warm/params happy
// paths, both watchdogs (script phase vs whole request), crash respawn, sticky
// fallback reasons, and dispose. Fake timers make the budgets explicit — no
// test sleeps, and timer-count assertions catch dangling watchdogs.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createBrowserKernel,
  KernelNotWarmError,
  KernelSourceError,
  KernelSupersededError,
  type BrowserKernel,
  type KernelEvent,
} from './browserKernelClient';
import type { KernelRequest, KernelResponse } from './protocol';

class FakeWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  onmessageerror: ((e: unknown) => void) | null = null;
  posted: KernelRequest[] = [];
  terminated = false;

  postMessage(msg: unknown): void {
    this.posted.push(msg as KernelRequest);
  }

  terminate(): void {
    this.terminated = true;
  }

  reply(msg: KernelResponse): void {
    this.onmessage?.({ data: msg } as MessageEvent);
  }

  crash(): void {
    this.onerror?.(new Error('boom'));
  }
}

interface Harness {
  kernel: BrowserKernel;
  workers: FakeWorker[];
  events: KernelEvent[];
  worker(): FakeWorker;
}

function harness(): Harness {
  const workers: FakeWorker[] = [];
  const events: KernelEvent[] = [];
  const kernel = createBrowserKernel({
    spawn: () => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker as unknown as Worker;
    },
    scriptBudgetMs: 1_000,
    totalBudgetMs: 5_000,
    onEvent: (event) => {
      events.push(event);
    },
  });
  return { kernel, workers, events, worker: () => workers[workers.length - 1]! };
}

function scriptDone(id: number): KernelResponse {
  return { v: 1, id, type: 'script-done' };
}

function buildResult(
  id: number,
  overrides: Partial<Extract<KernelResponse, { type: 'result' }>> = {},
): KernelResponse {
  return {
    v: 1,
    id,
    type: 'result',
    payload: new Uint8Array([1, 2, 3]),
    params: { width: { value: 1 } },
    featureRecords: [{ id: 'box#1' }, { id: 'cyl#1' }],
    bounds: { min: [0, 0, 0], max: [1, 2, 3] },
    failedFeatureIds: [],
    ...overrides,
  };
}

function errorResponse(
  id: number,
  code: 'script-error' | 'host-fs-unavailable' | 'worker-error',
  extra: { message?: string; failedFeatureIds?: string[] } = {},
): KernelResponse {
  return {
    v: 1,
    id,
    type: 'error',
    code,
    message: extra.message ?? 'worker said no',
    ...(extra.failedFeatureIds !== undefined ? { failedFeatureIds: extra.failedFeatureIds } : {}),
  };
}

function lastBuild(worker: FakeWorker): Extract<KernelRequest, { type: 'build' }> {
  const msg = [...worker.posted].reverse().find((m) => m.type === 'build');
  if (msg?.type !== 'build') throw new Error('no build request posted');
  return msg;
}

function lastParams(worker: FakeWorker): Extract<KernelRequest, { type: 'params' }> {
  const msg = [...worker.posted].reverse().find((m) => m.type === 'params');
  if (msg?.type !== 'params') throw new Error('no params request posted');
  return msg;
}

async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (err) {
    return err;
  }
  throw new Error('expected the promise to reject');
}

/** Warm through a script-done + result pair on the current worker. */
async function warm(h: Harness, source = 'box(10)', fileName = 'studio.kcad.ts'): Promise<FakeWorker> {
  const promise = h.kernel.warm(source, fileName);
  const worker = h.worker();
  const build = lastBuild(worker);
  worker.reply(scriptDone(build.id));
  worker.reply(buildResult(build.id));
  await promise;
  return worker;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('browserKernelClient: warm', () => {
  it('spawns once, disarms the script watchdog on script-done, and resolves warm on result', async () => {
    const h = harness();
    const promise = h.kernel.warm('box(10)', 'studio.kcad.ts');

    expect(h.kernel.status()).toBe('warming');
    expect(h.workers).toHaveLength(1);
    expect(lastBuild(h.worker())).toMatchObject({
      v: 1,
      type: 'build',
      source: 'box(10)',
      fileName: 'studio.kcad.ts',
    });

    h.worker().reply(scriptDone(lastBuild(h.worker()).id));
    // The script watchdog is armed at send and disarmed by script-done, so a
    // heavy mesh that outlives scriptBudgetMs must not kill the worker.
    await vi.advanceTimersByTimeAsync(1_000);
    expect(h.worker().terminated).toBe(false);

    h.worker().reply(buildResult(lastBuild(h.worker()).id));
    await promise;

    expect(h.kernel.status()).toBe('warm');
    expect(h.kernel.fallbackReason()).toBeNull();
    expect(h.workers).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
    expect(h.events.map((e) => e.type)).toEqual(['init', 'build']);
    expect(h.events.find((e) => e.type === 'build')).toMatchObject({
      type: 'build',
      featureCount: 2,
    });
  });

  it('retries the build once on the script watchdog, then fails with timeout', async () => {
    const h = harness();
    const promise = h.kernel.warm('slow(1)', 'f.ts');
    const rejection = rejectionOf(promise);

    const first = h.worker();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(first.terminated).toBe(true);
    expect(h.workers).toHaveLength(2);
    expect(lastBuild(h.worker())).toMatchObject({ type: 'build', source: 'slow(1)', fileName: 'f.ts' });

    const second = h.worker();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(second.terminated).toBe(true);

    const error = await rejection;
    expect(error).toBeInstanceOf(KernelSourceError);
    expect((error as KernelSourceError).reason).toBe('timeout');
    expect(h.kernel.status()).toBe('failed');
    expect(h.kernel.fallbackReason()).toBe('timeout');
    expect(h.workers).toHaveLength(2);
    expect(h.events).toContainEqual({ type: 'fallback', reason: 'timeout' });
  });

  it('retries the build once after a worker crash, then fails with crash', async () => {
    const h = harness();
    const promise = h.kernel.warm('s', 'f.ts');

    const first = h.worker();
    first.crash();
    expect(first.terminated).toBe(true);
    expect(h.workers).toHaveLength(2);
    expect(lastBuild(h.worker())).toMatchObject({ type: 'build', source: 's', fileName: 'f.ts' });

    const second = h.worker();
    second.crash();
    expect(second.terminated).toBe(true);

    const error = await rejectionOf(promise);
    expect(error).toBeInstanceOf(KernelSourceError);
    expect((error as KernelSourceError).reason).toBe('crash');
    expect(h.kernel.status()).toBe('failed');
    expect(h.kernel.fallbackReason()).toBe('crash');
    expect(h.workers).toHaveLength(2);
    expect(h.events).toContainEqual({ type: 'fallback', reason: 'crash' });
  });

  it('is idempotent for the same source while warming and while warm', async () => {
    const h = harness();
    const a = h.kernel.warm('s', 'f.ts');
    const b = h.kernel.warm('s', 'f.ts');
    expect(b).toBe(a);
    expect(h.workers).toHaveLength(1);

    const build = lastBuild(h.worker());
    h.worker().reply(scriptDone(build.id));
    h.worker().reply(buildResult(build.id));
    await a;
    await b;

    await h.kernel.warm('s', 'f.ts');
    expect(h.worker().posted.filter((m) => m.type === 'build')).toHaveLength(1);
    expect(h.workers).toHaveLength(1);
  });

  it('ignores responses with stray ids', async () => {
    const h = harness();
    const promise = h.kernel.warm('s', 'f.ts');
    const build = lastBuild(h.worker());

    h.worker().reply(buildResult(999));
    expect(h.kernel.status()).toBe('warming');

    h.worker().reply(scriptDone(build.id));
    h.worker().reply(buildResult(build.id));
    await promise;
    expect(h.kernel.status()).toBe('warm');
  });

  it('rejects a result with failedFeatureIds as a per-call script error without stickiness', async () => {
    const h = harness();
    const promise = h.kernel.warm('s', 'f.ts');
    const build = lastBuild(h.worker());
    h.worker().reply(scriptDone(build.id));
    h.worker().reply(buildResult(build.id, { failedFeatureIds: ['mover#1'] }));

    const error = await rejectionOf(promise);
    expect(error).toBeInstanceOf(KernelSourceError);
    expect((error as KernelSourceError).failedFeatureIds).toEqual(['mover#1']);
    expect(h.kernel.status()).toBe('failed');
    // Not server-only: the same source may be retried in the browser.
    expect(h.kernel.fallbackReason()).toBeNull();

    const retry = h.kernel.warm('s', 'f.ts');
    expect(h.workers).toHaveLength(2);
    const build2 = lastBuild(h.worker());
    h.worker().reply(scriptDone(build2.id));
    h.worker().reply(buildResult(build2.id));
    await retry;
    expect(h.kernel.status()).toBe('warm');
  });
});

describe('browserKernelClient: fallback reasons', () => {
  it('marks host-fs on host-fs-unavailable; params then throws KernelSourceError without posting', async () => {
    const h = harness();
    const promise = h.kernel.warm('fromSTEP("part.step")', 'f.ts');
    const build = lastBuild(h.worker());
    h.worker().reply(errorResponse(build.id, 'host-fs-unavailable', { message: 'needs a filesystem' }));

    const error = await rejectionOf(promise);
    expect(error).toBeInstanceOf(KernelSourceError);
    expect((error as KernelSourceError).reason).toBe('host-fs');
    expect(h.kernel.status()).toBe('failed');
    expect(h.kernel.fallbackReason()).toBe('host-fs');
    expect(h.events).toContainEqual({ type: 'fallback', reason: 'host-fs' });

    const posted = h.worker().posted.length;
    const paramsError = await rejectionOf(h.kernel.params([{ name: 'w', value: 2 }]));
    expect(paramsError).toBeInstanceOf(KernelSourceError);
    expect((paramsError as KernelSourceError).reason).toBe('host-fs');
    expect(h.worker().posted).toHaveLength(posted);
    expect(h.worker().terminated).toBe(false);
  });

  it('marks script-error on a script-error response', async () => {
    const h = harness();
    const promise = h.kernel.warm('throw new Error("x")', 'f.ts');
    const build = lastBuild(h.worker());
    h.worker().reply(errorResponse(build.id, 'script-error', { message: 'ReferenceError: x' }));

    const error = await rejectionOf(promise);
    expect(error).toBeInstanceOf(KernelSourceError);
    expect((error as KernelSourceError).reason).toBe('script-error');
    expect(h.kernel.status()).toBe('failed');
    expect(h.kernel.fallbackReason()).toBe('script-error');
    expect(h.events).toContainEqual({ type: 'fallback', reason: 'script-error' });
  });

  it('rejects a warm of the sticky source without spawning; a new source resets and retries', async () => {
    const h = harness();
    const first = h.kernel.warm('a', 'a.ts');
    h.worker().reply(errorResponse(lastBuild(h.worker()).id, 'script-error'));
    expect(await rejectionOf(first)).toBeInstanceOf(KernelSourceError);

    const same = await rejectionOf(h.kernel.warm('a', 'a.ts'));
    expect(same).toBeInstanceOf(KernelSourceError);
    expect((same as KernelSourceError).reason).toBe('script-error');
    expect(h.workers).toHaveLength(1);

    const retry = h.kernel.warm('b', 'b.ts');
    expect(h.kernel.fallbackReason()).toBeNull();
    expect(h.workers).toHaveLength(2);
    const build = lastBuild(h.worker());
    expect(build).toMatchObject({ source: 'b', fileName: 'b.ts' });
    h.worker().reply(scriptDone(build.id));
    h.worker().reply(buildResult(build.id));
    await retry;
    expect(h.kernel.status()).toBe('warm');
    expect(h.kernel.fallbackReason()).toBeNull();
  });
});

describe('browserKernelClient: params', () => {
  it('throws KernelNotWarmError before any warm and while warming', async () => {
    const h = harness();
    expect(await rejectionOf(h.kernel.params([{ name: 'w', value: 2 }]))).toBeInstanceOf(
      KernelNotWarmError,
    );

    const promise = h.kernel.warm('s', 'f.ts');
    expect(await rejectionOf(h.kernel.params([{ name: 'w', value: 2 }]))).toBeInstanceOf(
      KernelNotWarmError,
    );
    expect(h.worker().posted.filter((m) => m.type === 'params')).toHaveLength(0);

    const build = lastBuild(h.worker());
    h.worker().reply(scriptDone(build.id));
    h.worker().reply(buildResult(build.id));
    await promise;
  });

  it('supersedes an in-flight params, then resolves payload/trailer/params and emits the event', async () => {
    const h = harness();
    const worker = await warm(h);

    const p1 = h.kernel.params([{ name: 'width', value: 2 }], { 'box#1': 'aaaaaaaaaaaaaaaa' });
    const first = lastParams(worker);
    expect(first).toMatchObject({
      v: 1,
      type: 'params',
      edits: [{ name: 'width', value: 2 }],
      have: { 'box#1': 'aaaaaaaaaaaaaaaa' },
    });

    const p2 = h.kernel.params([{ name: 'width', value: 3 }]);
    const second = lastParams(worker);
    expect(second.id).not.toBe(first.id);
    expect(second).toMatchObject({ edits: [{ name: 'width', value: 3 }] });
    expect('have' in second).toBe(false);
    expect(await rejectionOf(p1)).toBeInstanceOf(KernelSupersededError);

    const trailer = { unchangedIds: ['box#1'], removedIds: [] };
    worker.reply(buildResult(second.id, { payload: new Uint8Array([9, 9]), trailer }));
    const out = await p2;

    expect(out.payload).toEqual(new Uint8Array([9, 9]));
    expect(out.trailer).toEqual(trailer);
    expect(out.params).toEqual({ width: { value: 1 } });
    expect(out.featureRecords).toEqual([{ id: 'box#1' }, { id: 'cyl#1' }]);
    expect(out.bounds).toEqual({ min: [0, 0, 0], max: [1, 2, 3] });
    expect(out.failedFeatureIds).toEqual([]);
    expect(h.events).toContainEqual({ type: 'params', ms: expect.any(Number), bytes: 2 });
    expect(h.kernel.status()).toBe('warm');
  });

  it('fails immediately on a crash during params, without respawning', async () => {
    const h = harness();
    const worker = await warm(h);

    const promise = h.kernel.params([{ name: 'w', value: 2 }]);
    worker.crash();

    const error = await rejectionOf(promise);
    expect(error).toBeInstanceOf(KernelSourceError);
    expect((error as KernelSourceError).reason).toBe('crash');
    expect(worker.terminated).toBe(true);
    expect(h.workers).toHaveLength(1);
    expect(h.kernel.status()).toBe('failed');
    expect(h.kernel.fallbackReason()).toBe('crash');
    expect(h.events).toContainEqual({ type: 'fallback', reason: 'crash' });
  });

  it('fails on the total watchdog during params', async () => {
    const h = harness();
    const worker = await warm(h);

    const promise = h.kernel.params([{ name: 'w', value: 2 }]);
    const rejection = rejectionOf(promise);
    await vi.advanceTimersByTimeAsync(5_000);

    const error = await rejection;
    expect(error).toBeInstanceOf(KernelSourceError);
    expect((error as KernelSourceError).reason).toBe('timeout');
    expect(worker.terminated).toBe(true);
    expect(h.workers).toHaveLength(1);
    expect(h.kernel.fallbackReason()).toBe('timeout');
  });

  it('keeps the kernel warm when a params result carries failedFeatureIds', async () => {
    const h = harness();
    const worker = await warm(h);

    const promise = h.kernel.params([{ name: 'w', value: 2 }]);
    worker.reply(buildResult(lastParams(worker).id, { failedFeatureIds: ['mover#1'] }));

    const error = await rejectionOf(promise);
    expect(error).toBeInstanceOf(KernelSourceError);
    expect((error as KernelSourceError).reason).toBe('script-error');
    expect((error as KernelSourceError).failedFeatureIds).toEqual(['mover#1']);
    expect(h.kernel.status()).toBe('warm');
    expect(h.kernel.fallbackReason()).toBeNull();
  });
});

describe('browserKernelClient: dispose', () => {
  it('terminates, clears timers, resets to idle, rejects the in-flight warm, and warms again', async () => {
    const h = harness();
    const promise = h.kernel.warm('s', 'f.ts');
    const worker = h.worker();

    h.kernel.dispose();

    expect(worker.terminated).toBe(true);
    expect(h.kernel.status()).toBe('idle');
    expect(h.kernel.fallbackReason()).toBeNull();
    expect(await rejectionOf(promise)).toBeInstanceOf(Error);
    expect(vi.getTimerCount()).toBe(0);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(h.workers).toHaveLength(1);

    const again = h.kernel.warm('s', 'f.ts');
    const fresh = h.worker();
    expect(fresh).not.toBe(worker);
    const build = lastBuild(fresh);
    fresh.reply(scriptDone(build.id));
    fresh.reply(buildResult(build.id));
    await again;
    expect(h.kernel.status()).toBe('warm');
  });

  it('clears a sticky reason so the same source can be tried again', async () => {
    const h = harness();
    const promise = h.kernel.warm('a', 'a.ts');
    h.worker().reply(errorResponse(lastBuild(h.worker()).id, 'host-fs-unavailable'));
    await rejectionOf(promise);
    expect(h.kernel.fallbackReason()).toBe('host-fs');

    h.kernel.dispose();
    expect(h.kernel.status()).toBe('idle');
    expect(h.kernel.fallbackReason()).toBeNull();

    const again = h.kernel.warm('a', 'a.ts');
    const worker = h.worker();
    const build = lastBuild(worker);
    worker.reply(scriptDone(build.id));
    worker.reply(buildResult(build.id));
    await again;
    expect(h.kernel.status()).toBe('warm');
  });
});
