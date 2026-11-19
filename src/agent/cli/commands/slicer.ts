// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/cli/commands/slicer.ts
//
// `kernelcad slicer open <file>` opens an already-exported STEP or 3MF file in
// a locally installed slicer. Detection order: `KERNELCAD_SLICER` env var,
// then `orca-slicer`, `prusa-slicer`, `PrusaSlicer`, `bambu-studio`,
// `BambuStudio`, `cura` on PATH. If no slicer is found the command returns a
// typed `{ ok: false, error: 'no-slicer' }` result and leaves the file on disk.

import { Command } from 'commander';
import { stat } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import {
  openFileInSlicer,
  type OpenSlicerError,
  type OpenSlicerResult,
} from '../../../kernel/export/gcode/slicerCli';

export interface OpenSlicerCliInput {
  file: string;
}

export interface OpenSlicerCliResult {
  exitCode: number;
  ok: boolean;
  result?: OpenSlicerResult;
  message: string;
}

const SUPPORTED_EXTENSIONS = new Set(['.step', '.stp', '.3mf']);

/** Human-readable label for an {@link OpenSlicerError}. */
function openSlicerErrorLabel(error: OpenSlicerError): string {
  switch (error) {
    case 'no-slicer': return 'No slicer found';
    case 'spawn-failed': return 'Slicer failed to start';
    default:
      return 'Open slicer failed';
  }
}

/**
 * Action behind `kernelcad slicer open`. Returns exit code 2 for input
 * problems (bad extension, missing file), 1 when no slicer is available or the
 * slicer could not be launched, and 0 on success.
 */
export async function runOpenSlicerCli(input: OpenSlicerCliInput): Promise<OpenSlicerCliResult> {
  const extension = extname(input.file).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    return {
      exitCode: 2,
      ok: false,
      message: `Unsupported file type '${extension}'. Expected .step, .stp, or .3mf.`,
    };
  }

  let filePath: string;
  try {
    filePath = resolve(input.file);
    const info = await stat(filePath);
    if (!info.isFile()) {
      return { exitCode: 2, ok: false, message: `Not a file: ${filePath}` };
    }
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return { exitCode: 2, ok: false, message: `Cannot read file '${input.file}': ${detail}` };
  }

  const result = await openFileInSlicer(filePath);
  if (!result.ok) {
    const label = openSlicerErrorLabel(result.error!);
    const message = result.error === 'no-slicer'
      ? `${label}. The file remains at ${filePath}.`
      : `${label}: ${result.message ?? result.error}`;
    return { exitCode: 1, ok: false, result, message };
  }

  return {
    exitCode: 0,
    ok: true,
    result,
    message: `Opened ${filePath} in ${result.binary}`,
  };
}

export function slicerCommand(): Command {
  const cmd = new Command('slicer')
    .description('Open a STEP or 3MF file in an installed local slicer');

  cmd
    .command('open')
    .description('Open an already-exported STEP/3MF file in the detected local slicer')
    .argument('<file>', 'path to a .step, .stp, or .3mf file')
    .option('--json', 'emit the result as JSON')
    .action(async (file: string, opts: { json?: boolean }) => {
      const r = await runOpenSlicerCli({ file });
      const payload = {
        ok: r.ok,
        file: r.result?.file,
        ...(r.result?.binary !== undefined ? { binary: r.result.binary } : {}),
        ...(r.result?.error !== undefined ? { error: r.result.error } : {}),
        message: r.message,
      };
      if (opts.json) {
        console.log(JSON.stringify(payload, null, 2));
      } else if (r.ok) {
        console.log(r.message);
      } else {
        console.error(r.message);
      }
      process.exitCode = r.exitCode;
    });

  return cmd;
}
