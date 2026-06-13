// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/intent/region.ts
//
// W2.2 sheet-metal slice 1: Region — a closed planar outline with optional
// holes and bend-line metadata. Returned by `Shape.flattenPattern()` as a
// derived view; no FeatureRecord is produced.

import type { Vec3 } from './types';

/** Local 2D point (x, y) in the Region's plane frame. */
export type Vec2 = [number, number];

/** A bend line projected into a Region's plane, tagged with its source bend's
 *  fold angle and inner radius. Order is bend ordinal along the lineage
 *  chain (0 = first bend applied). */
export interface BendLineRecord {
  start: Vec2;
  end: Vec2;
  /** Signed bend angle in degrees. Positive = fold toward +normal. */
  angle: number;
  /** Inner bend radius in mm. */
  radius: number;
  /** Bend index in the lineage chain (0-based). */
  ordinal: number;
}

/** Plane in 3D — origin point + normal direction. Region 2D coords are in
 *  this plane's local frame (origin at `origin`, X/Y derived deterministically
 *  from `normal` via the standard up-from-normal construction). */
export interface PlaneSpec3D {
  origin: Vec3;
  normal: Vec3;
}

/** A closed planar outline: outer wire (CCW polyline) + zero-or-more hole
 *  wires (CW polylines), plus the source plane and any bend-line metadata
 *  carried from `flattenPattern()`. Slice-1 wires are polylines only
 *  (straight segments between vertices). Future slices may add curve
 *  segments; this shape is forward-compatible because the type already
 *  carries a discriminated metadata bag. */
export interface Region {
  plane: PlaneSpec3D;
  outer: Vec2[];
  holes: Vec2[][];
  /** Empty unless this Region was produced by `Shape.flattenPattern()`. */
  bendLines: BendLineRecord[];
}

export function makeRegion(spec: Region): Region {
  if (!Array.isArray(spec.outer) || spec.outer.length < 3) {
    throw new Error(
      `Region: outer wire must have at least 3 points; got ${spec.outer?.length ?? 0}.`,
    );
  }
  for (const hole of spec.holes ?? []) {
    if (!Array.isArray(hole) || hole.length < 3) {
      throw new Error(
        `Region: hole wire must have at least 3 points; got ${hole?.length ?? 0}.`,
      );
    }
  }
  // Freeze to keep the type honest in the test suite.
  return Object.freeze({
    plane: spec.plane,
    outer: spec.outer.slice(),
    holes: (spec.holes ?? []).map(h => h.slice()),
    bendLines: (spec.bendLines ?? []).slice(),
  });
}

export function isValidRegion(v: unknown): v is Region {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Region;
  if (!Array.isArray(r.outer) || r.outer.length < 3) return false;
  if (!Array.isArray(r.holes)) return false;
  if (!Array.isArray(r.bendLines)) return false;
  return true;
}

/** Narrowing alias for `isValidRegion`. Exists so call-sites that only need
 *  the type-guard semantics (e.g. the DXF writer dispatch in
 *  `runAndExport`) read cleanly without picking up the "validity" framing
 *  used during construction. */
export function isRegion(v: unknown): v is Region {
  return isValidRegion(v);
}
