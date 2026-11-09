// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { exportMeshDeflection, type ExportMeshToleranceOptions, type MeshDeviationReport } from '../../kernel/backends/occt/backendMesh';
import type { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import type { WatertightReport } from '../../kernel/backends/occt/meshHeal';
import { stampStlMeshTolerance } from '../../kernel/backends/occt/exportStlBinary';
import type { WorldFramePart } from '../../kernel/backends/occt/sceneToWorldFrame';
import { measureBrepSurfaceDeviation, measureBrepSurfaceDeviationFromBinaryStl } from './meshDeviation';
import { meshToleranceNotMetDiagnostic } from './exportDiagnostics';

export interface StlMeshToleranceOptions extends ExportMeshToleranceOptions {
  verify?: boolean;
}

export function measureWorldFramePartsDeviation(
  parts: readonly WorldFramePart[],
  requestedMm: number,
): MeshDeviationReport {
  return measureBrepSurfaceDeviation(
    parts.map(part => part.shape.getReplicadShape()),
    parts.map(part => part.mesh),
    requestedMm,
  );
}

export function meshToleranceFailure(
  report: MeshDeviationReport | undefined,
  targetId: string,
): CompilerDiagnostic | undefined {
  if (report === undefined || report.measured_max_mm <= report.requested_mm * 1.05) return undefined;
  return meshToleranceNotMetDiagnostic(report, targetId);
}

export async function exportStlWithOptions(
  shape: OcctBackend,
  options?: StlMeshToleranceOptions,
): Promise<{ bytes: Uint8Array; report: WatertightReport; mesh_deviation?: MeshDeviationReport }> {
  const controls = meshToleranceControls(options);
  const toleranceRequested = options?.tolerance !== undefined;
  const initialDeflection = toleranceRequested
    ? exportMeshDeflection({ angularToleranceDeg: options?.angularToleranceDeg })
    : exportMeshDeflection(controls);
  let exported = await shape.exportSTLWithReportAsync(initialDeflection);
  let mesh_deviation = measureStlDeviation(shape, exported.bytes, options?.tolerance);
  if (deviationExceedsTolerance(mesh_deviation)) {
    exported = await shape.exportSTLWithReportAsync(exportMeshDeflection(controls));
    mesh_deviation = measureStlDeviation(shape, exported.bytes, options?.tolerance);
  }
  if (options?.tolerance !== undefined) {
    exported = { ...exported, bytes: stampStlMeshTolerance(exported.bytes, options.tolerance) };
  }
  return { ...exported, ...(mesh_deviation === undefined ? {} : { mesh_deviation }) };
}

function deviationExceedsTolerance(report: MeshDeviationReport | undefined): boolean {
  return report !== undefined && report.measured_max_mm > report.requested_mm * 1.05;
}

function meshToleranceControls(options?: StlMeshToleranceOptions): ExportMeshToleranceOptions {
  return {
    ...(options?.tolerance === undefined ? {} : { tolerance: options.tolerance }),
    ...(options?.angularToleranceDeg === undefined ? {} : { angularToleranceDeg: options.angularToleranceDeg }),
  };
}

function measureStlDeviation(
  shape: OcctBackend,
  bytes: Uint8Array,
  requestedMm: number | undefined,
): MeshDeviationReport | undefined {
  return requestedMm === undefined
    ? undefined
    : measureBrepSurfaceDeviationFromBinaryStl([shape.getReplicadShape()], bytes, requestedMm);
}
