// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { lockDownWorkerGlobals } from './workerLockdown';

/** A worker-shaped global: own props plus two prototype levels, like
 *  DedicatedWorkerGlobalScope → WorkerGlobalScope → EventTarget. */
function workerLikeScope() {
  const eventTarget = { addEventListener() {} };
  const workerGlobalScope = Object.create(eventTarget, {
    fetch: { value: () => 'network', writable: true, configurable: true },
    importScripts: { value: () => 'loaded', writable: true, configurable: true },
    indexedDB: { get: () => ({ open: () => 'db' }), configurable: true },
    caches: { get: () => ({ open: () => 'cache' }), configurable: true },
  });
  const dedicated = Object.create(workerGlobalScope, {
    postMessage: { value: () => 'posted', writable: true, configurable: true },
  });
  const scope = Object.create(dedicated, {
    XMLHttpRequest: { value: class {}, writable: true, configurable: true },
    WebSocket: { value: class {}, writable: true, configurable: true },
    EventSource: { value: class {}, writable: true, configurable: true },
    BroadcastChannel: { value: class {}, writable: true, configurable: true },
    Math: { value: Math, writable: true, configurable: true },
  });
  return { scope, workerGlobalScope };
}

describe('lockDownWorkerGlobals', () => {
  it('stubs every network, storage and messaging capability, on the prototype chain too', () => {
    const { scope, workerGlobalScope } = workerLikeScope();
    const locked = lockDownWorkerGlobals(scope);
    expect(locked).toEqual(expect.arrayContaining([
      'fetch', 'importScripts', 'indexedDB', 'caches', 'postMessage',
      'XMLHttpRequest', 'WebSocket', 'EventSource', 'BroadcastChannel',
    ]));
    const s = scope as Record<string, () => unknown>;
    for (const name of locked) {
      expect(() => s[name]!(), name).toThrow(/not available to scripts in the browser kernel/);
    }
    // Walking to the prototype does not bring the original back.
    expect(() => (workerGlobalScope as { fetch: () => unknown }).fetch()).toThrow();
    expect(() => Object.getPrototypeOf(Object.getPrototypeOf(scope)).fetch()).toThrow();
    // Inert globals are untouched.
    expect((scope as { Math: Math }).Math).toBe(Math);
  });

  it('cannot be undone by model code', () => {
    const { scope, workerGlobalScope } = workerLikeScope();
    lockDownWorkerGlobals(scope);
    const s = scope as Record<string, unknown>;
    expect(() => { s.fetch = () => 'network'; }).toThrow(TypeError);
    expect(() => Object.defineProperty(workerGlobalScope, 'fetch', { value: () => 'network' })).toThrow(TypeError);
    expect(Reflect.deleteProperty(workerGlobalScope, 'fetch')).toBe(false);
    expect(Reflect.deleteProperty(scope, 'XMLHttpRequest')).toBe(false);
  });

  it('fails closed when a capability cannot be replaced', () => {
    const scope = Object.create(null, {
      fetch: { value: () => 'network', writable: false, configurable: false },
    });
    expect(() => lockDownWorkerGlobals(scope)).toThrow(/could not lock down fetch/);
  });
});
