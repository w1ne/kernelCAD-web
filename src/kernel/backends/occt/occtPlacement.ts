// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/occtPlacement.ts
//
// Rigid placement without copying geometry. `OcctBackend.applyTransform`
// deep-copies (BRepBuilderAPI_Transform with copy=true), which a 7k-face STL
// part pays at ~8 MB and ~0.15 s per call. A TopoDS location places the same
// geometry instead; OCCT applies it everywhere, so read-only probes of a posed
// part (bounding boxes, booleans, distances) can use it.

import { getOC } from 'replicad';
import type { Transform } from '../../../shared/runtime/se3';

/**
 * The raw TopoDS shape `shape` placed by the rigid transform `t` through a
 * `TopLoc_Location`: a new handle sharing the same geometry.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function locateShape(shape: any, t: Transform): unknown {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oc = getOC() as any;
  const m = t.toMat4();
  const trsf = new oc.gp_Trsf_1();
  let loc;
  try {
    // Column-major 4x4: rows of the 3x4 are (m0 m4 m8 m12), (m1 m5 m9 m13), (m2 m6 m10 m14).
    trsf.SetValues(m[0], m[4], m[8], m[12], m[1], m[5], m[9], m[13], m[2], m[6], m[10], m[14]);
    loc = new oc.TopLoc_Location_2(trsf);
  } finally {
    trsf.delete();
  }
  try {
    return shape.Moved(loc, false);
  } finally {
    loc.delete();
  }
}
