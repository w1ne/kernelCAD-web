// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Canonical face names of a primitive (top/bottom/left/right/front/back) and
// the bounding-box plane each one sits on. Used by
// OcctBackend.findCanonicalFaceHash.

import type { Vec3 } from '../../../shared/intent/types';

export type CanonicalFaceName = 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back';

const CANONICAL_FACE_AXIS: Record<CanonicalFaceName, { axisIndex: 0 | 1 | 2; bound: 'min' | 'max' }> = {
  top:    { axisIndex: 2, bound: 'max' },
  bottom: { axisIndex: 2, bound: 'min' },
  right:  { axisIndex: 0, bound: 'max' },
  left:   { axisIndex: 0, bound: 'min' },
  back:   { axisIndex: 1, bound: 'max' },
  front:  { axisIndex: 1, bound: 'min' },
};

export function assertCanonicalFaceSupported(
  kind: 'box' | 'cylinder' | 'sphere' | 'sketch' | undefined,
  face: CanonicalFaceName,
): void {
  if (!kind) {
    throw new Error('findCanonicalFaceHash: only valid on primitives (box/cylinder/sphere); kind is unset');
  }
  if (kind === 'sphere') {
    throw new Error('findCanonicalFaceHash: spheres have no canonical planar face names');
  }
  if (kind === 'cylinder' && face !== 'top' && face !== 'bottom') {
    throw new Error(`findCanonicalFaceHash: '${face}' is not applicable to cylinder (only top/bottom)`);
  }
}

export function resolveCanonicalFaceTarget(
  face: CanonicalFaceName,
  bb: { min: Vec3; max: Vec3 },
): { axisIndex: 0 | 1 | 2; value: number } {
  const { axisIndex, bound } = CANONICAL_FACE_AXIS[face];
  return { axisIndex, value: bound === 'max' ? bb.max[axisIndex] : bb.min[axisIndex] };
}
