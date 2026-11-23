// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/export/creaseSplit.ts
//
// Crease-split shading normals for the PLY and USD mesh writers. The export
// mesher shares vertices across B-rep face boundaries, so a plain average
// rounds every sharp edge. A vertex shared by faces meeting at more than the
// crease angle gets one normal per smooth fan instead.

import type { IndexedMesh } from './meshFormats';

/** Split mesh: `triangles[k]` indexes the position and normal of corner `k`
 *  of the source mesh, so it also serves as a face-varying normal index. */
export interface CreaseSplitMesh { positions: Float32Array; normals: Float32Array; triangles: Uint32Array }

/** Area-weighted face normals (unnormalised cross products) and unit normals. */
function faceNormals(v: IndexedMesh['vertices'], t: IndexedMesh['triangles']): { area: Float64Array; unit: Float64Array } {
  const nt = t.length / 3;
  const area = new Float64Array(nt * 3);
  const unit = new Float64Array(nt * 3);
  for (let f = 0; f < nt; f++) {
    const a = t[f * 3]! * 3, b = t[f * 3 + 1]! * 3, c = t[f * 3 + 2]! * 3;
    const ux = v[b]! - v[a]!, uy = v[b + 1]! - v[a + 1]!, uz = v[b + 2]! - v[a + 2]!;
    const wx = v[c]! - v[a]!, wy = v[c + 1]! - v[a + 1]!, wz = v[c + 2]! - v[a + 2]!;
    const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
    const len = Math.hypot(nx, ny, nz);
    area.set([nx, ny, nz], f * 3);
    if (len > 0) unit.set([nx / len, ny / len, nz / len], f * 3);
  }
  return { area, unit };
}

/** Faces incident to each vertex, as CSR offsets + face ids. */
function vertexFaces(t: IndexedMesh['triangles'], vertexCount: number): { start: Uint32Array; faces: Uint32Array } {
  const start = new Uint32Array(vertexCount + 1);
  for (const index of t) start[index + 1]!++;
  for (let i = 0; i < vertexCount; i++) start[i + 1]! += start[i]!;
  const fill = start.slice(0, vertexCount);
  const faces = new Uint32Array(t.length);
  for (let k = 0; k < t.length; k++) faces[fill[t[k]!]!++] = Math.floor(k / 3);
  return { start, faces };
}

/** Per-corner normal: the area-weighted sum of the vertex's incident faces
 *  within the crease angle of this corner's face; corners at one vertex with
 *  the same normal share one output vertex. */
export function splitByCrease(mesh: IndexedMesh, creaseAngleDeg: number): CreaseSplitMesh {
  const { vertices: v, triangles: t } = mesh;
  const vertexCount = v.length / 3;
  const { area, unit } = faceNormals(v, t);
  const { start, faces } = vertexFaces(t, vertexCount);
  const cosCrease = Math.cos((creaseAngleDeg * Math.PI) / 180);
  const positions: number[] = [];
  const normals: number[] = [];
  const triangles = new Uint32Array(t.length);
  const emitted: Array<Array<{ n: [number, number, number]; index: number }>> = Array.from({ length: vertexCount }, () => []);
  for (let k = 0; k < t.length; k++) {
    const vi = t[k]!;
    const n = cornerNormal(Math.floor(k / 3), vi, start, faces, area, unit, cosCrease);
    const existing = emitted[vi]!.find(e => e.n[0] * n[0] + e.n[1] * n[1] + e.n[2] * n[2] > 0.99999);
    if (existing) { triangles[k] = existing.index; continue; }
    const index = positions.length / 3;
    positions.push(v[vi * 3]!, v[vi * 3 + 1]!, v[vi * 3 + 2]!);
    normals.push(...n);
    emitted[vi]!.push({ n, index });
    triangles[k] = index;
  }
  return { positions: Float32Array.from(positions), normals: Float32Array.from(normals), triangles };
}

function cornerNormal(
  face: number,
  vertex: number,
  start: Uint32Array,
  faces: Uint32Array,
  area: Float64Array,
  unit: Float64Array,
  cosCrease: number,
): [number, number, number] {
  let x = 0, y = 0, z = 0;
  const fx = unit[face * 3]!, fy = unit[face * 3 + 1]!, fz = unit[face * 3 + 2]!;
  for (let i = start[vertex]!; i < start[vertex + 1]!; i++) {
    const g = faces[i]!;
    if (fx * unit[g * 3]! + fy * unit[g * 3 + 1]! + fz * unit[g * 3 + 2]! < cosCrease && g !== face) continue;
    x += area[g * 3]!; y += area[g * 3 + 1]!; z += area[g * 3 + 2]!;
  }
  const len = Math.hypot(x, y, z);
  if (len === 0) return [fx, fy, fz];
  return [x / len, y / len, z / len];
}
