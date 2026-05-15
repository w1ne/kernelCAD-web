// src/modules/sdf/smoothBlend.ts
//
// Polynomial smooth-min combinator. Returns a closure that smoothly blends
// two SdfFields with blend radius `k` mm.
//
// Math (pinned in W2.3 design spec §5):
//   da = a(p); db = b(p)
//   h  = clamp(0.5 + 0.5 * (db - da) / k, 0, 1)
//   smin(a, b, k) = mix(db, da, h) - k * h * (1 - h)
//   where mix(x, y, t) = x * (1 - t) + y * t
//
// AABB: elementwise union of a.aabb and b.aabb, each face padded outward by k.
// The smooth-blend surface bulges outward of either input near the blend
// region, never further than k (provable from the polynomial smin formula).

import type { Vec3 } from '../../intent/types';
import type { SdfField } from './index';
import { KernelError } from '../../intent/kernelError';

export function smoothBlend(a: SdfField, b: SdfField, k: number): SdfField {
  if (typeof k !== 'number' || !Number.isFinite(k) || k <= 0) {
    throw new KernelError(
      'feature.invalid-args',
      `sdf.smoothBlend: k must be a positive finite number; got ${k}.`,
      undefined,
      'invalid-args.sdf.smoothBlend — pass a positive finite blend radius k.',
    );
  }
  const aabb = {
    min: [
      Math.min(a.aabb.min[0], b.aabb.min[0]) - k,
      Math.min(a.aabb.min[1], b.aabb.min[1]) - k,
      Math.min(a.aabb.min[2], b.aabb.min[2]) - k,
    ] as Vec3,
    max: [
      Math.max(a.aabb.max[0], b.aabb.max[0]) + k,
      Math.max(a.aabb.max[1], b.aabb.max[1]) + k,
      Math.max(a.aabb.max[2], b.aabb.max[2]) + k,
    ] as Vec3,
  };
  const f = (p: Vec3): number => {
    const da = a(p);
    const db = b(p);
    let h = 0.5 + 0.5 * (db - da) / k;
    if (h < 0) h = 0;
    else if (h > 1) h = 1;
    return db * (1 - h) + da * h - k * h * (1 - h);
  };
  return Object.assign(f, { aabb, kind: 'smoothBlend' as const });
}
