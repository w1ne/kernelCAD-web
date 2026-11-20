// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/edgeGeometry.ts
//
// Centroid and curve type of each edge on a body, keyed by edge hash. Edge
// lineage carries no geometry snapshot, so the spatial and geometry query
// filters (`closestTo`, `containsPoint`, `geometryType`) read it here. The
// centroid is the curve midpoint, the same point `edgeFingerprint` reports.

import type { Shape3D } from 'replicad';
import { occtEdgeHash } from './edgeIdentity';

export interface EdgeGeometry {
  readonly centroid: [number, number, number];
  /** replicad curve type: 'LINE', 'CIRCLE', 'BSPLINE_CURVE', ... */
  readonly curveType: string;
}

const cache = new WeakMap<Shape3D, Map<string, EdgeGeometry>>();

export function edgeGeometryOf(shape: Shape3D, hash: string): EdgeGeometry | undefined {
  let byHash = cache.get(shape);
  if (!byHash) {
    byHash = new Map();
    for (const edge of shape.edges) {
      const h = occtEdgeHash(edge);
      if (h === null) continue;
      const mid = edge.pointAt(0.5);
      byHash.set(h.toString(16), { centroid: [mid.x, mid.y, mid.z], curveType: edge.geomType });
      mid.delete();
    }
    cache.set(shape, byHash);
  }
  return byHash.get(hash);
}
