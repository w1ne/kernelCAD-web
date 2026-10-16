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

/**
 * Corner form of a {@link BoundingRegion}: `{ min: [x,y,z], max: [x,y,z] }`.
 * Accepted wherever a BoundingRegion is (`EdgeQuery.within`,
 * `FaceQuery.boundingBoxIn`) and normalised to the per-axis form before
 * evaluation.
 */
export type BoundingBoxCorners = { min: Vec3; max: Vec3 };

/** Principal axis name. Sign is accepted for readability; parallel /
 *  perpendicular tests are sign-agnostic, `byNormal` is not. */
export type AxisName = 'X' | 'Y' | 'Z' | '-X' | '-Y' | '-Z' | '+X' | '+Y' | '+Z';

/** A direction: an axis name or an explicit (non-zero) vector. */
export type DirectionSpec = AxisName | Vec3;

/** Public surface-type names. OCCT's French `'CYLINDRE'` and the long
 *  `*_SURFACE` spellings are accepted as aliases of the same type. */
export type SurfaceTypeName =
  | 'PLANE' | 'CYLINDER' | 'CONE' | 'SPHERE' | 'TORUS'
  | 'BSPLINE' | 'BSPLINE_SURFACE' | 'BEZIER' | 'BEZIER_SURFACE'
  | 'REVOLUTION' | 'REVOLUTION_SURFACE' | 'EXTRUSION' | 'EXTRUSION_SURFACE'
  | 'OFFSET' | 'OFFSET_SURFACE' | 'OTHER' | 'OTHER_SURFACE'
  | 'CYLINDRE';

/** Public curve-type names (`'BSPLINE'` is an alias of `'BSPLINE_CURVE'`). */
export type CurveTypeName =
  | 'LINE' | 'CIRCLE' | 'ELLIPSE' | 'HYPERBOLA' | 'PARABOLA'
  | 'BSPLINE' | 'BSPLINE_CURVE' | 'BEZIER' | 'BEZIER_CURVE'
  | 'OFFSET' | 'OFFSET_CURVE' | 'OTHER' | 'OTHER_CURVE';

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
  /** Keep edges whose midpoint lies inside the region (per-axis bounds or
   *  `{ min, max }` corners). An empty region is rejected, not ignored. */
  within?: BoundingRegion | BoundingBoxCorners;
  /** Edge (chord) direction parallel to this axis/vector. */
  parallel?: DirectionSpec;
  /** Alias of `parallel` (the FaceQuery spelling). */
  parallelTo?: DirectionSpec;
  perpendicular?: DirectionSpec;
  /** Alias of `perpendicular`. */
  perpendicularTo?: DirectionSpec;
  convex?: boolean;
  concave?: boolean;
  minAngle?: number;     // dihedral, degrees
  maxAngle?: number;
  ofCurveType?: CurveTypeName;
  tolerance?: number;     // default 1.0
  angleTolerance?: number; // default 10 (degrees)
};

export type FaceQuery = {
  atZ?: number;
  atX?: number;
  atY?: number;
  /** Face NORMAL parallel to this axis/vector, or face parallel to the
   *  named plane ('XY' ≡ normal along Z). */
  parallelTo?: 'XY' | 'YZ' | 'XZ' | DirectionSpec;
  /** Alias of `parallelTo` (the EdgeQuery spelling). */
  parallel?: 'XY' | 'YZ' | 'XZ' | DirectionSpec;
  inPlane?: 'XY' | 'YZ' | 'XZ';
  ofSurfaceType?: SurfaceTypeName;
  containsPoint?: Vec3;
  near?: Vec3;
  tolerance?: number;
  // v0.2-finish additions
  byNormal?: 'X' | '-X' | 'Y' | '-Y' | 'Z' | '-Z';
  minArea?: number;
  maxArea?: number;
  boundingBoxIn?: BoundingRegion | BoundingBoxCorners;
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
  /** Circle centre in mm, present ONLY when `curveType === 'CIRCLE'`. */
  center?: Vec3;
  /** Unit circle axis (normal of the circle's plane, right-handed with the
   *  curve's parametrisation), present ONLY when `curveType === 'CIRCLE'`.
   *  For circles `direction` carries the same axis — a chord direction is
   *  meaningless (zero) on a full circle. */
  axis?: Vec3;
  convex: boolean | null;
  dihedralAngleDeg: number | null;
  normalA: Vec3 | null;
  normalB: Vec3 | null;
  boundary: boolean;
};
