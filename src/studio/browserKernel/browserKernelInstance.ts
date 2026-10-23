// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/browserKernel/browserKernelInstance.ts
//
// The Studio's one browser kernel client and its budgets.

import { BrowserKernelClient } from './browserKernelClient';
import { spawnKernelWorker } from './kernelWorkerHost';

/** WebAssembly memory the kernel may grow to. The OCCT build itself stops at
 *  2 GiB; a heavy gallery assembly peaks well below this cap. */
export const BROWSER_KERNEL_MEMORY_CAP_BYTES = 1536 * 1024 * 1024;

export const browserKernel = new BrowserKernelClient({
  spawn: spawnKernelWorker,
  spawnOptions: {
    memoryCapBytes: BROWSER_KERNEL_MEMORY_CAP_BYTES,
    // Download + compile of the 11 MB wasm on a slow connection.
    startTimeoutMs: 60_000,
    requireIsolation: true,
  },
  // The node runner's script budget (BROWSER_SCRIPT_TIMEOUT_MS, not imported:
  // that module would pull the kernel into the page bundle). A slider edit
  // that takes longer is stopped and the server builds it.
  jobTimeoutMs: 30_000,
  // The first build of a heavy model runs in the background while the
  // stored mesh stays on screen; it may take longer.
  backgroundTimeoutMs: 120_000,
  maxInfraFailures: 3,
});
