// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/browserKernel/kernel.worker.ts
//
// Entry of the Studio's browser kernel worker: OCCT (the single-threaded
// replicad-opencascadejs build), the modern script runtime and the mesher,
// so a declared-parameter slider edit rebuilds with no network at all.
//
// Start-up order is the security boundary (see workerLockdown.ts):
//   1. wait for the page's one `kc-init` message: the private port, the
//      wasm bytes and the memory cap;
//   2. cap WebAssembly memory, then instantiate OCCT from the bytes;
//   3. lock the worker global down;
//   4. only then accept jobs, on the private port.
// Single-threaded on purpose: no SharedArrayBuffer, no COOP/COEP.
//
// Job logic lives in workerCore.ts (unit-tested); this file only wires it.

import { initOcct, occtHeapBytes } from '../../kernel/backends/occt/occtBackend';
import { createKernelDeps } from './kernelDeps';
import { installWasmMemoryCap } from './memoryCap';
import { createKernelWorkerCore } from './workerCore';
import { lockDownWorkerGlobals } from './workerLockdown';
import {
  BROWSER_KERNEL_PROTOCOL,
  isPageToWorker,
  type KernelInitMessage,
  type WorkerToPage,
} from './protocol';

type TransferList = Transferable[];

/** Quiet time after a settled result before its viewer dimensions are
 *  computed (80-600 ms of synchronous feature recognition on assemblies). */
const DIMENSIONS_IDLE_MS = 250;

function transferList(message: WorkerToPage): TransferList {
  if (message.type !== 'result') return [];
  const buffers = new Set<ArrayBuffer>();
  const add = (view: unknown): void => {
    if (ArrayBuffer.isView(view) && view.buffer instanceof ArrayBuffer) buffers.add(view.buffer);
  };
  for (const feature of message.payload.features) {
    for (const face of feature.faces) {
      add(face.vertices); add(face.normals); add(face.indices); add(face.uv);
    }
    add(feature.mesh?.positions); add(feature.mesh?.normals); add(feature.mesh?.indices);
    add(feature.edges);
  }
  return [...buffers];
}

function isInit(value: unknown): value is KernelInitMessage {
  const m = value as Partial<KernelInitMessage> | null;
  return !!m && m.type === 'kc-init' && m.v === BROWSER_KERNEL_PROTOCOL
    && m.wasm instanceof ArrayBuffer && typeof m.memoryCapBytes === 'number';
}

async function start(init: KernelInitMessage, port: MessagePort): Promise<void> {
  // Bound before any model code exists: a later patch of the prototype does
  // not change what these call.
  const send = MessagePort.prototype.postMessage.bind(port) as (m: unknown, t: TransferList) => void;
  const started = performance.now();
  const memory = installWasmMemoryCap(init.memoryCapBytes);
  await initOcct({ wasmBinary: init.wasm });
  const locked = lockDownWorkerGlobals(self);
  // The heap the module started with counts too, not only what it grew to.
  const core = createKernelWorkerCore(createKernelDeps({
    bytes: () => Math.max(memory.bytes(), occtHeapBytes()),
    capHit: memory.capHit,
  }));
  let dimensionsTimer: ReturnType<typeof setTimeout> | undefined;
  port.onmessage = (event: MessageEvent<unknown>) => {
    if (!isPageToWorker(event.data)) return;
    clearTimeout(dimensionsTimer);
    const receivedAt = performance.timeOrigin + performance.now();
    void core.handle(event.data).then((reply) => {
      if (reply.type === 'result') {
        reply.timings.receivedAt = receivedAt;
        reply.timings.postedAt = performance.timeOrigin + performance.now();
      }
      send(reply, transferList(reply));
      if (reply.type !== 'result' || reply.quality !== 'display') return;
      // After the mesh, once the edits pause: the pass cannot be interrupted,
      // and dimensions of a value the user is still changing are wasted.
      dimensionsTimer = setTimeout(() => {
        const dimensions = core.pendingDimensions();
        if (dimensions) send(dimensions, []);
      }, DIMENSIONS_IDLE_MS);
    });
  };
  const ready: WorkerToPage = {
    type: 'ready',
    v: BROWSER_KERNEL_PROTOCOL,
    origin: String((self as unknown as { origin?: unknown }).origin),
    locked,
    initMs: performance.now() - started,
  };
  send(ready, []);
}

const scope = self as unknown as { onmessage: ((event: MessageEvent<unknown>) => void) | null };
scope.onmessage = (event) => {
  const port = event.ports[0];
  if (!isInit(event.data) || !port) return;
  // One init only; nothing else is ever read from the worker object.
  scope.onmessage = null;
  start(event.data, port).catch(() => {
    // The page sees no `ready` and times the start-up out; a worker that
    // cannot lock itself down must not run anything.
    port.close();
  });
};
