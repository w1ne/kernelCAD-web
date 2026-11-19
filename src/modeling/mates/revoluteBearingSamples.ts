// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Axial bearing samples for the revolute-contact rule: where along a hinge
// axis a part has material near that axis.
import type { ShapeBackend } from '../../kernel/backends/backend';
import type { Vec3 } from '../../shared/intent/types';

const REVOLUTE_BEARING_RADIAL_SAMPLE_RADIUS_MM = 24;

function readVertex(positions: Float32Array, vertexIndex: number): Vec3 {
  const i = vertexIndex * 3;
  return [positions[i], positions[i + 1], positions[i + 2]];
}

export function closestSamples(samplesA: readonly number[], samplesB: readonly number[]): number {
  let best = Number.POSITIVE_INFINITY;
  for (const a of samplesA) for (const b of samplesB) best = Math.min(best, Math.abs(a - b));
  return best;
}

export function minBearingAxialGapMm(
  backendA: ShapeBackend,
  originA: Vec3,
  axisA: Vec3,
  backendB: ShapeBackend,
  originB: Vec3,
  axisB: Vec3,
): number {
  const samplesA = bearingProjectionSamples(backendA, originA, axisA);
  const samplesB = bearingProjectionSamples(backendB, originB, axisB);
  if (samplesA.length === 0 || samplesB.length === 0) return Number.POSITIVE_INFINITY;

  let best = Number.POSITIVE_INFINITY;
  for (const a of samplesA) {
    for (const b of samplesB) {
      best = Math.min(best, Math.abs(a - b));
    }
  }
  return best;
}

export function bearingProjectionSamples(
  backend: ShapeBackend,
  origin: Vec3,
  axis: Vec3,
): number[] {
  const normalizedAxis = normalize(axis);
  if (normalizedAxis === undefined) return [];
  const mesh = backend.getMesh();
  const out: number[] = [];
  for (let i = 0; i < mesh.positions.length; i += 3) {
    const point: Vec3 = [mesh.positions[i], mesh.positions[i + 1], mesh.positions[i + 2]];
    const rel = sub(point, origin);
    const projection = dot(rel, normalizedAxis);
    const closest = scale(normalizedAxis, projection);
    const radial = length(sub(rel, closest));
    if (radial <= REVOLUTE_BEARING_RADIAL_SAMPLE_RADIUS_MM) {
      out.push(projection);
    }
  }
  // Where the axis itself pierces the surface. A large flat face carries
  // vertices only at its far-away corners, so vertex sampling alone sees no
  // material on a pivot through the middle of a base plate (an "Infinity mm"
  // gap between two parts stacked face to face on the hinge axis).
  out.push(...axisPiercingProjections(mesh, origin, normalizedAxis));
  return out;
}

/** Axial positions (relative to `origin`) where the infinite line through
 *  `origin` along unit `axis` crosses a mesh triangle (Möller–Trumbore). */
function axisPiercingProjections(
  mesh: ReturnType<ShapeBackend['getMesh']>,
  origin: Vec3,
  axis: Vec3,
): number[] {
  const out: number[] = [];
  const { positions, indices } = mesh;
  for (let i = 0; i + 2 < indices.length; i += 3) {
    const t = intersectLineTriangle(
      origin,
      axis,
      readVertex(positions, indices[i]),
      readVertex(positions, indices[i + 1]),
      readVertex(positions, indices[i + 2]),
    );
    if (t !== undefined) out.push(t);
  }
  return out;
}

function intersectLineTriangle(origin: Vec3, dir: Vec3, v0: Vec3, v1: Vec3, v2: Vec3): number | undefined {
  const e1 = sub(v1, v0);
  const e2 = sub(v2, v0);
  const p = cross(dir, e2);
  const det = dot(e1, p);
  if (Math.abs(det) < 1e-12) return undefined;
  const inv = 1 / det;
  const s = sub(origin, v0);
  const u = dot(s, p) * inv;
  if (u < -1e-9 || u > 1 + 1e-9) return undefined;
  const q = cross(s, e1);
  const v = dot(dir, q) * inv;
  if (v < -1e-9 || u + v > 1 + 1e-9) return undefined;
  return dot(e2, q) * inv;
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function normalize(v: Vec3): Vec3 | undefined {
  const len = length(v);
  if (len === 0) return undefined;
  return [v[0] / len, v[1] / len, v[2] / len];
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scale(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function length(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}
