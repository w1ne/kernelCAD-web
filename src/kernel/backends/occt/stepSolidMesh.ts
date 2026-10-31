// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/stepSolidMesh.ts
//
// Read STEP bytes, pick one TopAbs_SOLID and tessellate it with the export
// mesher at an absolute chord deflection derived from that solid's size.
// Used by the STEP -> editable-feature-tree path, which fits and verifies
// against this tessellation of the exact B-rep.

import * as replicad from 'replicad';
import { getOC } from 'replicad';
import { importStepShape } from '../../import/inspectStep';
import { meshShapeForExport } from './backendMesh';

export interface StepSolidMeshOptions {
  /** 0-based solid index. Required when the file has more than one solid. */
  solid?: number;
  /** Absolute chord deflection (mm) for a solid of the given bbox diagonal. */
  linearDeflectionMm: (diagonalMm: number) => number;
  angularDeflectionRad: number;
}

export type StepSolidMesh =
  | {
      ok: true;
      solidCount: number;
      solid: number;
      linearMm: number;
      vertices: number[];
      triangles: number[];
    }
  | { ok: false; error: string };

/** Split an imported shape into its TopAbs_SOLID children (caller deletes them). */
function solidsOf(shape: replicad.Shape3D): replicad.Shape3D[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const explorer = new oc.TopExp_Explorer_2((shape as any).wrapped, oc.TopAbs_ShapeEnum.TopAbs_SOLID, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
  const out: replicad.Shape3D[] = [];
  try {
    while (explorer.More()) {
      out.push(replicad.cast(oc.TopoDS.Solid_1(explorer.Current())) as replicad.Shape3D);
      explorer.Next();
    }
  } finally {
    explorer.delete();
  }
  return out;
}

function diagonalOf(shape: replicad.Shape3D): number {
  const [min, max] = shape.boundingBox.bounds;
  return Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
}

function pickSolid(count: number, requested: number | undefined): { index: number } | { error: string } {
  if (count === 0) return { error: 'the STEP file contains no closed solid. Re-export it as AP214 or AP242 with solid bodies.' };
  if (requested === undefined && count > 1) {
    return {
      error: `the STEP file contains ${count} solids; pass solid: 0..${count - 1} to rebuild one of them (inspect({ of: 'step' }) lists them), or use import_step to bring the whole assembly in as reference geometry.`,
    };
  }
  const index = requested ?? 0;
  if (!Number.isInteger(index) || index < 0 || index >= count) {
    return { error: `solid must be an integer in 0..${count - 1}; got ${String(requested)}.` };
  }
  return { index };
}

/** Import STEP bytes and tessellate one solid. All OCCT handles are released before returning. */
export async function meshStepSolid(bytes: Uint8Array, opts: StepSolidMeshOptions): Promise<StepSolidMesh> {
  let imported;
  try {
    imported = await importStepShape(bytes);
  } catch (e) {
    return { ok: false, error: `the STEP file could not be read (${e instanceof Error ? e.message : String(e)}). Re-export it as AP214 or AP242 with solid bodies.` };
  }
  const root = imported.getReplicadShape() as replicad.Shape3D;
  const solids = solidsOf(root);
  try {
    const picked = pickSolid(solids.length, opts.solid);
    if ('error' in picked) return { ok: false, error: picked.error };
    const solid = solids[picked.index];
    const linearMm = opts.linearDeflectionMm(diagonalOf(solid));
    const mesh = meshShapeForExport(solid, { linear: linearMm, relative: false, angularRad: opts.angularDeflectionRad });
    return { ok: true, solidCount: solids.length, solid: picked.index, linearMm, vertices: mesh.vertices, triangles: mesh.triangles };
  } finally {
    for (const s of solids) s.delete();
    root.delete();
  }
}
