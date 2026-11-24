// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Half-space cutters for an infinite plane.
//
// The bundled OCCT build has no BRepAlgoAPI_Splitter and no half-space
// primitive, so a plane split is two bounded box cutters, one on each side of
// the plane. Both boxes share a face on the plane and extend past every corner
// of the target's bounding box. Their cut faces therefore coincide with the
// requested plane for any target that is fully inside its own bounding box.
//
// Kept free of OcctBackend imports so the backend and the feature lowerer can
// share it without a module cycle.

import { Transform } from '../../shared/runtime/se3';

export interface PlaneBounds {
  min: readonly [number, number, number];
  max: readonly [number, number, number];
}

export interface PlaneCutter {
  /** Edge length of the cubic cutter in mm. */
  size: number;
  /** Places a cube centred on the origin so one face lies on the plane. */
  transform: Transform;
}

function cross(a: readonly [number, number, number], b: readonly [number, number, number]): [number, number, number] {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function normalizeWithLength(v: readonly [number, number, number]): { unit: [number, number, number]; length: number } {
  const length = Math.hypot(v[0], v[1], v[2]);
  if (!(length > 0) || !Number.isFinite(length)) {
    throw new Error(`planeSplitCutters: normal must be a non-zero finite Vec3; got [${v[0]}, ${v[1]}, ${v[2]}].`);
  }
  return { unit: [v[0] / length, v[1] / length, v[2] / length], length };
}

/**
 * Build the positive and negative half-space cutters for the plane
 * `dot(p, normal) = offset`.
 *
 * The positive cutter covers `dot(p, normal) >= offset`; the negative one
 * covers the other side. `normal` need not be unit length: `offset` is divided
 * by its length so `[1, 1, 0], 20` still means the plane `x + y = 20`. Both
 * cutters are cubes large enough to contain every corner of `bounds` plus a
 * 1 mm margin.
 */
export function planeSplitCutters(
  normal: readonly [number, number, number],
  offset: number,
  bounds: PlaneBounds,
): [PlaneCutter, PlaneCutter] {
  if (!Number.isFinite(offset)) {
    throw new Error(`planeSplitCutters: offset must be finite; got ${offset}.`);
  }
  const { unit: n, length } = normalizeWithLength(normal);
  const planeOffset = offset / length;
  // Any vector not parallel to n gives a stable in-plane frame.
  const helper: [number, number, number] = Math.abs(n[2]) < 0.9 ? [0, 0, 1] : [0, 1, 0];
  const u = normalizeWithLength(cross(helper, n)).unit;
  const v = cross(n, u);

  const centre: [number, number, number] = [
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    (bounds.min[2] + bounds.max[2]) / 2,
  ];
  const diagonal = Math.hypot(
    bounds.max[0] - bounds.min[0],
    bounds.max[1] - bounds.min[1],
    bounds.max[2] - bounds.min[2],
  );
  // 1 mm beyond the bounding sphere covers bbox padding and boolean tolerance.
  const half = Math.max(diagonal / 2 + 1, 1);
  const size = half * 2;

  // Nearest point on the plane to the bbox centre: keeps the target inside the
  // in-plane extent even when the part is far from the world origin.
  const planeDistance = centre[0] * n[0] + centre[1] * n[1] + centre[2] * n[2] - planeOffset;
  const onPlane: [number, number, number] = [
    centre[0] - n[0] * planeDistance,
    centre[1] - n[1] * planeDistance,
    centre[2] - n[2] * planeDistance,
  ];

  const cutter = (side: 1 | -1): PlaneCutter => {
    const tx = onPlane[0] + n[0] * side * half;
    const ty = onPlane[1] + n[1] * side * half;
    const tz = onPlane[2] + n[2] * side * half;
    // Column-major rotation [u v n], then translation.
    return {
      size,
      transform: Transform.fromColumnMajor([
        u[0], u[1], u[2], 0,
        v[0], v[1], v[2], 0,
        n[0], n[1], n[2], 0,
        tx, ty, tz, 1,
      ]),
    };
  };

  return [cutter(1), cutter(-1)];
}
