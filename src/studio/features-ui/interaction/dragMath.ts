// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/studio/features-ui/interaction/dragMath.ts
//
// Direct-edit drag quantization. Pure functions only; the gizmo component
// feeds them raw world deltas and applies the results.

export type SnapUnit = 'mm' | 'in';

/** One increment: 1 mm, or 0.1 in (2.54 mm). */
export const SNAP_INCREMENTS: Readonly<Record<SnapUnit, number>> = { mm: 1, in: 2.54 };

export function snapDelta(delta: [number, number, number], unit: SnapUnit): [number, number, number] {
  const step = SNAP_INCREMENTS[unit];
  return delta.map((v) => {
    const r = Math.round(v / step) * step;
    return r === 0 ? 0 : r;
  }) as [number, number, number];
}

export function nudgeDelta(axis: 0 | 1 | 2, unit: SnapUnit, shift: boolean): [number, number, number] {
  const step = SNAP_INCREMENTS[unit] * (shift ? 10 : 1);
  const out: [number, number, number] = [0, 0, 0];
  out[axis] = step;
  return out;
}
