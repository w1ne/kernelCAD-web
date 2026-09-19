// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/backendInit.ts
import * as replicad from 'replicad';
import opencascade from 'replicad-opencascadejs';

let initialized = false;

/** Whether `initOcct` has completed in this module instance. */
export function isOcctInitialized(): boolean {
  return initialized;
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

export async function initOcct(opts?: InitOcctOptions): Promise<void> {
  if (initialized) return;
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
