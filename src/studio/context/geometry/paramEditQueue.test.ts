// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { createParamEditQueue } from './paramEditQueue';

function deferred() {
  let resolve!: () => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<void>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe('createParamEditQueue', () => {
  it('runs immediately when idle and coalesces to one trailing batch', async () => {
    const calls: Array<Record<string, unknown>> = [];
    const gates: Array<ReturnType<typeof deferred>> = [];
    const queue = createParamEditQueue(async (edits) => {
      calls.push(edits);
      const gate = deferred();
      gates.push(gate);
      await gate.promise;
    });
    const first = queue.submit({ w: 1 });
    expect(calls).toEqual([{ w: 1 }]);
    const second = queue.submit({ w: 2 });
    const third = queue.submit({ w: 3, h: 5 });
    expect(queue.stats()).toEqual({ inFlight: true, pending: true });
    gates[0]!.resolve();
    await first;
    await Promise.resolve();
    expect(calls[1]).toEqual({ w: 3, h: 5 });
    gates[1]!.resolve();
    await Promise.all([second, third]);
    expect(queue.stats()).toEqual({ inFlight: false, pending: false });
  });

  it('keeps the queue usable after a failed run and rejects only its submits', async () => {
    const calls: Array<Record<string, unknown>> = [];
    const gates: Array<ReturnType<typeof deferred>> = [];
    const queue = createParamEditQueue(async (edits) => {
      calls.push(edits);
      const gate = deferred();
      gates.push(gate);
      await gate.promise;
    });
    const a = queue.submit({ w: 1 });
    const b = queue.submit({ w: 2 });
    gates[0]!.reject(new Error('boom'));
    await expect(a).rejects.toThrow('boom');
    gates[1]!.resolve();
    await b;
    expect(calls).toEqual([{ w: 1 }, { w: 2 }]);
  });

  it('dispose drops the pending batch and the in-flight continues', async () => {
    const calls: Array<Record<string, unknown>> = [];
    const gates: Array<ReturnType<typeof deferred>> = [];
    const queue = createParamEditQueue(async (edits) => {
      calls.push(edits);
      const gate = deferred();
      gates.push(gate);
      await gate.promise;
    });
    void queue.submit({ w: 1 });
    void queue.submit({ w: 2 });
    queue.dispose();
    gates[0]!.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(calls).toEqual([{ w: 1 }]);
    expect(queue.stats()).toEqual({ inFlight: false, pending: false });
  });
});
