// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it, vi } from 'vitest';
import { createParamEditQueue } from './paramEditQueue';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe('createParamEditQueue', () => {
  it('runs immediately when idle, coalesces to one trailing batch, and returns its payloads', async () => {
    const calls: Array<Record<string, unknown>> = [];
    const gates: Array<ReturnType<typeof deferred<string>>> = [];
    const queue = createParamEditQueue((edits) => {
      calls.push(edits);
      const gate = deferred<string>();
      gates.push(gate);
      return gate.promise;
    });
    const first = queue.submit({ w: 1 });
    expect(calls).toEqual([{ w: 1 }]);
    const second = queue.submit({ w: 2 });
    const third = queue.submit({ w: 3, h: 5 });
    expect(queue.stats()).toEqual({ inFlight: true, pending: true });
    gates[0]!.resolve('first');
    await expect(first).resolves.toBe('first');
    expect(calls[1]).toEqual({ w: 3, h: 5 });
    gates[1]!.resolve('trailing');
    await expect(second).resolves.toBe('trailing');
    await expect(third).resolves.toBe('trailing');
    expect(queue.stats()).toEqual({ inFlight: false, pending: false });
  });

  it('keeps the queue usable after a failed run and rejects only its submits', async () => {
    const calls: Array<Record<string, unknown>> = [];
    const gates: Array<ReturnType<typeof deferred<string>>> = [];
    const queue = createParamEditQueue((edits) => {
      calls.push(edits);
      const gate = deferred<string>();
      gates.push(gate);
      return gate.promise;
    });
    const a = queue.submit({ w: 1 });
    const b = queue.submit({ w: 2 });
    gates[0]!.reject(new Error('boom'));
    await expect(a).rejects.toThrow('boom');
    gates[1]!.resolve('b');
    await expect(b).resolves.toBe('b');
    expect(calls).toEqual([{ w: 1 }, { w: 2 }]);
  });

  it('dispose resolves the pending batch as null and the in-flight run still returns its value', async () => {
    const calls: Array<Record<string, unknown>> = [];
    const gates: Array<ReturnType<typeof deferred<string>>> = [];
    const queue = createParamEditQueue((edits) => {
      calls.push(edits);
      const gate = deferred<string>();
      gates.push(gate);
      return gate.promise;
    });
    const first = queue.submit({ w: 1 });
    const dropped = queue.submit({ w: 2 });
    queue.dispose();
    await expect(dropped).resolves.toBeNull();
    gates[0]!.resolve('first');
    await expect(first).resolves.toBe('first');
    expect(calls).toEqual([{ w: 1 }]);
    expect(queue.stats()).toEqual({ inFlight: false, pending: false });
  });

  it('resolves a submit after dispose as null without invoking run', async () => {
    const run = vi.fn((edits: Record<string, unknown>) => Promise.resolve(edits));
    const queue = createParamEditQueue(run);
    queue.dispose();
    await expect(queue.submit({ w: 1 })).resolves.toBeNull();
    expect(run).not.toHaveBeenCalled();
  });

  it('a synchronous throw from run rejects its submit and leaves the queue usable', async () => {
    const calls: number[] = [];
    const queue = createParamEditQueue((edits) => {
      calls.push(Number(edits.w));
      if (calls.length === 1) throw new Error('sync boom');
      return Promise.resolve('ok');
    });
    await expect(queue.submit({ w: 1 })).rejects.toThrow('sync boom');
    await expect(queue.submit({ w: 2 })).resolves.toBe('ok');
    expect(calls).toEqual([1, 2]);
  });
});
