// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/kernel/browserKernelClient.ts
//
// Main-thread lifecycle client for Studio's kernel worker: warm the worker for
// a source, apply param edits against the warm model, and decide when a source
// is server-only. The worker itself never evaluates code on this thread —
// everything crosses as protocol.ts messages, geometry as transferred bin1.
//
// Timing is enforced by two watchdogs over a build request:
//   - script watchdog (scriptBudgetMs): armed when the build is sent, disarmed
//     by `script-done`. It guards the script phase only — heavy meshing after
//     the script ran is legitimate work, not a hang. A fire terminates the
//     worker and retries the warm once on a fresh worker.
//   - total watchdog (totalBudgetMs): armed for the whole request. It is the
//     only detector of a silently dead worker (Workers have no 'exit'). A fire
//     is terminal: the source fails immediately, with no respawn.
// A worker 'error'/'messageerror' terminates the worker and retries the warm
// once; a second such failure fails the source.
//
// Error taxonomy the callers act on: KernelNotWarmError (warm first),
// KernelSupersededError (a later params replaced this one — no apply),
// KernelDisposedError (dispose interrupted an in-flight warm/params),
// KernelSourceError (this call produced no geometry; its `reason` says whether
// the source is server-only for good or the worker merely crashed/timed out).

import type { MeshBinaryTrailer } from '../../modeling/capture/featureMeshBinary';
import type { Bounds } from '../../modeling/capture/featureMeshing';
import { KERNEL_PROTOCOL_VERSION, type KernelRequest, type KernelResponse } from './protocol';

export type KernelStatus = 'idle' | 'spawning' | 'warming' | 'warm' | 'failed';

/** Why a source stopped being warm. `host-fs`/`script-error` are sticky: the
 *  source needs the server. `crash`/`timeout` describe this worker, not the
 *  source. */
export type KernelFailureReason = 'host-fs' | 'script-error' | 'crash' | 'timeout';

export interface KernelParamsResult {
  payload: Uint8Array;
  trailer?: MeshBinaryTrailer;
  params: unknown;
  featureRecords: unknown[];
  bounds: Bounds;
  failedFeatureIds: string[];
}

export type KernelEvent =
  | { type: 'init'; ms: number }
  | { type: 'build'; ms: number; featureCount: number }
  | { type: 'params'; ms: number; bytes: number }
  | { type: 'fallback'; reason: KernelFailureReason };

export interface BrowserKernel {
  status(): KernelStatus;
  /** Warm the worker for `source`; resolves when warm, rejects when the
   *  source failed or the kernel was disposed. Idempotent for the same source
   *  while warming/warm. A different source re-warms. */
  warm(source: string, fileName: string): Promise<void>;
  /** Apply param edits against the warm model. Throws KernelNotWarmError when
   *  not warm; throws KernelSourceError for host-fs/script-error sources. */
  params(
    edits: Array<{ name: string; value: number | boolean }>,
    have?: Record<string, string>,
  ): Promise<KernelParamsResult>;
  /** Sticky reason this source is server-only; null otherwise. */
  fallbackReason(): KernelFailureReason | null;
  dispose(): void;
}

/** Params was asked for before the kernel is warm (or after dispose). */
export class KernelNotWarmError extends Error {
  readonly status: KernelStatus;
  constructor(status: KernelStatus) {
    super(`browser kernel is '${status}', not warm`);
    this.name = 'KernelNotWarmError';
    this.status = status;
  }
}

/** A later request replaced this one while it was in flight; no apply. */
export class KernelSupersededError extends Error {
  constructor() {
    super('superseded by a later request');
    this.name = 'KernelSupersededError';
  }
}

/** dispose() interrupted this in-flight warm/params request. */
export class KernelDisposedError extends Error {
  constructor() {
    super('browser kernel disposed');
    this.name = 'KernelDisposedError';
  }
}

/** This call produced no geometry. `reason` is the worker/source failure the
 *  caller may act on; `failedFeatureIds` names features when a mesh lost some. */
export class KernelSourceError extends Error {
  readonly reason: KernelFailureReason;
  readonly failedFeatureIds: string[];
  constructor(reason: KernelFailureReason, message: string, failedFeatureIds: string[] = []) {
    super(message);
    this.name = 'KernelSourceError';
    this.reason = reason;
    this.failedFeatureIds = failedFeatureIds;
  }
}

type ResultResponse = Extract<KernelResponse, { type: 'result' }>;
type ErrorResponse = Extract<KernelResponse, { type: 'error' }>;
type BuildRequest = Extract<KernelRequest, { type: 'build' }>;
type Edits = Array<{ name: string; value: number | boolean }>;

interface PendingBuild {
  id: number;
  source: string;
  fileName: string;
  startedAt: number;
  retried: boolean;
  promise: Promise<void>;
  resolve: () => void;
  reject: (err: Error) => void;
}

interface PendingParams {
  id: number;
  startedAt: number;
  resolve: (result: KernelParamsResult) => void;
  reject: (err: Error) => void;
}

/** Server-bridge wording for a mesh that lost features (vite.config.ts's
 *  `/__kernelcad/mesh` handler uses the same). */
const FAILED_FEATURES_MESSAGE = 'one or more features failed to compile';

const now = (): number =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

const failureVerb = (reason: 'crash' | 'timeout'): string =>
  reason === 'timeout' ? 'watchdog fired' : 'worker crashed';

const stickyMessage = (reason: KernelFailureReason): string => {
  if (reason === 'host-fs') return 'source needs host filesystem access; it is server-only';
  if (reason === 'script-error') return 'source failed to run in the browser kernel';
  return `browser kernel ${failureVerb(reason === 'crash' ? 'crash' : 'timeout')}`;
};

class BrowserKernelClient implements BrowserKernel {
  private readonly spawnWorkerFn: () => Worker;
  private readonly scriptBudgetMs: number;
  private readonly totalBudgetMs: number;
  /** Budget for the background WARM build. Longer than an interactive params
   *  budget: warming is off the interaction path, and a heavy gallery model's
   *  cold in-browser build runs for minutes. */
  private readonly buildBudgetMs: number;
  private readonly onEvent: ((event: KernelEvent) => void) | undefined;

  private statusValue: KernelStatus = 'idle';
  private worker: Worker | null = null;
  private sticky: KernelFailureReason | null = null;
  private warmSource: string | null = null;
  private pendingBuild: PendingBuild | null = null;
  private pendingParams: PendingParams | null = null;
  private scriptTimer: ReturnType<typeof setTimeout> | null = null;
  private totalTimer: ReturnType<typeof setTimeout> | null = null;
  private nextId = 1;
  private spawnStartedAt: number | null = null;
  private initEmitted = false;

  constructor(opts: {
    spawn: () => Worker;
    scriptBudgetMs?: number;
    totalBudgetMs?: number;
    /** Background warm-build budget (default 900_000). */
    buildBudgetMs?: number;
    onEvent?: (event: KernelEvent) => void;
  }) {
    this.spawnWorkerFn = opts.spawn;
    this.scriptBudgetMs = opts.scriptBudgetMs ?? 30_000;
    this.totalBudgetMs = opts.totalBudgetMs ?? 300_000;
    this.buildBudgetMs = opts.buildBudgetMs ?? 900_000;
    this.onEvent = opts.onEvent;
  }

  status(): KernelStatus {
    return this.statusValue;
  }

  fallbackReason(): KernelFailureReason | null {
    return this.sticky;
  }

  warm(source: string, fileName: string): Promise<void> {
    if (this.warmSource === source) {
      if (this.statusValue === 'warm' && this.pendingBuild === null) return Promise.resolve();
      if (this.pendingBuild !== null) return this.pendingBuild.promise;
      if (this.sticky !== null) {
        return Promise.reject(new KernelSourceError(this.sticky, stickyMessage(this.sticky)));
      }
    }
    // A different source (or a retry after a non-sticky failure) gets a fresh
    // worker so no state of the old model can leak into the new build.
    this.supersedePending();
    this.terminateWorker();
    this.warmSource = source;
    this.sticky = null;
    this.spawnWorker();
    return this.startBuild(source, fileName);
  }

  params(edits: Edits, have?: Record<string, string>): Promise<KernelParamsResult> {
    if (this.sticky !== null) {
      return Promise.reject(new KernelSourceError(this.sticky, stickyMessage(this.sticky)));
    }
    if (this.statusValue !== 'warm') {
      return Promise.reject(new KernelNotWarmError(this.statusValue));
    }
    if (this.pendingParams !== null) {
      // The earlier caller treats this as "no apply" (Task 9 semantics).
      const superseded = this.pendingParams;
      this.pendingParams = null;
      this.clearTimers();
      superseded.reject(new KernelSupersededError());
    }
    return this.postParams(edits, have);
  }

  dispose(): void {
    const error = new KernelDisposedError();
    this.clearTimers();
    if (this.pendingBuild !== null) {
      const build = this.pendingBuild;
      this.pendingBuild = null;
      build.reject(error);
    }
    if (this.pendingParams !== null) {
      const request = this.pendingParams;
      this.pendingParams = null;
      request.reject(error);
    }
    this.terminateWorker();
    this.statusValue = 'idle';
    this.sticky = null;
    this.warmSource = null;
  }

  private emit(event: KernelEvent): void {
    this.onEvent?.(event);
  }

  private disarmScript(): void {
    if (this.scriptTimer !== null) {
      clearTimeout(this.scriptTimer);
      this.scriptTimer = null;
    }
  }

  private disarmTotal(): void {
    if (this.totalTimer !== null) {
      clearTimeout(this.totalTimer);
      this.totalTimer = null;
    }
  }

  private clearTimers(): void {
    this.disarmScript();
    this.disarmTotal();
  }

  private post(request: KernelRequest): void {
    this.worker?.postMessage(request);
  }

  private terminateWorker(): void {
    if (this.worker !== null) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  private markFailed(reason: KernelFailureReason): void {
    this.statusValue = 'failed';
    this.sticky = reason;
    this.emit({ type: 'fallback', reason });
  }

  private spawnWorker(): void {
    this.statusValue = 'spawning';
    const spawned = this.spawnWorkerFn();
    this.worker = spawned;
    spawned.onmessage = (event: MessageEvent) => {
      this.onWorkerMessage(spawned, event.data as KernelResponse);
    };
    spawned.onerror = (event) => {
      // Dev-facing breadcrumb: without it a worker that fails to load its
      // module (CSP, a failed dev-server transform, a missing asset) is only
      // visible as a silent sticky `crash`.
      if (typeof console !== 'undefined' && typeof console.debug === 'function') {
        console.debug('[kernel] worker error', (event as ErrorEvent)?.message ?? event);
      }
      this.onWorkerFailure(spawned, 'crash');
    };
    spawned.onmessageerror = (event) => {
      if (typeof console !== 'undefined' && typeof console.debug === 'function') {
        console.debug('[kernel] worker message error', event);
      }
      this.onWorkerFailure(spawned, 'crash');
    };
    if (this.spawnStartedAt === null && !this.initEmitted) this.spawnStartedAt = now();
  }

  private armScriptWatchdog(): void {
    this.disarmScript();
    this.scriptTimer = setTimeout(() => {
      this.scriptTimer = null;
      this.handleFailure('timeout');
    }, this.scriptBudgetMs);
  }

  private armTotalWatchdog(budgetMs: number = this.totalBudgetMs): void {
    this.disarmTotal();
    this.totalTimer = setTimeout(() => {
      this.totalTimer = null;
      // A total-watchdog fire is terminal: fail now, no respawn.
      this.handleFailure('timeout', true);
    }, budgetMs);
  }

  private onWorkerMessage(source: Worker, message: KernelResponse): void {
    // A terminated worker's late messages must not touch a replacement.
    if (this.worker !== source) return;
    if (this.pendingBuild !== null && message.id === this.pendingBuild.id) {
      this.onBuildMessage(this.pendingBuild, message);
      return;
    }
    if (this.pendingParams !== null && message.id === this.pendingParams.id) {
      this.onParamsMessage(this.pendingParams, message);
    }
  }

  private onWorkerFailure(source: Worker, reason: 'crash' | 'timeout'): void {
    if (this.worker !== source) return;
    this.handleFailure(reason);
  }

  /** Dispatch a watchdog fire / worker crash to the request it interrupted.
   *  `noRetry` marks a total-watchdog fire: fail the warm immediately. */
  private handleFailure(reason: 'crash' | 'timeout', noRetry = false): void {
    if (this.pendingBuild !== null) {
      this.failBuildAttempt(this.pendingBuild, reason, noRetry);
      return;
    }
    if (this.pendingParams !== null) {
      this.failParamsAttempt(this.pendingParams, reason);
      return;
    }
    this.clearTimers();
    this.terminateWorker();
    if (this.statusValue === 'warm' || this.statusValue === 'warming') this.markFailed(reason);
  }

  private onBuildMessage(build: PendingBuild, message: KernelResponse): void {
    if (message.type === 'script-done') {
      // The script ran; only the total watchdog guards the (legitimate) mesh.
      this.disarmScript();
      return;
    }
    if (message.type === 'result') {
      this.settleBuildResult(build, message);
      return;
    }
    if (message.type === 'error') this.settleBuildError(build, message);
  }

  private settleBuildResult(build: PendingBuild, message: ResultResponse): void {
    this.clearTimers();
    this.pendingBuild = null;
    if (message.failedFeatureIds.length > 0) {
      // The script ran and its model committed, but this warm produced no
      // geometry. Not sticky: the source may still be retried in the browser.
      this.statusValue = 'failed';
      build.reject(
        new KernelSourceError('script-error', FAILED_FEATURES_MESSAGE, message.failedFeatureIds),
      );
      return;
    }
    this.statusValue = 'warm';
    if (!this.initEmitted && this.spawnStartedAt !== null) {
      this.initEmitted = true;
      this.emit({ type: 'init', ms: Math.max(0, now() - this.spawnStartedAt) });
      this.spawnStartedAt = null;
    }
    this.emit({
      type: 'build',
      ms: Math.max(0, now() - build.startedAt),
      featureCount: message.featureRecords.length,
    });
    build.resolve();
  }

  private settleBuildError(build: PendingBuild, message: ErrorResponse): void {
    this.clearTimers();
    this.pendingBuild = null;
    // Dev-facing breadcrumb: a failed warm silently becomes a sticky server
    // fallback, so the reason must be visible somewhere.
    if (typeof console !== 'undefined' && typeof console.debug === 'function') {
      console.debug('[kernel] build failed', message.code, message.message);
    }
    if (message.code === 'host-fs-unavailable') {
      this.markFailed('host-fs');
      build.reject(new KernelSourceError('host-fs', message.message, message.failedFeatureIds ?? []));
      return;
    }
    // The host-fs branch above wins even if it carried failedFeatureIds (which
    // today's core never sends); only script-error splits sticky vs per-call.
    if (message.code === 'script-error' && (message.failedFeatureIds?.length ?? 0) === 0) {
      this.markFailed('script-error');
      build.reject(new KernelSourceError('script-error', message.message));
      return;
    }
    if (message.code === 'script-error') {
      // Failed features, not a failed script: per-call, not sticky.
      this.statusValue = 'failed';
      build.reject(
        new KernelSourceError('script-error', message.message, message.failedFeatureIds ?? []),
      );
      return;
    }
    // worker-error: the worker's internal state is broken — treat like a crash.
    this.terminateWorker();
    this.markFailed('crash');
    build.reject(new KernelSourceError('crash', message.message));
  }

  private failBuildAttempt(build: PendingBuild, reason: 'crash' | 'timeout', noRetry = false): void {
    this.clearTimers();
    this.terminateWorker();
    if (!noRetry && !build.retried) {
      build.retried = true;
      this.spawnWorker();
      this.postBuildAttempt(build);
      return;
    }
    this.pendingBuild = null;
    this.markFailed(reason);
    build.reject(new KernelSourceError(reason, `browser kernel ${failureVerb(reason)} during warm`));
  }

  private onParamsMessage(request: PendingParams, message: KernelResponse): void {
    if (message.type === 'error') {
      this.settleParamsError(request, message);
      return;
    }
    if (message.type === 'result') this.settleParamsResult(request, message);
  }

  private settleParamsResult(request: PendingParams, message: ResultResponse): void {
    this.clearTimers();
    this.pendingParams = null;
    if (message.failedFeatureIds.length > 0) {
      // Per-call: the kernel stays warm and a later edit may fix the feature.
      request.reject(
        new KernelSourceError('script-error', FAILED_FEATURES_MESSAGE, message.failedFeatureIds),
      );
      return;
    }
    this.emit({
      type: 'params',
      ms: Math.max(0, now() - request.startedAt),
      bytes: message.payload.byteLength,
    });
    request.resolve({
      payload: message.payload,
      ...(message.trailer !== undefined ? { trailer: message.trailer } : {}),
      params: message.params,
      featureRecords: message.featureRecords,
      bounds: message.bounds,
      failedFeatureIds: message.failedFeatureIds,
    });
  }

  private settleParamsError(request: PendingParams, message: ErrorResponse): void {
    this.clearTimers();
    this.pendingParams = null;
    if (message.code === 'worker-error') {
      this.terminateWorker();
      this.markFailed('crash');
      request.reject(new KernelSourceError('crash', message.message));
      return;
    }
    const reason: KernelFailureReason =
      message.code === 'host-fs-unavailable' ? 'host-fs' : 'script-error';
    if ((message.failedFeatureIds?.length ?? 0) > 0) {
      // Failed features are per-call: the kernel stays warm.
      request.reject(new KernelSourceError(reason, message.message, message.failedFeatureIds));
      return;
    }
    this.markFailed(reason);
    request.reject(new KernelSourceError(reason, message.message));
  }

  private failParamsAttempt(request: PendingParams, reason: 'crash' | 'timeout'): void {
    this.clearTimers();
    this.terminateWorker();
    this.pendingParams = null;
    this.markFailed(reason);
    request.reject(
      new KernelSourceError(reason, `browser kernel ${failureVerb(reason)} during params`),
    );
  }

  private postBuildAttempt(build: PendingBuild): void {
    build.startedAt = now();
    this.statusValue = 'warming';
    const request: BuildRequest = {
      v: KERNEL_PROTOCOL_VERSION,
      id: build.id,
      type: 'build',
      source: build.source,
      fileName: build.fileName,
    };
    this.post(request);
    this.armScriptWatchdog();
    this.armTotalWatchdog(this.buildBudgetMs);
  }

  private startBuild(source: string, fileName: string): Promise<void> {
    let resolve!: () => void;
    let reject!: (err: Error) => void;
    const promise = new Promise<void>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    const build: PendingBuild = {
      id: this.nextId++,
      source,
      fileName,
      startedAt: now(),
      retried: false,
      promise,
      resolve,
      reject,
    };
    this.pendingBuild = build;
    this.postBuildAttempt(build);
    return promise;
  }

  /** A new source (or an explicit re-warm) replaces whatever is in flight. */
  private supersedePending(): void {
    this.clearTimers();
    if (this.pendingBuild !== null) {
      const build = this.pendingBuild;
      this.pendingBuild = null;
      build.reject(new KernelSupersededError());
    }
    if (this.pendingParams !== null) {
      const request = this.pendingParams;
      this.pendingParams = null;
      request.reject(new KernelSupersededError());
    }
  }

  private postParams(edits: Edits, have?: Record<string, string>): Promise<KernelParamsResult> {
    let resolve!: (result: KernelParamsResult) => void;
    let reject!: (err: Error) => void;
    const promise = new Promise<KernelParamsResult>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    const request: PendingParams = { id: this.nextId++, startedAt: now(), resolve, reject };
    this.pendingParams = request;
    this.post({
      v: KERNEL_PROTOCOL_VERSION,
      id: request.id,
      type: 'params',
      edits,
      ...(have !== undefined ? { have } : {}),
    });
    // No script phase in a params request: the total watchdog alone guards it.
    this.armTotalWatchdog();
    return promise;
  }
}

export function createBrowserKernel(opts: {
  spawn: () => Worker;
  scriptBudgetMs?: number;
  totalBudgetMs?: number;
  /** Background warm-build budget (default 900_000). */
  buildBudgetMs?: number;
  onEvent?: (event: KernelEvent) => void;
}): BrowserKernel {
  return new BrowserKernelClient(opts);
}
