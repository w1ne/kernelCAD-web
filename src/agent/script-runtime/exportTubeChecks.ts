// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { runScript } from '../../composition/runScript';
import type { RecomputeEngine } from '../../modeling/compute/recomputeEngine';
import { runTubeChecksOnModel } from '../../modeling/runtime/tube/runTubeChecks';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import type { ExportFormat } from './export';

const FABRICATION_FORMATS: ReadonlySet<ExportFormat> = new Set(['step', 'stl', 'dxf', '3mf', 'gcode']);

/** Check the already-lowered model before fabrication bytes are serialized.
 * GLB, drawings and simulation exports remain available for inspection;
 * bend-table runs this same gate through its evaluation path. */
export async function tubeExportDiagnostics(
  format: ExportFormat | undefined,
  run: Awaited<ReturnType<typeof runScript>>,
  result: Awaited<ReturnType<RecomputeEngine['run']>>,
): Promise<CompilerDiagnostic[]> {
  if (format === undefined || !FABRICATION_FORMATS.has(format) || result.diagnostics.some(d => d.severity === 'error')) {
    return result.diagnostics;
  }
  const report = await runTubeChecksOnModel({
    ...result,
    session: run.session,
    records: run.records,
    warnings: run.session.warnings,
  });
  return [...result.diagnostics, ...(report?.diagnostics ?? [])];
}
