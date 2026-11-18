// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/faceNormalEvaluator.ts
//
// Exact surface normals of one BREP face at many query points, with every
// OCCT object freed explicitly. Used by the injection-moulding DFM check to
// re-measure draft / release direction on curved faces.

import { getOC, type Face } from 'replicad';

type Vec3 = [number, number, number];

/** The BREP faces of a replicad shape, in the order faceTaggedMeshOf
 *  indexes them, as opaque handles for FaceNormalEvaluator / isPlanarFace. */
export function replicadFacesOf(shape: unknown): readonly unknown[] {
  return (shape as { faces: Face[] }).faces;
}

/** True when the face's underlying surface is a plane (facet normals are
 *  then exact). */
export function isPlanarFace(face: unknown): boolean {
  try {
    return (face as { geomType?: string }).geomType === 'PLANE';
  } catch {
    return false;
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any -- opencascade.js handles are untyped here */
/** Exact unit surface normals of one face at the projection of query points.
 *  Holds the face's surface handle and BRepGProp_Face for many queries and
 *  deletes every OCCT object explicitly: replicad's Face.normalAt leaves its
 *  projector, props and result for the JS GC, and thousands of calls in one
 *  sweep exhaust the WASM heap before the GC runs. */
export class FaceNormalEvaluator {
  private readonly oc = getOC() as any;
  private readonly surface: any;
  private readonly props: any;
  private readonly pnt: any;
  private readonly vec: any;

  constructor(face: unknown) {
    const wrapped = (face as unknown as { wrapped: unknown }).wrapped;
    this.surface = this.oc.BRep_Tool.Surface_2(wrapped);
    this.props = new this.oc.BRepGProp_Face_2(wrapped, false);
    this.pnt = new this.oc.gp_Pnt_1();
    this.vec = new this.oc.gp_Vec_1();
  }

  /** Unit normal at the surface point nearest `p`, or undefined when OCCT
   *  cannot project or evaluate there (parametric singularity). */
  normalAt(p: Vec3): Vec3 | undefined {
    const q = new this.oc.gp_Pnt_3(p[0], p[1], p[2]);
    let proj: any;
    try {
      proj = new this.oc.GeomAPI_ProjectPointOnSurf_2(q, this.surface, this.oc.Extrema_ExtAlgo.Extrema_ExtAlgo_Grad);
      if (proj.NbPoints() < 1) return undefined;
      const u = { current: 0 };
      const v = { current: 0 };
      proj.LowerDistanceParameters(u, v);
      this.props.Normal(u.current, v.current, this.pnt, this.vec);
      const l = this.vec.Magnitude();
      return l > 0 && Number.isFinite(l) ? [this.vec.X() / l, this.vec.Y() / l, this.vec.Z() / l] : undefined;
    } catch {
      return undefined; // OCCT throws raw (non-Error) Standard_Failure pointers
    } finally {
      proj?.delete();
      q.delete();
    }
  }

  delete(): void {
    for (const h of [this.vec, this.pnt, this.props, this.surface]) h.delete();
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
