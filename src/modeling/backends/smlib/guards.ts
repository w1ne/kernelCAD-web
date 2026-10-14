// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
export class GuardError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'GuardError';
    this.code = code;
  }
}

export interface Measures { volume: number; area: number }

export function volumeCrossCheck(reference: number, candidate: number, relativeTolerance = 1e-3, absoluteTolerance = 1e-5): number {
  if (!Number.isFinite(reference) || !Number.isFinite(candidate) || reference <= 0 || candidate <= 0) {
    throw new GuardError('BAD_MEASURE', 'Non-positive/non-finite solid volume');
  }
  const delta = candidate - reference;
  if (Math.abs(delta) > Math.max(absoluteTolerance, Math.abs(reference) * relativeTolerance)) {
    throw new GuardError('VOLUME_MISMATCH', `Volume differs ${(100 * delta / reference).toFixed(6)}%`);
  }
  return delta / reference;
}

export function measureCrossCheck(before: Measures, after: Measures, relativeTolerance = 1e-3): void {
  volumeCrossCheck(before.volume, after.volume, relativeTolerance);
  if (!Number.isFinite(before.area) || !Number.isFinite(after.area) || before.area <= 0 || after.area <= 0) {
    throw new GuardError('BAD_MEASURE', 'Non-positive/non-finite surface area');
  }
  if (Math.abs(after.area - before.area) > Math.max(1e-5, before.area * relativeTolerance)) {
    throw new GuardError('AREA_MISMATCH', 'Surface area differs beyond tolerance');
  }
}

export function repairInvariant(before: Measures, after: Measures): void {
  measureCrossCheck(before, after, 1e-5);
}

/** The certificate must come from independent material intersection, never AABB overlap. */
export function cutNoOp(before: number, after: number, positiveOverlapVolume: number | undefined, relativeTolerance = 1e-8): void {
  if (!Number.isFinite(before) || !Number.isFinite(after) || before <= 0 || after < 0 ||
      (positiveOverlapVolume !== undefined && (!Number.isFinite(positiveOverlapVolume) || positiveOverlapVolume < 0))) {
    throw new GuardError('BAD_MEASURE', 'Invalid cut measurement');
  }
  if (after > before + Math.max(1e-7, before * 1e-3)) throw new GuardError('CUT_GREW', 'Cut increased volume');
  if (positiveOverlapVolume !== undefined && positiveOverlapVolume > Math.max(1e-7, before * relativeTolerance) &&
      Math.abs(before - after) <= Math.max(1e-7, before * relativeTolerance)) {
    throw new GuardError('CUT_NO_OP', 'Certified material overlap, but cut removed no volume');
  }
}

export type Point2 = readonly [number, number];
const cross = (a: Point2, b: Point2, c: Point2) => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function on(a: Point2, b: Point2, p: Point2, eps: number): boolean {
  return Math.abs(cross(a,b,p)) <= eps && p[0] >= Math.min(a[0],b[0])-eps && p[0] <= Math.max(a[0],b[0])+eps &&
    p[1] >= Math.min(a[1],b[1])-eps && p[1] <= Math.max(a[1],b[1])+eps;
}

/** Exact segment predicates (floating-point tolerance), AABB broad phase.
 * Curve samples screen only: they do not certify the original curves. */
export function profileSelfIntersections(input: readonly Point2[], eps = 1e-9): {a: number; b: number}[] {
  if (input.some(p => !Number.isFinite(p[0]) || !Number.isFinite(p[1]))) throw new GuardError('BAD_PROFILE', 'Non-finite profile');
  const p = input.filter((v,i) => !i || Math.hypot(v[0]-input[i-1][0],v[1]-input[i-1][1]) > eps);
  if (p.length > 1 && Math.hypot(p[0][0]-p.at(-1)![0],p[0][1]-p.at(-1)![1]) <= eps) p.pop();
  if (p.length < 3) throw new GuardError('BAD_PROFILE', 'Profile requires three distinct vertices');
  const hits: {a: number; b: number}[] = [];
  for (let i=0; i<p.length; i++) for (let j=i+1; j<p.length; j++) {
    const a=p[i], b=p[(i+1)%p.length], c=p[j], d=p[(j+1)%p.length];
    if (j===i+1 || (i===0 && j===p.length-1)) {
      // Adjacent edges may share their endpoint, but not a positive-length
      // collinear interval (backtracking), including across the closing seam.
      const common = j===i+1 ? b : a;
      const first = j===i+1 ? a : b;
      const last = j===i+1 ? d : c;
      const dot = (first[0]-common[0])*(last[0]-common[0]) + (first[1]-common[1])*(last[1]-common[1]);
      if (Math.abs(cross(common,first,last)) <= eps && dot > eps*eps) hits.push({a:i,b:j});
      continue;
    }
    if (Math.max(a[0],b[0])+eps<Math.min(c[0],d[0]) || Math.max(c[0],d[0])+eps<Math.min(a[0],b[0]) ||
        Math.max(a[1],b[1])+eps<Math.min(c[1],d[1]) || Math.max(c[1],d[1])+eps<Math.min(a[1],b[1])) continue;
    const x=cross(a,b,c), y=cross(a,b,d), z=cross(c,d,a), w=cross(c,d,b);
    if ((x*y < -eps*eps && z*w < -eps*eps) || on(a,b,c,eps) || on(a,b,d,eps) || on(c,d,a,eps) || on(c,d,b,eps)) hits.push({a:i,b:j});
  }
  return hits;
}

export function requireSimpleProfile(points: readonly Point2[]): void {
  if (points.length < 3) throw new GuardError('BAD_PROFILE', 'Profile requires at least three points');
  const hits = profileSelfIntersections(points);
  if (hits.length) throw new GuardError('SELF_INTERSECTION', `Profile has ${hits.length} non-adjacent crossings/touches`);
}
