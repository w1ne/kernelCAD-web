// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { isAbsolute, resolve } from 'node:path';
import { getSandboxScriptPathCheck } from '../sandbox/config';

/**
 * Resolve a user-script-relative asset path (`lib.fromSTEP`,
 * `referenceImage`, texture refs) identically in every consumer:
 * absolute paths pass through; relative paths anchor at the script's
 * directory; with no known script directory (inline code), fall back
 * to process.cwd(). In sandbox mode the resolved path must stay inside the
 * workspace (docs/sandbox.md).
 */
export function resolveScriptRelativePath(
  scriptDir: string | undefined,
  path: string,
): string {
  const abs = isAbsolute(path) ? path : resolve(scriptDir ?? process.cwd(), path);
  // Sandbox mode: refuse script asset paths outside the workspace here, with a
  // structured diagnostic, before the reader turns it into a generic
  // "cannot read" error. The node:fs chokepoint still backs this up.
  getSandboxScriptPathCheck()?.(path, abs);
  return abs;
}
