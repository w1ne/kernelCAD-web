// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modules/sdf/index.ts
//
// `sdf` namespace export. SDF fields are plain callable closures plus a
// static `aabb` (used by `sdf.materialize` as the marching-cubes sample
// region). Primitives compute AABB exactly; combinators take the union of
// inputs' AABBs padded by the blend radius `k`.

import type { Vec3 } from '../../shared/intent/types';

export interface SdfField {
  /** Evaluate signed distance at a point. Negative = inside, 0 = surface,
   *  positive = outside. mm. */
  (p: Vec3): number;
  /** Axis-aligned bounding box used as the marching-cubes sample region.
   *  Primitives compute exactly; combinators take the input union and pad
   *  by the blend radius. mm. */
  readonly aabb: { min: Vec3; max: Vec3 };
  /** Human-readable kind tag for diagnostics + SKILL.md ergonomics. */
  readonly kind: 'sphere' | 'box' | 'cylinder' | 'torus' | 'smoothBlend';
}

export { sphere, box, cylinder, torus } from './primitives';
export { smoothBlend } from './smoothBlend';
// materialize is host-side (touches CaptureSession); imported by api.ts directly.
