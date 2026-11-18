// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/exportPart.ts
//
// Per-part STL export MCP tool. Runs a script that returns
// `assembly.solvedModel(...)` / `assembly.model()` and writes each selected
// part as its own binary STL in the part's modeled (world-frame) position.
// All logic lives in the shared script-runtime `runAndExportParts` — this
// layer only loads the source, validates destinations, and writes files.

import { summarizeScene, unavailableSceneSummary, type SceneSummary } from '../../script-runtime/sceneSummary';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { initOcct } from '../../../kernel/backends/occt/occtBackend';
import {
  runAndExportParts,
  stlNotWatertightDiagnostic,
  type ExportPartsResult,
} from '../../script-runtime/export';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { withNextActions } from '../../../shared/diagnostics/diagnostic';
import { validateOutputPath } from '../../script-runtime/safeOutputPath';
import { loadMcpScriptSource } from '../runMcpScript';
import type { ExportGeometryQualitySummary, QualityGateMode } from '../../script-runtime/export';
import type { ExportMeshToleranceOptions, MeshDeviationReport } from '../../../kernel/backends/occt/backendMesh';
import { validateExportMeshToleranceOptions } from '../../../kernel/backends/occt/backendMesh';
import { meshToleranceInvalidDiagnostic, meshToleranceNotMetDiagnostic } from '../../script-runtime/exportDiagnostics';
import { qualityGateInput } from './exportModel';

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
  /** Per-part geometry-quality gate: 'warn' (default), 'block' or 'off'. */
  qualityGate?: QualityGateMode;
  tiny_face_area_mm2?: number;
  short_edge_length_mm?: number;
  /** STL mesh controls applied independently to each selected part. */
  options?: ExportMeshToleranceOptions;
}

export interface WrittenPartFile {
  part: string;
  output_path: string;
  byte_count: number;
  triangle_count: number;
  watertight: boolean;
  mesh_deviation?: MeshDeviationReport;
}

export interface ExportPartOutput {
  ok: boolean;
  sceneSummary?: SceneSummary;
  written?: WrittenPartFile[];
  /** Per-part tiny-face / short-edge screen (qualityGate not 'off'). */
  geometryQuality?: ExportGeometryQualitySummary;
  diagnostics?: CompilerDiagnostic[];
  error?: string;
}

function validateExportDestinations(input: ExportPartInput, allParts: boolean): string | undefined {
  if (allParts) {
    if (!input.output_dir || typeof input.output_dir !== 'string') {
      return "Required: output_dir (all-parts mode; pass { part, output_path } for a single part)";
    }
  } else {
    if (!input.output_path || typeof input.output_path !== 'string') {
      return 'Required: output_path (single-part mode; pass { output_dir } with part omitted or "all" for all parts)';
    }
  }
  return undefined;
}

async function writeExportedParts(
  parts: ExportPartsResult['parts'],
  input: ExportPartInput,
  allParts: boolean,
  written: WrittenPartFile[],
  diagnostics: CompilerDiagnostic[],
): Promise<string | undefined> {
  for (const p of parts) {
    const destination = allParts
      ? join(input.output_dir!, `${p.fileSafeName}.stl`)
      : input.output_path!;
    const pathCheck = validateOutputPath(destination);
    if (!pathCheck.ok) {
      return pathCheck.error;
    }
    const finalPath = pathCheck.resolved!;
    try {
      await mkdir(dirname(finalPath), { recursive: true });
      await writeFile(finalPath, Buffer.from(p.bytes));
    } catch (e) {
      return `Cannot write to ${finalPath}: ${e instanceof Error ? e.message : String(e)}`;
    }
    written.push({
      part: p.name,
      output_path: finalPath,
      byte_count: p.bytes.byteLength,
      triangle_count: p.triangleCount,
      watertight: p.report.ok,
      ...(p.mesh_deviation === undefined ? {} : { mesh_deviation: p.mesh_deviation }),
    });
    if (p.mesh_deviation !== undefined &&
        p.mesh_deviation.measured_max_mm > p.mesh_deviation.requested_mm * 1.05) {
      diagnostics.push(meshToleranceNotMetDiagnostic(p.mesh_deviation, undefined, p.name));
    }
    if (!input.no_verify && !p.report.ok) {
      diagnostics.push(stlNotWatertightDiagnostic(p.report, undefined, p.name));
    }
  }
  return undefined;
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

  const toleranceError = validateExportMeshToleranceOptions(input.options);
  if (toleranceError !== undefined) {
    return { ok: false, diagnostics: withNextActions([meshToleranceInvalidDiagnostic(toleranceError)]) };
  }

  const destinationError = validateExportDestinations(input, allParts);
  if (destinationError !== undefined) {
    return { ok: false, error: destinationError };
  }

  const source = await loadMcpScriptSource(input);
  if (!source.ok) return source;

  await initOcct();

  let result;
  let sceneSummary = unavailableSceneSummary();
  try {
    result = await runAndExportParts({
      onBuild: root => { sceneSummary = summarizeScene(root); },
      code: source.code,
      fileName: source.fileName,
      scriptDir: input.file !== undefined ? dirname(resolve(input.file)) : undefined,
      ...(allParts ? {} : { parts: [input.part!] }),
      qualityGate: qualityGateInput(input),
      options: input.options,
    });
  } catch (e) {
    return {
      ok: false, sceneSummary,
      error: `Export failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const geometryQuality = result.geometryQuality === undefined ? {} : { geometryQuality: result.geometryQuality };
  const errorDiagnostics = result.diagnostics.filter(d => d.severity === 'error');
  if (errorDiagnostics.length > 0) {
    return { ok: false, sceneSummary, ...geometryQuality, diagnostics: withNextActions(result.diagnostics) };
  }

  const written: WrittenPartFile[] = [];
  const diagnostics: CompilerDiagnostic[] = [...result.diagnostics];
  const writeError = await writeExportedParts(result.parts, input, allParts, written, diagnostics);
  if (writeError !== undefined) {
    return { ok: false, sceneSummary, written, error: writeError };
  }

  const gateFailed = !input.no_verify && written.some(w => !w.watertight);
  const toleranceFailed = diagnostics.some(d => d.code === 'export.mesh.tolerance-not-met');
  return {
    ok: !gateFailed && !toleranceFailed,
    sceneSummary,
    written,
    ...geometryQuality,
    diagnostics: withNextActions(diagnostics),
  };
}
