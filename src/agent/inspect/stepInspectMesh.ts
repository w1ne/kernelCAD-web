// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Tessellation for STEP inspect rasters. Face index matches `f<index>`.
// Edge index matches `e<index>` on the shape's `.edges` list.

import type { OcctBackend } from '../../kernel/backends/occt/occtBackend';
import { triangulateFaces } from '../../kernel/backends/occt/faceTriangles';
import { triangleNormal, type DrawnEdge, type DrawnTriangle } from './stepViewDraw';
import { dot, type Vec3 } from './stepViewMath';

const CHORD_MM = 0.25;
const ANGULAR = 0.5;

interface SampledCurve {
  geomType?: string;
  length: number;
  pointAt(t: number): { x: number; y: number; z: number };
}

export interface InspectMesh {
  triangles: DrawnTriangle[];
  edges: DrawnEdge[];
  points: Vec3[];
}

function vertexAt(vertices: number[], index: number): Vec3 | undefined {
  const o = index * 3;
  const x = vertices[o];
  const y = vertices[o + 1];
  const z = vertices[o + 2];
  if (x === undefined || y === undefined || z === undefined) return undefined;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return undefined;
  return [x, y, z];
}

function orient(normal: Vec3, outward: Vec3 | undefined): Vec3 {
  if (!outward) return normal;
  if (dot(normal, outward) >= 0) return normal;
  return [-normal[0], -normal[1], -normal[2]];
}

function trianglesOf(
  vertices: number[],
  indexes: number[],
  faceIndex: number,
  outward: Vec3 | undefined,
  points: Vec3[],
): DrawnTriangle[] {
  const out: DrawnTriangle[] = [];
  for (let i = 0; i + 2 < indexes.length; i += 3) {
    const a = vertexAt(vertices, indexes[i] ?? -1);
    const b = vertexAt(vertices, indexes[i + 1] ?? -1);
    const c = vertexAt(vertices, indexes[i + 2] ?? -1);
    if (!a || !b || !c) continue;
    const raw = triangleNormal([a, b, c]);
    if (raw[0] === 0 && raw[1] === 0 && raw[2] === 0) continue;
    points.push(a, b, c);
    out.push({ p: [a, b, c], n: orient(raw, outward), faceIndex });
  }
  return out;
}

function sampleCount(edge: SampledCurve): number {
  const kind = edge.geomType;
  if (kind === 'LINE') return 1;
  const length = Number.isFinite(edge.length) ? edge.length : 8;
  return Math.max(6, Math.min(16, Math.ceil(length / 2)));
}

export function sampleEdge(edge: SampledCurve): Vec3[] {
  try {
    const n = sampleCount(edge);
    const points: Vec3[] = [];
    for (let i = 0; i <= n; i++) {
      const p = edge.pointAt(i / n);
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) continue;
      points.push([p.x, p.y, p.z]);
    }
    return points;
  } catch {
    return [];
  }
}

function pushEdge(edges: DrawnEdge[], points: Vec3[], edge: SampledCurve, index: number): void {
  const sampled = sampleEdge(edge);
  if (sampled.length < 2) return;
  edges.push({ index, points: sampled });
  points.push(sampled[0], sampled[sampled.length - 1]);
}

export function meshImportedShape(
  shape: OcctBackend,
  outward: ReadonlyMap<number, Vec3>,
): InspectMesh {
  const triangles: DrawnTriangle[] = [];
  const edges: DrawnEdge[] = [];
  const points: Vec3[] = [];
  for (const face of triangulateFaces(shape, CHORD_MM, ANGULAR)) {
    triangles.push(...trianglesOf(face.vertices, face.triangles, face.index, outward.get(face.index), points));
  }
  const replicadEdges = (shape.getReplicadShape() as unknown as { edges: SampledCurve[] }).edges;
  replicadEdges.forEach((edge, index) => pushEdge(edges, points, edge, index));
  return { triangles, edges, points };
}

export function faceBoundary(shape: OcctBackend, faceIndex: number): Vec3[][] {
  const faces = (shape.getReplicadShape() as unknown as { faces: { edges?: SampledCurve[] }[] }).faces;
  const face = faces[faceIndex];
  if (!face) return [];
  try {
    const edges = face.edges ?? [];
    return edges.map(sampleEdge).filter((loop) => loop.length >= 2);
  } catch {
    return [];
  }
}
