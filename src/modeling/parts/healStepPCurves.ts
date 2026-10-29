// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/parts/healStepPCurves.ts
//
// Import-time pcurve rebuild for STEP files whose faces fail BRepCheck.
//
// A STEP face carries its surface, its 3D boundary curves and (optionally) the
// same boundary as 2D curves in the face's parameter space ("pcurves"). The
// pcurves are redundant — a reader can rebuild them from the 3D curves and the
// surface — and some source files carry a pcurve that a strict reader accepts
// only on the machine that wrote it. CADGenBench 217's input is that class:
// one small B-spline face (49.9 mm², one wire, 364-face solid) fails
// `BRepCheck_Analyzer` on a fresh import while the benchmark's gate accepts
// the same file. Every edit inherits the face, and a re-export that copies the
// pcurve is rejected downstream as `BRepCheck_UnorientableShape`, so the task
// could not be completed at all.
//
// The repair is a round-trip, not a patch: write the body to STEP without
// surface pcurves, re-import it, and keep the result only when it is
// BRepCheck-valid with the same solid count, face count and volume. A healthy
// import never reaches this code (`importStepCached` runs it only after the
// whole-shape check fails), and any throw or mismatch returns undefined so the
// original import is untouched.

import * as replicad from 'replicad';
import { getOC } from 'replicad';
import { writeStepAssembly } from '../../kernel/backends/occt/stepAssemblyExport';
import { isValidShape, volumeOf } from '../../kernel/backends/occt/booleanRecovery';

/** Relative volume change accepted across the round-trip. Dropping pcurves
 *  must not move geometry; this only catches a writer/reader fault. */
export const PCURVE_REBUILD_VOLUME_TOL = 1e-4;

export interface ImportedShapeFacts {
  solids: number;
  faces: number;
  volume: number;
}

/** Counts + volume of an imported solid, the identity the round-trip must keep. */
export function importedShapeFacts(shape: replicad.Shape3D): ImportedShapeFacts {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrapped = (shape as any).wrapped;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  let solids = 0;
  const explorer = new oc.TopExp_Explorer_2(
    wrapped,
    oc.TopAbs_ShapeEnum.TopAbs_SOLID,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
  );
  try {
    while (explorer.More()) {
      solids++;
      explorer.Next();
    }
  } finally {
    explorer.delete();
  }
  return { solids, faces: shape.faces.length, volume: volumeOf(getOC(), wrapped) };
}

/** Whether a pcurve-free round-trip preserved the body it was given. */
export function pcurveRebuildMatches(before: ImportedShapeFacts, after: ImportedShapeFacts): boolean {
  if (before.solids !== after.solids || before.faces !== after.faces) return false;
  if (!(after.volume > 0) || !Number.isFinite(after.volume)) return false;
  const scale = Math.max(1, before.volume);
  return Math.abs(after.volume - before.volume) <= PCURVE_REBUILD_VOLUME_TOL * scale;
}

/**
 * Rewrite an imported body without surface pcurves and re-import it. Returns
 * the rebuilt shape only when it is BRepCheck-valid and identical in solid
 * count, face count and volume; otherwise undefined.
 */
export async function rebuildImportedPCurves(
  shape: replicad.Shape3D,
): Promise<replicad.Shape3D | undefined> {
  let bytes: Uint8Array;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bytes = writeStepAssembly([{ name: 'import', shape: (shape as any).wrapped }], { surfaceCurves: false });
  } catch {
    return undefined;
  }
  try {
    const r = await replicad.importSTEP(new Blob([new Uint8Array(bytes)]));
    const imported = r as replicad.Shape3D;
    if (typeof (imported as { meshShape?: unknown }).meshShape !== 'function') return undefined;
    if (!isValidShape(getOC(), (imported as unknown as { wrapped: unknown }).wrapped)) return undefined;
    if (!pcurveRebuildMatches(importedShapeFacts(shape), importedShapeFacts(imported))) return undefined;
    return imported;
  } catch {
    return undefined;
  }
}
