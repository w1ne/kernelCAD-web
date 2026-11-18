// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Minimum distance between the lateral faces of two extrusions that share
// a Z interval. The flat end caps repeat the profile outline and dominate
// BRepExtrema on the whole solid. When the shorter solid's Z interval sits
// inside the taller one, the minimum of two non-nested extrusions is
// realized on the faces that span the face width (flanks, tip, root, bore).
// Returns undefined when that reduction does not apply; the caller then
// measures the whole solids.

import { getOC } from 'replicad';
import { brepExtremaClosestBetween, type BrepClosest } from './brepDistance';

interface AxisBox {
  minZ: number;
  maxZ: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Oc = any;

function boundsOf(oc: Oc, shape: unknown): AxisBox {
  const box = new oc.Bnd_Box_1();
  try {
    oc.BRepBndLib.Add(shape, box, false);
    return { minZ: box.GetZMin(), maxZ: box.GetZMax() };
  } finally {
    box.delete();
  }
}

/** The shorter solid's Z interval sits inside the taller one. */
function zCovered(a: AxisBox, b: AxisBox): boolean {
  const overlap = Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ);
  const shorter = Math.min(a.maxZ - a.minZ, b.maxZ - b.minZ);
  return shorter > 0 && overlap >= shorter - 1e-6;
}

function faceSpanZ(oc: Oc, face: unknown): number {
  const box = boundsOf(oc, face);
  return box.maxZ - box.minZ;
}

/** Faces that span the extrusion. End caps are flat in Z and stay out. */
function lateralCompound(oc: Oc, shape: unknown, solid: AxisBox): Oc | undefined {
  const span = solid.maxZ - solid.minZ;
  if (!(span > 0)) return undefined;
  const explorer = new oc.TopExp_Explorer_2(
    shape,
    oc.TopAbs_ShapeEnum.TopAbs_FACE,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
  );
  const faces: unknown[] = [];
  try {
    for (; explorer.More(); explorer.Next()) {
      const face = explorer.Current();
      if (faceSpanZ(oc, face) > span * 0.5) faces.push(face);
    }
  } finally {
    explorer.delete();
  }
  if (faces.length === 0) return undefined;
  const compound = new oc.TopoDS_Compound();
  const builder = new oc.TopoDS_Builder();
  try {
    builder.MakeCompound(compound);
    for (const face of faces) builder.Add(compound, face);
  } finally {
    builder.delete();
  }
  return compound;
}

/** Closest points on the lateral faces, or undefined when the caps must stay. */
export function closestOnExtrusionSides(shapeA: unknown, shapeB: unknown): BrepClosest | undefined {
  const oc = getOC() as Oc;
  const boxA = boundsOf(oc, shapeA);
  const boxB = boundsOf(oc, shapeB);
  if (!zCovered(boxA, boxB)) return undefined;
  const sidesA = lateralCompound(oc, shapeA, boxA);
  const sidesB = lateralCompound(oc, shapeB, boxB);
  if (sidesA === undefined || sidesB === undefined) {
    sidesA?.delete();
    sidesB?.delete();
    return undefined;
  }
  try {
    return brepExtremaClosestBetween(sidesA, sidesB);
  } finally {
    sidesA.delete();
    sidesB.delete();
  }
}
