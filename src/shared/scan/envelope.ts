// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { SCAN_PARSE_LIMIT, scanRefused, type ScanBBox, type ScanFailure, type Vec3 } from './types';

export interface ScanEnvelope {
  ok: true;
  pointCount: number;
  bbox: ScanBBox;
  centroid: Vec3;
}

export type EnvelopeResult = ScanEnvelope | ScanFailure;

function vec3(values: number[]): Vec3 {
  return [values[0], values[1], values[2]];
}

/** Bounding box and centroid of an XYZ cloud. Coordinates are already in millimetres. */
export function scanEnvelope(points: readonly (readonly [number, number, number])[]): EnvelopeResult {
  if (points.length === 0) return scanRefused('Point cloud has no points');
  if (points.length > SCAN_PARSE_LIMIT) {
    return scanRefused(`Point cloud has ${points.length} points, above the ${SCAN_PARSE_LIMIT} parse limit. Downsample the file first.`);
  }
  const coords = new Float64Array(points.length * 3);
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (point.length !== 3) return scanRefused(`Point ${i} must contain three coordinates`);
    coords[i * 3] = point[0];
    coords[i * 3 + 1] = point[1];
    coords[i * 3 + 2] = point[2];
  }
  const summed = envelopeFromCoords(coords, 1);
  if (typeof summed === 'string') return scanRefused(summed);
  return { ok: true, pointCount: points.length, ...summed };
}

/** Running bbox and centroid. `scale` converts file units to millimetres. */
export function envelopeFromCoords(coords: ArrayLike<number>, scale: number): { bbox: ScanBBox; centroid: Vec3 } | string {
  const count = coords.length / 3;
  if (count === 0) return 'Point cloud has no points';
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const sum = [0, 0, 0];
  for (let i = 0; i < count; i++) {
    for (let axis = 0; axis < 3; axis++) {
      const value = coords[i * 3 + axis] * scale;
      if (!Number.isFinite(value)) return `Point ${i} has a non-finite coordinate`;
      min[axis] = Math.min(min[axis], value);
      max[axis] = Math.max(max[axis], value);
      sum[axis] += value;
    }
  }
  return {
    bbox: { min: vec3(min), max: vec3(max), size: vec3(min.map((value, axis) => max[axis] - value)) },
    centroid: vec3(sum.map(value => value / count)),
  };
}

export function sampleStride(count: number, maxPoints: number): { stride: number; stored: number; downsampled: boolean } {
  if (count <= maxPoints) return { stride: 1, stored: count, downsampled: false };
  const stride = Math.ceil(count / maxPoints);
  return { stride, stored: Math.floor((count - 1) / stride) + 1, downsampled: true };
}

export function samplePoints(coords: ArrayLike<number>, stride: number, scale: number): Vec3[] {
  const out: Vec3[] = [];
  const count = coords.length / 3;
  for (let i = 0; i < count; i += stride) {
    out.push([coords[i * 3] * scale, coords[i * 3 + 1] * scale, coords[i * 3 + 2] * scale]);
  }
  return out;
}
