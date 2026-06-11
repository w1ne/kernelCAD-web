// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { isAbsolute, resolve } from 'node:path';

/**
 * Resolve a user-script-relative asset path (`lib.fromSTEP`,
 * `referenceImage`, texture refs) identically in every consumer:
 * absolute paths pass through; relative paths anchor at the script's
 * directory; with no known script directory (inline code), fall back
 * to process.cwd().
 */
export function resolveScriptRelativePath(
  scriptDir: string | undefined,
  path: string,
): string {
  if (isAbsolute(path)) return path;
  return resolve(scriptDir ?? process.cwd(), path);
}
