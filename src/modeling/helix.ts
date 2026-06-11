// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modules/helix.ts
//
// Pure helix point generator for `Sketch.sweep(rail)`. Returns a polyline
// approximation of the helix curve sampled at `pointsPerTurn` points per
// revolution. Default 32/turn produces visually smooth threads and springs
// at typical CAD scales; agents can crank up resolution for fine threads.

export interface HelixOptions {
  radius: number;          // distance from axis (mm)
  pitch: number;           // axial distance per full turn (mm)
  turns: number;           // number of complete revolutions
  axis?: 'X' | 'Y' | 'Z';  // default 'Z'
  pointsPerTurn?: number;  // sample resolution; default 32
  startAngle?: number;     // radians; default 0
}

import type { Vec3 } from '../shared/intent/types';
export type RailPoint = Vec3;

/**
 * Generate a polyline approximation of a helix curve.
 *
 * For axis = 'Z' (default), point at parameter t (0 ≤ t ≤ turns) is:
 *   x = radius * cos(2π·t + startAngle)
 *   y = radius * sin(2π·t + startAngle)
 *   z = pitch · t
 *
 * For axis 'X' or 'Y', the same parametric formula is rotated so that the
 * named axis becomes the helix's axial direction.
 *
 * Returns `(turns × pointsPerTurn) + 1` points — start point plus one per
 * sample interval.
 */
export function helix(opts: HelixOptions): RailPoint[] {
  const radius = opts.radius;
  const pitch = opts.pitch;
  const turns = opts.turns;
  const axis = opts.axis ?? 'Z';
  const pointsPerTurn = opts.pointsPerTurn ?? 32;
  const startAngle = opts.startAngle ?? 0;

  const totalPoints = Math.round(turns * pointsPerTurn) + 1;
  const result: RailPoint[] = [];

  for (let i = 0; i < totalPoints; i++) {
    const t = i / pointsPerTurn;          // 0 → turns
    const angle = 2 * Math.PI * t + startAngle;
    const radial1 = radius * Math.cos(angle);
    const radial2 = radius * Math.sin(angle);
    const axial = pitch * t;

    let pt: RailPoint;
    if (axis === 'Z') {
      pt = [radial1, radial2, axial];
    } else if (axis === 'X') {
      pt = [axial, radial1, radial2];
    } else {
      pt = [radial1, axial, radial2];
    }
    result.push(pt);
  }

  return result;
}
