// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/sdf/transform.ts
//
// Translation transform for SDF fields. The field stays a closure; the
// offset is folded into the evaluation point (f(p - v)) and the aabb is
// offset in world space. Combinators need no changes: translated children
// carry their offsets inside their own closures, and the smoothBlend aabb
// union stays correct because child aabbs are already offset.

import type { Vec3 } from '../../shared/intent/types';
import type { SdfField } from './index';
import { KernelError } from '../../shared/intent/kernelError';

export interface RawSdfField {
  (p: Vec3): number;
  readonly aabb: { min: Vec3; max: Vec3 };
  readonly kind: SdfField['kind'];
}

function assertFiniteOffset(dx: number, dy: number, dz: number): void {
  if (![dx, dy, dz].every((v) => typeof v === 'number' && Number.isFinite(v))) {
    throw new KernelError(
      'feature.invalid-args',
      `sdf.translate: offset must be three finite numbers; got [${dx}, ${dy}, ${dz}].`,
      undefined,
      'invalid-args.sdf.translate — pass three finite numbers for the translation offset.',
    );
  }
}

/** Attach the fluent `.translate` builder to a raw field object. */
export function withTranslate<T extends RawSdfField>(field: T): SdfField {
  return Object.assign(field, {
    translate: (dx: number, dy: number, dz: number): SdfField =>
      translateField(field, [dx, dy, dz]),
  }) as SdfField;
}

/** Return a new field whose surface is `field`'s surface offset by `offset`. */
export function translateField(field: RawSdfField, offset: Vec3): SdfField {
  const [dx, dy, dz] = offset;
  assertFiniteOffset(dx, dy, dz);
  const f = (p: Vec3): number => field([p[0] - dx, p[1] - dy, p[2] - dz]);
  return withTranslate(
    Object.assign(f, {
      aabb: {
        min: [field.aabb.min[0] + dx, field.aabb.min[1] + dy, field.aabb.min[2] + dz] as Vec3,
        max: [field.aabb.max[0] + dx, field.aabb.max[1] + dy, field.aabb.max[2] + dz] as Vec3,
      },
      kind: field.kind,
    }),
  );
}
