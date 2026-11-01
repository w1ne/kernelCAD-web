// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/runtime/dfm/latticeCheck.ts
//
// DFM for lattice (mesh-solid) parts. The generic min-wall / void probes
// would ray-cast millions of lattice triangles and report every enclosed
// lattice channel as an undeclared void; instead the lattice's own measured
// wall (5th percentile across walls / struts, sampled on the built mesh) is
// compared with dfmSpec.minWall and, for FDM, twice the nozzle, and the
// enclosed void network of a skinned lattice is reported as information.

import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { DIAGNOSTIC_REGISTRY, type DiagnosticCode } from '../../../shared/diagnostics/registry';
import type { DfmSpecMetadata } from '../../../shared/intent/dfmSpecRecord';
import { SolidMeshBackend } from '../../../kernel/backends/solidMeshBackend';
import type { LatticeReport } from '../../../kernel/lattice/buildLattice';

export interface LatticeDfmResult {
  part: string;
  measuredWallP5Mm?: number;
  requiredMinWallMm?: number;
  enclosed: boolean;
}

function emit(code: DiagnosticCode, message: string, severity?: CompilerDiagnostic['severity']): CompilerDiagnostic {
  const entry = DIAGNOSTIC_REGISTRY[code];
  return { target: 'export-occt', code, severity: severity ?? entry.defaultSeverity, message, hint: entry.hintTemplate, nextAction: entry.nextAction };
}

/** Lattice report of a part shape, or undefined for any other body. */
export function latticeReportOf(shape: unknown): LatticeReport | undefined {
  return shape instanceof SolidMeshBackend ? (shape.facts.lattice as LatticeReport | undefined) : undefined;
}

/** The printable minimum wall and what sets it, or undefined. */
function requiredWall(spec: DfmSpecMetadata): { mm: number; why: string } | undefined {
  const nozzleMin = spec.fdm !== undefined ? 2 * spec.fdm.nozzleMm : 0;
  const declared = spec.minWall ?? 0;
  if (declared <= 0 && nozzleMin <= 0) return undefined;
  return declared >= nozzleMin
    ? { mm: declared, why: `dfmSpec.minWall ${declared} mm` }
    : { mm: nozzleMin, why: `2 x nozzle (${nozzleMin} mm)` };
}

export function checkLatticePart(
  part: string, report: LatticeReport, spec: DfmSpecMetadata, diagnostics: CompilerDiagnostic[],
): LatticeDfmResult {
  const required = requiredWall(spec);
  const wall = report.measuredWallMm;
  if (required !== undefined && wall !== undefined && wall.p5Mm < required.mm) {
    diagnostics.push(emit('dfm.lattice.wall-too-thin',
      `dfm.lattice: part '${part}' ${report.type} ${report.variant} lattice measures ${wall.p5Mm.toFixed(2)} mm at the 5th percentile `
      + `(min ${wall.minMm.toFixed(2)} mm, ${wall.samples} samples) — below ${required.why}.`));
  }
  const enclosed = report.skinMm > 0;
  if (enclosed) {
    const process = spec.fdm !== undefined ? ' (prints like FDM infill)' : ' (drain it for resin / powder processes)';
    diagnostics.push(emit('dfm.lattice.enclosed-cavities',
      `dfm.lattice: part '${part}' — the ${report.skinMm} mm skin seals the lattice's void network${process}.`));
  }
  return {
    part,
    ...(wall !== undefined ? { measuredWallP5Mm: wall.p5Mm } : {}),
    ...(required !== undefined ? { requiredMinWallMm: required.mm } : {}),
    enclosed,
  };
}

/** Run the lattice check when `shape` is a lattice body; true when it was. */
export function checkIfLatticePart(
  part: string, shape: unknown, spec: DfmSpecMetadata, diagnostics: CompilerDiagnostic[], out: LatticeDfmResult[],
): boolean {
  const report = latticeReportOf(shape);
  if (report === undefined) return false;
  out.push(checkLatticePart(part, report, spec, diagnostics));
  return true;
}
