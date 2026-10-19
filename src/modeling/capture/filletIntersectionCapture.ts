// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { FeatureRef } from '../../shared/intent/types';
import type { Editable } from '../../shared/runtime/paramRef';
import { isParamRef } from '../../shared/runtime/paramRef';
import { invalidArgs } from '../../shared/intent/invalidArgs';
import type { FilletContinuity } from '../../shared/intent/filletContinuityRecord';
import { toParam } from '../../shared/runtime/editableHelpers';
import type { CaptureSession } from './captureSession';
import type { Shape } from './proxy';

export interface FilletIntersectionOpts {
  sides?: 'body' | 'both';
  toleranceMm?: Editable<number>;
  continuity?: FilletContinuity;
}

interface ResolvedFilletIntersection {
  radius: Editable<number>;
  tolerance: Editable<number>;
  sides: 'body' | 'both';
  continuity: FilletContinuity;
}

function validateRadius(radius: Editable<number>, featureId: string): void {
  if (typeof radius === 'number' && !(radius > 0 && Number.isFinite(radius))) {
    invalidArgs({
      api: 'filletIntersection(cutter, radius, opts?)',
      path: 'radius',
      got: radius,
      requires: 'a positive finite radius in mm',
      unit: 'mm',
      example: 'body.filletIntersection(cutter, 2)',
      featureId,
    });
  }
  if (typeof radius !== 'number' && !isParamRef(radius)) {
    invalidArgs({
      api: 'filletIntersection(cutter, radius, opts?)',
      path: 'radius',
      got: radius,
      showType: true,
      requires: 'a number or ParamRef<number> in mm',
      unit: 'mm',
      example: 'body.filletIntersection(cutter, 2)',
      featureId,
    });
  }
}

function validateTolerance(tolerance: Editable<number>, featureId: string): void {
  if (typeof tolerance === 'number' && !(tolerance > 0 && Number.isFinite(tolerance))) {
    invalidArgs({
      api: 'filletIntersection(cutter, radius, { toleranceMm })',
      path: 'opts.toleranceMm',
      got: tolerance,
      requires: 'a positive finite distance in mm',
      unit: 'mm',
      example: 'body.filletIntersection(cutter, 2, { toleranceMm: 0.05 })',
      featureId,
    });
  }
  if (typeof tolerance !== 'number' && !isParamRef(tolerance)) {
    invalidArgs({
      api: 'filletIntersection(cutter, radius, { toleranceMm })',
      path: 'opts.toleranceMm',
      got: tolerance,
      showType: true,
      requires: 'a number or ParamRef<number> in mm',
      unit: 'mm',
      example: 'body.filletIntersection(cutter, 2, { toleranceMm: 0.05 })',
      featureId,
    });
  }
}

function resolveOptions(
  radius: Editable<number>,
  opts: FilletIntersectionOpts | undefined,
  featureId: string,
): ResolvedFilletIntersection {
  validateRadius(radius, featureId);
  const tolerance = opts?.toleranceMm ?? 0.05;
  validateTolerance(tolerance, featureId);
  const sides = opts?.sides ?? 'body';
  if (sides !== 'body' && sides !== 'both') {
    invalidArgs({
      api: 'filletIntersection(cutter, radius, { sides })',
      path: 'opts.sides',
      got: sides,
      requires: "'body' (default) or 'both'",
      example: "body.filletIntersection(cutter, 2, { sides: 'body' })",
      featureId,
    });
  }
  const continuity = opts?.continuity ?? 'G1';
  if (continuity !== 'G1' && continuity !== 'G2') {
    invalidArgs({
      api: 'filletIntersection(cutter, radius, { continuity })',
      path: 'opts.continuity',
      got: continuity,
      requires: "'G1' (default) or 'G2'",
      example: "body.filletIntersection(cutter, 2, { continuity: 'G2' })",
      featureId,
    });
  }
  return { radius, tolerance, sides, continuity };
}

/** Capture `body.filletIntersection(cutter, radius, opts?)`. Kept out of
 *  `proxy.ts` so that file stays inside the repo size ratchet. */
export function captureFilletIntersection(
  session: CaptureSession,
  base: Shape,
  cutter: Shape,
  radius: Editable<number>,
  opts?: FilletIntersectionOpts,
): Shape {
  const resolved = resolveOptions(radius, opts, base.id);
  const inputs: Record<string, FeatureRef> = {
    base: { kind: 'feature', id: base.id },
    cutter: { kind: 'feature', id: cutter.id },
  };
  return session.createShape({
    kind: 'filletIntersection',
    inputs,
    params: {
      radius: toParam(resolved.radius, 'mm'),
      tolerance: toParam(resolved.tolerance, 'mm'),
    },
    metadata: {
      sides: resolved.sides,
      continuity: resolved.continuity,
    },
  });
}

