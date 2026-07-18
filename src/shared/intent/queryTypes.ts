// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Query types shared between kernel resolvers and intent records.
// Lives in shared/ so intent types (featureRecord, queryKeys) can reference
// FaceQuery/EdgeQuery without a shared→kernel upward dep.

import type { Vec3 } from './types';

export type BoundingRegion = {
  xMin?: number; xMax?: number;
  yMin?: number; yMax?: number;
  zMin?: number; zMax?: number;
};

export type EdgeQuery = {
  atZ?: number;
  atX?: number;
  atY?: number;
  /**
   * Sort matching edges by distance to this point — closest first.
   * NOTE: this is a SORT, not a FILTER. `near` alone returns all edges
   * (sorted); combine with `within`, `tolerance`, or other keys to filter.
   * `selectEdge` uses `near` to pick a single result from multiple matches.
   */
  near?: Vec3;
  within?: BoundingRegion;
  parallel?: Vec3;
  perpendicular?: Vec3;
  convex?: boolean;
  concave?: boolean;
  minAngle?: number;     // dihedral, degrees
  maxAngle?: number;
  ofCurveType?: 'LINE' | 'CIRCLE' | 'BSPLINE';
  tolerance?: number;     // default 1.0
  angleTolerance?: number; // default 10 (degrees)
};

export type FaceQuery = {
  atZ?: number;
  atX?: number;
  atY?: number;
  parallelTo?: 'XY' | 'YZ' | 'XZ' | Vec3;
  inPlane?: 'XY' | 'YZ' | 'XZ';
  ofSurfaceType?: 'PLANE' | 'CYLINDER' | 'SPHERE' | 'CONE' | 'TORUS' | 'BSPLINE';
  containsPoint?: Vec3;
  near?: Vec3;
  tolerance?: number;
  // v0.2-finish additions
  byNormal?: 'X' | '-X' | 'Y' | '-Y' | 'Z' | '-Z';
  minArea?: number;
  maxArea?: number;
  boundingBoxIn?: BoundingRegion;
};

export type EdgeSegment = {
  id: string;
  midpoint: Vec3;
  direction: Vec3;
  length: number;
  curveType: string;
  /**
   * Circumradius in mm, present ONLY when `curveType === 'CIRCLE'` (full
   * circles and arcs alike). Derived from three points sampled on the edge,
   * so it is exact for circular geometry and deliberately absent for every
   * other curve type rather than approximated. Consumed by the selector
   * algebra (`ShapeList.sortBy('radius')` / `groupBy('radius')`) to rank
   * bore lips, fillet rims, and hole mouths by size.
   */
  radius?: number;
  convex: boolean | null;
  dihedralAngleDeg: number | null;
  normalA: Vec3 | null;
  normalB: Vec3 | null;
  boundary: boolean;
};
