// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Exact closest points of two external spur solids. The pair extrudes both
// gears through one face-width interval and spins them about their axes, so
// the minimum lives on the lateral faces. One tip cylinder containing the
// other could bury a gear inside material the flanks never touch; that pose
// keeps the full solids. Every other pose matches a full-solid query.

import { closestOnExtrusionSides } from '../kernel/backends/occt/lateralFaceDistance';
import { brepExtremaClosestBetween, type BrepClosest } from './runtime/brepDistance';

/** One tip cylinder can contain the other, so a buried gear is possible. */
function tipsCanNest(centerMm: number, tipA: number, tipB: number): boolean {
  return centerMm + tipA <= tipB || centerMm + tipB <= tipA;
}

export function closestSpurGearFaces(
  driver: unknown,
  driven: unknown,
  centerDistanceMm: number,
  driverTipRadiusMm: number,
  drivenTipRadiusMm: number,
): BrepClosest | undefined {
  if (tipsCanNest(centerDistanceMm, driverTipRadiusMm, drivenTipRadiusMm)) {
    return brepExtremaClosestBetween(driver, driven);
  }
  return closestOnExtrusionSides(driver, driven) ?? brepExtremaClosestBetween(driver, driven);
}
