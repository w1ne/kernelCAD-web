// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Drill-point geometry shared by hole capture/validation and the OCCT lowerer.
// A twist-drill point is a cone below the cylindrical bore. `depth` in the
// public hole API is the full-diameter depth, so the cone adds `tipDepth`
// beyond it — the same convention `drawingFeatures` uses when it reads a
// drill-point bottom from imported geometry.

/** Included angle of a standard 118° twist-drill point. */
export const DEFAULT_DRILL_POINT_ANGLE_DEG = 118;

/** Axial distance from the full-diameter shoulder to the cone apex, mm. */
export function drillPointTipDepth(radius: number, angleDeg = DEFAULT_DRILL_POINT_ANGLE_DEG): number {
  return radius / Math.tan((angleDeg / 2) * Math.PI / 180);
}
