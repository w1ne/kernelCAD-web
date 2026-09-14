// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Geometry a repair candidate is derived FROM.
//
// Every candidate in this slice is a number the kernel already knows — the
// shortest adjacent edge, the gap between two bounding boxes, the real Z of an
// edge loop. Reading those facts here keeps the generators free of geometry
// plumbing and makes the derivation auditable: each candidate ships the numbers
// this module returned as its `evidence`.

import { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { selectEdges } from '../../kernel/backends/occt/edgeQueries';
import type { ShapeBackend } from '../../kernel/backends/backend';
import type { Vec3 } from '../../shared/intent/types';

export interface Bbox {
  min: Vec3;
  max: Vec3;
}

export function bboxOf(shape: ShapeBackend | undefined): Bbox | undefined {
  if (shape === undefined) return undefined;
  try {
    return shape.boundingBox();
  } catch {
    return undefined;
  }
}

export function bboxCentre(bbox: Bbox): Vec3 {
  return [
    (bbox.min[0] + bbox.max[0]) / 2,
    (bbox.min[1] + bbox.max[1]) / 2,
    (bbox.min[2] + bbox.max[2]) / 2,
  ];
}

export function bboxSize(bbox: Bbox): Vec3 {
  return [
    bbox.max[0] - bbox.min[0],
    bbox.max[1] - bbox.min[1],
    bbox.max[2] - bbox.min[2],
  ];
}

/** Shortest edge on the shape — the hard ceiling on a fillet radius or chamfer
 *  distance, since an edge feature consumes half its length on each side. */
export function minEdgeLengthOf(shape: ShapeBackend | undefined): number | undefined {
  const lengths = edgeLengthsOf(shape);
  if (lengths.length === 0) return undefined;
  return Math.min(...lengths);
}

export function edgeLengthsOf(shape: ShapeBackend | undefined): number[] {
  if (!(shape instanceof OcctBackend)) return [];
  try {
    return selectEdges(shape, {}).map(edge => edge.length).filter(n => Number.isFinite(n) && n > 0);
  } catch {
    return [];
  }
}

/** Distinct edge-midpoint coordinates along one axis, ascending. These are the
 *  values an `atX` / `atY` / `atZ` selector can actually match. */
export function edgeMidpointCoordinates(
  shape: ShapeBackend | undefined,
  axis: 0 | 1 | 2,
): number[] {
  if (!(shape instanceof OcctBackend)) return [];
  let coordinates: number[];
  try {
    coordinates = selectEdges(shape, {}).map(edge => edge.midpoint[axis]);
  } catch {
    return [];
  }
  const distinct: number[] = [];
  for (const value of coordinates.sort((a, b) => a - b)) {
    if (!Number.isFinite(value)) continue;
    // Selector matching runs with a 1 mm positional tolerance, so values closer
    // than that are the same target and should not produce duplicate candidates.
    if (distinct.length > 0 && Math.abs(distinct[distinct.length - 1] - value) < 1) continue;
    distinct.push(value);
  }
  return distinct;
}

/** Translation that moves `from` so its centre lands on `to`'s centre. */
export function centreAlignDelta(from: Bbox, to: Bbox): Vec3 {
  const a = bboxCentre(from);
  const b = bboxCentre(to);
  return [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
}

/** In-plane axes of a canonical face, as indices into a Vec3. The `u` axis is
 *  listed first, matching the (u, v) ordering face-bound features author in. */
export function canonicalFaceAxes(face: string): [0 | 1 | 2, 0 | 1 | 2] | undefined {
  switch (face) {
    case 'top':
    case 'bottom':
      return [0, 1];
    case 'left':
    case 'right':
      return [1, 2];
    case 'front':
    case 'back':
      return [0, 2];
    default:
      return undefined;
  }
}
