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
// The boundary has three layers:
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
//   3. Code generation (this file, `lockDownCodeGeneration`). Dynamic
//      `import()` is syntax and cannot be stubbed, so the model source is
//      parsed and `import()` / `import.meta` refused before it runs
//      (moduleLoadingCheck.ts), and every way to build code from a string at
//      run time is removed, so the syntax cannot be synthesized either.
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

/** A constructor stand-in that throws when called or constructed but keeps
 *  `instanceof Function` working (its `prototype` is Function.prototype). */
function blockedConstructor(name: string): () => never {
  const stub = blocked(name);
  Object.defineProperty(stub, 'prototype', { value: Function.prototype, writable: false });
  return stub;
}

function lockProperty(owner: object, name: string, value: unknown): void {
  Object.defineProperty(owner, name, { value, writable: false, enumerable: false, configurable: false });
  if ((owner as Record<string, unknown>)[name] !== value) {
    throw new Error(`browser kernel: could not lock down ${name}`);
  }
}

/** Timers that refuse a string handler (the one other way to eval). */
function functionOnlyTimer<T extends (...args: never[]) => unknown>(original: T, name: string): T {
  const wrapped = function (this: unknown, handler: unknown, ...rest: unknown[]) {
    if (typeof handler !== 'function') throw new Error(`${name} with a code string is not available to scripts in the browser kernel`);
    return (original as unknown as (...args: unknown[]) => unknown).call(this, handler, ...rest);
  };
  return wrapped as unknown as T;
}

const WASM_ENTRY_POINTS = [
  'compile', 'compileStreaming', 'instantiate', 'instantiateStreaming', 'Module', 'Instance', 'Memory', 'Table', 'Global',
] as const;

/**
 * Remove every way to turn a string into code, and to make new WebAssembly,
 * once OCCT is instantiated. Dynamic `import()` is syntax, not a global: it
 * cannot be stubbed, so model code must never be able to *produce* it. The
 * source of a model is checked for `import()` / `import.meta` before it runs
 * (moduleLoadingCheck.ts); this makes that check sufficient by taking away
 * `Function`, `eval`, the async/generator function constructors and string
 * timers, which could otherwise synthesize the syntax at run time. The realm
 * runner keeps its own reference to `Function` from before this point.
 *
 * WebAssembly compilation, instantiation and `new WebAssembly.Memory` go too:
 * model code cannot allocate wasm memory around the memory cap (memoryCap.ts)
 * or bring its own module. Returns the names that were locked.
 */
export function lockDownCodeGeneration(scope: object = globalThis): string[] {
  const global = scope as Record<string, unknown>;
  const locked: string[] = [];
  const functionStub = blockedConstructor('Function');
  lockProperty(Function.prototype, 'constructor', functionStub);
  for (const name of ['Function', 'eval'] as const) {
    for (let owner: object | null = scope; owner !== null; owner = Object.getPrototypeOf(owner)) {
      if (Object.getOwnPropertyDescriptor(owner, name) === undefined) continue;
      lockProperty(owner, name, name === 'Function' ? functionStub : blocked(name));
    }
    locked.push(name);
  }
  const samples: Array<[string, unknown]> = [
    ['AsyncFunction', async function sample() {}],
    ['GeneratorFunction', function* sample() {}],
    ['AsyncGeneratorFunction', async function* sample() {}],
  ];
  for (const [name, sample] of samples) {
    lockProperty(Object.getPrototypeOf(sample), 'constructor', blockedConstructor(name));
    locked.push(name);
  }
  for (const name of ['setTimeout', 'setInterval'] as const) {
    const original = global[name];
    if (typeof original !== 'function') continue;
    const wrapped = functionOnlyTimer(original as (...args: never[]) => unknown, name);
    for (let owner: object | null = scope; owner !== null; owner = Object.getPrototypeOf(owner)) {
      if (Object.getOwnPropertyDescriptor(owner, name) !== undefined) lockProperty(owner, name, wrapped);
    }
    locked.push(`${name}(string)`);
  }
  const wasm = global.WebAssembly as Record<string, unknown> | undefined;
  if (wasm) {
    for (const name of WASM_ENTRY_POINTS) {
      if (!(name in wasm)) continue;
      lockProperty(wasm, name, name[0] === name[0]!.toUpperCase() ? blockedConstructor(`WebAssembly.${name}`) : blocked(`WebAssembly.${name}`));
      locked.push(`WebAssembly.${name}`);
    }
  }
  return locked;
}
