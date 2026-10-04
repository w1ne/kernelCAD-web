// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/intent/patternValidation.ts
//
// Shared pattern-arg validators. Hoisted out of src/modeling/capture/proxy.ts so the
// MCP add_pattern_feature tool can validate structured input with the same
// predicates the capture proxy uses at script-eval time.
//
// Every message is rendered by the shared `invalidArgs` renderer, so the tool
// reply carries the same four parts as a thrown `feature.invalid-args`: the
// API and argument path, the received value, the requirement with units, and
// one inline example.

import { isValidVec3 } from './types';
import type { Vec3 } from './types';
import { invalidArgsText } from './invalidArgs';
import type { InvalidArgsSpec } from './invalidArgs';

export interface PatternValidationError {
  field: string;
  message: string;
  hint: string;
}

const LINEAR_EXAMPLE = 'plate.patternLinear({ count: 4, direction: [1, 0, 0], spacing: 20 })';
const CIRCULAR_EXAMPLE = 'plate.patternCircular({ count: 6, axis: [0, 0, 1], angleDeg: 360 })';
const GRID_EXAMPLE =
  'plate.patternGrid({ x: { count: 4, direction: [1, 0, 0], spacing: 20 }, y: { count: 3, direction: [0, 1, 0], spacing: 15 } })';

/** `count` is the trap users hit most: it is the total, not the extra copies. */
const COUNT_REQUIRES =
  'an integer ≥ 2 — count is the TOTAL number of instances including the original, not the number of copies added';
const SPACING_REQUIRES =
  'a finite non-zero number — the centre-to-centre pitch between neighbours, not the total span (total span is spacing × (count − 1))';
const DIRECTION_REQUIRES =
  'a 3-element array of finite numbers [x, y, z]; it only sets the axis, the step comes from spacing';

function err(field: string, spec: InvalidArgsSpec): PatternValidationError {
  return { field, ...invalidArgsText(spec) };
}

export function validateLinear(opts: {
  count: number; direction: Vec3; spacing: number;
}): PatternValidationError | null {
  if (!Number.isInteger(opts.count) || opts.count < 2) {
    return err('count', {
      api: 'patternLinear({ count })',
      path: 'count',
      got: opts.count,
      showType: typeof opts.count !== 'number',
      requires: COUNT_REQUIRES,
      unit: 'count',
      example: LINEAR_EXAMPLE,
    });
  }
  if (!isValidVec3(opts.direction)) {
    return err('direction', {
      api: 'patternLinear({ direction })',
      path: 'direction',
      got: opts.direction,
      showType: !Array.isArray(opts.direction),
      requires: DIRECTION_REQUIRES,
      example: LINEAR_EXAMPLE,
    });
  }
  if (typeof opts.spacing !== 'number' || !Number.isFinite(opts.spacing) || opts.spacing === 0) {
    return err('spacing', {
      api: 'patternLinear({ spacing })',
      path: 'spacing',
      got: opts.spacing,
      showType: typeof opts.spacing !== 'number',
      requires: SPACING_REQUIRES,
      unit: 'mm',
      example: LINEAR_EXAMPLE,
    });
  }
  return null;
}

export function validateCircular(opts: {
  count: number; axis: Vec3; angleDeg: number;
}): PatternValidationError | null {
  if (!Number.isInteger(opts.count) || opts.count < 2) {
    return err('count', {
      api: 'patternCircular({ count })',
      path: 'count',
      got: opts.count,
      showType: typeof opts.count !== 'number',
      requires: `${COUNT_REQUIRES}; with the default angleDeg: 360 they land 360 / count apart`,
      unit: 'count',
      example: CIRCULAR_EXAMPLE,
    });
  }
  if (!isValidVec3(opts.axis)) {
    return err('axis', {
      api: 'patternCircular({ axis })',
      path: 'axis',
      got: opts.axis,
      showType: !Array.isArray(opts.axis),
      requires:
        'a 3-element array of finite numbers [x, y, z] — the rotation axis through the world origin ([0, 0, 1] for a bolt circle on an XY plate)',
      example: CIRCULAR_EXAMPLE,
    });
  }
  if (typeof opts.angleDeg !== 'number' || !Number.isFinite(opts.angleDeg) || opts.angleDeg === 0) {
    return err('angleDeg', {
      api: 'patternCircular({ angleDeg })',
      path: 'angleDeg',
      got: opts.angleDeg,
      showType: typeof opts.angleDeg !== 'number',
      requires:
        'a finite non-zero number — the TOTAL sweep covered by all instances (360 for a full circle, the default); instances land angleDeg / count apart',
      unit: 'deg',
      example: CIRCULAR_EXAMPLE,
    });
  }
  return null;
}

export function validateGridAxis(label: 'x' | 'y', axis: {
  count: number; direction: Vec3; spacing: number;
}): PatternValidationError | null {
  if (!Number.isInteger(axis.count) || axis.count < 2) {
    return err(`${label}.count`, {
      api: `patternGrid({ ${label} })`,
      path: `${label}.count`,
      got: axis.count,
      showType: typeof axis.count !== 'number',
      requires: COUNT_REQUIRES,
      unit: 'count',
      example: GRID_EXAMPLE,
    });
  }
  if (!isValidVec3(axis.direction)) {
    return err(`${label}.direction`, {
      api: `patternGrid({ ${label} })`,
      path: `${label}.direction`,
      got: axis.direction,
      showType: !Array.isArray(axis.direction),
      requires: DIRECTION_REQUIRES,
      example: GRID_EXAMPLE,
    });
  }
  if (typeof axis.spacing !== 'number' || !Number.isFinite(axis.spacing) || axis.spacing === 0) {
    return err(`${label}.spacing`, {
      api: `patternGrid({ ${label} })`,
      path: `${label}.spacing`,
      got: axis.spacing,
      showType: typeof axis.spacing !== 'number',
      requires: SPACING_REQUIRES,
      unit: 'mm',
      example: GRID_EXAMPLE,
    });
  }
  return null;
}
