// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Host-filesystem PORT.
//
// A handful of modeling features are only meaningful when the script runs next
// to a real filesystem: `referenceImage()` checks the image exists and reads
// its pixel dimensions, `lib.fromSTEP` / `lib.fromSTL` read part files,
// `sketch.text({ font: fontPath(...) })` reads a TTF. Those code paths used to
// `import { existsSync } from 'node:fs'` DIRECTLY, which dragged `node:fs` into
// the static import graph of `src/modeling/api.ts` — i.e. into every browser
// bundle that wanted to evaluate a script, where it cannot resolve at all.
//
// This module is the seam. It is PURE (no node imports, browser-safe) and holds
// a registry with no default. The node facade installs the real implementation
// (`../../modeling/runtime/hostFsNode.ts`, side-effect import); the browser installs nothing.
//
// The contract is deliberately fail-loud: `requireHostFs(feature)` throws a
// KernelError naming the feature and why it is unavailable. Nothing here ever
// silently degrades — a browser script that calls `lib.fromSTEP` gets a
// diagnostic that says so, not a no-op and not a module-resolution crash.

import { KernelError } from '../intent/kernelError';

export interface ImageDimensions {
  width: number;
  height: number;
}

/** Capabilities the modeling layer needs from a real filesystem. */
export interface HostFs {
  /** True when `path` names an existing file. */
  fileExists(path: string): boolean;
  /** Pixel dimensions of a PNG/JPEG/WEBP, or {0,0} when unreadable. */
  imageDimensions(path: string): ImageDimensions;
  /** Resolve a script-relative asset path to an absolute one. */
  resolveScriptRelative(scriptDir: string | undefined, path: string): string;
  /** Read a file as bytes (fonts, STEP/STL payloads). */
  readFileBytes(path: string): Uint8Array;
}

let installed: HostFs | null = null;

/** Install the host filesystem. Called once by `modeling/runtime/hostFsNode.ts` on import. */
export function installHostFs(fs: HostFs): void {
  installed = fs;
}

/** The installed host filesystem, or `null` when there is none (browser). */
export function getHostFs(): HostFs | null {
  return installed;
}

/** True when a real filesystem is reachable from this runtime. */
export function hasHostFs(): boolean {
  return installed !== null;
}

/**
 * Fetch the host filesystem or throw a diagnostic naming the feature that
 * needed it. `feature` should read like the call the user made, e.g.
 * `lib.fromSTEP()`, so the message points at their own source line.
 */
export function requireHostFs(feature: string): HostFs {
  if (installed === null) {
    throw new KernelError(
      'cli.host-fs-unavailable',
      `${feature} needs filesystem access, which the browser runtime does not have. ` +
        `Run this script through the kernelCAD CLI or MCP server instead, or remove the ${feature} call.`,
    );
  }
  return installed;
}

/**
 * Test-only: drop the installed filesystem so a test can exercise the
 * browser-shaped runtime from a node process. Returns the previous value so
 * the caller can restore it.
 */
export function __setHostFsForTest(fs: HostFs | null): HostFs | null {
  const prev = installed;
  installed = fs;
  return prev;
}
