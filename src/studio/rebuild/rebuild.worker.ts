// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/rebuild/rebuild.worker.ts
// Worker entry: fetches a mesh payload, parses it and packs the numeric
// arrays into typed arrays off the main thread, then transfers the buffers
// back. The logic lives in rebuildProtocol.ts so it stays testable.
import { createRebuildWorkerHandler, type RebuildWorkerRequest } from './rebuildProtocol';

const scope = self as unknown as {
  onmessage: ((e: MessageEvent<RebuildWorkerRequest>) => void) | null;
  postMessage: (m: unknown, t: Transferable[]) => void;
};

const handle = createRebuildWorkerHandler({
  fetchImpl: (url, init) => fetch(url, init),
  post: (m, t) => scope.postMessage(m, t),
});

scope.onmessage = (event) => handle(event.data);
