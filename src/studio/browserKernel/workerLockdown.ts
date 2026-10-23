// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/browserKernel/workerLockdown.ts
//
// The in-worker half of the browser kernel's boundary.
//
// Model sources (gallery, shared links, agent output) run in the worker with
// the realm runner's `new Function`. That runner only SHADOWS `fetch` & co.
// by name, which a script escapes in one line
// (`(() => {}).constructor('return self')()`), so it is not a boundary.
// The boundary has two layers:
//
//   1. Origin. The worker is created from a `data:` URL, so its origin is
//      opaque ('null'): a request it makes is cross-origin to the Studio and
//      carries no cookies, and it has no access to the Studio's storage,
//      caches or broadcast channels. kernelWorkerHost.ts refuses to run the
//      browser kernel in a production build when the worker reports any other
//      origin.
//   2. Capabilities (this file). After the wasm is instantiated — the worker
//      never fetches anything, the page hands it the bytes — every network,
//      storage and cross-context API on the worker global AND its whole
//      prototype chain is replaced with a non-configurable throwing stub, so
//      `Object.getPrototypeOf(self).fetch` does not bring it back either.
//      `postMessage` is stubbed too: replies go over a private MessagePort
//      held in a closure model code cannot reach.
//
// Based on the lockdown in kernelCAD PR #1080 (src/studio/kernel/
// workerNetworkLockdown.ts), extended with postMessage/close and the
// remaining network/storage constructors.

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
  'MessageChannel',
  'indexedDB',
  'IDBFactory',
  'caches',
  'CacheStorage',
  'cookieStore',
  'RTCPeerConnection',
  'RTCDataChannel',
  'postMessage',
  'close',
] as const;

function blocked(name: string): () => never {
  return function blockedCapability(): never {
    throw new Error(`${name} is not available to scripts in the browser kernel`);
  };
}

/** Replace one property on one object; false when it could not be replaced. */
function replaceOn(owner: object, name: string, stub: () => never): boolean {
  const descriptor = Object.getOwnPropertyDescriptor(owner, name);
  if (descriptor === undefined) return true;
  if (descriptor.configurable) {
    Object.defineProperty(owner, name, { value: stub, writable: false, enumerable: false, configurable: false });
  } else if ('value' in descriptor && descriptor.writable) {
    (owner as Record<string, unknown>)[name] = stub;
  }
  return (owner as Record<string, unknown>)[name] === stub;
}

/**
 * Lock `scope` down; returns the names that were present (and are now
 * stubbed). Throws when a present capability could not be replaced, so the
 * caller fails closed instead of running model code with it reachable.
 */
export function lockDownWorkerGlobals(scope: object = globalThis): string[] {
  const locked: string[] = [];
  for (const name of LOCKED_WORKER_GLOBALS) {
    const stub = blocked(name);
    let found = false;
    for (let owner: object | null = scope; owner !== null; owner = Object.getPrototypeOf(owner)) {
      if (Object.getOwnPropertyDescriptor(owner, name) === undefined) continue;
      found = true;
      if (!replaceOn(owner, name, stub)) {
        throw new Error(`browser kernel: could not lock down ${name}`);
      }
    }
    if (found) locked.push(name);
  }
  return locked;
}
