// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/rebuild/rebuildQueue.ts
//
// Main-thread scheduler for the Studio rebuilds. It hands the mesh fetches to
// the rebuild worker, keeps the number of in-flight fetches bounded and
// publishes a live list of the running and queued rebuilds the UI can show.
//
// Two rules shape the queue:
//   - a rebuild of a document supersedes the older rebuild of the SAME
//     document (the older result would be stale anyway), and
//   - a rebuild never blocks the UI thread: the fetch, the JSON parse and the
//     packing of the numeric arrays happen in the worker.

import type {
  RebuildFetchInit,
  RebuildWorkerRequest,
  RebuildWorkerResponse,
} from './rebuildProtocol';

/** Moves protocol messages to and from wherever the worker logic runs. */
export interface RebuildTransport {
  post(message: RebuildWorkerRequest): void;
  /** Register the single response listener. */
  listen(onMessage: (message: RebuildWorkerResponse) => void, onCrash: (reason: string) => void): void;
  /** Tear down (e.g. terminate the Worker). Optional. */
  dispose?(): void;
}

/** The answer of a rebuild fetch, flattened for the caller. */
export interface OffThreadResponse {
  ok: boolean;
  status: number;
  statusText: string;
  retryAfter: string | null;
  body: unknown;
}

export type RebuildJobState = 'queued' | 'running';

/** One rebuild as the UI sees it. */
export interface RebuildJobView {
  id: number;
  doc: string;
  label: string;
  state: RebuildJobState;
  queuedAt: number;
  startedAt: number | null;
}

/** The last thing that went wrong, so the UI can show it. */
export interface RebuildErrorView {
  label: string;
  message: string;
  at: number;
}

/** The published state: the live job list plus the last error. */
export interface RebuildSnapshot {
  jobs: readonly RebuildJobView[];
  lastError: RebuildErrorView | null;
}

/**
 * Rejection for a rebuild a newer rebuild of the same document replaced.
 * name is 'AbortError' so existing `isAbortError` checks treat it as a cancel.
 */
export class RebuildSupersededError extends Error {
  readonly superseded = true;

  constructor(label: string) {
    super(`The rebuild "${label}" was replaced by a newer rebuild.`);
    this.name = 'AbortError';
  }
}

export interface RebuildQueueOptions {
  /** Called lazily on the first fetch job; called again after a crash. */
  createTransport: () => RebuildTransport;
  maxConcurrent?: number;
  now?: () => number;
}

type Listener = () => void;

interface JobBase {
  id: number;
  /** The document this rebuild belongs to; null when it has none. */
  doc: string | null;
  /** Edit order within the document (the Studio passes its model revision). */
  generation?: number;
  label: string;
  queuedAt: number;
  settled: boolean;
}

interface FetchJob extends JobBase {
  kind: 'fetch';
  state: RebuildJobState;
  startedAt: number | null;
  url: string;
  init?: RebuildFetchInit;
  /** False for speculative reads (a cache miss is not a failed rebuild). */
  reportErrors: boolean;
  resolve: (response: OffThreadResponse) => void;
  reject: (error: unknown) => void;
  callerSignal?: AbortSignal;
  callerAbort?: () => void;
}

interface TrackedJob extends JobBase {
  kind: 'tracked';
  state: 'running';
  startedAt: number;
  controller: AbortController;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
}

type QueueJob = FetchJob | TrackedJob;

type DoneMessage = Extract<RebuildWorkerResponse, { type: 'done' }>;
type FailedMessage = Extract<RebuildWorkerResponse, { type: 'failed' }>;

function abortError(message: string): Error {
  const error = new Error(message);
  error.name = 'AbortError';
  return error;
}

function isAbortError(error: unknown): boolean {
  return !!error && typeof error === 'object' && (error as { name?: unknown }).name === 'AbortError';
}

function errorText(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}

/** The server's own error message when it sent one, the status otherwise. */
function errorTextFromBody(body: unknown, status: number): string {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const error = (body as { error?: unknown }).error;
    if (typeof error === 'string' && error) return error;
  }
  return `HTTP ${status}`;
}

function byId(a: RebuildJobView, b: RebuildJobView): number {
  return a.id - b.id;
}

export class RebuildQueue {
  private readonly createTransport: () => RebuildTransport;
  private readonly maxConcurrent: number;
  private readonly now: () => number;
  private readonly jobs = new Map<number, QueueJob>();
  private readonly listeners = new Set<Listener>();
  private readonly latestGeneration = new Map<string, number>();
  private transport: RebuildTransport | null = null;
  private transportError: Error | null = null;
  private lastError: RebuildErrorView | null = null;
  private snapshot: RebuildSnapshot = RebuildQueue.emptySnapshot();
  private nextId = 1;
  private disposed = false;

  constructor(options: RebuildQueueOptions) {
    this.createTransport = options.createTransport;
    this.maxConcurrent = Math.max(1, options.maxConcurrent ?? 2);
    this.now = options.now ?? Date.now;
  }

  /** Fetch + parse a JSON (mesh) response off the UI thread. */
  fetchJson(request: {
    url: string;
    init?: RebuildFetchInit;
    label: string;
    doc?: string;
    generation?: number;
    signal?: AbortSignal;
    /** Default true. False keeps a failure out of the UI's last error;
     *  the caller still gets the response / rejection. */
    reportErrors?: boolean;
  }): Promise<OffThreadResponse> {
    if (request.signal?.aborted) {
      return Promise.reject(abortError('The rebuild request was cancelled.'));
    }
    if (this.disposed) {
      return Promise.reject(new Error('The rebuild queue was disposed.'));
    }
    const late = this.admit(request.doc, request.generation, request.label);
    if (late) return Promise.reject(late);
    return new Promise<OffThreadResponse>((resolve, reject) => {
      const job = this.createFetchJob(request, resolve, reject);
      this.supersedeDoc(job.doc, job.generation);
      this.jobs.set(job.id, job);
      this.watchCallerSignal(job, request.signal);
      this.pump();
      this.publish();
    });
  }

  /**
   * Show work that runs elsewhere (e.g. the in-browser kernel worker) in the
   * list, with the same per-document supersession. `run` gets an AbortSignal
   * that fires when superseded.
   */
  track<T>(
    request: { label: string; doc?: string; generation?: number },
    run: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    if (this.disposed) {
      return Promise.reject(new Error('The rebuild queue was disposed.'));
    }
    const late = this.admit(request.doc, request.generation, request.label);
    if (late) return Promise.reject(late);
    const doc = request.doc ?? null;
    return new Promise<T>((resolve, reject) => {
      const job: TrackedJob = {
        kind: 'tracked',
        id: this.nextId++,
        doc,
        ...(request.generation !== undefined ? { generation: request.generation } : {}),
        label: request.label,
        state: 'running',
        queuedAt: this.now(),
        startedAt: this.now(),
        controller: new AbortController(),
        resolve: resolve as unknown as (value: unknown) => void,
        reject,
        settled: false,
      };
      this.supersedeDoc(doc, request.generation);
      this.jobs.set(job.id, job);
      this.publish();
      this.runTracked(job, run);
    });
  }

  /** Forget the last error (the user dismissed it). */
  clearError(): void {
    if (!this.lastError) return;
    this.lastError = null;
    this.publish();
  }

  /** Record an error the UI should show (e.g. a rebuild whose result failed to apply). */
  reportError(label: string, message: string): void {
    this.setLastError(label, message);
    this.publish();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): RebuildSnapshot {
    return this.snapshot;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const error = abortError('The rebuild queue was disposed.');
    for (const job of [...this.jobs.values()]) {
      this.cancelJob(job, error);
    }
    this.disposeTransport();
    this.publish();
  }

  private static emptySnapshot(): RebuildSnapshot {
    return Object.freeze({ jobs: Object.freeze([] as RebuildJobView[]), lastError: null });
  }

  private createFetchJob(
    request: { url: string; init?: RebuildFetchInit; label: string; doc?: string; generation?: number; reportErrors?: boolean },
    resolve: (response: OffThreadResponse) => void,
    reject: (error: unknown) => void,
  ): FetchJob {
    return {
      kind: 'fetch',
      id: this.nextId++,
      doc: request.doc ?? null,
      ...(request.generation !== undefined ? { generation: request.generation } : {}),
      label: request.label,
      state: 'queued',
      queuedAt: this.now(),
      startedAt: null,
      url: request.url,
      init: request.init,
      reportErrors: request.reportErrors !== false,
      resolve,
      reject,
      settled: false,
    };
  }

  /**
   * A request from an older edit that arrives after a newer one started (a
   * delayed retry, a second leg) must not cancel the newer rebuild: it is
   * refused as superseded instead. Returns that refusal, or null to admit.
   */
  private admit(doc: string | undefined, generation: number | undefined, label: string): Error | null {
    if (!doc || generation === undefined) return null;
    const latest = this.latestGeneration.get(doc);
    if (latest !== undefined && generation < latest) return new RebuildSupersededError(label);
    this.latestGeneration.set(doc, generation);
    return null;
  }

  /** Cancel every older job of the same document. Jobs of the same edit
   *  (equal generation) are its own legs and stay. */
  private supersedeDoc(doc: string | null, generation?: number): void {
    if (!doc) return;
    for (const job of [...this.jobs.values()]) {
      if (job.doc !== doc) continue;
      if (generation !== undefined && job.generation !== undefined && job.generation >= generation) continue;
      this.cancelJob(job, new RebuildSupersededError(job.label));
    }
  }

  /** True when the job was still open and got cancelled. */
  private cancelJob(job: QueueJob, error: Error): boolean {
    if (job.settled) return false;
    if (job.kind === 'fetch') {
      this.finishFetchJob(job);
      if (job.state === 'running') this.postCancel(job.id);
      job.reject(error);
      return true;
    }
    job.settled = true;
    this.jobs.delete(job.id);
    job.controller.abort(error);
    job.reject(error);
    return true;
  }

  private finishFetchJob(job: FetchJob): void {
    job.settled = true;
    this.jobs.delete(job.id);
    this.detachCallerSignal(job);
  }

  private watchCallerSignal(job: FetchJob, signal: AbortSignal | undefined): void {
    if (!signal) return;
    const onAbort = (): void => {
      if (this.cancelJob(job, abortError('The rebuild request was cancelled.'))) this.publish();
    };
    job.callerSignal = signal;
    job.callerAbort = onAbort;
    signal.addEventListener('abort', onAbort, { once: true });
  }

  private detachCallerSignal(job: FetchJob): void {
    if (!job.callerSignal || !job.callerAbort) return;
    job.callerSignal.removeEventListener('abort', job.callerAbort);
    job.callerSignal = undefined;
    job.callerAbort = undefined;
  }

  /** Start queued fetch jobs while a slot is free. */
  private pump(): void {
    if (this.disposed) return;
    while (this.runningFetchCount() < this.maxConcurrent) {
      const next = this.nextQueuedFetch();
      if (!next) break;
      this.startFetchJob(next);
    }
  }

  private runningFetchCount(): number {
    let count = 0;
    for (const job of this.jobs.values()) {
      if (job.kind === 'fetch' && job.state === 'running') count += 1;
    }
    return count;
  }

  private nextQueuedFetch(): FetchJob | null {
    for (const job of this.jobs.values()) {
      if (job.kind === 'fetch' && job.state === 'queued') return job;
    }
    return null;
  }

  private startFetchJob(job: FetchJob): void {
    job.state = 'running';
    job.startedAt = this.now();
    const transport = this.ensureTransport();
    if (!transport) {
      this.failFetchJob(job, this.transportError ?? new Error('The rebuild worker could not be created.'));
      return;
    }
    transport.post({ type: 'fetch', jobId: job.id, url: job.url, init: job.init });
  }

  private ensureTransport(): RebuildTransport | null {
    if (this.transport) return this.transport;
    this.transportError = null;
    try {
      const created = this.createTransport();
      created.listen(
        (message) => { this.handleMessage(message); },
        (reason) => { this.handleCrash(reason); },
      );
      this.transport = created;
      return created;
    } catch (error) {
      this.transportError = error instanceof Error ? error : new Error(String(error));
      return null;
    }
  }

  private disposeTransport(): void {
    const transport = this.transport;
    this.transport = null;
    try {
      transport?.dispose?.();
    } catch {
      // A transport that fails to tear down must not break the queue.
    }
  }

  private postCancel(jobId: number): void {
    try {
      this.transport?.post({ type: 'cancel', jobId });
    } catch {
      // The job is settled either way.
    }
  }

  private handleMessage(message: RebuildWorkerResponse): void {
    if (message.type === 'done') {
      this.handleDone(message);
      return;
    }
    if (message.type === 'failed') {
      this.handleFailed(message);
    }
  }

  private handleDone(message: DoneMessage): void {
    const job = this.jobs.get(message.jobId);
    if (!job || job.kind !== 'fetch' || job.settled) return;
    this.finishFetchJob(job);
    if (message.ok) {
      this.lastError = null;
    } else {
      if (job.reportErrors) this.setLastError(job.label, errorTextFromBody(message.body, message.status));
    }
    this.pump();
    this.publish();
    job.resolve({
      ok: message.ok,
      status: message.status,
      statusText: message.statusText,
      retryAfter: message.retryAfter,
      body: message.body,
    });
  }

  private handleFailed(message: FailedMessage): void {
    const job = this.jobs.get(message.jobId);
    if (!job || job.kind !== 'fetch' || job.settled) return;
    this.finishFetchJob(job);
    const error = new Error(message.message);
    if (message.aborted) {
      error.name = 'AbortError';
    } else if (job.reportErrors) {
      this.setLastError(job.label, message.message);
    }
    this.pump();
    this.publish();
    job.reject(error);
  }

  private failFetchJob(job: FetchJob, error: Error): void {
    if (job.settled) return;
    this.finishFetchJob(job);
    this.setLastError(job.label, error.message);
    this.publish();
    job.reject(error);
  }

  private handleCrash(reason: string): void {
    const message = `Rebuild worker crashed: ${reason}`;
    const failed: FetchJob[] = [];
    for (const job of this.jobs.values()) {
      if (job.kind === 'fetch') failed.push(job);
    }
    for (const job of failed) {
      this.finishFetchJob(job);
      job.reject(new Error(message));
    }
    this.setLastError(failed[0]?.label ?? 'Rebuild worker', message);
    this.disposeTransport();
    this.publish();
  }

  private runTracked<T>(job: TrackedJob, run: (signal: AbortSignal) => Promise<T>): void {
    let result: Promise<T>;
    try {
      result = run(job.controller.signal);
    } catch (error) {
      this.failTrackedJob(job, error);
      return;
    }
    Promise.resolve(result).then(
      (value) => { this.resolveTrackedJob(job, value); },
      (error) => { this.failTrackedJob(job, error); },
    );
  }

  private resolveTrackedJob(job: TrackedJob, value: unknown): void {
    if (job.settled) return;
    job.settled = true;
    this.jobs.delete(job.id);
    this.lastError = null;
    this.publish();
    job.resolve(value);
  }

  private failTrackedJob(job: TrackedJob, error: unknown): void {
    if (job.settled) return;
    job.settled = true;
    this.jobs.delete(job.id);
    if (!isAbortError(error)) {
      this.setLastError(job.label, errorText(error));
    }
    this.publish();
    job.reject(error);
  }

  private setLastError(label: string, message: string): void {
    this.lastError = Object.freeze({ label, message, at: this.now() });
  }

  /** Rebuild the published state and tell the listeners. */
  private publish(): void {
    this.snapshot = Object.freeze({
      jobs: Object.freeze(this.buildViews()),
      lastError: this.lastError,
    });
    for (const listener of [...this.listeners]) listener();
  }

  /** Running jobs first, then the queued ones; each group by id. */
  private buildViews(): RebuildJobView[] {
    const running: RebuildJobView[] = [];
    const queued: RebuildJobView[] = [];
    for (const job of this.jobs.values()) {
      const view = this.toView(job);
      if (job.state === 'running') running.push(view);
      else queued.push(view);
    }
    running.sort(byId);
    queued.sort(byId);
    return [...running, ...queued];
  }

  private toView(job: QueueJob): RebuildJobView {
    return Object.freeze({
      id: job.id,
      doc: job.doc ?? '',
      label: job.label,
      state: job.state,
      queuedAt: job.queuedAt,
      startedAt: job.startedAt,
    });
  }
}
