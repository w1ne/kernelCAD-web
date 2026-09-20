// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { GeometryResult } from '../../../shared/worker/geometryEngine';

/** True when at least one face has triangle indices (non-empty mesh). */
export function hasNonemptyGeometry(geometries: GeometryResult[]): boolean {
  return geometries.some((g) =>
    g.faces.some((f) => f.indices.length >= 3 && f.vertices.length >= 9),
  );
}
