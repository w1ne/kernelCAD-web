// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/browserKernel/browserKernelClient.ts
//
// The page side of the browser kernel: one worker, one job in flight plus
// the latest pending one (an older pending job is dropped as superseded —
// the interactive-edit rule from OpenZCAD's geometry worker, Apache-2.0),
// a page-enforced deadline per job, and the decisions about when the
// server must take an edit instead:
//
//   - the worker cannot start, crashes, or misses its deadline: it is
//     terminated (`worker.terminate()` is the only way to stop synchronous
//     WASM) and respawned for the next edit; that edit falls back;
//   - a model that ran out of memory, timed out, or needs the filesystem is
//     remembered as server-only for this page;
//   - after repeated infrastructure failures the browser kernel switches
//     itself off for the page (sticky fallback).
//
// The client never paints anything; it resolves with the worker's result and
// the caller applies it (and drops it when a newer edit owns the view).

import type { KernelWorkerHandle, SpawnKernelWorker, SpawnOptions } from './kernelWorkerHost';
import { hashText } from './meshFingerprint';
import { markParamEdit } from './paramEditPerf';
import type {
  MeshQuality,
  ParamValues,
  RebuildJobDimensions,
  RebuildJobError,
  RebuildJobRequest,
  RebuildJobResult,
} from './protocol';

export type BrowserKernelFailure =
  | 'unavailable'
  | 'timeout'
  | 'crash'
  | 'memory'
  | 'server-only'
  | 'script'
  | 'internal';

/** Why the browser kernel did not answer. `fallback`: the server may still. */
export class BrowserKernelError extends Error {
  readonly failure: BrowserKernelFailure;
  readonly fallback: boolean;

  constructor(failure: BrowserKernelFailure, message: string, fallback: boolean) {
    super(message);
    this.name = 'BrowserKernelError';
    this.failure = failure;
    this.fallback = fallback;
  }
}

/** A pending job a newer one replaced. Named like the queue's supersession
 *  so existing abort checks treat it as a cancel. */
export class BrowserKernelSupersededError extends Error {
  readonly superseded = true;

  constructor() {
    super('The browser rebuild was replaced by a newer edit.');
    this.name = 'AbortError';
  }
}

export interface RebuildInput {
  scope: string;
  generation: number;
  source: string;
  params: ParamValues;
  quality: MeshQuality;
  have: Record<string, string> | null;
  /** Interactive edits get the short deadline; the warm-up the long one. */
  background?: boolean;
  signal?: AbortSignal;
}

export interface BrowserKernelClientOptions {
  spawn: SpawnKernelWorker;
  spawnOptions: SpawnOptions;
  /** Deadline of an interactive edit. */
  jobTimeoutMs: number;
  /** Deadline of the first (warm-up) build of a source. */
  backgroundTimeoutMs: number;
  /** Infrastructure failures before the browser kernel turns itself off. */
  maxInfraFailures: number;
}

interface Job {
  request: RebuildJobRequest;
  background: boolean;
  resolve: (result: RebuildJobResult) => void;
  reject: (error: unknown) => void;
  timer?: ReturnType<typeof setTimeout>;
  signal?: AbortSignal;
  onAbort?: () => void;
}

export interface BrowserKernelStatus {
  state: 'idle' | 'starting' | 'ready' | 'disabled';
  disabledReason: string | null;
  origin: string | null;
  lastInitMs: number | null;
  infraFailures: number;
}

/** Grace on top of the spawn's own deadline before the client gives up. */
const START_GRACE_MS = 2_000;

/** A start that never settles must still fall back to the server. A worker
 *  that arrives after the deadline is terminated. */
function withStartDeadline(start: Promise<KernelWorkerHandle>, timeoutMs: number): Promise<KernelWorkerHandle> {
  return new Promise((resolve, reject) => {
    let late = false;
    const timer = setTimeout(() => {
      late = true;
      reject(new Error(`The browser kernel did not start within ${Math.round(timeoutMs / 1000)} s.`));
    }, timeoutMs + START_GRACE_MS);
    start.then((handle) => {
      clearTimeout(timer);
      if (late) handle.terminate();
      else resolve(handle);
    }, (error: unknown) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

function sourceKey(source: string): string {
  return `${source.length}:${hashText(source)}`;
}

export class BrowserKernelClient {
  private readonly options: BrowserKernelClientOptions;
  private worker: KernelWorkerHandle | null = null;
  private workerScope: string | null = null;
  private starting: Promise<KernelWorkerHandle> | null = null;
  private running: Job | null = null;
  private pending: Job | null = null;
  private nextJobId = 1;
  private infraFailures = 0;
  private disabledReason: string | null = null;
  private readonly serverOnly = new Set<string>();
  private readonly warmSources = new Set<string>();
  private readonly warming = new Map<string, Promise<void>>();
  private readonly dimensionListeners = new Set<(message: RebuildJobDimensions) => void>();

  constructor(options: BrowserKernelClientOptions) {
    this.options = options;
  }

  status(): BrowserKernelStatus {
    let state: BrowserKernelStatus['state'] = 'idle';
    if (this.disabledReason) state = 'disabled';
    else if (this.worker) state = 'ready';
    else if (this.starting) state = 'starting';
    return {
      state,
      disabledReason: this.disabledReason,
      origin: this.worker?.ready.origin ?? null,
      lastInitMs: this.worker?.ready.initMs ?? null,
      infraFailures: this.infraFailures,
    };
  }

  /** False once the kernel turned itself off for this page. */
  usable(): boolean {
    return this.disabledReason === null;
  }

  /** True when this source must be built by the server. */
  isServerOnly(source: string): boolean {
    return this.serverOnly.has(sourceKey(source));
  }

  /** True once this source was built in the worker of this scope. */
  isWarm(scope: string, source: string): boolean {
    return this.workerScope === scope && this.worker !== null && this.warmSources.has(sourceKey(source));
  }

  /** Build `source` in the background so the first slider tick is an
   *  incremental edit. Never rejects; a failure is remembered. */
  warm(scope: string, source: string, generation: number): Promise<void> {
    if (!this.usable() || this.isServerOnly(source) || this.isWarm(scope, source)) return Promise.resolve();
    const key = `${scope}|${sourceKey(source)}`;
    const existing = this.warming.get(key);
    if (existing) return existing;
    const run = this.rebuild({ scope, generation, source, params: {}, quality: 'display', have: null, background: true })
      .then(() => undefined, () => undefined)
      .finally(() => { this.warming.delete(key); });
    this.warming.set(key, run);
    return run;
  }

  /** Rebuild in the worker. Rejects with BrowserKernelError (see `fallback`)
   *  or BrowserKernelSupersededError. */
  rebuild(input: RebuildInput): Promise<RebuildJobResult> {
    if (!this.usable()) {
      return Promise.reject(new BrowserKernelError('unavailable', this.disabledReason ?? 'The browser kernel is off.', true));
    }
    if (this.isServerOnly(input.source)) {
      return Promise.reject(new BrowserKernelError('server-only', 'This model is built by the server.', true));
    }
    if (input.signal?.aborted) return Promise.reject(new BrowserKernelSupersededError());
    return new Promise<RebuildJobResult>((resolve, reject) => {
      const job: Job = {
        request: {
          type: 'rebuild',
          jobId: this.nextJobId++,
          scope: input.scope,
          generation: input.generation,
          source: input.source,
          params: input.params,
          quality: input.quality,
          have: input.have,
        },
        background: input.background === true,
        resolve,
        reject,
        signal: input.signal,
      };
      this.watchSignal(job);
      if (this.running) {
        this.replacePending(job);
        return;
      }
      void this.start(job);
    });
  }

  /** Dimensions that follow a settled result (see protocol.ts). */
  onDimensions(listener: (message: RebuildJobDimensions) => void): () => void {
    this.dimensionListeners.add(listener);
    return () => { this.dimensionListeners.delete(listener); };
  }

  /** Stop everything (page teardown, tests). */
  dispose(): void {
    this.rejectPending(new BrowserKernelSupersededError());
    if (this.running) this.finish(this.running).reject(new BrowserKernelSupersededError());
    this.dropWorker();
  }

  private watchSignal(job: Job): void {
    if (!job.signal) return;
    job.onAbort = () => {
      if (this.pending === job) {
        this.pending = null;
        job.reject(new BrowserKernelSupersededError());
      }
      // A running job cannot be interrupted short of terminating the worker;
      // its result still lands in the worker's cache and the caller drops it.
    };
    job.signal.addEventListener('abort', job.onAbort, { once: true });
  }

  private replacePending(job: Job): void {
    this.rejectPending(new BrowserKernelSupersededError());
    this.pending = job;
  }

  private rejectPending(error: Error): void {
    const old = this.pending;
    if (!old) return;
    this.pending = null;
    this.detachSignal(old);
    old.reject(error);
  }

  private detachSignal(job: Job): void {
    if (job.signal && job.onAbort) job.signal.removeEventListener('abort', job.onAbort);
  }

  private async start(job: Job): Promise<void> {
    this.running = job;
    let worker: KernelWorkerHandle;
    try {
      worker = await this.ensureWorker(job.request.scope);
    } catch (error) {
      this.infraFailure(`The browser kernel could not start: ${error instanceof Error ? error.message : String(error)}`);
      this.finish(job).reject(new BrowserKernelError('unavailable', error instanceof Error ? error.message : String(error), true));
      this.next();
      return;
    }
    if (this.running !== job) return;
    const timeoutMs = job.background ? this.options.backgroundTimeoutMs : this.options.jobTimeoutMs;
    job.timer = setTimeout(() => { this.onTimeout(job, timeoutMs); }, timeoutMs);
    try {
      worker.post(job.request);
    } catch (error) {
      this.onCrash(error instanceof Error ? error.message : String(error));
    }
  }

  private async ensureWorker(scope: string): Promise<KernelWorkerHandle> {
    if (this.worker && this.workerScope === scope) return this.worker;
    if (this.worker) {
      // A different document gets a fresh worker: what one model's code did
      // to the worker's realm must not reach another model.
      this.dropWorker();
    }
    if (!this.starting) {
      this.workerScope = scope;
      const spawnStarted = performance.now();
      this.starting = withStartDeadline(this.options.spawn(
        {
          onMessage: (message) => { this.onMessage(message); },
          onCrash: (reason) => { this.onCrash(reason); },
        },
        this.options.spawnOptions,
      ), this.options.spawnOptions.startTimeoutMs).then((handle) => {
        if (this.workerScope !== scope) {
          handle.terminate();
          throw new Error('The document changed while the browser kernel started.');
        }
        this.worker = handle;
        markParamEdit('kernel-ready', { kernel: 'browser', detail: { initMs: handle.ready.initMs, spawnMs: performance.now() - spawnStarted } });
        return handle;
      }).finally(() => {
        this.starting = null;
      });
    }
    return this.starting;
  }

  private dropWorker(): void {
    const worker = this.worker;
    this.worker = null;
    this.workerScope = null;
    this.warmSources.clear();
    try {
      worker?.terminate();
    } catch {
      // Already gone.
    }
  }

  private finish(job: Job): Job {
    if (job.timer) clearTimeout(job.timer);
    this.detachSignal(job);
    if (this.running === job) this.running = null;
    return job;
  }

  private next(): void {
    const job = this.pending;
    if (!job || this.running) return;
    this.pending = null;
    void this.start(job);
  }

  private onMessage(message: RebuildJobResult | RebuildJobError | RebuildJobDimensions): void {
    if (message.type === 'dimensions') {
      for (const listener of [...this.dimensionListeners]) listener(message);
      return;
    }
    const job = this.running;
    if (!job || message.jobId !== job.request.jobId) return; // stale or foreign: dropped
    this.finish(job);
    if (message.type === 'result') {
      this.infraFailures = 0;
      this.warmSources.add(sourceKey(job.request.source));
      if (job.background) markParamEdit('first-build', { kernel: 'browser', detail: { ...message.timings, memoryBytes: message.memoryBytes } });
      job.resolve(message);
    } else {
      job.reject(this.errorOf(job, message));
    }
    this.next();
  }

  private errorOf(job: Job, message: RebuildJobError): BrowserKernelError {
    const source = sourceKey(job.request.source);
    if (message.code === 'memory' || message.code === 'server-only') this.serverOnly.add(source);
    if (message.fatal) {
      this.dropWorker();
      if (message.code !== 'memory') this.infraFailure(message.message);
    }
    // A model error the browser hit is still the server's call: its runtime
    // is the authority, and the edit keeps the last model on screen there too.
    return new BrowserKernelError(message.code, message.message, true);
  }

  private onTimeout(job: Job, timeoutMs: number): void {
    if (this.running !== job) return;
    this.finish(job);
    this.serverOnly.add(sourceKey(job.request.source));
    this.dropWorker();
    this.infraFailure('A browser rebuild ran past its deadline.');
    job.reject(new BrowserKernelError('timeout', `The browser kernel stopped a rebuild that ran longer than ${Math.round(timeoutMs / 1000)} s.`, true));
    this.next();
  }

  private onCrash(reason: string): void {
    const job = this.running;
    this.dropWorker();
    this.infraFailure(reason);
    if (job) {
      this.finish(job);
      job.reject(new BrowserKernelError('crash', `The browser kernel crashed: ${reason}`, true));
    }
    this.next();
  }

  private infraFailure(reason: string): void {
    this.infraFailures += 1;
    console.warn(`[kernelcad] browser kernel: ${reason} — this edit goes to the server.`);
    if (this.infraFailures >= this.options.maxInfraFailures && !this.disabledReason) {
      this.disabledReason = `The browser kernel is off for this page after ${this.infraFailures} failures (last: ${reason}).`;
      this.rejectPending(new BrowserKernelError('unavailable', this.disabledReason, true));
      this.dropWorker();
    }
  }
}
