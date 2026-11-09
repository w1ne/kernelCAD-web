// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { exportMeshObjZip, exportMeshUsd, type NamedMesh } from '../../kernel/export/meshFormats';
import { lookupColorFromLineage, lookupMaterialFromLineage } from '../../kernel/backends/occt/lookupSourceColor';
import { exportMeshDeflection, type ExportMeshToleranceOptions, type MeshDeviationReport } from '../../kernel/backends/occt/backendMesh';
import { meshShapeForExport, type OcctBackend } from '../../kernel/backends/occt/occtBackend';
import type { WorldFramePart } from '../../kernel/backends/occt/sceneToWorldFrame';
import { measureBrepSurfaceDeviation } from './meshDeviation';
import { meshToleranceNotMetDiagnostic } from './exportDiagnostics';
import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { ExportOptions, ExportResult } from './export';

type MeshTextFormat = 'obj' | 'usd';

export function exportSceneTextMesh(
  format: MeshTextFormat,
  worldParts: readonly WorldFramePart[],
  targetId: string,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
  options?: Extract<ExportOptions, { format: 'obj' }>,
): ExportResult {
  const requested = format === 'obj' ? options?.tolerance : undefined;
  const initialDeflection = initialMeshDeflection(options);
  let parts = sceneTextMeshes(worldParts, initialDeflection);
  let mesh_deviation = measureSceneTextMeshes(worldParts, parts, requested);
  if (toleranceNeedsRefinement(mesh_deviation)) {
    parts = sceneTextMeshes(worldParts, exportMeshDeflection(options));
    mesh_deviation = measureSceneTextMeshes(worldParts, parts, requested);
  }
  const bytes = serializeTextMeshes(format, parts, requested);
  const toleranceFailure = deviationFailure(mesh_deviation, targetId);
  return {
    bytes,
    featureCount,
    diagnostics: [...diagnostics, ...(toleranceFailure === undefined ? [] : [toleranceFailure])],
    ...(mesh_deviation === undefined ? {} : { mesh_deviation }),
  };
}

export function exportSingleTextMesh(
  shape: OcctBackend,
  format: MeshTextFormat,
  targetId: string,
  records: readonly FeatureRecord[],
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
  options?: Extract<ExportOptions, { format: 'obj' }>,
): ExportResult {
  const tail = records.find(record => record.id === targetId);
  const color = tail === undefined ? undefined : lookupColorFromLineage(tail, records);
  const material = tail === undefined ? undefined : lookupMaterialFromLineage(tail, records);
  const { mesh, mesh_deviation } = singleShapeTextMesh(shape, options);
  const parts: NamedMesh[] = [{
    name: 'part',
    mesh,
    ...(color === undefined ? {} : { color }),
    ...(material === undefined ? {} : { material }),
  }];
  const bytes = serializeTextMeshes(format, parts, options?.tolerance);
  const toleranceFailure = deviationFailure(mesh_deviation, targetId);
  return {
    bytes,
    featureCount,
    diagnostics: [...diagnostics, ...(toleranceFailure === undefined ? [] : [toleranceFailure])],
    ...(mesh_deviation === undefined ? {} : { mesh_deviation }),
  };
}

function initialMeshDeflection(options?: ExportMeshToleranceOptions) {
  return options?.tolerance === undefined
    ? exportMeshDeflection(options)
    : exportMeshDeflection({ angularToleranceDeg: options.angularToleranceDeg });
}

function sceneTextMeshes(
  worldParts: readonly WorldFramePart[],
  deflection: ReturnType<typeof exportMeshDeflection>,
): NamedMesh[] {
  return worldParts.map(part => ({
    name: part.name,
    mesh: meshShapeForExport(part.shape.getReplicadShape(), deflection),
    ...(part.material === undefined ? {} : { material: part.material }),
    ...(part.color === undefined ? {} : { color: part.color }),
    ...(part.colorParamName === undefined ? {} : { colorParamName: part.colorParamName }),
  }));
}

function measureSceneTextMeshes(
  worldParts: readonly WorldFramePart[],
  parts: readonly NamedMesh[],
  requested: number | undefined,
): MeshDeviationReport | undefined {
  return requested === undefined
    ? undefined
    : measureBrepSurfaceDeviation(
        worldParts.map(part => part.shape.getReplicadShape()),
        parts.map(part => part.mesh),
        requested,
      );
}

function singleShapeTextMesh(
  shape: OcctBackend,
  options?: Extract<ExportOptions, { format: 'obj' }>,
): { mesh: ReturnType<typeof meshShapeForExport>; mesh_deviation?: MeshDeviationReport } {
  const firstDeflection = initialMeshDeflection(options);
  let mesh = meshShapeForExport(shape.getReplicadShape(), firstDeflection);
  let mesh_deviation = options?.tolerance === undefined
    ? undefined
    : measureBrepSurfaceDeviation([shape.getReplicadShape()], [mesh], options.tolerance);
  if (toleranceNeedsRefinement(mesh_deviation)) {
    mesh = meshShapeForExport(shape.getReplicadShape(), exportMeshDeflection(options));
    mesh_deviation = measureBrepSurfaceDeviation([shape.getReplicadShape()], [mesh], options!.tolerance!);
  }
  return { mesh, ...(mesh_deviation === undefined ? {} : { mesh_deviation }) };
}

function toleranceNeedsRefinement(report: MeshDeviationReport | undefined): boolean {
  return report !== undefined && report.measured_max_mm > report.requested_mm * 1.05;
}

function deviationFailure(
  report: MeshDeviationReport | undefined,
  targetId: string,
): CompilerDiagnostic | undefined {
  return toleranceNeedsRefinement(report) ? meshToleranceNotMetDiagnostic(report!, targetId) : undefined;
}

function serializeTextMeshes(format: MeshTextFormat, parts: readonly NamedMesh[], tolerance?: number): Uint8Array {
  return format === 'obj'
    ? exportMeshObjZip(parts, tolerance === undefined ? undefined : { toleranceMm: tolerance })
    : exportMeshUsd(parts);
}
