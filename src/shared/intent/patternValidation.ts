// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/intent/patternValidation.ts
//
// Shared pattern-arg validators. Hoisted out of src/modeling/capture/proxy.ts so the
// MCP add_pattern_feature tool can validate structured input with the same
// predicates the capture proxy uses at script-eval time.

import { isValidVec3 } from './types';
import type { Vec3 } from './types';

export interface PatternValidationError {
  field: string;
  message: string;
  hint: string;
}

export function validateLinear(opts: {
  count: number; direction: Vec3; spacing: number;
}): PatternValidationError | null {
  if (!Number.isInteger(opts.count) || opts.count < 2) {
    return { field: 'count', message: 'patternLinear count must be an integer >= 2.', hint: 'Pass count: 2 or greater.' };
  }
  if (!isValidVec3(opts.direction)) {
    return { field: 'direction', message: 'patternLinear direction must be a finite Vec3.', hint: 'Pass direction: [x, y, z].' };
  }
  if (typeof opts.spacing !== 'number' || !Number.isFinite(opts.spacing) || opts.spacing === 0) {
    return { field: 'spacing', message: 'patternLinear spacing must be a non-zero finite number.', hint: 'Pass a non-zero finite spacing.' };
  }
  return null;
}

export function validateCircular(opts: {
  count: number; axis: Vec3; angleDeg: number;
}): PatternValidationError | null {
  if (!Number.isInteger(opts.count) || opts.count < 2) {
    return { field: 'count', message: 'patternCircular count must be an integer >= 2.', hint: 'Pass count: 2 or greater.' };
  }
  if (!isValidVec3(opts.axis)) {
    return { field: 'axis', message: 'patternCircular axis must be a finite Vec3.', hint: 'Pass axis: [x, y, z].' };
  }
  if (typeof opts.angleDeg !== 'number' || !Number.isFinite(opts.angleDeg) || opts.angleDeg === 0) {
    return { field: 'angleDeg', message: 'patternCircular angleDeg must be a non-zero finite number.', hint: 'Pass a non-zero finite angleDeg.' };
  }
  return null;
}

export function validateGridAxis(label: 'x' | 'y', axis: {
  count: number; direction: Vec3; spacing: number;
}): PatternValidationError | null {
  if (!Number.isInteger(axis.count) || axis.count < 2) {
    return { field: `${label}.count`, message: `patternGrid.${label} count must be an integer >= 2.`, hint: 'Pass count: 2 or greater for both grid axes.' };
  }
  if (!isValidVec3(axis.direction)) {
    return { field: `${label}.direction`, message: `patternGrid.${label} direction must be a finite Vec3.`, hint: 'Pass direction: [x, y, z] for both grid axes.' };
  }
  if (typeof axis.spacing !== 'number' || !Number.isFinite(axis.spacing) || axis.spacing === 0) {
    return { field: `${label}.spacing`, message: `patternGrid.${label} spacing must be a non-zero finite number.`, hint: 'Pass a non-zero finite spacing for both grid axes.' };
  }
  return null;
}
