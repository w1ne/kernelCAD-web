// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Small vector helpers for the viewer dimension rules.

import type { V3 } from './types';
import { cross, dot, len, sub } from '../drawingAuto/vectors';

export { cross, dot, len, sub };

export const add = (a: readonly number[], b: readonly number[]): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const scale = (a: readonly number[], k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const unit = (a: readonly number[]): V3 => {
  const l = len(a);
  return l > 0 ? [a[0] / l, a[1] / l, a[2] / l] : [a[0], a[1], a[2]];
};

const WORLD: readonly V3[] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

/** A unit vector perpendicular to `axis`, built from the world axis it is
 *  least aligned with (deterministic for a given axis). */
export function perpendicular(axis: readonly number[]): V3 {
  let best = WORLD[0];
  for (const w of WORLD) {
    if (Math.abs(dot(w, axis)) < Math.abs(dot(best, axis))) best = w;
  }
  return unit(cross(axis, best));
}

/** `v` with its component along unit `axis` removed. */
export const reject = (v: readonly number[], axis: readonly number[]): V3 => sub(v, scale(axis, dot(v, axis)));
