// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { FeatureId } from '../../shared/intent/types';
import type { Shape } from './proxy';
import { invalidArgs } from '../../shared/intent/invalidArgs';

/** `assembly.part(..., { overlay })` accepts a boolean only. Kept out of
 *  assemblyParts.ts to stay inside its size/complexity budgets. */
export function validateOverlayOption(
  partName: string,
  featureId: FeatureId,
  overlay: unknown,
): void {
  if (overlay !== undefined && typeof overlay !== 'boolean') {
    invalidArgs({
      api: `assembly.part('${partName}', shape, { overlay })`,
      path: 'opts.overlay',
      got: overlay,
      showType: true,
      requires: 'a boolean',
      example: `arm.part('${partName}', shape, { overlay: true })`,
      featureId,
    });
  }
}

/** `massKg`, when given, must be a positive finite mass. */
export function validateMassKg(name: string, shape: Shape, massKg: number | undefined): void {
  if (massKg !== undefined && (typeof massKg !== 'number' || !Number.isFinite(massKg) || massKg <= 0)) {
    invalidArgs({
      api: `assembly.part('${name}', shape, { massKg })`,
      path: 'opts.massKg',
      got: massKg,
      requires: 'a positive finite mass in kg',
      example: `arm.part('${name}', shape, { massKg: 0.009 })`,
      featureId: shape.id,
    });
  }
}
