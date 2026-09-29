// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/faceFrame.ts
//
// Origin of the face-local (u, v) frame used by `.hole()` / `.holes()` /
// `.cutout()`.
//
// The origin is the area centroid of the region bounded by the face's OUTER
// wire. The plain face centroid (`Face.center`) is NOT stable: every hole
// already drilled in the face removes area and pulls the centroid away from
// it, so a second `.hole()` on the same face lands off by
// (holeArea * offset) / remainingArea. Filling the inner wires back in makes
// the origin independent of earlier interior cuts; for a face without holes
// the two are identical, so untouched faces keep their exact origin.

import * as replicad from 'replicad';
import type { Face } from 'replicad';
import type { Vec3 } from '../../../shared/intent/types';

function vecOf(p: { x: number; y: number; z: number }): Vec3 {
  return [p.x, p.y, p.z];
}

/** World-space origin of the face-local (u, v) frame: the centroid of the
 *  face with its interior holes filled. Falls back to the face centroid if
 *  OCCT cannot rebuild the filled face (non-planar outer wire). */
export function faceFrameOrigin(face: Face): Vec3 {
  const centroid = vecOf(face.center);
  const wires = face.wires;
  const hasInnerWires = wires.length > 1;
  for (const w of wires) w.delete();
  if (!hasInnerWires) return centroid;
  try {
    // `outerWire()` deletes its receiver, so call it on a clone.
    const outer = (face.clone() as Face).outerWire();
    try {
      const filled = replicad.makeFace(outer);
      try {
        return vecOf(filled.center);
      } finally {
        filled.delete();
      }
    } finally {
      outer.delete();
    }
  } catch {
    return centroid;
  }
}
