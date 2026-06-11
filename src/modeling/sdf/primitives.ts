// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modules/sdf/primitives.ts
//
// SDF primitive constructors. Each returns a closure `(p: Vec3) => number`
// with a static `aabb` and `kind`. All formulas are signed distance in mm,
// centered at the origin in their local frame.
//
// Math reference: Inigo Quilez's SDF primitive catalogue. The exact formulas
// used below are pinned in the W2.3 design spec table 5.

import type { Vec3 } from '../../shared/intent/types';
import type { SdfField } from './index';
import { KernelError } from '../../shared/intent/kernelError';

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

/** Axis-aligned box centred at origin, size = [sx, sy, sz].
 *  Formula: let q = abs(p) - size/2; length(max(q, 0)) + min(max(qx, qy, qz), 0). */
export function box(size: Vec3): SdfField {
  if (!Array.isArray(size) || size.length !== 3) {
    throw new KernelError(
      'feature.invalid-args',
      `sdf.box: size must be a Vec3; got ${JSON.stringify(size)}.`,
      undefined,
      'invalid-args.sdf.box — pass a Vec3 of positive finite numbers.',
    );
  }
  for (const c of size) assertPositiveFinite(c, 'box');
  const hx = size[0] / 2;
  const hy = size[1] / 2;
  const hz = size[2] / 2;
  const f = (p: Vec3): number => {
    const qx = Math.abs(p[0]) - hx;
    const qy = Math.abs(p[1]) - hy;
    const qz = Math.abs(p[2]) - hz;
    const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0));
    const inside = Math.min(Math.max(qx, qy, qz), 0);
    return outside + inside;
  };
  return Object.assign(f, {
    aabb: { min: [-hx, -hy, -hz] as Vec3, max: [hx, hy, hz] as Vec3 },
    kind: 'box' as const,
  });
}

/** Cylinder with axis = +Z, centred at origin, radius `r`, height `h`.
 *  Formula: dxy = length([px, py]) - r; dz = abs(pz) - h/2;
 *           length(max([dxy, dz], 0)) + min(max(dxy, dz), 0). */
export function cylinder(r: number, h: number): SdfField {
  assertPositiveFinite(r, 'cylinder');
  assertPositiveFinite(h, 'cylinder');
  const hh = h / 2;
  const f = (p: Vec3): number => {
    const dxy = Math.hypot(p[0], p[1]) - r;
    const dz = Math.abs(p[2]) - hh;
    const outside = Math.hypot(Math.max(dxy, 0), Math.max(dz, 0));
    const inside = Math.min(Math.max(dxy, dz), 0);
    return outside + inside;
  };
  return Object.assign(f, {
    aabb: { min: [-r, -r, -hh] as Vec3, max: [r, r, hh] as Vec3 },
    kind: 'cylinder' as const,
  });
}

/** Torus with ring axis = +Z, centred at origin, major radius `R` (ring),
 *  minor radius `r` (tube).
 *  Formula: q = [length([px, py]) - R, pz]; length(q) - r. */
export function torus(R: number, r: number): SdfField {
  assertPositiveFinite(R, 'torus');
  assertPositiveFinite(r, 'torus');
  const f = (p: Vec3): number => {
    const dxy = Math.hypot(p[0], p[1]) - R;
    return Math.hypot(dxy, p[2]) - r;
  };
  return Object.assign(f, {
    aabb: { min: [-(R + r), -(R + r), -r] as Vec3, max: [R + r, R + r, r] as Vec3 },
    kind: 'torus' as const,
  });
}
