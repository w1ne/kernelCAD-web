// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { stlNotWatertightDiagnostic } from './exportDiagnostics';
import { exportStlWithOptions, meshToleranceFailure } from './exportMeshTolerance';
import type { ExportInput, ExportOptions, ExportResult } from './export';

export async function exportSingleStl(
  input: ExportInput,
  shape: OcctBackend,
  targetId: string,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): Promise<ExportResult> {
  const verify = (input.options as { verify?: boolean } | undefined)?.verify !== false;
  const { bytes, report, mesh_deviation } = await exportStlWithOptions(
    shape,
    input.options as Extract<ExportOptions, { format: 'stl' }> | undefined,
  );
  const toleranceFailure = meshToleranceFailure(mesh_deviation, targetId);
  if (verify && !report.ok) {
    return {
      bytes,
      featureCount,
      diagnostics: [
        ...diagnostics,
        ...(toleranceFailure === undefined ? [] : [toleranceFailure]),
        stlNotWatertightDiagnostic(report, targetId),
      ],
      ...(mesh_deviation === undefined ? {} : { mesh_deviation }),
    };
  }
  return {
    bytes,
    featureCount,
    diagnostics: [...diagnostics, ...(toleranceFailure === undefined ? [] : [toleranceFailure])],
    ...(mesh_deviation === undefined ? {} : { mesh_deviation }),
  };
}
