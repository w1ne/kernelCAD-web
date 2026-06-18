// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { FeatureId, FeatureKind } from './types';
import type { SurfaceId } from './surfaceRecord';

export interface FeatureIdGenerator {
  next(kind: FeatureKind): FeatureId;
  reset(): void;
}

export function createFeatureIdGenerator(): FeatureIdGenerator {
  const counters = new Map<FeatureKind, number>();
  return {
    next(kind) {
      const n = (counters.get(kind) ?? 0) + 1;
      counters.set(kind, n);
      return `${kind}_${n}`;
    },
    reset() {
      counters.clear();
    },
  };
}

/**
 * Parallel id stream for `SurfaceRecord`. Surfaces never enter `FeatureKind`
 * — they have their own counter so `surface_1` cannot collide with
 * `surfaceThicken_1` (the latter is a Shape FeatureId minted from
 * `createFeatureIdGenerator`).
 */
export interface SurfaceIdGenerator {
  next(): SurfaceId;
  reset(): void;
}

export function createSurfaceIdGenerator(): SurfaceIdGenerator {
  let n = 0;
  return {
    next() { n += 1; return `surface_${n}`; },
    reset() { n = 0; },
  };
}
