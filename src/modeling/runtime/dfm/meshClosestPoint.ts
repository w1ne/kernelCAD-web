// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Vec3 } from '../../../shared/intent/types';

const dot = (a: Vec3, b: Vec3): number => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
export const distanceSquared = (a: Vec3, b: Vec3): number => dot(sub(a, b), sub(a, b));

/** Plane projection when inside the triangle; otherwise the nearest of its
 * three closed segments. Original implementation; no library dependency. */
export function closestPointOnTriangle(p: Vec3, a: Vec3, b: Vec3, c: Vec3): Vec3 {
  const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a);
  const nx = ab[1]*ac[2] - ab[2]*ac[1];
  const ny = ab[2]*ac[0] - ab[0]*ac[2];
  const nz = ab[0]*ac[1] - ab[1]*ac[0];
  const denominator = nx*nx + ny*ny + nz*nz;
  // Cross products avoid the cancellation of |ab|²|ac|²-(ab·ac)² on slivers.
  if (denominator > 0) {
    const v = ((ap[1]*ac[2]-ap[2]*ac[1])*nx + (ap[2]*ac[0]-ap[0]*ac[2])*ny + (ap[0]*ac[1]-ap[1]*ac[0])*nz) / denominator;
    const w = ((ab[1]*ap[2]-ab[2]*ap[1])*nx + (ab[2]*ap[0]-ab[0]*ap[2])*ny + (ab[0]*ap[1]-ab[1]*ap[0])*nz) / denominator;
    if (v >= 0 && w >= 0 && v + w <= 1) {
      return [a[0]+v*ab[0]+w*ac[0], a[1]+v*ab[1]+w*ac[1], a[2]+v*ab[2]+w*ac[2]];
    }
  }
  let best = a, bestDistance = Infinity;
  for (const [start, end] of [[a,b], [b,c], [c,a]]) {
    const delta = sub(end, start);
    const length2 = dot(delta, delta);
    const t = length2 > 0 ? Math.max(0, Math.min(1, dot(sub(p, start), delta) / length2)) : 0;
    const point: Vec3 = [start[0]+t*delta[0], start[1]+t*delta[1], start[2]+t*delta[2]];
    const distance = distanceSquared(p, point);
    if (distance < bestDistance) { best = point; bestDistance = distance; }
  }
  return best;
}
