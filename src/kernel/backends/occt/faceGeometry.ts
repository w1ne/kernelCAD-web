// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/faceGeometry.ts
//
// Centroid and surface type of each face on a body, keyed by face hash. Only
// some lowerers attach a geometry snapshot and surface type to face lineage;
// plain primitives (box, cylinder) and most of their descendants carry
// neither. The spatial and geometry query filters (`closestTo`,
// `containsPoint`, `geometryType`) read the body here when the lineage has
// no value. The centroid is the area centroid (`face.center`), the same
// point a lineage snapshot stores.

import type { Shape3D } from 'replicad';

export interface FaceGeometry {
  readonly centroid: [number, number, number];
  /** replicad surface type: 'PLANE', 'CYLINDRE', 'BSPLINE_SURFACE', ... */
  readonly surfaceType: string;
}

const cache = new WeakMap<Shape3D, Map<string, FaceGeometry>>();

export function faceGeometryOf(shape: Shape3D, hash: string): FaceGeometry | undefined {
  let byHash = cache.get(shape);
  if (!byHash) {
    byHash = new Map();
    for (const face of shape.faces) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const h = ((face as any).wrapped.HashCode(2147483647) as number).toString(16);
      const c = face.center;
      byHash.set(h, { centroid: [c.x, c.y, c.z], surfaceType: face.geomType });
    }
    cache.set(shape, byHash);
  }
  return byHash.get(hash);
}
