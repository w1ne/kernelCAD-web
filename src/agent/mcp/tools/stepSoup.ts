// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/agent/mcp/tools/stepSoup.ts
//
// STEP -> triangle soup for `mesh_to_features`. A STEP file carries an exact
// B-rep, not facets: the OCCT reader loads it (converting the file's length
// unit to millimetres), one solid is picked, and the export mesher tessellates
// it with an absolute deflection tied to the part size. The reconstruction
// pipeline then fits and verifies against that tessellation exactly as it
// does for an STL, so the fidelity numbers it reports are measured against
// the STEP geometry to within `tessellation.linearMm`.

import { meshStepSolid } from '../../../kernel/backends/occt/stepSolidMesh';
import { stepLengthToMillimetres } from '../../../modeling/parts/stepLengthUnit';
import type { TriangleSoup } from '../../reconstruct/meshIO';

export interface StepSoupOptions {
  /** 0-based solid index for a multi-solid STEP. Required when the file has more than one solid. */
  solid?: number;
}

export interface StepSourceReport {
  format: 'step';
  /** Solids found in the file. */
  solidCount: number;
  /** The solid that was rebuilt (0-based). */
  solid: number;
  /** Millimetres per file length unit, as declared in the STEP header (1 when undeclared). */
  mmPerFileUnit: number;
  /** Tessellation of the exact B-rep that the fit and the fidelity check run against. */
  tessellation: { linearMm: number; angularRad: number; triangles: number };
}

export type StepSoupResult =
  | { ok: true; soup: TriangleSoup; source: StepSourceReport }
  | { ok: false; error: string };

/** Absolute chord deflection: 0.02 % of the solid's bbox diagonal, kept in [0.002, 0.05] mm. */
export function stepTessellationDeflectionMm(diagonalMm: number): number {
  const mm = Math.min(0.05, Math.max(0.002, diagonalMm * 2e-4));
  return Math.round(mm * 1e4) / 1e4;
}

const ANGULAR_DEFLECTION_RAD = 0.05;

function unitName(mmPerUnit: number): string {
  const named: Array<[number, string]> = [[1, 'mm'], [10, 'cm'], [1000, 'm'], [25.4, 'inch'], [304.8, 'foot'], [0.001, 'micrometre']];
  const hit = named.find(([mm]) => Math.abs(mm - mmPerUnit) <= 1e-9 * Math.max(1, mm));
  return hit ? hit[1] : `${mmPerUnit} mm per unit`;
}

/** Read STEP bytes and tessellate one solid into a soup for the reconstruction pipeline. */
export async function stepBytesToSoup(bytes: Uint8Array, opts: StepSoupOptions = {}): Promise<StepSoupResult> {
  const meshed = await meshStepSolid(bytes, {
    ...(opts.solid !== undefined ? { solid: opts.solid } : {}),
    linearDeflectionMm: stepTessellationDeflectionMm,
    angularDeflectionRad: ANGULAR_DEFLECTION_RAD,
  });
  if (!meshed.ok) return meshed;
  const triangles = meshed.triangles.length / 3;
  const positions = new Float64Array(triangles * 9);
  for (let t = 0; t < triangles; t++) {
    for (let k = 0; k < 3; k++) {
      const v = meshed.triangles[t * 3 + k];
      positions[t * 9 + k * 3] = meshed.vertices[v * 3];
      positions[t * 9 + k * 3 + 1] = meshed.vertices[v * 3 + 1];
      positions[t * 9 + k * 3 + 2] = meshed.vertices[v * 3 + 2];
    }
  }
  const text = new TextDecoder().decode(bytes);
  const mmPerFileUnit = stepLengthToMillimetres(text);
  const unitDeclared = /\bLENGTH_UNIT\b/i.test(text);
  return {
    ok: true,
    soup: { positions, format: 'step', unitDeclared, ...(unitDeclared ? { unit: unitName(mmPerFileUnit) } : {}) },
    source: {
      format: 'step',
      solidCount: meshed.solidCount,
      solid: meshed.solid,
      mmPerFileUnit,
      tessellation: { linearMm: meshed.linearMm, angularRad: ANGULAR_DEFLECTION_RAD, triangles },
    },
  };
}
