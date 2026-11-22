// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Capture-time validation of the asymmetric-chamfer options:
// `.chamfer(distance, edges, { distance2 | angleDeg, face? })`.
import { invalidArgs, type InvalidArgsSpec } from '../../shared/intent/invalidArgs';
import type { FeatureId } from '../../shared/intent/types';
import { isParamRef, type Editable } from '../../shared/runtime/paramRef';

export interface ChamferLegOptions {
  /** Bevel leg on the face opposite the reference face (mm). */
  distance2?: Editable<number>;
  /** Angle between the bevel and the reference face (degrees, 0–90 exclusive). */
  angleDeg?: Editable<number>;
  /** Reference face that `distance` is measured on. Defaults to the face
   *  that selected the edges (`.chamfer(2, 'top', …)`). */
  face?: unknown;
}

export const CHAMFER_LEGS_API = 'chamfer(distance, edges, { distance2 | angleDeg, face })';
export const CHAMFER_LEGS_EXAMPLE = "box(40, 30, 10).chamfer(2, 'top', { distance2: 5 })";

const KEYS = new Set(['distance2', 'angleDeg', 'face']);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function inRange(value: unknown, max: number): boolean {
  return isParamRef(value) || (typeof value === 'number' && Number.isFinite(value) && value > 0 && value < max);
}

/** Validate the third `.chamfer()` argument, or raise `feature.invalid-args`. */
export function validateChamferLegOptions(opts: unknown, featureId: FeatureId): ChamferLegOptions {
  const bad = (spec: Omit<InvalidArgsSpec, 'api' | 'example' | 'featureId'>): never =>
    invalidArgs({ api: CHAMFER_LEGS_API, example: CHAMFER_LEGS_EXAMPLE, featureId, ...spec });
  const unknownKeys = isPlainObject(opts) ? Object.keys(opts).filter((k) => !KEYS.has(k)) : [];
  if (!isPlainObject(opts) || unknownKeys.length > 0) {
    bad({
      path: 'opts',
      ...(unknownKeys.length > 0 ? { gotText: `unknown keys: ${unknownKeys.join(', ')}` } : { got: opts, showType: true }),
      requires: 'an object with only distance2, angleDeg and face',
    });
  }
  const { distance2, angleDeg, face } = opts as ChamferLegOptions;
  if ((distance2 === undefined) === (angleDeg === undefined)) {
    bad({
      path: 'opts',
      gotText: distance2 === undefined ? 'neither distance2 nor angleDeg' : 'both distance2 and angleDeg',
      requires: 'exactly one second leg — distance2 (mm) or angleDeg; omit the options for a symmetric chamfer',
    });
  }
  if (distance2 !== undefined && !inRange(distance2, Infinity)) {
    bad({
      path: 'opts.distance2', got: distance2, showType: typeof distance2 !== 'number', unit: 'mm',
      requires: 'a finite number > 0 — the bevel leg on the face opposite the reference face',
    });
  }
  if (angleDeg !== undefined && !inRange(angleDeg, 90)) {
    bad({
      path: 'opts.angleDeg', got: angleDeg, showType: typeof angleDeg !== 'number', unit: 'deg',
      requires: 'a number in (0, 90) — the angle between the bevel and the reference face',
    });
  }
  return { distance2, angleDeg, ...(face !== undefined ? { face } : {}) };
}
