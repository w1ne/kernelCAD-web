// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { Vec3 } from '../../shared/intent/types';

export interface SymmetryPlane { origin: Vec3; normal: Vec3 }
export interface GeometryQualityOptions {
  tiny_face_area_mm2?: number;
  /** Fraction of total BREP surface area, in [0,1]. ORed with absolute area. */
  tiny_face_relative?: number;
  short_edge_length_mm?: number;
  symmetry_tolerance_mm?: number;
  mesh_deflection_mm?: number;
  asserted_plane?: SymmetryPlane;
}
export interface ResolvedGeometryQualityOptions {
  tinyFaceAreaMm2: number;
  tinyFaceRelative: number;
  shortEdgeLengthMm: number;
  symmetryToleranceMm: number;
  meshDeflectionMm: number;
  assertedPlane?: SymmetryPlane;
}
export interface SymmetryPlaneResult extends SymmetryPlane {
  name: string;
  passed: boolean;
  maxDeviationMm: number;
  rmsDeviationMm: number;
  sampleCount: number;
  worst: { source: Vec3; reflected: Vec3; closest: Vec3; sourceTriangle: number; closestTriangle: number };
}
export interface GeometrySymmetryReport {
  method: 'sampled-mesh-reflection';
  toleranceMm: number;
  meshDeflectionMm: number;
  triangleCount: number;
  planes: SymmetryPlaneResult[];
  matchingPlanes: string[];
}
export interface GeometryQualityReport {
  ok: boolean;
  source: 'local';
  featureId: string;
  frame: 'model';
  counts: { faces: number; edges: number };
  thresholds: { tinyFaceAreaMm2: number; tinyFaceRelative: number; shortEdgeLengthMm: number; surfaceAreaMm2: number };
  /** Ids/indices enumerate this feature's BREP and are only valid for this rebuild. */
  tinyFaces: { id: string; index: number; areaMm2: number; location: Vec3 }[];
  shortEdges: { id: string; index: number; lengthMm: number; location: Vec3 }[];
  /** Explicit BREP degenerated edges (e.g. sphere poles), not physical defects. */
  degenerateEdges: { id: string; index: number; location: Vec3 }[];
  symmetry: GeometrySymmetryReport;
  limitations: string[];
}

const triple = (v: unknown): v is Vec3 => Array.isArray(v) && v.length === 3 && v.every(n => typeof n === 'number' && Number.isFinite(n));
function numberOption(value: unknown, fallback: number, name: string, min = 0, max = Infinity): number {
  const n = value === undefined ? fallback : value;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < min || n > max) throw new Error(`${name} must be finite in [${min}, ${max}].`);
  return n;
}
export function resolveGeometryQualityOptions(input: GeometryQualityOptions): ResolvedGeometryQualityOptions {
  const tinyFaceAreaMm2 = numberOption(input.tiny_face_area_mm2, 0.01, 'tiny_face_area_mm2');
  const tinyFaceRelative = numberOption(input.tiny_face_relative, 0, 'tiny_face_relative', 0, 1);
  const shortEdgeLengthMm = numberOption(input.short_edge_length_mm, 0.1, 'short_edge_length_mm');
  const symmetryToleranceMm = numberOption(input.symmetry_tolerance_mm, 0.05, 'symmetry_tolerance_mm', 1e-6);
  const meshDeflectionMm = numberOption(input.mesh_deflection_mm, symmetryToleranceMm / 4, 'mesh_deflection_mm', 1e-7, symmetryToleranceMm / 2);
  let assertedPlane: SymmetryPlane | undefined;
  if (input.asserted_plane !== undefined) {
    const plane = input.asserted_plane;
    if (!plane || !triple(plane.origin) || !triple(plane.normal)) throw new Error('asserted_plane requires finite origin and normal triples.');
    const length = Math.hypot(...plane.normal);
    if (!(length > 0) || !Number.isFinite(length)) throw new Error('asserted_plane.normal must have finite nonzero length.');
    assertedPlane = { origin: [...plane.origin], normal: plane.normal.map(n => n / length) as Vec3 };
  }
  return { tinyFaceAreaMm2, tinyFaceRelative, shortEdgeLengthMm, symmetryToleranceMm, meshDeflectionMm, assertedPlane };
}
