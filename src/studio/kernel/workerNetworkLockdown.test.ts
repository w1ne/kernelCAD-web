// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { LOCKED_WORKER_GLOBALS, lockDownWorkerNetwork } from './workerNetworkLockdown';

/** A fake worker global: `fetch` on the prototype (like WorkerGlobalScope),
 *  constructors as own props, one getter, one non-configurable value. */
function fakeScope() {
  const proto = { fetch: () => 'real fetch' };
  const scope = Object.create(proto) as Record<string, unknown>;
  scope.XMLHttpRequest = class {};
  scope.WebSocket = class {};
  Object.defineProperty(scope, 'indexedDB', { get: () => ({ open: () => 'db' }), configurable: true });
  Object.defineProperty(scope, 'BroadcastChannel', { value: class {}, writable: true, configurable: false });
  scope.postMessage = () => 'kept';
  return { scope, proto };
}

describe('lockDownWorkerNetwork', () => {
  it('stubs present capabilities on the scope and its prototype chain', () => {
    const { scope, proto } = fakeScope();
    const locked = lockDownWorkerNetwork(scope);
    expect(locked.sort()).toEqual(['BroadcastChannel', 'WebSocket', 'XMLHttpRequest', 'fetch', 'indexedDB']);
    expect(() => (scope.fetch as () => unknown)()).toThrow(/fetch is not available/);
    expect(() => (Object.getPrototypeOf(scope).fetch as () => unknown)()).toThrow(/not available/);
    expect(() => (proto.fetch as () => unknown)()).toThrow(/not available/);
    expect(() => new (scope.XMLHttpRequest as new () => unknown)()).toThrow(/XMLHttpRequest/);
    expect(() => (scope.indexedDB as () => unknown)()).toThrow(/indexedDB/);
    expect(() => new (scope.BroadcastChannel as new () => unknown)()).toThrow(/BroadcastChannel/);
    expect((scope.postMessage as () => unknown)()).toBe('kept');
  });

  it('cannot be undone by the script', () => {
    const { scope, proto } = fakeScope();
    lockDownWorkerNetwork(scope);
    const stub = proto.fetch;
    // The original lived on the prototype (like WorkerGlobalScope.prototype):
    // its slot is now a frozen stub, so it cannot be restored or deleted.
    expect(() => Object.defineProperty(proto, 'fetch', { value: () => 'x' })).toThrow(TypeError);
    expect(() => { (proto as Record<string, unknown>).fetch = () => 'x'; }).toThrow(TypeError);
    expect(() => delete (proto as Record<string, unknown>).fetch).toThrow(TypeError);
    expect(proto.fetch).toBe(stub);
    expect(() => Object.defineProperty(scope, 'XMLHttpRequest', { value: class {} })).toThrow(TypeError);
  });

  it('fails closed when a capability cannot be replaced', () => {
    const scope = {};
    Object.defineProperty(scope, 'fetch', { value: () => 'real', writable: false, configurable: false });
    expect(() => lockDownWorkerNetwork(scope)).toThrow(/could not lock down fetch/);
  });

  it('ignores capabilities the scope does not have', () => {
    expect(lockDownWorkerNetwork({})).toEqual([]);
    expect(LOCKED_WORKER_GLOBALS).toContain('importScripts');
  });
});
