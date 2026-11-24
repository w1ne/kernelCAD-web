// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Shape.splitByPlane records one shape per side so each half is a normal
// Shape that can be filleted, measured, exported, or unioned downstream. The
// lowerer builds the bounded half-space cutter from the actual body box.

import type { FeatureRef, Vec3 } from '../../shared/intent/types';
import { invalidArgs } from '../../shared/intent/invalidArgs';
import { isParamRef, type Editable } from '../../shared/runtime/paramRef';
import { toParam, toVec3Param } from '../../shared/runtime/editableHelpers';
import type { CaptureSession } from './captureSession';
import type { Shape } from './proxy';

export type SplitPlaneSide = 'positive' | 'negative';

const API = 'shape.splitByPlane(normal, offset)';
const EXAMPLE = 'box(40, 30, 20).splitByPlane([0, 0, 1], 8)';

function assertNormal(normal: unknown, featureId: string): asserts normal is Vec3 {
  if (
    !Array.isArray(normal)
    || normal.length !== 3
    || !normal.every((value) => typeof value === 'number' && Number.isFinite(value))
  ) {
    invalidArgs({
      api: API,
      path: 'normal',
      gotText: `expected [x, y, z] of finite numbers, got ${JSON.stringify(normal)}`,
      requires: 'a non-zero Vec3 plane normal, e.g. [0, 0, 1]',
      example: EXAMPLE,
      featureId,
    });
  }
  if (Math.hypot(normal[0], normal[1], normal[2]) === 0) {
    invalidArgs({
      api: API,
      path: 'normal',
      gotText: '[0, 0, 0]',
      requires: 'a non-zero Vec3 plane normal',
      example: EXAMPLE,
      featureId,
    });
  }
}

function assertOffset(offset: unknown, featureId: string): asserts offset is Editable<number> {
  if (isParamRef(offset)) return;
  if (typeof offset === 'number' && Number.isFinite(offset)) return;
  invalidArgs({
    api: API,
    path: 'offset',
    got: offset,
    showType: true,
    requires: 'a finite signed distance from the origin along the normal, or a numeric param() reference',
    example: EXAMPLE,
    featureId,
  });
}

/** Register the two `splitPlane` records that `Shape.splitByPlane` returns. */
export function captureSplitByPlane(
  session: CaptureSession,
  base: Shape,
  normal: Vec3,
  offset: Editable<number>,
): [Shape, Shape] {
  assertNormal(normal, base.id);
  assertOffset(offset, base.id);

  const inputs = (): Record<string, FeatureRef> => ({
    base: { kind: 'feature', id: base.id },
  });
  const vector = toVec3Param(normal, 'unitless');
  const distance = toParam(offset, 'mm');

  const halves = (['positive', 'negative'] as const).map((side): Shape => session.createShape({
    kind: 'splitPlane',
    inputs: inputs(),
    params: {
      normalX: vector.x,
      normalY: vector.y,
      normalZ: vector.z,
      offset: distance,
      side: { expression: `'${side}'`, unit: 'unitless', evaluated: 0 },
    },
    metadata: { splitPlaneSide: side },
  }));
  return [halves[0], halves[1]];
}
