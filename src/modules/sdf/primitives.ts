// src/modules/sdf/primitives.ts
//
// SDF primitive constructors. Each returns a closure `(p: Vec3) => number`
// with a static `aabb` and `kind`. All formulas are signed distance in mm,
// centered at the origin in their local frame.
//
// Math reference: Inigo Quilez's SDF primitive catalogue. The exact formulas
// used below are pinned in the W2.3 design spec table 5.

import type { Vec3 } from '../../intent/types';
import type { SdfField } from './index';
import { KernelError } from '../../intent/kernelError';

function assertPositiveFinite(value: number, label: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new KernelError(
      'feature.invalid-args',
      `sdf.${label}: ${label} must be a positive finite number; got ${value}.`,
      undefined,
      `invalid-args.sdf.${label} — pass a positive finite number for ${label}.`,
    );
  }
}

/** Signed distance to a sphere of radius `r` centred at the origin.
 *  Formula: length(p) - r. */
export function sphere(r: number): SdfField {
  assertPositiveFinite(r, 'sphere');
  const f = (p: Vec3): number => {
    return Math.hypot(p[0], p[1], p[2]) - r;
  };
  return Object.assign(f, {
    aabb: { min: [-r, -r, -r] as Vec3, max: [r, r, r] as Vec3 },
    kind: 'sphere' as const,
  });
}
