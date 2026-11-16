// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Key check for the boundingBox / recenter / seatOnFloor options. A
// misspelled placement key (`seatOnFloor({ centre: false })`,
// `recenter({ axes: 'xy' })`) used to be dropped, so the part moved on every
// axis with no diagnostic.
import type { FeatureId } from '../../shared/intent/types';
import { invalidArgs } from '../../shared/intent/invalidArgs';

export function assertPlacementOptions(
  method: 'recenter' | 'seatOnFloor' | 'boundingBox',
  keys: readonly string[],
  example: string,
  opts: unknown,
  featureId: FeatureId,
): void {
  if (opts === undefined || opts === null) return;
  const signature = `${method}(opts?: { ${keys.map((k) => `${k}?: boolean`).join('; ')} })`;
  if (typeof opts !== 'object' || Array.isArray(opts)) {
    invalidArgs({ api: signature, path: 'opts', got: opts, showType: true, requires: `an options object with ${keys.join(', ')}`, example, featureId });
  }
  for (const [key, value] of Object.entries(opts as Record<string, unknown>)) {
    if (!keys.includes(key)) {
      invalidArgs({ api: signature, path: `opts.${key}`, gotText: `an unknown option '${key}'`, requires: `one of ${keys.join(', ')}`, example, featureId });
    }
    if (value !== undefined && typeof value !== 'boolean') {
      invalidArgs({ api: signature, path: `opts.${key}`, got: value, showType: true, requires: 'true or false', example, featureId });
    }
  }
}
