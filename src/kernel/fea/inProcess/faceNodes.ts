// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/fea/inProcess/faceNodes.ts
//
// Binds a study's faces to voxel nodes, and names stress regions.
//
// The shape is triangulated face by face (replicad's faceGroups); a voxel node
// belongs to a face's set when it lies within half a brick of that face's
// triangles. Bounding-box faces of the part sit exactly on node planes, so a
// "fixed at minX" face binds exactly one plane of nodes.

import type { Face } from 'replicad';
import type { OcctBackend } from '../../backends/occt/occtBackend';
import type { TriangleSoup } from './voxelize';
import type { VoxelModel } from './voxelSolve';

export interface FaceTriangulation {
  soup: TriangleSoup;
  /** Triangle indices per face, in `shape.faces` order. */
  faceTris: number[][];
}

interface MeshedShape {
  faces: Face[];
  mesh(o: { tolerance: number; angularTolerance: number }): {
    vertices: number[];
    triangles: number[];
    faceGroups: Array<{ start: number; count: number; faceId: number }>;
  };
}

/** Surface triangulation of the shape, grouped per face. Chord tolerance is
 *  a fraction of the brick size so curved faces are captured below the
 *  resolution the grid can see anyway. */
export function triangulateFaces(shape: OcctBackend, chordMm: number): FaceTriangulation {
  const s = shape.getReplicadShape() as unknown as MeshedShape;
  const meshed = s.mesh({ tolerance: chordMm, angularTolerance: 0.2 });
  const indexOfFace = new Map<number, number>();
  s.faces.forEach((f, i) => indexOfFace.set((f as unknown as { hashCode: number }).hashCode, i));
  const faceTris: number[][] = s.faces.map(() => []);
  for (const g of meshed.faceGroups) {
    const fi = indexOfFace.get(g.faceId);
    if (fi === undefined) continue;
    for (let t = g.start / 3; t < (g.start + g.count) / 3; t++) faceTris[fi].push(t);
  }
  return { soup: { positions: meshed.vertices, indices: meshed.triangles }, faceTris };
}

type V3 = readonly [number, number, number];

const sub = (a: V3, b: V3): [number, number, number] => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const lerp = (a: V3, d: V3, t: number): [number, number, number] => [a[0] + t * d[0], a[1] + t * d[1], a[2] + t * d[2]];

/** The six dot products of Ericson's region test (RTCD 5.1.5). */
function regionDots(p: V3, a: V3, b: V3, c: V3): number[] {
  const ab = sub(b, a), ac = sub(c, a);
  const ap = sub(p, a), bp = sub(p, b), cp = sub(p, c);
  return [dot(ab, ap), dot(ac, ap), dot(ab, bp), dot(ac, bp), dot(ab, cp), dot(ac, cp)];
}

/** Closest point when it is a vertex of abc, else undefined. */
function closestVertex(a: V3, b: V3, c: V3, d: number[]): [number, number, number] | undefined {
  const [d1, d2, d3, d4, d5, d6] = d;
  if (d1 <= 0 && d2 <= 0) return [...a];
  if (d3 >= 0 && d4 <= d3) return [...b];
  if (d6 >= 0 && d5 <= d6) return [...c];
  return undefined;
}

/** Closest point when it lies on an edge of abc, else undefined. */
function closestEdge(a: V3, b: V3, c: V3, d: number[]): [number, number, number] | undefined {
  const [d1, d2, d3, d4, d5, d6] = d;
  if (d1 * d4 - d3 * d2 <= 0 && d1 >= 0 && d3 <= 0) return lerp(a, sub(b, a), d1 / (d1 - d3));
  if (d5 * d2 - d1 * d6 <= 0 && d2 >= 0 && d6 <= 0) return lerp(a, sub(c, a), d2 / (d2 - d6));
  if (d3 * d6 - d5 * d4 <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) return lerp(b, sub(c, b), (d4 - d3) / (d4 - d3 + (d5 - d6)));
  return undefined;
}

function closestOnBoundary(p: V3, a: V3, b: V3, c: V3): [number, number, number] | undefined {
  const d = regionDots(p, a, b, c);
  return closestVertex(a, b, c, d) ?? closestEdge(a, b, c, d);
}

/** Closest point of p on triangle abc. */
function closestOnTriangle(p: V3, a: V3, b: V3, c: V3): [number, number, number] {
  const edge = closestOnBoundary(p, a, b, c);
  if (edge !== undefined) return edge;
  // Interior: project onto the plane.
  const n = [
    (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]),
    (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]),
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]),
  ] as const;
  const nn = dot(n, n);
  if (nn === 0) return [...a];
  const t = dot(sub(p, a), n) / nn;
  return [p[0] - t * n[0], p[1] - t * n[1], p[2] - t * n[2]];
}

function vertex(soup: TriangleSoup, t: number, k: number): V3 {
  const i = 3 * soup.indices[3 * t + k];
  return [soup.positions[i], soup.positions[i + 1], soup.positions[i + 2]];
}

/** Distance from p to the nearest of `tris`. */
export function distanceToTriangles(soup: TriangleSoup, tris: readonly number[], p: V3): number {
  let best = Infinity;
  for (const t of tris) {
    const q = closestOnTriangle(p, vertex(soup, t, 0), vertex(soup, t, 1), vertex(soup, t, 2));
    const d = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
    if (d < best) best = d;
  }
  return best;
}

function trianglesBox(soup: TriangleSoup, tris: readonly number[], pad: number): { min: number[]; max: number[] } {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const t of tris) for (let k = 0; k < 3; k++) {
    const v = vertex(soup, t, k);
    for (let a = 0; a < 3; a++) { min[a] = Math.min(min[a], v[a] - pad); max[a] = Math.max(max[a], v[a] + pad); }
  }
  return { min, max };
}

/** Voxel nodes within `tol` of the given faces' triangles. */
export function nodesNearFaces(
  model: VoxelModel,
  tri: FaceTriangulation,
  faceIndices: readonly number[],
  tol: number,
): number[] {
  const tris = faceIndices.flatMap(i => tri.faceTris[i] ?? []);
  if (tris.length === 0) return [];
  const box = trianglesBox(tri.soup, tris, tol);
  const out: number[] = [];
  for (let n = 0; n < model.nodeCount; n++) {
    const p: V3 = [model.coords[3 * n], model.coords[3 * n + 1], model.coords[3 * n + 2]];
    if (p.some((v, a) => v < box.min[a] || v > box.max[a])) continue;
    if (distanceToTriangles(tri.soup, tris, p) <= tol) out.push(n);
  }
  return out;
}

/** Index of the face whose triangles are nearest to p. */
export function nearestFace(tri: FaceTriangulation, p: V3): number {
  let best = -1;
  let bestD = Infinity;
  tri.faceTris.forEach((tris, i) => {
    if (tris.length === 0) return;
    const d = distanceToTriangles(tri.soup, tris, p);
    if (d < bestD) { bestD = d; best = i; }
  });
  return best;
}
