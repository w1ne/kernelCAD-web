// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/exportModel.ts
//
// Unified write-side export MCP tool. ONE tool, format-enum-dispatched —
// discoverable via list_api as the single entry "export the model to a file".
// Replaces the legacy `export_stl` shim (removed in the C2 cull).
//
// Format enum: stl | step | dxf | 3mf | glb | svg-drawing | urdf | srdf | sdf-gazebo.
// URDF / SDF-Gazebo exports also write companion meshes/<part>.stl files
// next to output_path (the emitted XML references them by relative path);
// the written paths are reported in `mesh_files`.

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { initOcct } from '../../../kernel/backends/occt/occtBackend';
import {
  runAndExport,
  type ExportFormat,
  type ExportOptions,
} from '../../script-runtime/export';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { withNextActions } from '../../../shared/diagnostics/diagnostic';
import { validateOutputPath } from '../../script-runtime/safeOutputPath';
import { loadMcpScriptSource } from '../runMcpScript';

export interface ExportModelInput {
  file?: string;
  code?: string;
  output_path: string;
  format: ExportFormat;
  feature_id?: string;
  /** Per-format options bag; discriminator `options.format` must match `format`. */
  options?: ExportOptions;
  /** Skip the STL watertight verify gate (default: verify on). */
  no_verify?: boolean;
}

export interface ExportModelOutput {
  ok: boolean;
  output_path?: string;
  byte_count?: number;
  /** Total features in the script, not the count contributing to the exported shape. */
  feature_count?: number;
  /** The format actually used for export; echoed for receipt-side dispatching. */
  format?: ExportFormat;
  /** Companion mesh files written next to output_path (URDF / SDF exports
   *  reference per-link meshes by relative path). */
  mesh_files?: string[];
  diagnostics?: CompilerDiagnostic[];
  error?: string;
}

/**
 * MCP `export_model` tool — runs a kernelCAD script and writes the geometry
 * to `output_path` in the requested `format`. The single, unified write-side
 * export entry point. (The legacy `export_stl` shim was removed in C2.)
 *
 * Pass either `{ file }` (path on disk) or `{ code }` (inline source),
 * plus a required `output_path` and `format`. Optional `feature_id` selects
 * which feature to export (default: last returned shape). Optional `options`
 * carries per-format knobs (see the kernelcad-mcp skill for the per-format
 * keys).
 *
 * STL exports run a watertight verify by default; a failing mesh still
 * writes the file (so the broken mesh can be inspected) but fails the call
 * with `export.mesh.not-watertight` unless `{ no_verify: true }`.
 *
 * Returns `{ ok, output_path, byte_count, feature_count, format, diagnostics }`.
 */
export async function exportModelTool(input: ExportModelInput): Promise<ExportModelOutput> {
  const { output_path, format, feature_id, options } = input;

  if (!output_path || typeof output_path !== 'string') {
    return { ok: false, error: 'Required: output_path' };
  }
  if (!format || typeof format !== 'string') {
    return { ok: false, error: 'Required: format' };
  }

  const source = await loadMcpScriptSource(input);
  if (!source.ok) return source;

  await initOcct();

  // `no_verify` mirrors export_part: plumb `verify: false` into the STL
  // options bag (the runtime gate is default-on).
  const effectiveOptions = format === 'stl' && input.no_verify
    ? { ...(options ?? {}), format: 'stl' as const, verify: false }
    : options;

  let result;
  try {
    result = await runAndExport({
      code: source.code,
      fileName: source.fileName,
      format,
      feature_id,
      options: effectiveOptions,
      scriptDir: input.file !== undefined ? dirname(resolve(input.file)) : undefined,
    });
  } catch (e) {
    return {
      ok: false,
      error: `Export failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  // Write-then-fail: a verify-gate failure (export.mesh.not-watertight)
  // still carries the mesh bytes — write the file for inspection BEFORE
  // failing the call, same contract as export_part. Other fatal paths
  // return empty bytes and fail without writing.
  const errorDiagnostics = result.diagnostics.filter(d => d.severity === 'error');
  if (errorDiagnostics.length > 0 && result.bytes.length === 0) {
    return {
      ok: false,
      diagnostics: withNextActions(result.diagnostics),
      feature_count: result.featureCount,
      format,
    };
  }

  const pathCheck = validateOutputPath(output_path);
  if (!pathCheck.ok) {
    return { ok: false, error: pathCheck.error };
  }
  const finalPath = pathCheck.resolved!;

  const meshFiles: string[] = [];
  try {
    await mkdir(dirname(finalPath), { recursive: true });
    await writeFile(finalPath, Buffer.from(result.bytes));
    // Robot-description exports (URDF / SDF) reference per-link mesh files
    // by relative path — write them next to the output file so the
    // document is consumable as-is.
    for (const m of result.meshes ?? []) {
      const meshPath = resolve(dirname(finalPath), m.relPath);
      await mkdir(dirname(meshPath), { recursive: true });
      await writeFile(meshPath, Buffer.from(m.bytes));
      meshFiles.push(meshPath);
    }
  } catch (e) {
    return {
      ok: false,
      error: `Cannot write to ${finalPath}: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  return {
    ok: errorDiagnostics.length === 0,
    output_path: finalPath,
    byte_count: result.bytes.byteLength,
    feature_count: result.featureCount,
    format,
    ...(meshFiles.length > 0 ? { mesh_files: meshFiles } : {}),
    diagnostics: withNextActions(result.diagnostics),
  };
}
