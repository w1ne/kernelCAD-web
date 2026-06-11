// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/cli/lib/readScript.ts
//
// Shared CLI-layer helper: read a .kcad.ts script from disk, mapping FS
// failures to a structured `cli.file-read` diagnostic instead of an
// uncaught exception. Used by `export`, `parts`, and any future
// script-consuming command so the read-failure contract stays identical.

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { withNextActions } from '../../../shared/diagnostics/diagnostic';

export type ReadScriptResult =
  | { ok: true; filePath: string; code: string }
  | { ok: false; diagnostics: CompilerDiagnostic[] };

/** Read `file` (resolved to an absolute path) or return a `cli.file-read`
 *  diagnostic suitable for direct inclusion in a CLI result envelope. */
export async function readScriptOrDiagnostic(file: string): Promise<ReadScriptResult> {
  const filePath = resolve(file);
  try {
    return { ok: true, filePath, code: await readFile(filePath, 'utf8') };
  } catch (e) {
    return {
      ok: false,
      diagnostics: withNextActions([{
        target: 'export-occt', code: 'cli.file-read', severity: 'error',
        message: e instanceof Error ? e.message : String(e),
        hint: 'Check that the file path exists and is readable.',
      }]),
    };
  }
}
