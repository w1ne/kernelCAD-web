// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it, vi } from 'vitest';
import { RebuildQueue, RebuildSupersededError } from './rebuildQueue';
import type { RebuildWorkerRequest, RebuildWorkerResponse } from './rebuildProtocol';

type FetchRequest = Extract<RebuildWorkerRequest, { type: 'fetch' }>;
type CancelRequest = Extract<RebuildWorkerRequest, { type: 'cancel' }>;

/** An in-memory transport: it records what was posted and lets the test
 *  answer with a worker message or a crash. */
class FakeTransport {
  readonly posted: RebuildWorkerRequest[] = [];
  disposed = false;
  private onMessage: ((message: RebuildWorkerResponse) => void) | null = null;
  private onCrash: ((reason: string) => void) | null = null;

  post(message: RebuildWorkerRequest): void {
    this.posted.push(message);
  }

  listen(onMessage: (message: RebuildWorkerResponse) => void, onCrash: (reason: string) => void): void {
    this.onMessage = onMessage;
    this.onCrash = onCrash;
  }

  dispose(): void {
    this.disposed = true;
  }

  emit(message: RebuildWorkerResponse): void {
    this.onMessage?.(message);
  }

  crash(reason: string): void {
    this.onCrash?.(reason);
  }

  fetches(): FetchRequest[] {
    return this.posted.filter((m): m is FetchRequest => m.type === 'fetch');
  }

  cancels(): CancelRequest[] {
    return this.posted.filter((m): m is CancelRequest => m.type === 'cancel');
  }
}

function done(jobId: number, body: unknown = null): RebuildWorkerResponse {
  return { type: 'done', jobId, ok: true, status: 200, statusText: 'OK', retryAfter: null, body };
}

describe('rebuild queue supersession', () => {
  it('refuses a late request from an older edit instead of cancelling the newer rebuild', async () => {
    const transport = new FakeTransport();
    const queue = new RebuildQueue({ createTransport: () => transport });

    const newer = queue.fetchJson({ url: '/edit-2', label: 'Edit 2', doc: 'doc-g', generation: 2 });
    // Edit 1's delayed retry (or second leg) arrives after edit 2 started.
    const late = queue.fetchJson({ url: '/edit-1-retry', label: 'Edit 1', doc: 'doc-g', generation: 1 });

    await expect(late).rejects.toBeInstanceOf(RebuildSupersededError);
    expect(transport.fetches().map((f) => f.url)).not.toContain('/edit-1-retry');
    expect(transport.cancels()).toHaveLength(0);

    transport.emit(done(transport.fetches()[0].jobId, { features: [] }));
    await expect(newer).resolves.toMatchObject({ ok: true });
  });

  it('lets the legs of one edit (same generation) run without cancelling each other', async () => {
    const transport = new FakeTransport();
    const queue = new RebuildQueue({ createTransport: () => transport });

    const coarse = queue.fetchJson({ url: '/coarse', label: 'Preview', doc: 'doc-h', generation: 5 });
    const display = queue.fetchJson({ url: '/display', label: 'Model', doc: 'doc-h', generation: 5 });
    expect(transport.cancels()).toHaveLength(0);
    const [first, second] = transport.fetches();
    transport.emit(done(first.jobId));
    transport.emit(done(second.jobId));
    await expect(coarse).resolves.toMatchObject({ ok: true });
    await expect(display).resolves.toMatchObject({ ok: true });

    // A newer edit still supersedes.
    const old = queue.fetchJson({ url: '/old', label: 'Old', doc: 'doc-h', generation: 5 });
    const fresh = queue.fetchJson({ url: '/fresh', label: 'Fresh', doc: 'doc-h', generation: 6 });
    await expect(old).rejects.toBeInstanceOf(RebuildSupersededError);
    transport.emit(done(transport.fetches().at(-1)!.jobId));
    await expect(fresh).resolves.toMatchObject({ ok: true });
  });

  it('cancels the older rebuild of the same document and keeps the newer one', async () => {
    const transport = new FakeTransport();
    const queue = new RebuildQueue({ createTransport: () => transport });

    const first = queue.fetchJson({ url: '/mesh-a', label: 'First', doc: 'doc-1' });
    const second = queue.fetchJson({ url: '/mesh-b', label: 'Second', doc: 'doc-1' });

    await expect(first).rejects.toBeInstanceOf(RebuildSupersededError);
    await expect(first).rejects.toMatchObject({ name: 'AbortError' });

    const fetches = transport.fetches();
    expect(fetches.map((f) => f.url)).toEqual(['/mesh-a', '/mesh-b']);
    expect(transport.cancels().map((c) => c.jobId)).toEqual([fetches[0].jobId]);

    const jobs = queue.getSnapshot().jobs;
    expect(jobs).toHaveLength(1);
    expect(jobs[0].label).toBe('Second');
    expect(jobs[0].state).toBe('running');
    expect(jobs[0].doc).toBe('doc-1');

    // A late answer for the cancelled job is ignored.
    transport.emit(done(fetches[0].jobId));
    await expect(first).rejects.toBeInstanceOf(RebuildSupersededError);

    transport.emit(done(fetches[1].jobId, { features: [] }));
    await expect(second).resolves.toMatchObject({ ok: true, status: 200 });
    expect(queue.getSnapshot().jobs).toHaveLength(0);
  });

  it('never posts a queued rebuild that a newer one of the same document replaced', async () => {
    const transport = new FakeTransport();
    const queue = new RebuildQueue({ createTransport: () => transport, maxConcurrent: 1 });

    // The single slot is taken by another document, so both rebuilds of
    // 'doc-a' wait in the queue.
    const blocking = queue.fetchJson({ url: '/block', label: 'Block', doc: 'doc-other' });
    const queued = queue.fetchJson({ url: '/a1', label: 'A1', doc: 'doc-a' });
    const newest = queue.fetchJson({ url: '/a2', label: 'A2', doc: 'doc-a' });

    await expect(queued).rejects.toBeInstanceOf(RebuildSupersededError);
    expect(transport.fetches().map((f) => f.url)).toEqual(['/block']);
    expect(transport.cancels()).toHaveLength(0);

    const jobs = queue.getSnapshot().jobs;
    expect(jobs.map((j) => j.label)).toEqual(['Block', 'A2']);
    expect(jobs.map((j) => j.state)).toEqual(['running', 'queued']);

    transport.emit(done(transport.fetches()[0].jobId));
    await expect(blocking).resolves.toMatchObject({ ok: true });
    expect(transport.fetches().map((f) => f.url)).toEqual(['/block', '/a2']);

    transport.emit(done(transport.fetches()[1].jobId));
    await expect(newest).resolves.toMatchObject({ ok: true });
  });

  it('leaves other documents and document-less rebuilds alone', async () => {
    const transport = new FakeTransport();
    const queue = new RebuildQueue({ createTransport: () => transport, maxConcurrent: 4 });

    const a = queue.fetchJson({ url: '/a', label: 'A', doc: 'doc-a' });
    const b = queue.fetchJson({ url: '/b', label: 'B', doc: 'doc-b' });
    const c = queue.fetchJson({ url: '/c', label: 'C' });

    expect(transport.cancels()).toHaveLength(0);
    const fetches = transport.fetches();
    expect(fetches).toHaveLength(3);

    for (const fetch of fetches) transport.emit(done(fetch.jobId));
    await expect(a).resolves.toMatchObject({ ok: true });
    await expect(b).resolves.toMatchObject({ ok: true });
    await expect(c).resolves.toMatchObject({ ok: true });
  });

  it('runs at most maxConcurrent fetches and queues the rest', async () => {
    const transport = new FakeTransport();
    const queue = new RebuildQueue({ createTransport: () => transport, maxConcurrent: 1 });

    const first = queue.fetchJson({ url: '/1', label: 'First' });
    const second = queue.fetchJson({ url: '/2', label: 'Second' });

    expect(transport.fetches()).toHaveLength(1);
    const jobs = queue.getSnapshot().jobs;
    expect(jobs.map((j) => j.label)).toEqual(['First', 'Second']);
    expect(jobs.map((j) => j.state)).toEqual(['running', 'queued']);
    expect(jobs[1].startedAt).toBeNull();

    transport.emit(done(transport.fetches()[0].jobId));
    await expect(first).resolves.toMatchObject({ ok: true });
    expect(transport.fetches()).toHaveLength(2);

    transport.emit(done(transport.fetches()[1].jobId));
    await expect(second).resolves.toMatchObject({ ok: true });
  });
});

describe('rebuild queue cancellation', () => {
  it('cancels a running rebuild when the caller aborts', async () => {
    const transport = new FakeTransport();
    const queue = new RebuildQueue({ createTransport: () => transport });
    const controller = new AbortController();

    const promise = queue.fetchJson({ url: '/x', label: 'X', signal: controller.signal });
    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(transport.cancels()).toHaveLength(1);
    expect(queue.getSnapshot().jobs).toHaveLength(0);
  });

  it('rejects right away when the caller signal is already aborted', async () => {
    const transport = new FakeTransport();
    const queue = new RebuildQueue({ createTransport: () => transport });
    const controller = new AbortController();
    controller.abort();

    await expect(
      queue.fetchJson({ url: '/y', label: 'Y', signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(transport.posted).toHaveLength(0);
  });
});

describe('rebuild queue errors', () => {
  it('reports a failed rebuild and keeps its message', async () => {
    const transport = new FakeTransport();
    const queue = new RebuildQueue({ createTransport: () => transport });

    const promise = queue.fetchJson({ url: '/e', label: 'E' });
    transport.emit({ type: 'failed', jobId: transport.fetches()[0].jobId, message: 'network down', aborted: false });

    await expect(promise).rejects.toThrow('network down');
    expect(queue.getSnapshot().lastError?.message).toBe('network down');
    expect(queue.getSnapshot().lastError?.label).toBe('E');
    expect(queue.getSnapshot().jobs).toHaveLength(0);
  });

  it('resolves an HTTP error but reports the server message', async () => {
    const transport = new FakeTransport();
    const queue = new RebuildQueue({ createTransport: () => transport });

    const promise = queue.fetchJson({ url: '/e', label: 'E' });
    transport.emit({
      type: 'done',
      jobId: transport.fetches()[0].jobId,
      ok: false,
      status: 500,
      statusText: 'Server Error',
      retryAfter: '7',
      body: { error: 'bad mesh' },
    });

    const response = await promise;
    expect(response.ok).toBe(false);
    expect(response.status).toBe(500);
    expect(response.retryAfter).toBe('7');
    expect(queue.getSnapshot().lastError?.message).toBe('bad mesh');
  });

  it('falls back to the HTTP status when the server sent no message', async () => {
    const transport = new FakeTransport();
    const queue = new RebuildQueue({ createTransport: () => transport });

    const promise = queue.fetchJson({ url: '/e', label: 'E' });
    transport.emit({
      type: 'done',
      jobId: transport.fetches()[0].jobId,
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      retryAfter: null,
      body: { detail: 'no message' },
    });

    await promise;
    expect(queue.getSnapshot().lastError?.message).toBe('HTTP 502');
  });

  it('clears the last error when a rebuild succeeds', async () => {
    const transport = new FakeTransport();
    const queue = new RebuildQueue({ createTransport: () => transport });

    const failed = queue.fetchJson({ url: '/1', label: 'First' });
    transport.emit({ type: 'failed', jobId: transport.fetches()[0].jobId, message: 'boom', aborted: false });
    await expect(failed).rejects.toThrow('boom');
    expect(queue.getSnapshot().lastError).not.toBeNull();

    const ok = queue.fetchJson({ url: '/2', label: 'Second' });
    transport.emit(done(transport.fetches()[1].jobId));
    await expect(ok).resolves.toMatchObject({ ok: true });
    expect(queue.getSnapshot().lastError).toBeNull();
  });
});

describe('rebuild queue crash', () => {
  it('rejects the running and the queued rebuilds and starts a new transport', async () => {
    const transports: FakeTransport[] = [];
    const queue = new RebuildQueue({
      createTransport: () => {
        const transport = new FakeTransport();
        transports.push(transport);
        return transport;
      },
      maxConcurrent: 1,
    });

    const running = queue.fetchJson({ url: '/1', label: 'One' });
    const queued = queue.fetchJson({ url: '/2', label: 'Two' });

    transports[0].crash('worker gone');

    await expect(running).rejects.toThrow('Rebuild worker crashed: worker gone');
    await expect(queued).rejects.toThrow('Rebuild worker crashed: worker gone');
    expect(queue.getSnapshot().lastError?.message).toContain('Rebuild worker crashed');
    expect(queue.getSnapshot().jobs).toHaveLength(0);
    expect(transports[0].disposed).toBe(true);

    const next = queue.fetchJson({ url: '/3', label: 'Three' });
    expect(transports).toHaveLength(2);
    transports[1].emit(done(transports[1].fetches()[0].jobId));
    await expect(next).resolves.toMatchObject({ ok: true });
  });
});

describe('rebuild queue tracked work', () => {
  it('shows a tracked rebuild while it runs', async () => {
    const queue = new RebuildQueue({ createTransport: () => new FakeTransport() });
    const holder: { resolve?: (value: string) => void } = {};

    const promise = queue.track({ label: 'Kernel', doc: 'doc-1' }, () => new Promise<string>((resolve) => {
      holder.resolve = resolve;
    }));

    const jobs = queue.getSnapshot().jobs;
    expect(jobs).toHaveLength(1);
    expect(jobs[0].label).toBe('Kernel');
    expect(jobs[0].state).toBe('running');
    expect(jobs[0].doc).toBe('doc-1');

    holder.resolve!('value');
    await expect(promise).resolves.toBe('value');
    expect(queue.getSnapshot().jobs).toHaveLength(0);
  });

  it('aborts and rejects a tracked rebuild a newer one replaced', async () => {
    const queue = new RebuildQueue({ createTransport: () => new FakeTransport() });
    const signals: AbortSignal[] = [];

    const first = queue.track({ label: 'First', doc: 'doc-2' }, (signal) => {
      signals.push(signal);
      return new Promise<never>(() => { /* never settles */ });
    });
    const second = queue.track({ label: 'Second', doc: 'doc-2' }, () => new Promise<never>(() => { /* never settles */ }));
    void second;

    await expect(first).rejects.toBeInstanceOf(RebuildSupersededError);
    expect(signals[0].aborted).toBe(true);
    expect(queue.getSnapshot().jobs.map((j) => j.label)).toEqual(['Second']);
  });

  it('reports the error of a tracked rebuild that failed', async () => {
    const queue = new RebuildQueue({ createTransport: () => new FakeTransport() });

    const promise = queue.track({ label: 'Kernel' }, () => Promise.reject(new Error('kernel died')));
    await expect(promise).rejects.toThrow('kernel died');
    expect(queue.getSnapshot().lastError?.message).toBe('kernel died');
    expect(queue.getSnapshot().lastError?.label).toBe('Kernel');
  });
});

describe('rebuild queue snapshot', () => {
  it('keeps the same snapshot until something changes', async () => {
    const transport = new FakeTransport();
    const queue = new RebuildQueue({ createTransport: () => transport });

    const before = queue.getSnapshot();
    expect(queue.getSnapshot()).toBe(before);

    const promise = queue.fetchJson({ url: '/s', label: 'S' });
    const after = queue.getSnapshot();
    expect(after).not.toBe(before);
    expect(Object.isFrozen(after)).toBe(true);
    expect(Object.isFrozen(after.jobs)).toBe(true);

    transport.emit(done(transport.fetches()[0].jobId));
    await expect(promise).resolves.toMatchObject({ ok: true });

    const finished = queue.getSnapshot();
    expect(finished).not.toBe(after);
    expect(finished.jobs).toHaveLength(0);
  });

  it('notifies the subscribers and stops after unsubscribe', () => {
    const queue = new RebuildQueue({ createTransport: () => new FakeTransport() });
    const listener = vi.fn();

    const unsubscribe = queue.subscribe(listener);
    queue.reportError('Rebuild', 'broken');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(queue.getSnapshot().lastError?.message).toBe('broken');

    unsubscribe();
    queue.reportError('Rebuild', 'still broken');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('speculative reads', () => {
  it('keep a cache miss out of the last error but still answer the caller', async () => {
    const transport = new FakeTransport();
    const queue = new RebuildQueue({ createTransport: () => transport });
    const miss = queue.fetchJson({ url: '/gallery.json', label: 'Gallery mesh', reportErrors: false });
    const [request] = transport.fetches();
    transport.emit({ type: 'done', jobId: request.jobId, ok: false, status: 404, statusText: 'Not Found', retryAfter: null, body: null });
    await expect(miss).resolves.toMatchObject({ ok: false, status: 404 });
    expect(queue.getSnapshot().lastError).toBeNull();
  });
});
