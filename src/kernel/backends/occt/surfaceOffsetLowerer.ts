// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import * as replicad from 'replicad';
import { getOC } from 'replicad';
import type { BuiltSurface } from './nurbsSurfaceLowerer';

/** Raised when OCCT cannot produce a trustworthy offset surface. */
export class SurfaceOffsetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SurfaceOffsetError';
  }
}

/** Offset one built surface by a signed normal distance.
 *
 *  OCCT's `BRepOffsetAPI_MakeOffsetShape.PerformBySimple` takes the base
 *  face/shell and the signed distance, trims the result to the base boundary
 *  and returns a face or shell. A positive distance moves along the base
 *  face normal; a negative distance moves against it.
 *
 *  A single resulting face stays a `face` surface so `.trimTo()` and
 *  `.split()` keep working. A multi-face result (a skinned shell or an offset
 *  that split into several faces) is returned as the existing `skinned`
 *  shell wrapper, which supports `.toShape()` and `.thicken()`.
 */
export function offsetBuiltSurface(base: BuiltSurface, distance: number): BuiltSurface {
  if (!(Number.isFinite(distance) && distance !== 0)) {
    throw new SurfaceOffsetError(
      `offset distance must be a non-zero finite number; got ${String(distance)}`,
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const baseShape = base.kind === 'face' ? (base.face as unknown as { wrapped: unknown }).wrapped : (base.shape as unknown as { wrapped: unknown }).wrapped;
  if (baseShape === undefined) {
    throw new SurfaceOffsetError('could not read the base surface geometry');
  }

  const builder = new oc.BRepOffsetAPI_MakeOffsetShape();
  try {
    builder.PerformBySimple(baseShape, distance);
    if (!builder.IsDone()) {
      throw new SurfaceOffsetError('BRepOffsetAPI_MakeOffsetShape failed (IsDone=false)');
    }
    const raw = builder.Shape();
    const analyzer = new oc.BRepCheck_Analyzer(raw, false, false);
    let valid = false;
    try {
      valid = Boolean(analyzer.IsValid_2());
    } finally {
      analyzer.delete?.();
    }
    if (!valid) {
      throw new SurfaceOffsetError('the offset result fails the BRep validity check');
    }

    const faces = collectFaces(oc, raw);
    if (faces.length === 0) {
      throw new SurfaceOffsetError('the offset result contains no faces');
    }
    if (faces.length === 1) {
      return { kind: 'face', face: new replicad.Face(faces[0]) };
    }
    for (const face of faces) (face as { delete?: () => void }).delete?.();
    return { kind: 'skinned', shape: replicad.cast(raw) as replicad.Shape3D };
  } finally {
    builder.delete?.();
  }
}

/** Every `TopoDS_Face` in a result compound/shell, in traversal order. */
function collectFaces(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oc: any,
  shape: unknown,
): unknown[] {
  const faces: unknown[] = [];
  const explorer = new oc.TopExp_Explorer_2(
    shape,
    oc.TopAbs_ShapeEnum.TopAbs_FACE,
    oc.TopAbs_ShapeEnum.TopAbs_SHAPE,
  );
  try {
    for (; explorer.More(); explorer.Next()) {
      const current = explorer.Current();
      faces.push(oc.TopoDS.Face_1(current));
      current.delete?.();
    }
    return faces;
  } finally {
    explorer.delete();
  }
}
