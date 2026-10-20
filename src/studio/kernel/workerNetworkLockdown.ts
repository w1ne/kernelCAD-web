// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/kernel/workerNetworkLockdown.ts
//
// The browser kernel worker runs hosted/shared model sources with
// `new Function` (realmRunner.ts). That runner only SHADOWS `fetch` & co. by
// name, which a script escapes in one line (`(() => {}).constructor('return
// self')().fetch(...)`). The worker is same-origin with Studio, so without a
// real boundary `?kernel=force` on someone else's shared model would let that
// model issue credentialed requests as the viewer.
//
// This module is the in-worker half of the boundary: once the OCCT wasm is
// loaded (the one fetch the worker itself needs), every network / cross-
// context capability on the worker global and its whole prototype chain is
// replaced with a non-configurable throwing stub, so it cannot be recovered
// through `Object.getPrototypeOf(self)` or `WorkerGlobalScope.prototype`.
// The other half is the worker chunk's own CSP (`public/_headers`), which
// also covers dynamic `import()` — a JS-level lockdown cannot intercept that.

/** Capabilities removed from the worker global before any model code runs. */
export const LOCKED_WORKER_GLOBALS = [
  'fetch',
  'fetchLater',
  'XMLHttpRequest',
  'XMLHttpRequestUpload',
  'XMLHttpRequestEventTarget',
  'WebSocket',
  'WebSocketStream',
  'WebTransport',
  'EventSource',
  'importScripts',
  'Worker',
  'SharedWorker',
  'BroadcastChannel',
  'indexedDB',
  'caches',
  'cookieStore',
] as const;

function blocked(name: string): () => never {
  const stub = function blockedCapability(): never {
    throw new Error(`${name} is not available to scripts in the browser kernel`);
  };
  return stub;
}

/** Lock `scope` down; returns the names that were actually present (and are
 *  now stubbed). Throws if a present capability could not be replaced, so the
 *  caller fails closed instead of running model code with it reachable. */
export function lockDownWorkerNetwork(scope: object = globalThis): string[] {
  const locked: string[] = [];
  for (const name of LOCKED_WORKER_GLOBALS) {
    const stub = blocked(name);
    let found = false;
    for (let owner: object | null = scope; owner !== null; owner = Object.getPrototypeOf(owner)) {
      const descriptor = Object.getOwnPropertyDescriptor(owner, name);
      if (descriptor === undefined) continue;
      found = true;
      if (descriptor.configurable) {
        Object.defineProperty(owner, name, { value: stub, writable: false, enumerable: false, configurable: false });
      } else if ('value' in descriptor && descriptor.writable) {
        (owner as Record<string, unknown>)[name] = stub;
      }
      if ((owner as Record<string, unknown>)[name] !== stub) {
        throw new Error(`browser kernel: could not lock down ${name}`);
      }
    }
    if (found) locked.push(name);
  }
  return locked;
}
