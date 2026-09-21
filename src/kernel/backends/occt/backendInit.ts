// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/backendInit.ts
import * as replicad from 'replicad';
import opencascade from 'replicad-opencascadejs';
import { describeOcctThrow, isOcctWasmPoisoned, WASM_POISON_MARKER } from './occtException';

let initialized = false;

/** Last options passed to init/reset — reused so a browser host's locateFile survives reset. */
let lastInitOpts: InitOcctOptions | undefined;
/** Coalesce concurrent initOcct/resetOcct callers onto one factory load. */
let initInFlight: Promise<void> | null = null;
/** Hooks run at the start of resetOcct (e.g. abandon STEP parse-cache masters). */
const occtResetHooks: Array<() => void> = [];

/** Whether `initOcct` has completed in this module instance. */
export function isOcctInitialized(): boolean {
  return initialized;
}

/**
 * Register a callback invoked when the OCCT wasm module is about to be replaced.
 * Hooks must NOT call into OCCT (the heap may already be poisoned). Clear JS-side
 * caches of OcctBackend handles without `.dispose()` — dispose would touch the
 * corrupt heap and throw again.
 */
export function registerOcctResetHook(hook: () => void): void {
  occtResetHooks.push(hook);
}

/**
 * Initialize OpenCascade WASM and bind it to Replicad.
 *
 * Idempotent — safe to call multiple times. Must be awaited before any
 * `OcctBackend` static factory or method that constructs/measures shapes.
 *
 * Uses the same factory-style import as `HeadlessKernel` so it works in both
 * Node (vitest) and bundler (vite) contexts. Browser builds can pre-resolve
 * the WASM URL via Vite's `?url` syntax and pass it as `opts.locateFile`.
 *
 * Passing `locateFile` matters in a browser and nowhere else. Emscripten's
 * default resolution reads `document.currentScript`, which is null in a module
 * worker, so `scriptDirectory` collapses to `''` and the 10.8 MB wasm is
 * fetched relative to the *page* — meaning a page at `/docs/finish-edges.html`
 * asks for `/docs/replicad_single.wasm` and 404s. Callers that already know the
 * bundled asset URL pass it here rather than depending on that heuristic.
 * Node callers pass nothing and behave exactly as before.
 *
 * Because init is idempotent, a host that calls this WITH a `locateFile` early
 * also fixes the later argument-less call inside `meshFeaturesPerFeature`.
 */
export interface InitOcctOptions {
  /** Maps an Emscripten-requested file name to a URL. Browser hosts only. */
  locateFile?: (file: string) => string;
}

async function loadAndBindOcct(opts?: InitOcctOptions): Promise<void> {
  // Only forward a module argument when the caller supplied one — passing
  // `{}` is not the same as passing nothing to some Emscripten builds.
  const moduleArg = opts?.locateFile ? { locateFile: opts.locateFile } : undefined;
  let OC: unknown;
  if (typeof opencascade === 'function') {
    OC = await (opencascade as unknown as (m?: unknown) => Promise<unknown>)(moduleArg);
  } else if (
    opencascade &&
    typeof (opencascade as { default?: (m?: unknown) => Promise<unknown> }).default === 'function'
  ) {
    OC = await (opencascade as { default: (m?: unknown) => Promise<unknown> }).default(moduleArg);
  } else {
    throw new Error('Could not find opencascade factory function');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  replicad.setOC(OC as any);
  initialized = true;
}

export async function initOcct(opts?: InitOcctOptions): Promise<void> {
  if (opts) lastInitOpts = opts;
  if (initialized) return;
  if (initInFlight) return initInFlight;
  initInFlight = (async () => {
    try {
      await loadAndBindOcct(lastInitOpts);
    } finally {
      initInFlight = null;
    }
  })();
  return initInFlight;
}

/**
 * Drop the live OCCT wasm module and load a fresh one in-process.
 *
 * Node has no worker to terminate: after an embind double-free / abort the
 * process-global heap stays poisoned and even `sphere()`/`box()` fail with
 * `RuntimeError: memory access out of bounds`. Browser GeometryEngine can
 * `terminate()` + re-init the worker; this is the Node equivalent.
 *
 * Does not invent an occt-wasm `releaseAll` — we just clear the initialized
 * flag, abandon JS-side caches via registerOcctResetHook, and call the
 * replicad-opencascadejs factory again (verified to recover sphere/box).
 */
export async function resetOcct(opts?: InitOcctOptions): Promise<void> {
  if (opts) lastInitOpts = opts;
  // Wait out any in-flight init so we don't race two factories.
  if (initInFlight) {
    try { await initInFlight; } catch { /* ignore — we are replacing anyway */ }
  }
  initialized = false;
  for (const hook of occtResetHooks) {
    try { hook(); } catch { /* best-effort; hooks must not touch OCCT */ }
  }
  initInFlight = (async () => {
    try {
      await loadAndBindOcct(lastInitOpts);
    } finally {
      initInFlight = null;
    }
  })();
  return initInFlight;
}

/**
 * Run `op`; if it throws a wasm-poison RuntimeError, resetOcct once and retry.
 * A second poison failure is rethrown with WASM_POISON_MARKER so callers
 * surface a host-condition diagnostic (mirrors the OOM retry pattern in
 * stepParseCache / PR #645).
 */
export async function withOcctPoisonRecovery<T>(op: () => Promise<T>): Promise<T> {
  try {
    return await op();
  } catch (e) {
    if (!isOcctWasmPoisoned(e)) throw e;
    await resetOcct();
    try {
      return await op();
    } catch (retryErr) {
      if (isOcctWasmPoisoned(retryErr)) {
        throw new Error(
          `${WASM_POISON_MARKER}: ${describeOcctThrow(retryErr)}. ` +
            'Reset + retry still failed; restart the host process.',
        );
      }
      throw retryErr;
    }
  }
}
