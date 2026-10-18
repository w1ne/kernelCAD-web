// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/kernel/kernelSingleton.ts
//
// The one Studio-owned browser kernel worker and the rules for warming it.
// The instance is lazy: the first warm spawns the worker through
// `studioKernelWorker.ts`, whose ~11 MB OCCT chunk nothing imports statically —
// the `new Worker(new URL(...))` below stays inside `spawnKernelWorker` so the
// chunk is fetched on the first warm, never on page load (and can be stripped
// from the embed build). Routing reads `browserKernelForSource`: a kernel is
// usable for a source only while it is warm for exactly that source.

import { createBrowserKernel, type BrowserKernel } from './browserKernelClient';
import { browserKernelEnabled } from './flag';

let instance: BrowserKernel | null = null;
let warmedSource: string | null = null;
let swapTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSwap: { source: string; fileName: string } | null = null;

/** Trailing delay before a warm for a different source replaces the running
 *  worker. Hosted code edits apply on a debounce; swapping on every apply
 *  would dispose the worker mid-download and re-warm for each keystroke-scale
 *  edit. The old worker keeps serving until this fires; a newer swap or a
 *  change back to the current source replaces/cancels it. */
export const WARM_SETTLE_MS = 1500;

function cancelPendingWarmSwap(): void {
  if (swapTimer !== null) {
    clearTimeout(swapTimer);
    swapTimer = null;
  }
  pendingSwap = null;
}

function scheduleWarmSwap(source: string, fileName: string): void {
  cancelPendingWarmSwap();
  pendingSwap = { source, fileName };
  swapTimer = setTimeout(() => {
    swapTimer = null;
    const swap = pendingSwap;
    pendingSwap = null;
    if (swap === null) return;
    disposeBrowserKernel();
    warmBrowserKernel(swap.source, swap.fileName);
  }, WARM_SETTLE_MS);
}

/** Sources the worker cannot build: `lib.fromSTEP` reads the host filesystem,
 *  and a literal relative import needs the server's asset manifest. The
 *  worker would throw `cli.host-fs-unavailable` for them anyway, but only
 *  after paying the wasm download — the precheck skips that. The locked
 *  precheck pattern is `lib.from(ST|EP)`; `from(STEP|EP)` is the atom that
 *  actually matches `lib.fromSTEP` (the plan regex's `ST|EP` fails on its own
 *  example). Other host-fs importers (fromSTL/fromBREP/…) are left to the
 *  worker's own host-fs failure, which flips the source sticky server-side.
 *  Over-matching here only keeps a model on the server path, never breaks it. */
const HOST_FS_IMPORT = /\blib\s*\.\s*from(STEP|EP)\b/;
const LITERAL_RELATIVE_IMPORT = /\bfrom\s*['"]\.{1,2}\//;

export function browserKernelSourceIsServerOnly(source: string): boolean {
  return HOST_FS_IMPORT.test(source) || LITERAL_RELATIVE_IMPORT.test(source);
}

/** The worker entry, reached only when a kernel actually spawns: `new
 *  Worker(new URL(...))` compiles to a separate vite chunk, so the wasm
 *  payload is never part of the main/embed bundles. Must stay inside this
 *  function — a module-scope Worker would construct one for every studio
 *  load. */
function spawnKernelWorker(): Worker {
  return new Worker(new URL('./studioKernelWorker.ts', import.meta.url), { type: 'module' });
}

function browserKernelInstance(): BrowserKernel {
  if (instance === null) instance = createBrowserKernel({ spawn: spawnKernelWorker });
  return instance;
}

/** The kernel when it is warm for exactly `source`; null otherwise.
 *  `status() !== 'warm'` covers every sticky failure (host-fs, script-error,
 *  crash, timeout), and the tracked source covers a model this kernel was
 *  never warmed on (or one whose dispose already dropped the worker). */
export function browserKernelForSource(source: string): BrowserKernel | null {
  if (instance === null || warmedSource !== source || instance.status() !== 'warm') return null;
  return instance;
}

/** Warm the kernel for `(source, fileName)` in the background. Fire-and-
 *  forget: warm rejects on failure/dispose (see the client's typed errors) and
 *  no caller can act on that — routing simply sees a not-warm kernel. A new
 *  source swaps the old worker only after `WARM_SETTLE_MS` (latest swap wins,
 *  a change back to the current source cancels it) so no state leaks across
 *  models without churning the worker on every debounced code edit. */
export function warmBrowserKernel(source: string, fileName: string): void {
  // Intentionally skips the capability flag check; `warmKernelOnOpen` is the production entry.
  if (browserKernelSourceIsServerOnly(source)) return;
  if (warmedSource !== null && warmedSource !== source) {
    scheduleWarmSwap(source, fileName);
    return;
  }
  // Same source (or nothing warmed yet): any scheduled swap is stale — the
  // source about to be warm is the one it was going to swap away from.
  cancelPendingWarmSwap();
  const kernel = browserKernelInstance();
  warmedSource = source;
  void kernel.warm(source, fileName).catch(() => {});
}

/** Terminate the worker and forget the warmed source, dropping a pending
 *  swap with it. The client instance stays (the one singleton) and a later
 *  warm respawns its worker fresh — no state of the disposed model can leak
 *  into the new build. */
export function disposeBrowserKernel(): void {
  cancelPendingWarmSwap();
  instance?.dispose();
  warmedSource = null;
}

/** A warm a hidden tab is holding for the next `visibilitychange`: the latest
 *  applied source wins, and at most one listener waits for it. */
let pendingHiddenWarm: { source: string; fileName: string } | null = null;
let visibilityListenerAttached = false;

function flushPendingKernelWarm(): void {
  const pending = pendingHiddenWarm;
  pendingHiddenWarm = null;
  if (pending !== null) warmBrowserKernel(pending.source, pending.fileName);
}

function onVisibilityChangeForWarm(): void {
  if (document.visibilityState !== 'visible') return;
  document.removeEventListener('visibilitychange', onVisibilityChangeForWarm);
  visibilityListenerAttached = false;
  flushPendingKernelWarm();
}

/** Kick the browser kernel's background warm for the source a hosted payload
 *  was just applied for — the one warm-on-open seam both hosted routes call:
 *  `useMeshFetch`'s `?script=` apply and the auto-run loop's `?gallery=`
 *  apply. Locked: a hidden tab never starts the ~11 MB worker download — the
 *  warm is deferred (latest apply wins, one listener) to the first
 *  `visibilitychange` that makes the tab visible. The `fileName` is the
 *  `?script=` path (relative-import anchor), or a cosmetic `studio.kcad.ts`
 *  on routes without one; host-fs sources are filtered inside
 *  `warmBrowserKernel`. */
export function warmKernelOnOpen(source: string, fileName: string): void {
  if (!browserKernelEnabled()) return;
  if (typeof document === 'undefined') return;
  if (document.visibilityState === 'visible') {
    warmBrowserKernel(source, fileName);
    return;
  }
  pendingHiddenWarm = { source, fileName };
  if (visibilityListenerAttached) return;
  visibilityListenerAttached = true;
  document.addEventListener('visibilitychange', onVisibilityChangeForWarm);
}

/** Test-only: swap in a fake kernel and the source it is "warm" for, or clear
 *  the seam entirely. */
export function __setBrowserKernelForTests(kernel: BrowserKernel | null, source: string | null = null): void {
  instance = kernel;
  warmedSource = source;
}

/** Test-only: dispose, drop the singleton, and clear any warm a hidden tab is
 *  still holding (including its `visibilitychange` listener) or swap still
 *  scheduled. */
export function __resetBrowserKernelForTests(): void {
  cancelPendingWarmSwap();
  instance?.dispose();
  instance = null;
  warmedSource = null;
  pendingHiddenWarm = null;
  if (visibilityListenerAttached && typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', onVisibilityChangeForWarm);
  }
  visibilityListenerAttached = false;
}
