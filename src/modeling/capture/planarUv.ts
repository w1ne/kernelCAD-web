// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/capture/planarUv.ts
//
// Bbox-planar UV generator. For each face we project the vertex positions onto
// the two world axes least aligned with the face's average normal, then
// remap into `[0, 1] x [0, 1]` using the bounding box of the projection.
//
// This is intentionally the simplest UV scheme that lets `MeshPhysicalMaterial`
// sample any texture without garbage; it is NOT a conformal unwrap. For axis-
// aligned planar faces (the dominant case in agent-authored builds) it gives
// a stable, deterministic mapping — re-running on the same face yields
// bit-identical UVs.
//
// Edge cases:
//   - Degenerate bbox along either chosen axis → UV component clamped to 0.
//   - Empty face (0 vertices) → empty Float32Array.

import type { FaceGeometry } from '../../shared/worker/workerTypes';
import { computeProjectedUVs, type TextureProjection } from '../../shared/intent/textureProjection';
import type { PBRMaterial } from '../../shared/intent/material';

/** Determine the dominant axis from the face's normal. Prefer the face's
 *  declared plane normal when available; fall back to averaging vertex
 *  normals to dodge degenerate-plane edge cases on curved faces. */
function dominantFaceNormal(face: FaceGeometry): [number, number, number] {
  let nx = 0, ny = 0, nz = 0;
  if (face.plane?.normal) {
    [nx, ny, nz] = face.plane.normal;
  } else if (face.normals.length >= 3) {
    for (let i = 0; i < face.normals.length; i += 3) {
      nx += face.normals[i];
      ny += face.normals[i + 1];
      nz += face.normals[i + 2];
    }
    // No need to normalize — only relative magnitudes matter for axis picking.
  } else {
    nx = 0; ny = 0; nz = 1; // arbitrary fallback (degenerate face → all-zero UVs anyway)
  }
  return [nx, ny, nz];
}

function chooseUvAxes(nx: number, ny: number, nz: number): { uAxis: 0 | 1 | 2; vAxis: 0 | 1 | 2 } {
  const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
  // Pick the two axes with the SMALLEST normal-projection magnitude — i.e.
  // the in-plane directions for the dominant face plane.
  // Drop the axis with the LARGEST absolute normal component.
  if (ax >= ay && ax >= az) {
    // Drop X; UV from Y, Z.
    return { uAxis: 1, vAxis: 2 };
  }
  if (ay >= ax && ay >= az) {
    // Drop Y; UV from X, Z.
    return { uAxis: 0, vAxis: 2 };
  }
  // Drop Z; UV from X, Y.
  return { uAxis: 0, vAxis: 1 };
}

function projectedBounds(
  verts: Float32Array,
  vCount: number,
  uAxis: 0 | 1 | 2,
  vAxis: 0 | 1 | 2,
): { minU: number; maxU: number; minV: number; maxV: number } {
  // Compute the bbox along the two chosen axes.
  let minU = Infinity, maxU = -Infinity;
  let minV = Infinity, maxV = -Infinity;
  for (let i = 0; i < vCount; i++) {
    const u = verts[i * 3 + uAxis];
    const v = verts[i * 3 + vAxis];
    if (u < minU) minU = u;
    if (u > maxU) maxU = u;
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
  }
  return { minU, maxU, minV, maxV };
}

/** Generate planar UVs for a face geometry. Returns a `Float32Array` with
 *  `vertices.length / 3 * 2` entries (one (u,v) per vertex), deterministic
 *  across recomputes for the same input. */
export function generatePlanarUVs(face: FaceGeometry): Float32Array {
  const verts = face.vertices;
  const vCount = verts.length / 3;
  if (vCount === 0) return new Float32Array(0);

  const [nx, ny, nz] = dominantFaceNormal(face);
  const { uAxis, vAxis } = chooseUvAxes(nx, ny, nz);
  const { minU, maxU, minV, maxV } = projectedBounds(verts, vCount, uAxis, vAxis);
  const du = maxU - minU;
  const dv = maxV - minV;

  const uvs = new Float32Array(vCount * 2);
  for (let i = 0; i < vCount; i++) {
    const u = verts[i * 3 + uAxis];
    const v = verts[i * 3 + vAxis];
    uvs[i * 2] = du > 0 ? (u - minU) / du : 0;
    uvs[i * 2 + 1] = dv > 0 ? (v - minV) / dv : 0;
  }
  return uvs;
}

/** `.wrapTexture()` projections: one projection over the whole body (all
 *  faces share the body's bounds), so the image wraps the part rather than
 *  restarting on every face. Same mapping the GLB export writes. */
export function attachProjectedUVs(faces: FaceGeometry[], projection: TextureProjection): void {
  let total = 0;
  for (const face of faces) total += face.vertices.length;
  const all = new Float32Array(total);
  let offset = 0;
  for (const face of faces) {
    all.set(face.vertices, offset);
    offset += face.vertices.length;
  }
  const uv = computeProjectedUVs(all, projection);
  const wraps = projection.type === 'cylinder' || projection.type === 'sphere';
  let vertex = 0;
  for (const face of faces) {
    const count = face.vertices.length / 3;
    face.uv = uv.slice(vertex * 2, (vertex + count) * 2);
    if (wraps) splitWrapSeam(face);
    vertex += count;
  }
}

/** An angular projection jumps from u = 1 back to u = 0 at its seam, and a
 *  triangle that straddles it would smear the whole image across one
 *  triangle. Give such triangles their own copies of the low-u vertices at
 *  u + 1; the texture repeats, so u + 1 samples the same column. Original
 *  vertex indices are kept, copies are appended. */
function splitWrapSeam(face: FaceGeometry): void {
  const uv = face.uv;
  if (uv === undefined) return;
  const indices = face.indices;
  const copies = new Map<number, number>();
  const extra: number[] = [];
  const count = face.vertices.length / 3;
  const nextIndices = new Uint32Array(indices);
  for (let t = 0; t + 2 < indices.length; t += 3) {
    const u0 = uv[indices[t] * 2], u1 = uv[indices[t + 1] * 2], u2 = uv[indices[t + 2] * 2];
    if (Math.max(u0, u1, u2) - Math.min(u0, u1, u2) <= 0.5) continue;
    for (let k = 0; k < 3; k++) {
      const i = indices[t + k];
      if (uv[i * 2] >= 0.5) continue;
      let copy = copies.get(i);
      if (copy === undefined) {
        copy = count + extra.length;
        copies.set(i, copy);
        extra.push(i);
      }
      nextIndices[t + k] = copy;
    }
  }
  if (extra.length === 0) return;
  const n = count + extra.length;
  const vertices = new Float32Array(n * 3);
  const normals = new Float32Array(n * 3);
  const uvs = new Float32Array(n * 2);
  vertices.set(face.vertices);
  normals.set(face.normals);
  uvs.set(uv);
  extra.forEach((src, j) => {
    const dst = count + j;
    vertices.set(face.vertices.subarray(src * 3, src * 3 + 3), dst * 3);
    normals.set(face.normals.subarray(src * 3, src * 3 + 3), dst * 3);
    uvs[dst * 2] = uv[src * 2] + 1;
    uvs[dst * 2 + 1] = uv[src * 2 + 1];
  });
  face.vertices = vertices;
  face.normals = normals;
  face.uv = uvs;
  face.indices = nextIndices;
}

/** UVs for a body whose material wraps a texture (`.wrapTexture()`); a no-op
 *  for any other material, which keeps the planar fallback. */
export function attachMaterialUVs(faces: FaceGeometry[], material: PBRMaterial | undefined): void {
  const projection = material?.textureProjection;
  if (projection !== undefined && material?.textures?.albedo !== undefined) attachProjectedUVs(faces, projection);
}
