// src/agent/mcp/tools/exportPart.ts
//
// Per-part STL export MCP tool. Runs a script that returns
// `assembly.solvedModel(...)` / `assembly.model()` and writes each selected
// part as its own binary STL in the part's modeled (world-frame) position.
// All logic lives in the shared script-runtime `runAndExportParts` — this
// layer only loads the source, validates destinations, and writes files.

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { initOcct } from '../../../kernel/backends/occt/occtBackend';
import {
  runAndExportParts,
  stlNotWatertightDiagnostic,
} from '../../script-runtime/export';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { withNextActions } from '../../../shared/diagnostics/diagnostic';
import { validateOutputPath } from '../../script-runtime/safeOutputPath';
import { loadMcpScriptSource } from '../runMcpScript';

export interface ExportPartInput {
  file?: string;
  code?: string;
  /** Part name for a single-part export. Omit (or pass 'all') with output_dir for all parts. */
  part?: string;
  /** Destination .stl path (single-part mode). */
  output_path?: string;
  /** Destination directory (all-parts mode); files are <dir>/<part>.stl. */
  output_dir?: string;
  /** Skip the watertight verify gate (default: verify on). */
  no_verify?: boolean;
}

export interface WrittenPartFile {
  part: string;
  output_path: string;
  byte_count: number;
  watertight: boolean;
}

export interface ExportPartOutput {
  ok: boolean;
  written?: WrittenPartFile[];
  diagnostics?: CompilerDiagnostic[];
  error?: string;
}

/**
 * MCP `export_part` tool — export solved-assembly parts as individual
 * binary STL files in their modeled (world-frame) positions.
 *
 * Pass either `{ file }` or `{ code }`, plus `{ part, output_path }` for a
 * single part or `{ output_dir }` (with `part` omitted or `'all'`) for all
 * parts — files then land at `<output_dir>/<part>.stl`. A watertight verify
 * runs on every exported mesh by default; a failing part still writes its
 * file (so the broken mesh can be inspected) but fails the call with
 * `export.mesh.not-watertight` unless `{ no_verify: true }`.
 *
 * Returns `{ ok, written: [{ part, output_path, byte_count, watertight }], diagnostics }`.
 */
export async function exportPartTool(input: ExportPartInput): Promise<ExportPartOutput> {
  const allParts = input.part === undefined || input.part === 'all';

  if (allParts) {
    if (!input.output_dir || typeof input.output_dir !== 'string') {
      return { ok: false, error: "Required: output_dir (all-parts mode; pass { part, output_path } for a single part)" };
    }
  } else {
    if (!input.output_path || typeof input.output_path !== 'string') {
      return { ok: false, error: 'Required: output_path (single-part mode; pass { output_dir } with part omitted or "all" for all parts)' };
    }
  }

  const source = await loadMcpScriptSource(input);
  if (!source.ok) return source;

  await initOcct();

  let result;
  try {
    result = await runAndExportParts({
      code: source.code,
      fileName: source.fileName,
      scriptDir: input.file !== undefined ? dirname(resolve(input.file)) : undefined,
      ...(allParts ? {} : { parts: [input.part!] }),
    });
  } catch (e) {
    return {
      ok: false,
      error: `Export failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const errorDiagnostics = result.diagnostics.filter(d => d.severity === 'error');
  if (errorDiagnostics.length > 0) {
    return { ok: false, diagnostics: withNextActions(result.diagnostics) };
  }

  const written: WrittenPartFile[] = [];
  const diagnostics: CompilerDiagnostic[] = [...result.diagnostics];
  for (const p of result.parts) {
    const destination = allParts
      ? join(input.output_dir!, `${p.fileSafeName}.stl`)
      : input.output_path!;
    const pathCheck = validateOutputPath(destination);
    if (!pathCheck.ok) {
      return { ok: false, written, error: pathCheck.error };
    }
    const finalPath = pathCheck.resolved!;
    try {
      await mkdir(dirname(finalPath), { recursive: true });
      await writeFile(finalPath, Buffer.from(p.bytes));
    } catch (e) {
      return {
        ok: false,
        written,
        error: `Cannot write to ${finalPath}: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
    written.push({
      part: p.name,
      output_path: finalPath,
      byte_count: p.bytes.byteLength,
      watertight: p.report.ok,
    });
    if (!input.no_verify && !p.report.ok) {
      diagnostics.push(stlNotWatertightDiagnostic(p.report, undefined, p.name));
    }
  }

  const gateFailed = !input.no_verify && written.some(w => !w.watertight);
  return {
    ok: !gateFailed,
    written,
    diagnostics: withNextActions(diagnostics),
  };
}
