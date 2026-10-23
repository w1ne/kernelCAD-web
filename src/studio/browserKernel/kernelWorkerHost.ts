// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/browserKernel/kernelWorkerHost.ts
//
// Starts the browser kernel worker and hands it its private port.
//
// In a production build the worker is created from a small `data:` URL
// bootstrap, which gives it an OPAQUE origin: model code inside it cannot
// make a credentialed request to the Studio's origin or read its storage,
// whatever it escapes from (see workerLockdown.ts). The bootstrap receives
// the bundled kernel script as text and imports it from a blob URL it makes
// itself (same opaque origin) — browsers refuse `data:` URLs over 2 MB, and
// the kernel bundle is larger. A production worker that reports any other
// origin is terminated and the edit goes to the server. The Vite dev server
// serves the worker as separate modules, so dev uses a normal same-origin
// worker and relies on the in-worker lockdown.
//
// The page fetches the OCCT wasm and transfers the bytes: the worker itself
// never needs the network.

import {
  BROWSER_KERNEL_PROTOCOL,
  isWorkerToPage,
  type KernelInitMessage,
  type KernelReadyMessage,
  type RebuildJobRequest,
  type WorkerToPage,
} from './protocol';

export interface KernelWorkerHandle {
  readonly ready: KernelReadyMessage;
  post(request: RebuildJobRequest): void;
  terminate(): void;
}

export interface KernelWorkerHooks {
  onMessage(message: Exclude<WorkerToPage, KernelReadyMessage>): void;
  onCrash(reason: string): void;
}

export interface SpawnOptions {
  memoryCapBytes: number;
  startTimeoutMs: number;
  /** Refuse a worker whose origin is not opaque. */
  requireIsolation: boolean;
}

export type SpawnKernelWorker = (hooks: KernelWorkerHooks, options: SpawnOptions) => Promise<KernelWorkerHandle>;

const EMBED_BUILD = typeof __KERNELCAD_EMBED__ !== 'undefined' && __KERNELCAD_EMBED__;

async function loadAssets(): Promise<{ kernelWorkerUrl: string; occtWasmUrl: string }> {
  if (EMBED_BUILD) throw new Error('The browser kernel is not part of the embed library.');
  return import('./kernelWorkerAssets');
}

/** The isolated worker's whole script: import the kernel bundle it is sent
 *  from a blob URL of its own, then hand the init message to it. */
const BOOTSTRAP = [
  'self.onmessage = async (event) => {',
  '  self.onmessage = null;',
  "  const url = URL.createObjectURL(new Blob([event.data.script], { type: 'text/javascript' }));",
  '  try { await import(url); } finally { URL.revokeObjectURL(url); }',
  "  self.dispatchEvent(new MessageEvent('message', { data: event.data.init, ports: [event.data.port] }));",
  '};',
].join('\n');

const BOOTSTRAP_URL = `data:text/javascript;base64,${btoa(BOOTSTRAP)}`;

async function fetchOk(url: string): Promise<Response> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response;
}

/** The kernel bundle's text for the isolated bootstrap; null under the dev
 *  server, where the worker is loaded by URL. */
async function kernelScript(kernelWorkerUrl: string, isolate: boolean): Promise<string | null> {
  if (!isolate) return null;
  return (await fetchOk(new URL(kernelWorkerUrl, globalThis.location?.href).href)).text();
}

function startWorker(kernelWorkerUrl: string, script: string | null, init: KernelInitMessage, port: MessagePort): Worker {
  const options: WorkerOptions = { type: 'module', name: 'kernelcad-browser-kernel' };
  if (script === null) {
    const worker = new Worker(new URL(kernelWorkerUrl, globalThis.location?.href).href, options);
    worker.postMessage(init, [port, init.wasm]);
    return worker;
  }
  const worker = new Worker(BOOTSTRAP_URL, options);
  worker.postMessage({ script, init, port }, [port, init.wasm]);
  return worker;
}

function waitForReady(port: MessagePort, timeoutMs: number): Promise<KernelReadyMessage> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`The browser kernel did not start within ${Math.round(timeoutMs / 1000)} s.`));
    }, timeoutMs);
    port.onmessage = (event: MessageEvent<unknown>) => {
      if (!isWorkerToPage(event.data) || event.data.type !== 'ready') return;
      clearTimeout(timer);
      resolve(event.data);
    };
  });
}

export const spawnKernelWorker: SpawnKernelWorker = async (hooks, options) => {
  const { kernelWorkerUrl, occtWasmUrl } = await loadAssets();
  const isolate = !import.meta.env.DEV;
  const [script, wasm] = await Promise.all([
    kernelScript(kernelWorkerUrl, isolate),
    fetchOk(new URL(occtWasmUrl, globalThis.location?.href).href).then((r) => r.arrayBuffer()),
  ]);
  const channel = new MessageChannel();
  const init: KernelInitMessage = {
    type: 'kc-init',
    v: BROWSER_KERNEL_PROTOCOL,
    wasm,
    memoryCapBytes: options.memoryCapBytes,
  };
  const worker = startWorker(kernelWorkerUrl, script, init, channel.port2);
  let alive = true;
  const crash = (reason: string): void => {
    if (!alive) return;
    hooks.onCrash(reason);
  };
  // Nothing is ever read from the worker object: model code can post there.
  worker.onmessage = null;
  worker.onerror = (event: ErrorEvent) => {
    event.preventDefault();
    crash(event.message || 'The browser kernel worker failed.');
  };
  let ready: KernelReadyMessage;
  try {
    ready = await waitForReady(channel.port1, options.startTimeoutMs);
    if (options.requireIsolation && isolate && ready.origin !== 'null') {
      throw new Error(`The browser kernel worker is not isolated (origin ${ready.origin}).`);
    }
  } catch (error) {
    alive = false;
    worker.terminate();
    channel.port1.close();
    throw error;
  }
  channel.port1.onmessage = (event: MessageEvent<unknown>) => {
    if (!alive || !isWorkerToPage(event.data) || event.data.type === 'ready') return;
    hooks.onMessage(event.data);
  };
  channel.port1.onmessageerror = () => crash('The browser kernel sent a message that could not be read.');
  return {
    ready,
    post: (request) => { channel.port1.postMessage(request); },
    terminate: () => {
      alive = false;
      worker.terminate();
      channel.port1.close();
    },
  };
};
