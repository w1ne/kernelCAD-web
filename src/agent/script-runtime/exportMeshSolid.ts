// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/script-runtime/exportMeshSolid.ts
//
// Export of a mesh-solid body (a `.lattice()` result). There is no B-rep to
// re-tessellate: the triangles ARE the part, so STL / 3MF / OBJ write them
// as built, after the same watertight gate the B-rep STL path applies.
// B-rep-only formats (STEP, DXF, drawings, GLB / USD scene writers) are
// refused with `export.mesh-body.format-unsupported` rather than written
// from some approximation.

import type { CompilerDiagnostic } from '../../shared/diagnostics/diagnostic';
import { HINT_TEMPLATES, NEXT_ACTIONS } from '../../shared/diagnostics/registry';
import type { SolidMeshBackend } from '../../kernel/backends/solidMeshBackend';
import type { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { export3mfWithReportAsync, type Export3mfOptions, type MeshedPart } from '../../kernel/backends/occt/export3mf';
import { verifyWatertight } from '../../kernel/backends/occt/meshHeal';
import { exportMeshObj } from '../../kernel/export/meshFormats';
import type { LatticeReport } from '../../kernel/lattice/buildLattice';
import { stlNotWatertightDiagnostic } from './exportDiagnostics';

export const MESH_SOLID_EXPORT_FORMATS = ['stl', '3mf', 'obj'] as const;

export interface MeshSolidExportResult {
  bytes: Uint8Array;
  featureCount: number;
  diagnostics: CompilerDiagnostic[];
  latticeReport?: LatticeReport;
}

function unsupported(format: string, targetId: string): CompilerDiagnostic {
  return {
    target: 'export-occt',
    code: 'export.mesh-body.format-unsupported',
    featureId: targetId,
    severity: 'error',
    message: `'${format}' export needs a B-rep, but ${targetId} is a lattice mesh solid. Export it as ${MESH_SOLID_EXPORT_FORMATS.join(', ')}.`,
    hint: HINT_TEMPLATES['export.mesh-body.format-unsupported'].template,
    nextAction: NEXT_ACTIONS['export.mesh-body.format-unsupported'],
  };
}

export async function exportMeshSolid(
  format: string,
  options: unknown,
  shape: SolidMeshBackend,
  targetId: string,
  diagnostics: CompilerDiagnostic[],
  featureCount: number,
): Promise<MeshSolidExportResult> {
  const latticeReport = shape.facts.lattice as LatticeReport | undefined;
  const base = { featureCount, ...(latticeReport ? { latticeReport } : {}) };
  const mesh = { vertices: shape.positions, triangles: shape.indices };
  if (format === 'stl') {
    const bytes = shape.exportSTL();
    const verify = (options as { verify?: boolean } | undefined)?.verify !== false;
    const report = verify ? verifyWatertight(mesh) : undefined;
    return { ...base, bytes, diagnostics: report && !report.ok ? [...diagnostics, stlNotWatertightDiagnostic(report, targetId)] : diagnostics };
  }
  if (format === 'obj') {
    return { ...base, bytes: exportMeshObj([{ name: 'part', mesh }]), diagnostics };
  }
  if (format === '3mf') {
    const opts = (options as Export3mfOptions | undefined) ?? { format: '3mf' };
    // The writer reads `mesh` when present and never touches `shape` then.
    const part: MeshedPart = { name: 'part', shape: shape as unknown as OcctBackend, mesh };
    const { bytes } = await export3mfWithReportAsync([part], opts);
    return { ...base, bytes, diagnostics };
  }
  return { ...base, bytes: new Uint8Array(), diagnostics: [...diagnostics, unsupported(format, targetId)] };
}
